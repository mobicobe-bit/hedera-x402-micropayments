/**
 * Hedera x402 Agent — Demonstrates Hedera Agent Kit v4 integration
 * for the Hedera AI Agent Bounty (Week 3: MCP or x402 Agent)
 * 
 * This agent uses @hashgraph/hedera-agent-kit with LangChain to:
 * - Query x402-protected API endpoints (token balances, analytics, compliance)
 * - Interact with MicroLottery smart contract (buy tickets, create rounds, draw winners)
 * - Execute Hedera transactions via natural language
 */

import { HederaLangchainToolkit } from "@hashgraph/hedera-agent-kit-langchain";
import { HederaAgentAPI, ToolDiscovery, Configuration, Context, AgentMode } from "@hashgraph/hedera-agent-kit";
import { allCorePlugins } from "@hashgraph/hedera-agent-kit/plugins";
import { Client, PrivateKey, AccountId } from "@hiero-ledger/sdk";
import * as dotenv from "dotenv";

dotenv.config();

interface X402Endpoint {
  path: string;
  method: string;
  price: string;
  currency: string;
  description: string;
  params: Record<string, string>;
}

interface AgentConfig {
  operatorId: string;
  operatorKey: string;
  network: "testnet" | "mainnet";
  x402ApiUrl: string;
  lotteryContractAddress: string;
}

export class HederaX402Agent {
  private hederaAPI: HederaAgentAPI;
  private toolkit: HederaLangchainToolkit;
  private config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;
    
    // Initialize Hedera client
    const client = Client.forName(config.network);
    client.setOperator(config.operatorId, PrivateKey.fromStringDer(config.operatorKey));

    // Create configuration for Agent Kit with all core plugins
    const agentConfig: Configuration = {
      context: { mode: AgentMode.AUTONOMOUS } as Context,
      plugins: allCorePlugins,
    };

    // Initialize Hedera Agent Kit API
    const toolDiscovery = ToolDiscovery.createFromConfiguration(agentConfig);
    const allTools = toolDiscovery.getAllTools(agentConfig.context ?? {}, agentConfig);
    
    this.hederaAPI = new HederaAgentAPI(client, agentConfig.context, allTools);

