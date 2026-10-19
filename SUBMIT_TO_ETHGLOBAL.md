# ETHGlobal Submission - Quick Setup Guide

## 1. Create GitHub Repository

```bash
# Go to https://github.com/new
# Repository name: hedera-x402-micropayments
# Description: x402-gated Hedera data APIs with 7 endpoints, revenue dashboard, and agent-ready payments
# Public repository
# Don't initialize with README (we have one)
```

## 2. Push Your Code

```bash
cd /mnt/c/Users/c/hedera-micropayments-starter
git remote add origin https://github.com/YOUR_USERNAME/hedera-x402-micropayments.git
git branch -M main
git push -u origin main
```

## 3. Record Demo Video (3 min max)

**Tools**: OBS Studio, Loom, or GitHub Codespaces + screen record

**Script** (3 minutes):
1. **0:00-0:30** - Landing page: `https://hedera-x402-landing.mobicobe.workers.dev`
2. **0:30-1:00** - Discovery: `curl https://hedera-micropayments-api.mobicobe.workers.dev/.well-known/x402.json`
3. **1:00-2:00** - Payment flow: Run `hedera-x402` client, show 402 → payment → data
4. **2:00-2:30** - Dashboard: `https://hedera-revenue-dashboard.mobicobe.workers.dev/dashboard`
4. **2:30-3:00** - Architecture summary

## 4. Submit to ETHGlobal

1. Go to ETHGlobal submission page for the Hedera prize
2. Fill in:
   - **Project Name**: Hedera x402 Micropayments API
   - **GitHub Repo**: `https://github.com/YOUR_USERNAME/hedera-x402-micropayments`
   - **Demo Video**: Upload or link (YouTube/Loom/Drive)
   - **Live Demo**: `https://hedera-micropayments-api.mobicobe.workers.dev`
   - **Prize**: Hedera - AI & Agentic Payments on Hedera
3. **Description**: Use `ETHGLOBAL_SUBMISSION.md` content
4. **Prize Criteria**: Explicitly check each:
   - ✅ Real x402-gated service on Hedera
   - ✅ Platform that consumes it (dashboard, clients, facilitator)
   - ✅ Agent discovers & pays without API key
   - ✅ Pay-per-call / metered data / agent marketplace

## 4. Verify Before Submit

```bash
# Test all live endpoints
curl https://hedera-micropayments-api.mobicobe.workers.dev/.well-known/x402.json
curl https://hedera-micropayments-api.mobicobe.workers.dev/health
open https://hedera-revenue-dashboard.mobicobe.workers.dev/dashboard
open https://hedera-x402-landing.mobicobe.workers.dev
```

## 5. Key Talking Points for Judges

1. **"Not a toy - 7 real endpoints on Hedera Mainnet with Coinbase facilitator"**
2. **"Revenue dashboard proves monetization - webhooks track every payment"**
3. **"Agent-ready: no API keys, pure x402 protocol, any x402 client works"**
3. **"Hedera advantages: USDC native, 3s finality, $0.0001 fees, Mirror Nodes"**
4. **"Extensible: adding SaucerSwap/HeliSwap/Bonzo endpoints is trivial"**
5. **"Testnet facilitator included for free development"**

---

## 🎯 **Submit Now**

Once GitHub repo is pushed and video recorded:
1. Submit at ETHGlobal Hedera prize page
2. Reference this guide for talking points
3. All live URLs are already working!