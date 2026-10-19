# Contributing to Crypto Micropayments Starter

## Goal
This project aims to onboard developers to the Hedera ecosystem through two use cases:
1. **x402 Micropayments API** — Pay-per-request data APIs using HTTP 402
2. **MicroLottery** — Hedera-native lottery with product prizes

## How to Contribute

### Bug Reports
- Use the Github Issues template
- Include Hedera network version (testnet/mainnet)
- Include node version and SDK version

### Feature Requests
- Discuss new ideas in Discussions tab
- Align with project roadmap (testnet → mainnet → SaaS)
- Consider gas fees and user experience on Hedera

### Code Contributions
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add some amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Setup

#### Prerequisites
- Node.js v18 or higher
- npm or yarn
- Hedera testnet account (get HBAR from faucet: https://faucet.hedera.com/)
- Git

#### Local Setup
```bash
# 1. Clone the repository
git clone https://github.com/your-username/crypto-micropayments-starter.git
cd crypto-micropayments-starter

# 2. Install dependencies
npm install

# 3. Build the project
npm run build

# 4. Start the dashboard
npm run dev:dashboard

# 5. Test the lottery
cd lottery-contract
npm install  # if needed
node scripts/buy-ticket.js

# 6. Test x402 API
node test-x402-client-final.js
```

#### Coding Standards
- Use TypeScript for all new code
- Follow existing code style in the repository
- Add JSDoc comments for public functions
- Include error handling for Hedera SDK calls
- Test on Hedera testnet before mainnet

#### Adding New Endpoints to x402 API
1. Edit `src/config/x402.ts` to add pricing
2. Edit `src/server.ts` to add handler logic
3. Edit `src/dashboard.ts` to add chart/tables
4. Test: `node test-x402-client-final.js`
5. Update documentation in `docs/`

### Deploying to Mainnet
1. Update `.env` with mainnet credentials
2. Run: `npx hardhat run scripts/deploy.js --network hederaMainnet`
3. Update contract address in all files
4. Test: `node scripts/buy-ticket.js` (with mainnet funds)
5. Update dashboard environment variables

### Adding New Scripts
1. Create script in `lottery-contract/scripts/`
2. Follow existing pattern (import hre, get signers, interact with contract)
3. Test on testnet first
4. Document in README.md
5. Add to CONTRIBUTING.md

## Project Structure
```
crypto-micropayments-starter/
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── README.md             # Project overview and quickstart
├── .env.example          # Environment variables (copy to .env)
├── .env                 # Your Hedera credentials
├── src/                 # TypeScript source code
│   ├── dashboard.ts     # Revenue dashboard API + UI
│   ├── server.ts        # x402 API server
│   ├── config/          # Configuration files
│   ├── routes/          # API route handlers
│   ├── demo.ts          # Demo script
│   └── demo-purchase.ts # Token purchase demo
├── lottery-contract/    # MicroLottery Hardhat project
│   ├── hardhat.config.js
│   ├── package.json
│   ├── scripts/         # deploy, create-round, buy-ticket, draw-winner
│   ├── contracts/       # Solidity source
│   └── test/            # Test files
├── data/                # Generated revenue data
├── docs/                # Documentation
│   ├── grant_application.md
│   └── api_reference.md
├── CONTRIBUTING.md      # This file
└── GRANT_APPLICATION_OUTLINE.md  # Grant application outline
```

## Grant Application Support

This project is structured to be **grant-ready**. Key features reviewers look for:

- ✅ **Proof of Concept**: Working testnet deployment with all scripts functional
- ✅ **Open Source**: MIT license, public repository, full code history
- ✅ **Technical Excellence**: TypeScript, proper error handling, Hedera SDK usage
- ✅ **Ecosystem Growth**: Combines two Hedera use cases (x402 + MicroLottery)
- ✅ **Scalable Architecture**: Testnet → Mainnet → SaaS roadmap
- ✅ **Documentation**: README, CONTRIBUTING, GRANT_APPLICATION_OUTLINE
- ✅ **Community Features**: Dashboard UI, easy onboarding via testnet faucet

## Questions & Support

- **GitHub Issues**: Use for bug reports and feature requests
- **Discord**: Join Hedera Developer Discord for community help
- **Email**: (project maintainer contact)
- **Read the Docs**: See `docs/` folder for detailed guides

## Thank You
Contributors help advance Hedera adoption and developer experience. Every contribution, whether a bug fix, documentation improvement, or new feature, helps the ecosystem grow.

---
*Last updated: `date`*