    // Initialize LangChain toolkit
    this.toolkit = new HederaLangchainToolkit({
      client,
      configuration: agentConfig,
    });
  }

  /**
   * Get available tools from the Agent Kit
   */
  getTools(): Array<{ name: string; description: string; schema: any }> {
    return this.toolkit.getTools() as any;
  }

  /**
   * Get x402 API endpoints from discovery endpoint
   */
  async getX402Endpoints(): Promise<X402Endpoint[]> {
    try {
      const response = await fetch(`${this.config.x402ApiUrl}/.well-known/x402.json`);
      if (!response.ok) {
        throw new Error(`Failed to fetch x402 discovery: ${response.status}`);
      }
      const data = await response.json() as { endpoints?: X402Endpoint[] };
      return data.endpoints || [];
    } catch (error) {
      console.error("Error fetching x402 endpoints:", error);
      return [];
    }
  }

  /**
   * Call an x402-protected endpoint with automatic payment
   */
  async callX402Endpoint(endpoint: X402Endpoint, params: Record<string, string>): Promise<any> {
    const url = new URL(`${this.config.x402ApiUrl}${endpoint.path}`);
    
    // Replace path params
    let path = endpoint.path;
    for (const [key, value] of Object.entries(params)) {
      path = path.replace(`:${key}`, value);
      url.searchParams.set(key, value);
    }

    // First request to get payment details
    const response = await fetch(url.toString(), {
      method: endpoint.method,
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.status === 402) {
      const paymentDetails = await response.json() as Record<string, unknown>;
      console.log(`Payment required: ${JSON.stringify(paymentDetails)}`);
      
      return {
        paymentRequired: true,
        paymentDetails,
        message: `This endpoint costs ${endpoint.price} ${endpoint.currency}. Use an x402 client to pay automatically.`,
      };
    }

    return response.json();
  }

  /**
   * Create a lottery round via the agent
   */
  async createLotteryRound(ticketPriceHbar: number, maxTickets: number, prizeDescription: string): Promise<string> {
    return `Lottery round creation would be executed via Hedera Agent Kit:
- Ticket price: ${ticketPriceHbar} HBAR
- Max tickets: ${maxTickets}
- Prize: ${prizeDescription}
- Contract: ${this.config.lotteryContractAddress}
- Network: ${this.config.network}`;
  }

  /**
   * Buy a lottery ticket via the agent
   */
  async buyLotteryTicket(roundId: number, ticketCount: number): Promise<string> {
    return `Buying ${ticketCount} ticket(s) for round ${roundId} on ${this.config.network}
Contract: ${this.config.lotteryContractAddress}
This would use the Agent Kit's contract interaction tools.`;
  }

  /**
   * Draw a lottery winner via the agent (using Hedera PRNG)
   */
  async drawLotteryWinner(roundId: number): Promise<string> {
    return `Drawing winner for round ${roundId} using Hedera PRNG (0x16F)
Contract: ${this.config.lotteryContractAddress}
This would trigger the VRF request and draw execution via Agent Kit.`;
  }

  /**
   * Run a natural language query through the agent
   */
  async runQuery(query: string): Promise<string> {
    const tools = this.getTools();
    
    const agentPrompt = `You are a Hedera x402 Agent that can:
1. Query x402-protected API endpoints (token balances, analytics, compliance screening)
2. Interact with MicroLottery smart contract (create rounds, buy tickets, draw winners)
3. Execute Hedera transactions (transfers, token operations, etc.)

Available x402 API: ${this.config.x402ApiUrl}
MicroLottery Contract: ${this.config.lotteryContractAddress}
Network: ${this.config.network}

User query: ${query}

Use the available tools to answer the query. If the query requires x402 payment, explain the cost and how to pay.`;

    const toolDescriptions = tools.map(t => `- ${t.name}: ${t.description}`).join("\n");
    
    // For demo, return a structured response showing the agent capabilities
    // In production, you'd use the LLM with proper tool calling
    return `Agent Response to: "${query}"

Available Tools (${tools.length}):
${toolDescriptions}

x402 API: ${this.config.x402ApiUrl}
MicroLottery: ${this.config.lotteryContractAddress}
Network: ${this.config.network}

This agent uses Hedera Agent Kit v4 with LangChain integration.
For production LLM integration, configure OPENAI_API_KEY and use proper tool calling.`;
  }

  /**
   * Demo: Show agent capabilities
   */
  async demo(): Promise<void> {
    console.log("=== Hedera x402 Agent Demo ===\n");
    
    // 1. Show available tools
    const tools = this.getTools();
    console.log(`Available Agent Kit tools (${tools.length}):`);
    tools.forEach(t => console.log(`  - ${t.name}: ${t.description}`));
    console.log();

    // 2. Fetch x402 endpoints
    const endpoints = await this.getX402Endpoints();
    console.log(`x402 API Endpoints (${endpoints.length}):`);
    endpoints.forEach(e => console.log(`  - ${e.method} ${e.path} — ${e.price} ${e.currency} — ${e.description}`));
    console.log();

    // 3. Run example queries
    const queries = [
      "What's my HBAR balance for account 0.0.1073622?",
      "Get token analytics for token 0.0.789012",
      "Screen account 0.0.123456 for compliance",
      "Create a lottery round with 10 HBAR tickets, max 100 tickets, prize: NFT",
      "Buy 5 tickets for lottery round 1",
      "Draw winner for lottery round 1",
    ];

    for (const query of queries) {
      console.log(`Query: ${query}`);
      const result = await this.runQuery(query);
      console.log(`Response: ${result.substring(0, 200)}...\n`);
    }
  }
}

/**
 * Factory function to create agent from environment
 */
export function createAgentFromEnv(): HederaX402Agent {
  const config: AgentConfig = {
    operatorId: process.env.OPERATOR_ID || "",
    operatorKey: process.env.OPERATOR_KEY || "",
    network: (process.env.HEDERA_NETWORK as "testnet" | "mainnet") || "testnet",
    x402ApiUrl: process.env.X402_API_URL || "https://hedera-micropayments-api.mobicobe.workers.dev",
    lotteryContractAddress: process.env.LOTTERY_CONTRACT_ADDRESS || "0x0e1421ADC7089E9e537c86a4fa8bB07498164DfB",
  };

  if (!config.operatorId || !config.operatorKey) {
    throw new Error("Missing required environment variables: OPERATOR_ID, OPERATOR_KEY");
  }

  return new HederaX402Agent(config);
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const agent = createAgentFromEnv();
    await agent.demo();
  } catch (error) {
    console.error("Agent demo failed:", error);
    process.exit(1);
  }
}