/**
 * Hedera x402 MCP Server — Model Context Protocol server for x402 API & MicroLottery
 * 
 * This MCP server exposes tools for:
 * - Querying x402-protected API endpoints
 * - Interacting with MicroLottery smart contract
 * - Executing Hedera transactions via Agent Kit
 * 
 * Run with: npx ts-node --esm src/agent/mcp-server.ts
 * Or build and run: npm run build && node dist/agent/mcp-server.js
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { HederaMCPToolkit } from "@hashgraph/hedera-agent-kit-mcp";
import { Configuration, AgentMode } from "@hashgraph/hedera-agent-kit";
import { allCorePlugins } from "@hashgraph/hedera-agent-kit/plugins";
import { 
  Client, 
  PrivateKey, 
  AccountId, 
  ContractExecuteTransaction, 
  ContractCallQuery, 
  Hbar,
  ContractFunctionParameters,
  TransactionReceipt
} from "@hiero-ledger/sdk";
import * as dotenv from "dotenv";

dotenv.config();

interface MCPConfig {
  operatorId: string;
  operatorKey: string;
  network: "testnet" | "mainnet";
  x402ApiUrl: string;
  lotteryContractAddress: string;
}

function getConfig(): MCPConfig {
  const config: MCPConfig = {
    operatorId: process.env.OPERATOR_ID || "",
    operatorKey: process.env.OPERATOR_KEY || "",
    network: (process.env.HEDERA_NETWORK as "testnet" | "mainnet") || "testnet",
    x402ApiUrl: process.env.X402_API_URL || "https://hedera-micropayments-api.mobicobe.workers.dev",
    lotteryContractAddress: process.env.LOTTERY_CONTRACT_ADDRESS || "0x0e1421ADC7089E9e537c86a4fa8bB07498164DfB",
  };

  if (!config.operatorId || !config.operatorKey) {
    throw new Error("Missing required environment variables: OPERATOR_ID, OPERATOR_KEY");
  }

  return config;
}

// Initialize Hedera client
const config = getConfig();
const client = Client.forName(config.network);
client.setOperator(config.operatorId, PrivateKey.fromStringDer(config.operatorKey));

// Create Agent Kit configuration with all core plugins
const agentConfig: Configuration = {
  context: { mode: AgentMode.AUTONOMOUS } as any,
  plugins: allCorePlugins,
};

// Create MCP server using Hedera MCP Toolkit
const hederaMCPToolkit = new HederaMCPToolkit({
  client,
  configuration: agentConfig,
});

const server = hederaMCPToolkit as any; // Cast to access McpServer methods

// Helper to get transaction ID from receipt
function getTransactionId(receipt: TransactionReceipt): string {
  return (receipt as any).transactionId?.toString() || "unknown";
}

// ============================================================
// x402 API Tools
// ============================================================

server.tool(
  "x402_discover_endpoints",
  "Discover all x402-protected API endpoints with pricing and details",
  {},
  async () => {
    try {
      const response = await fetch(`${config.x402ApiUrl}/.well-known/x402.json`);
      if (!response.ok) {
        throw new Error(`Failed to fetch x402 discovery: ${response.status}`);
      }
      const data = await response.json();
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : "Unknown error"}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "x402_get_token_balances",
  "Get token balances for a Hedera account (requires x402 payment: $0.001 USDC)",
  {
    accountId: z.string().describe("Hedera account ID (e.g., 0.0.1073622)"),
  },
  async ({ accountId }: { accountId: string }) => {
    try {
      const url = `${config.x402ApiUrl}/api/v1/token/balances?accountId=${accountId}`;
      const response = await fetch(url);
      
      if (response.status === 402) {
        const paymentDetails = await response.json();
        return {
          content: [{
            type: "text",
            text: `Payment required (x402): ${JSON.stringify(paymentDetails, null, 2)}\n\nThis endpoint costs $0.001 USDC. Use an x402 client (like the x402 CLI or a compatible wallet) to pay automatically.`
          }],
        };
      }
      
      const data = await response.json();
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : "Unknown error"}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "x402_get_token_analytics",
  "Get token analytics (holders, velocity, top holders) (requires x402 payment: $0.005 USDC)",
  {
    tokenId: z.string().describe("Hedera token ID (e.g., 0.0.789012)"),
  },
  async ({ tokenId }: { tokenId: string }) => {
    try {
      const url = `${config.x402ApiUrl}/api/v1/token/analytics/${tokenId}`;
      const response = await fetch(url);
      
      if (response.status === 402) {
        const paymentDetails = await response.json();
        return {
          content: [{
            type: "text",
            text: `Payment required (x402): ${JSON.stringify(paymentDetails, null, 2)}\n\nThis endpoint costs $0.005 USDC.`
          }],
        };
      }
      
      const data = await response.json();
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : "Unknown error"}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "x402_screen_compliance",
  "Screen a Hedera account for compliance/KYC/AML (requires x402 payment: $0.02 USDC)",
  {
    accountId: z.string().describe("Hedera account ID (e.g., 0.0.123456)"),
  },
  async ({ accountId }: { accountId: string }) => {
    try {
      const url = `${config.x402ApiUrl}/api/v1/compliance/screen/${accountId}`;
      const response = await fetch(url);
      
      if (response.status === 402) {
        const paymentDetails = await response.json();
        return {
          content: [{
            type: "text",
            text: `Payment required (x402): ${JSON.stringify(paymentDetails, null, 2)}\n\nThis endpoint costs $0.02 USDC.`
          }],
        };
      }
      
      const data = await response.json();
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : "Unknown error"}` }],
        isError: true,
      };
    }
  }
);

// ============================================================
// MicroLottery Tools
// ============================================================

server.tool(
  "lottery_create_round",
  "Create a new MicroLottery round",
  {
    ticketPriceHbar: z.number().describe("Ticket price in HBAR (e.g., 10)"),
    maxTickets: z.number().describe("Maximum number of tickets (e.g., 100)"),
    prizeDescription: z.string().describe("Description of the prize"),
  },
  async ({ ticketPriceHbar, maxTickets, prizeDescription }: { 
    ticketPriceHbar: number; 
    maxTickets: number; 
    prizeDescription: string 
  }) => {
    try {
      const ticketPriceTinybars = Math.floor(ticketPriceHbar * 100_000_000);
      
      const params = new ContractFunctionParameters()
        .addUint256(ticketPriceTinybars)
        .addUint256(maxTickets)
        .addString(prizeDescription)
        .addUint256(604800); // 1 week duration in seconds
      
      const tx = new ContractExecuteTransaction()
        .setContractId(config.lotteryContractAddress)
        .setGas(500_000)
        .setFunction("createRound", params)
        .setPayableAmount(Hbar.fromTinybars(ticketPriceTinybars));

      const response = await tx.execute(client);
      const receipt = await response.getReceipt(client);
      
      return {
        content: [{
          type: "text",
          text: `Lottery round created!\nTransaction: ${getTransactionId(receipt)}\nStatus: ${receipt.status.toString()}\nTicket Price: ${ticketPriceHbar} HBAR\nMax Tickets: ${maxTickets}\nPrize: ${prizeDescription}`
        }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error creating round: ${error instanceof Error ? error.message : "Unknown error"}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "lottery_buy_tickets",
  "Buy tickets for a lottery round",
  {
    roundId: z.number().describe("Lottery round ID"),
    ticketCount: z.number().describe("Number of tickets to buy"),
  },
  async ({ roundId, ticketCount }: { roundId: number; ticketCount: number }) => {
    try {
      const query = new ContractCallQuery()
        .setContractId(config.lotteryContractAddress)
        .setGas(100_000)
        .setFunction("getRound", new ContractFunctionParameters().addUint256(roundId));
      
      const result = await query.execute(client);
      // getRound returns: (uint256 ticketPrice, uint256 maxTickets, string prizeDescription, uint256 duration, uint256 startTime, uint256 endTime, bool isActive, uint256 ticketsSold)
      const round = result.getResult(["uint256", "uint256", "string", "uint256", "uint256", "uint256", "bool", "uint256"]);
      const ticketPrice = Number(round[0]);
      
      const totalPrice = ticketPrice * ticketCount;
      
      const tx = new ContractExecuteTransaction()
        .setContractId(config.lotteryContractAddress)
        .setGas(300_000)
        .setFunction("buyTickets", new ContractFunctionParameters().addUint256(roundId).addUint256(ticketCount))
        .setPayableAmount(Hbar.fromTinybars(totalPrice));

      const response = await tx.execute(client);
      const receipt = await response.getReceipt(client);
      
      return {
        content: [{
          type: "text",
          text: `Tickets purchased!\nTransaction: ${getTransactionId(receipt)}\nRound: ${roundId}\nTickets: ${ticketCount}\nTotal: ${totalPrice / 100_000_000} HBAR`
        }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error buying tickets: ${error instanceof Error ? error.message : "Unknown error"}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "lottery_draw_winner",
  "Draw winner for a lottery round using Hedera PRNG (0x16F)",
  {
    roundId: z.number().describe("Lottery round ID"),
  },
  async ({ roundId }: { roundId: number }) => {
    try {
      const tx = new ContractExecuteTransaction()
        .setContractId(config.lotteryContractAddress)
        .setGas(500_000)
        .setFunction("drawWinner", new ContractFunctionParameters().addUint256(roundId));

      const response = await tx.execute(client);
      const receipt = await response.getReceipt(client);
      
      return {
        content: [{
          type: "text",
          text: `Winner drawn!\nTransaction: ${getTransactionId(receipt)}\nRound: ${roundId}\nRandomness: Hedera PRNG (System Contract 0x16F)\nCheck transaction logs for winner address.`
        }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error drawing winner: ${error instanceof Error ? error.message : "Unknown error"}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "lottery_get_round_info",
  "Get information about a lottery round",
  {
    roundId: z.number().describe("Lottery round ID"),
  },
  async ({ roundId }: { roundId: number }) => {
    try {
      const query = new ContractCallQuery()
        .setContractId(config.lotteryContractAddress)
        .setGas(100_000)
        .setFunction("getRound", new ContractFunctionParameters().addUint256(roundId));
      
      const result = await query.execute(client);
      // getRound returns: (uint256 ticketPrice, uint256 maxTickets, string prizeDescription, uint256 duration, uint256 startTime, uint256 endTime, bool isActive, uint256 ticketsSold)
      const round = result.getResult(["uint256", "uint256", "string", "uint256", "uint256", "uint256", "bool", "uint256"]);
      
      return {
        content: [{
          type: "text",
          text: `Round ${roundId} Info:\n${JSON.stringify(round, null, 2)}`
        }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error getting round info: ${error instanceof Error ? error.message : "Unknown error"}` }],
        isError: true,
      };
    }
  }
);

// ============================================================
// Hedera Agent Kit Tools (expose core capabilities)
// ============================================================

server.tool(
  "hedera_get_balance",
  "Get HBAR and token balances for an account",
  {
    accountId: z.string().describe("Hedera account ID (e.g., 0.0.1073622)"),
  },
  async ({ accountId }: { accountId: string }) => {
    try {
      const { AccountBalanceQuery } = await import("@hiero-ledger/sdk");
      const query = new AccountBalanceQuery().setAccountId(accountId);
      const balance = await query.execute(client);
      
      return {
        content: [{
          type: "text",
          text: `Balances for ${accountId}:\nHBAR: ${balance.hbars.toString()}\nTokens: ${JSON.stringify(balance.tokens._map, null, 2)}`
        }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : "Unknown error"}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "hedera_transfer_hbar",
  "Transfer HBAR to another account",
  {
    toAccountId: z.string().describe("Recipient account ID"),
    amountHbar: z.number().describe("Amount in HBAR"),
  },
  async ({ toAccountId, amountHbar }: { toAccountId: string; amountHbar: number }) => {
    try {
      const { TransferTransaction, Hbar } = await import("@hiero-ledger/sdk");
      const tx = new TransferTransaction()
        .addHbarTransfer(config.operatorId, -amountHbar)
        .addHbarTransfer(toAccountId, amountHbar);
      
      const response = await tx.execute(client);
      const receipt = await response.getReceipt(client);
      
      return {
        content: [{
          type: "text",
          text: `Transfer complete!\nTransaction: ${getTransactionId(receipt)}\nFrom: ${config.operatorId}\nTo: ${toAccountId}\nAmount: ${amountHbar} HBAR`
        }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : "Unknown error"}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "hedera_create_token",
  "Create a new Hedera token (HTS)",
  {
    name: z.string().describe("Token name"),
    symbol: z.string().describe("Token symbol"),
    decimals: z.number().default(0).describe("Decimals (0 for NFT, >0 for fungible)"),
    initialSupply: z.number().default(0).describe("Initial supply"),
    treasuryAccountId: z.string().optional().describe("Treasury account (defaults to operator)"),
  },
  async ({ name, symbol, decimals, initialSupply, treasuryAccountId }: { 
    name: string; 
    symbol: string; 
    decimals: number; 
    initialSupply: number; 
    treasuryAccountId?: string 
  }) => {
    try {
      const { TokenCreateTransaction, TokenType, TokenSupplyType, AccountId } = await import("@hiero-ledger/sdk");
      
      const tx = new TokenCreateTransaction()
        .setTokenName(name)
        .setTokenSymbol(symbol)
        .setTokenType(decimals === 0 ? TokenType.NonFungibleUnique : TokenType.FungibleCommon)
        .setDecimals(decimals)
        .setInitialSupply(initialSupply)
        .setTreasuryAccountId(treasuryAccountId || config.operatorId)
        .setSupplyType(TokenSupplyType.Infinite)
        .setSupplyKey(PrivateKey.fromStringDer(config.operatorKey));
      
      const response = await tx.execute(client);
      const receipt = await response.getReceipt(client);
      const tokenId = receipt.tokenId;
      
      return {
        content: [{
          type: "text",
          text: `Token created!\nTransaction: ${getTransactionId(receipt)}\nToken ID: ${tokenId?.toString()}\nName: ${name}\nSymbol: ${symbol}\nDecimals: ${decimals}`
        }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : "Unknown error"}` }],
        isError: true,
      };
    }
  }
);

// ============================================================
// Start server
// ============================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Hedera x402 MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});