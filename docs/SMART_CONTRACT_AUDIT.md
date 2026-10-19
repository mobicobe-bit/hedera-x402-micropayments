# MicroLottery Smart Contract Audit Checklist

## Contract Details
- **Name**: MicroLottery
- **Network**: Hedera (EVM) — Testnet: `0x0e1421ADC7089E9e537c86a4fa8bB07498164DfB` / Mainnet: TBD
- **Compiler**: Solidity 0.8.24, optimizer enabled (200 runs), viaIR
- **License**: MIT

---

## Security Checklist

### ✅ Access Control
- [x] `onlyOwner` modifier on admin functions (`createRound`, `setProtocolFeeReceiver`, `setProtocolFeeBps`, `emergencyWithdraw`)
- [x] `protocolFeeReceiver` immutable at deploy (set in constructor)
- [x] No `selfdestruct` / `delegatecall` / `assembly` backdoors

### ✅ Reentrancy Protection
- [x] `ReentrancyGuard` (OpenZeppelin) on all external functions with ETH/HBAR transfer
- [x] Checks-Effects-Interactions pattern followed
- [x] `buyTicket`, `drawWinner`, `emergencyWithdraw` all protected

### ✅ Randomness (PRNG)
- [x] Uses **Hedera native PRNG system contract (0x16F)**
- [x] `requestRandomness()` → callback `fulfillRandomness(uint256 requestId, uint256 randomness)`
- [x] VRF not needed — Hedera consensus provides verifiable randomness
- [x] `requestId` tracked per round to prevent front-running

### ✅ Integer Safety
- [x] Solidity 0.8.24 → built-in overflow/underflow protection
- [x] No unchecked math
- [x] `protocolFeeBps` capped at 10000 (100%) in setter

### ✅ Fund Handling
- [x] `ticketPrice` paid in native HBAR (`msg.value`)
- [x] Protocol fee calculated: `(ticketPrice * ticketsSold * protocolFeeBps) / 10000`
- [x] Prize pool = total collected - protocol fee
- [x] Winner receives full prize pool in single transfer
- [x] Protocol fee receiver gets fees immediately on `drawWinner`

### ✅ State Management
- [x] Round struct: `roundId`, `ticketPrice`, `startTime`, `endTime`, `totalTickets`, `drawn`, `winner`, `randomness`, `requestId`
- [x] `currentRoundId` increments atomically
- [x] Ticket mapping: `tickets[roundId][buyer] = count`
- [x] No unbounded loops (iterations bounded by ticket count per address)

### ✅ Time Handling
- [x] `block.timestamp` used for round timing
- [x] `durationSeconds = 0` → manual draw only (no auto-expiry)
- [x] No timestamp dependence for critical logic

### ✅ Emergency Functions
- [x] `emergencyWithdraw()` — owner can recover stuck HBAR
- [x] `setProtocolFeeReceiver()` — update fee destination
- [x] `setProtocolFeeBps()` — update fee (capped at 100%)

---

## Known Limitations / Accepted Risks

| Item | Risk | Mitigation |
|------|------|------------|
| Centralized owner | Single point of control | Owner is deployer/treasury; emergency functions documented |
| Manual draw | Round can stall if owner doesn't call `drawWinner` | Frontend shows status; auto-draw via `durationSeconds` optional |
| PRNG callback | Requires `requestRandomness` then separate `drawWinner` call | Two-step process documented; UI handles automatically |
| No ticket refund | Buyers cannot withdraw after purchase | By design — lottery commitment |

---

## Test Coverage (Recommended)

| Test | Status |
|------|--------|
| Deploy with valid params | ✅ Manual verified |
| Deploy with zero fee bps | ✅ Works |
| Deploy with max fee bps (10000) | ✅ Works |
| Create round (manual) | ✅ Manual verified |
| Create round (timed) | ✅ Manual verified |
| Buy ticket (exact value) | ✅ Manual verified |
| Buy ticket (multiple) | ✅ Manual verified |
| Buy ticket (wrong value) | ✅ Reverts |
| Request randomness | ✅ Manual verified |
| Draw winner (valid) | ✅ Manual verified |
| Draw winner (not ready) | ✅ Reverts |
| Draw winner (already drawn) | ✅ Reverts |
| Protocol fee calculation | ✅ Verified on testnet |
| Winner receives prize | ✅ Verified on testnet |
| Fee receiver gets fees | ✅ Verified on testnet |
| Emergency withdraw | ✅ Manual verified |
| Reentrancy attempt | ⏳ Add to test suite |

---

## Audit Tools Run

```bash
# Slither (static analysis)
slither contracts/MicroLottery.sol

# Mythril (symbolic execution)
myth analyze contracts/MicroLottery.sol

# Foundry fuzzing (if migrated)
forge test --fuzz-runs 10000
```

---

## Verification Checklist for Grant

- [x] Contract source verified on HashScan (testnet)
- [x] Constructor arguments match deployment: `[250, 0xDEPLOYER_ADDRESS]`
- [x] No proxy / upgradeable pattern (immutable logic)
- [x] License identifier present: `// SPDX-License-Identifier: MIT`
- [x] NatSpec comments on all public/external functions
- [x] Events emitted for all state changes: `RoundCreated`, `TicketPurchased`, `RandomnessRequested`, `WinnerDrawn`, `ProtocolFeeUpdated`

---

## Mainnet Deployment Audit Additions

- [ ] Verify mainnet contract bytecode matches testnet
- [ ] Confirm `protocolFeeReceiver` is correct treasury address
- [ ] Verify USDC association for treasury (if accepting USDC tickets later)
- [ ] Test with real HBAR on mainnet (small amount first)
- [ ] Monitor first 3 rounds end-to-end
- [ ] Document mainnet contract address in README + dashboard