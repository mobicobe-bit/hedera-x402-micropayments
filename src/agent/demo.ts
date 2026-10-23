/**
 * Hedera x402 Agent Demo — Shows Agent Kit integration for bounty submission
 * 
 * Run with: npx ts-node --esm src/agent/demo.ts
 */

import { HederaX402Agent, createAgentFromEnv } from "./hedera-x402-agent.js";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("=== Hedera x402 Agent Demo (Week 3: MCP or x402 Agent) ===\n");
  
  try {
    const agent = createAgentFromEnv();
    
    // Show available tools
    const tools = agent.getTools();
    console.log(`✓ Hedera Agent Kit initialized with ${tools.length} tools\n`);
    
    // Show x402 endpoints
    console.log("Fetching x402 API endpoints...");
    const endpoints = await agent.getX402Endpoints();
    console.log(`Found ${endpoints.length} x402-protected endpoints:\n`);
    endpoints.forEach((e, i) => {
      console.log(`  ${i + 1}. ${e.method} ${e.path}`);
      console.log(`     Price: ${e.price} ${e.currency}`);
      console.log(`     Description: ${e.description}`);
      console.log(`     Params: ${JSON.stringify(e.params)}`);
      console.log();
    });
    
    // Demo queries
    console.log("Running demo queries...\n");
    
    const queries = [
      "What can this agent do?",
      "How do I query token balances for account 0.0.1073622?",
      "Explain the MicroLottery contract integration",
    ];
    
    for (const query of queries) {
      console.log(`🤖 Query: "${query}"`);
      const response = await agent.runQuery(query);
      console.log(`📝 Response: ${response.substring(0, 300)}...\n`);
    }
    
    console.log("=== Demo Complete ===");
    console.log("\nThis agent demonstrates:");
    console.log("✅ Hedera Agent Kit (@hashgraph/hedera-agent-kit) as core dependency");
    console.log("✅ LangChain integration (@hashgraph/hedera-agent-kit-langchain)");
    console.log("✅ x402 API integration (7 endpoints, $0.001-$0.02/call)");
    console.log("✅ MicroLottery smart contract interaction (Hedera PRNG 0x16F)");
    console.log("✅ MCP server capability (@hashgraph/hedera-agent-kit-mcp)");
    console.log("\nReady for Hedera AI Agent Bounty Week 3 submission!");
    
  } catch (error) {
    console.error("Demo failed:", error);
    console.log("\nMake sure you have these environment variables set:");
    console.log("  OPERATOR_ID=0.0.XXXXXX");
    console.log("  OPERATOR_KEY=302e020100...");
    console.log("  OPENAI_API_KEY=sk-...");
    console.log("  HEDERA_NETWORK=testnet");
    console.log("  X402_API_URL=https://hedera-micropayments-api.mobicobe.workers.dev");
    console.log("  LOTTERY_CONTRACT_ADDRESS=0x0e1421ADC7089E9e537c86a4fa8bB07498164DfB");
    process.exit(1);
  }
}

main();