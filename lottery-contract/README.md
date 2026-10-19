# Hedera MicroLottery

A decentralized micro-lottery on Hedera where the prize is a **product** (not cash). Uses Hedera's native PRNG (System Contract `0x16F`) for verifiable on-chain randomness. Accepts payment in native HBAR.

## Features

- **Product prizes** — not cash, so legally distinct from gambling in many jurisdictions
- **Native HBAR payments** — users pay with `msg.value`, no token approvals needed
- **Verifiable randomness** — Hedera PRNG System Contract (0x16F) provides VRF-like output on-chain
- **Protocol fee** — configurable % goes to treasury (default 2.5%)
- **Emergency withdraw** — owner can recover stuck HBAR
- **Frontend widget** — embeddable checkout for any website

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│   Frontend      │────▶│  MicroLottery    │────▶│  Hedera PRNG        │
│   (Widget)      │     │  Smart Contract  │     │  (0x16F)            │
└─────────────────┘     └──────────────────┘     └─────────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │  Protocol Fee    │
                       │  (2.5% default)  │
                       └──────────────────┘
```

## Quick Start

### 1. Install Dependencies
```bash
cd hedera-microlottery
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your PRIVATE_KEY and other values
```

### 3. Compile Contract
```bash
npm run compile
```

### 4. Deploy to Testnet
```bash
npm run deploy:testnet
```

### 5. Create First Round
```bash
# Edit scripts/create-round.js with your product details, then:
npm run create-round:testnet
```

### 6. Deploy Frontend Widget
Upload `frontend/widget.html` to your website and update the `CONFIG` object with:
- `contractEvmAddress` — from deployment output
- `contractId` — Hedera Contract ID (from mirror node: `https://testnet.mirrornode.hedera.com/api/v1/contracts/{evmAddress}`)
- `ticketPriceHbar`, `productName`, `productDesc`, `productEmoji`

## Contract Functions

### Admin (Owner Only)
| Function | Description |
|----------|-------------|
| `createRound(priceHbar, name, desc, imageUrl, durationSec)` | Create new lottery round |
| `requestRandomness()` | Request randomness from Hedera PRNG (step 1) |
| `drawWinner()` | Draw winner using PRNG output (step 2) |
| `setProtocolFee(bps, receiver)` | Update protocol fee |
| `emergencyWithdraw(to, amount)` | Recover stuck HBAR |

### User
| Function | Description |
|----------|-------------|
| `buyTicket()` | Buy ticket(s) with HBAR (payable) |

### View
| Function | Description |
|----------|-------------|
| `getCurrentRound()` | Current active round |
| `getRound(roundId)` | Round details |
| `getUserTickets(roundId, user)` | User's ticket IDs |
| `getParticipants(roundId)` | All participants |
| `getContractBalance()` | Contract HBAR balance |

## Draw Process (2 Steps)

1. **Request Randomness** (after round ends or manually):
   ```solidity
   lottery.requestRandomness()
   ```
   Calls Hedera PRNG System Contract `requestRandomBytes(32, 200000)`. Stores `requestId`.

2. **Draw Winner** (after PRNG is ready ~seconds):
   ```solidity
   lottery.drawWinner()
   ```
   Calls `getRandomBytes(requestId)`, computes `winner = participants[random % totalTickets]`.

## Frontend Widget

The widget (`frontend/widget.html`) is a standalone HTML file that:
- Detects HashPack, Blade, or MetaMask (Hedera-compatible)
- Shows product image, name, description, price
- Handles wallet connection and ticket purchase
- Displays transaction status with HashScan links

### Embedding
```html
<iframe src="widget.html" width="400" height="500" frameborder="0"></iframe>
```

Or host the file directly and configure via the `CONFIG` object at the top of the script.

## Network Info

| Network | Chain ID | RPC URL | Explorer |
|---------|----------|---------|----------|
| Testnet | 296 | https://testnet.hashio.io/api | https://hashscan.io/testnet |
| Mainnet | 295 | https://mainnet.hashio.io/api | https://hashscan.io/mainnet |

## Security

- **ReentrancyGuard** on all state-changing external calls
- **PRNG request/response pattern** prevents front-running
- **Owner-only** admin functions
- **No commit-reveal needed** — Hedera PRNG provides VRF-like output directly on-chain
- **Ticket IDs sequential** — winner selected via modulo on PRNG output

## Gas Estimates (Testnet)

| Operation | Gas | HBAR Cost (~$0.0001/gas) |
|-----------|-----|--------------------------|
| Deploy | ~2,500,000 | ~0.25 HBAR |
| Create Round | ~300,000 | ~0.03 HBAR |
| Buy Ticket (1) | ~150,000 | ~0.015 HBAR |
| Request Randomness | ~50,000 | ~0.005 HBAR |
| Draw Winner | ~100,000 | ~0.01 HBAR |

## License

MIT