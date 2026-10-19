// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title MicroLottery
 * @dev Decentralized micro-lottery on Hedera where the prize is a product (not cash).
 *      Uses Hedera's native PRNG (System Contract 0x16F - PRNG) for verifiable randomness.
 *      Accepts payment in HBAR (native) via msg.value.
 *
 * Security considerations:
 * - ReentrancyGuard on state-changing external calls
 * - PRNG request/response pattern prevents front-running
 * - Only owner can configure product metadata and draw winner
 * - Commit-reveal not needed: Hedera PRNG provides VRF-like output on-chain
 * - Ticket IDs are sequential; winner selected via modulo on PRNG output
 * - Emergency withdraw for stuck HBAR (owner only)
 */
contract MicroLottery {
    // ============ Hedera System Contract Addresses ============
    // Hedera Testnet/Mainnet: PRNG System Contract at 0x000000000000000000000000000000000000016F
    address constant PRNG_SYSTEM_CONTRACT = 0x000000000000000000000000000000000000016F;

    // ============ State ============
    struct LotteryRound {
        uint256 roundId;
        uint256 ticketPrice;           // in tinybars (1 HBAR = 100_000_000 tinybars)
        uint256 startTime;
        uint256 endTime;               // 0 = open until draw
        uint256 totalTickets;
        address payable winner;        // 0 = not drawn
        bytes32 prngRequestId;         // PRNG request tracker
        bool prngRequested;
        bool drawn;
        string productName;
        string productDescription;
        string productImageUrl;
    }

    // ============ Storage ============
    uint256 public currentRoundId;
    mapping(uint256 => LotteryRound) public rounds;
    mapping(uint256 => address[]) public roundParticipants; // roundId -> list of ticket holders
    mapping(uint256 => mapping(address => uint256[])) public userTickets; // roundId -> user -> ticketIds[]

    address public owner;
    uint256 public protocolFeeBps; // basis points (e.g., 250 = 2.5%)
    address public protocolFeeReceiver;

    // Reentrancy guard
    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;
    uint256 private status;

    // ============ Events ============
    event RoundCreated(uint256 indexed roundId, uint256 ticketPrice, string productName);
    event TicketPurchased(uint256 indexed roundId, address indexed buyer, uint256 ticketId);
    event PRNGRequested(uint256 indexed roundId, bytes32 requestId);
    event WinnerDrawn(uint256 indexed roundId, address indexed winner, uint256 winningTicketId, bytes32 prngOutput);
    event ProtocolFeeUpdated(uint256 newFeeBps, address newReceiver);
    event EmergencyWithdraw(address indexed to, uint256 amount);

    // ============ Errors ============
    error OnlyOwner();
    error RoundNotActive();
    error RoundAlreadyDrawn();
    error RoundNotReadyForDraw();
    error InsufficientPayment();
    error InvalidTicketPrice();
    error PRNGRequestFailed();
    error PRNGNotReady();
    error Reentrancy();
    error ZeroAddress();

    // ============ Modifiers ============
    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    modifier nonReentrant() {
        if (status == ENTERED) revert Reentrancy();
        status = ENTERED;
        _;
        status = NOT_ENTERED;
    }

    modifier roundActive(uint256 roundId) {
        LotteryRound storage round = rounds[roundId];
        if (round.roundId == 0) revert RoundNotActive();
        if (round.drawn) revert RoundAlreadyDrawn();
        if (block.timestamp < round.startTime) revert RoundNotActive();
        if (round.endTime != 0 && block.timestamp > round.endTime) revert RoundNotActive();
        _;
    }

    // ============ Constructor ============
    constructor(uint256 _protocolFeeBps, address _protocolFeeReceiver) {
        if (_protocolFeeReceiver == address(0)) revert ZeroAddress();
        if (_protocolFeeBps > 10000) revert InvalidTicketPrice(); // max 100%

        owner = msg.sender;
        protocolFeeBps = _protocolFeeBps;
        protocolFeeReceiver = payable(_protocolFeeReceiver);
        status = NOT_ENTERED;
        currentRoundId = 0;
    }

    // ============ Admin: Create New Round ============
    /**
     * @notice Create a new lottery round with a product prize
     * @param _ticketPriceHbar Ticket price in HBAR (e.g., 10 = 10 HBAR)
     * @param _productName Name of the product prize
     * @param _productDescription Description of the product prize
     * @param _productImageUrl Image URL for the product
     * @param _durationSeconds Duration in seconds (0 = manual draw only)
     */
    function createRound(
        uint256 _ticketPriceHbar,
        string calldata _productName,
        string calldata _productDescription,
        string calldata _productImageUrl,
        uint256 _durationSeconds
    ) external onlyOwner nonReentrant {
        if (_ticketPriceHbar == 0) revert InvalidTicketPrice();

        currentRoundId++;
        uint256 ticketPriceTinybars = _ticketPriceHbar * 100_000_000; // HBAR -> tinybars

        rounds[currentRoundId] = LotteryRound({
            roundId: currentRoundId,
            ticketPrice: ticketPriceTinybars,
            startTime: block.timestamp,
            endTime: _durationSeconds > 0 ? block.timestamp + _durationSeconds : 0,
            totalTickets: 0,
            winner: payable(address(0)),
            prngRequestId: bytes32(0),
            prngRequested: false,
            drawn: false,
            productName: _productName,
            productDescription: _productDescription,
            productImageUrl: _productImageUrl
        });

        emit RoundCreated(currentRoundId, ticketPriceTinybars, _productName);
    }

    // ============ User: Buy Ticket ============
    /**
     * @notice Buy a ticket for the current active round
     * @dev Accepts native HBAR via msg.value. Each ticket = 1 entry.
     *      Multiple tickets per transaction supported via msg.value / ticketPrice.
     */
    function buyTicket() external payable nonReentrant roundActive(currentRoundId) {
        LotteryRound storage round = rounds[currentRoundId];

        if (msg.value < round.ticketPrice) revert InsufficientPayment();

        uint256 ticketCount = msg.value / round.ticketPrice;
        if (ticketCount == 0) revert InsufficientPayment();

        uint256 totalCost = ticketCount * round.ticketPrice;
        uint256 protocolFee = (totalCost * protocolFeeBps) / 10000;
        uint256 prizePoolAmount = totalCost - protocolFee;

        // Forward protocol fee if configured
        if (protocolFee > 0 && protocolFeeReceiver != address(0)) {
            (bool sent, ) = protocolFeeReceiver.call{value: protocolFee}("");
            if (!sent) revert PRNGRequestFailed(); // bubble up
        }

        // Mint tickets
        for (uint256 i = 0; i < ticketCount; i++) {
            round.totalTickets++;
            uint256 ticketId = round.totalTickets;
            roundParticipants[currentRoundId].push(msg.sender);
            userTickets[currentRoundId][msg.sender].push(ticketId);

            emit TicketPurchased(currentRoundId, msg.sender, ticketId);
        }

        // Refund excess
        if (msg.value > totalCost) {
            (bool refunded, ) = payable(msg.sender).call{value: msg.value - totalCost}("");
            if (!refunded) revert PRNGRequestFailed();
        }
    }

    // ============ Admin: Request PRNG (Step 1 of draw) ============
    /**
     * @notice Request randomness from Hedera PRNG system contract
     * @dev Must be called before drawWinner(). Uses Hedera's native PRNG (System Contract 0x16F).
     *      The requestId is stored and used in drawWinner() to retrieve the output.
     */
    function requestRandomness() external onlyOwner nonReentrant {
        LotteryRound storage round = rounds[currentRoundId];
        if (round.roundId == 0) revert RoundNotActive();
        if (round.drawn) revert RoundAlreadyDrawn();
        if (round.totalTickets == 0) revert RoundNotReadyForDraw();
        if (round.prngRequested) revert PRNGRequestFailed(); // already requested
        if (round.endTime != 0 && block.timestamp < round.endTime) revert RoundNotReadyForDraw();

        // Call Hedera PRNG System Contract: requestRandomBytes(uint256 numBytes, uint256 callbackGas)
        // Returns (bytes32 requestId)
        (bool success, bytes memory returnData) = PRNG_SYSTEM_CONTRACT.call(
            abi.encodeWithSelector(bytes4(keccak256("requestRandomBytes(uint256,uint256)")), 32, 200_000)
        );

        if (!success || returnData.length < 32) revert PRNGRequestFailed();

        bytes32 requestId = abi.decode(returnData, (bytes32));
        round.prngRequestId = requestId;
        round.prngRequested = true;

        emit PRNGRequested(currentRoundId, requestId);
    }

    // ============ Admin: Draw Winner (Step 2 of draw) ============
    /**
     * @notice Draw the winner using the PRNG output
     * @dev Retrieves randomness from PRNG system contract using stored requestId.
     *      Winner = participants[random % totalTickets]
     */
    function drawWinner() external onlyOwner nonReentrant {
        LotteryRound storage round = rounds[currentRoundId];
        if (round.roundId == 0) revert RoundNotActive();
        if (round.drawn) revert RoundAlreadyDrawn();
        if (!round.prngRequested) revert PRNGNotReady();
        if (round.totalTickets == 0) revert RoundNotReadyForDraw();

        // Call PRNG system contract: getRandomBytes(bytes32 requestId)
        // Returns (bytes32 randomOutput)
        (bool success, bytes memory returnData) = PRNG_SYSTEM_CONTRACT.call(
            abi.encodeWithSelector(bytes4(keccak256("getRandomBytes(bytes32)")), round.prngRequestId)
        );

        if (!success || returnData.length < 32) revert PRNGNotReady();

        bytes32 randomOutput = abi.decode(returnData, (bytes32));

        // Convert random bytes to uint256 and select winner
        uint256 randomNum = uint256(randomOutput);
        uint256 winningIndex = randomNum % round.totalTickets;
        address winner = roundParticipants[currentRoundId][winningIndex];
        uint256 winningTicketId = userTickets[currentRoundId][winner][0]; // first ticket of winner

        round.winner = payable(winner);
        round.drawn = true;

        emit WinnerDrawn(currentRoundId, winner, winningTicketId, randomOutput);
    }

    // ============ View Functions ============
    function getCurrentRound() external view returns (LotteryRound memory) {
        return rounds[currentRoundId];
    }

    function getRound(uint256 roundId) external view returns (LotteryRound memory) {
        return rounds[roundId];
    }

    function getUserTickets(uint256 roundId, address user) external view returns (uint256[] memory) {
        return userTickets[roundId][user];
    }

    function getParticipants(uint256 roundId) external view returns (address[] memory) {
        return roundParticipants[roundId];
    }

    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // ============ Admin: Config ============
    function setProtocolFee(uint256 _feeBps, address _receiver) external onlyOwner {
        if (_feeBps > 10000) revert InvalidTicketPrice();
        if (_receiver == address(0)) revert ZeroAddress();
        protocolFeeBps = _feeBps;
        protocolFeeReceiver = payable(_receiver);
        emit ProtocolFeeUpdated(_feeBps, _receiver);
    }

    function setOwner(address _newOwner) external onlyOwner {
        if (_newOwner == address(0)) revert ZeroAddress();
        owner = _newOwner;
    }

    // ============ Emergency ============
    function emergencyWithdraw(address payable _to, uint256 _amount) external onlyOwner {
        if (_to == address(0)) revert ZeroAddress();
        if (_amount > address(this).balance) _amount = address(this).balance;
        if (_amount == 0) return;

        (bool sent, ) = _to.call{value: _amount}("");
        if (!sent) revert PRNGRequestFailed();
        emit EmergencyWithdraw(_to, _amount);
    }

    // ============ Receive HBAR ============
    receive() external payable {
        // Allow direct HBAR transfers (not used for tickets, but useful for funding)
    }

    fallback() external payable {
        // Allow direct HBAR transfers
    }
}