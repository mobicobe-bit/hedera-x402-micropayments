/**
 * Hedera Wallet Connect Integration (v1.5+)
 * 
 * Uses @hashgraph/hedera-wallet-connect DAppConnector
 * Supports: HashPack, Blade, and other WalletConnect v2 compatible wallets
 */

import { DAppConnector } from "@hashgraph/hedera-wallet-connect";
import { Client, AccountId, Transaction, LedgerId } from "@hashgraph/sdk";

export interface WalletConnection {
  accountId: string;
  publicKey: string;
  evmAddress?: string;
}

export type WalletType = "hashpack" | "blade" | "walletconnect";

/**
 * Detect available wallets in browser
 */
export function detectWallets(): WalletType[] {
  const wallets: WalletType[] = [];
  
  if (typeof window !== "undefined") {
    // Note: HashPack/Blade inject WalletConnect v2, not the old hashConnect
    // The DAppConnector handles WalletConnect v2 for all wallets
    wallets.push("walletconnect");
  }
  
  return wallets;
}

/**
 * Create and initialize DAppConnector for WalletConnect v2
 * This works with HashPack, Blade, and other WalletConnect v2 wallets
 */
export async function createDAppConnector(opts: {
  metadata: {
    name: string;
    description: string;
    icon: string;
    url?: string;
  };
  network?: "testnet" | "mainnet";
  projectId?: string; // WalletConnect project ID (get from cloud.walletconnect.com)
}): Promise<DAppConnector> {
  const network = opts.network === "mainnet" ? LedgerId.MAINNET : LedgerId.TESTNET;
  
  // Use provided projectId or a demo one (replace for production!)
  const projectId = opts.projectId || "a2f8b8e8c8b8e8c8b8e8c8b8e8c8b8e8"; // 32-char hex
  
  const connector = new DAppConnector(
    {
      name: opts.metadata.name,
      description: opts.metadata.description,
      url: opts.metadata.url || window.location.origin,
      icons: [opts.metadata.icon],
    },
    network,
    projectId,
    [
      "hedera_signTransaction",
      "hedera_signAndExecuteTransaction",
      "hedera_signMessage",
      "hedera_signAndExecuteQuery",
    ],
    [
      "hedera_accountsChanged",
      "hedera_chainChanged",
    ],
    [`hedera:${opts.network || "testnet"}`],
    "info"
  );
  
  await connector.init({ logger: "info" });
  
  return connector;
}

/**
 * Connect to wallet using QR code modal
 */
export async function connectWallet(
  connector: DAppConnector
): Promise<WalletConnection> {
  const session = await connector.openModal();
  
  if (!session.namespaces?.hedera?.accounts?.length) {
    throw new Error("No Hedera accounts in session");
  }
  
  // Get first account (format: hedera:testnet:0.0.12345)
  const accountStr = session.namespaces.hedera.accounts[0];
  const accountId = accountStr.split(":").pop() || accountStr;
  
  // Get public key from account (if available in session)
  const publicKey = session.namespaces.hedera.accounts[0].split(":")[3] || "";
  
  return {
    accountId,
    publicKey,
  };
}

/**
 * Sign and execute transaction via wallet
 * Returns transaction ID and receipt
 */
export async function signAndExecuteTransaction(
  connector: DAppConnector,
  opts: {
    accountId: string;
    transaction: Transaction | Transaction[];
  }
): Promise<{ transactionId: string; receipt: any }> {
  const signer = connector.getSigner(AccountId.fromString(opts.accountId));
  
  const transactions = Array.isArray(opts.transaction) ? opts.transaction : [opts.transaction];
  const transactionStrings = transactions.map(tx => 
    Buffer.from(tx.toBytes()).toString("base64")
  );
  
  const result = await connector.signAndExecuteTransaction({
    signerAccountId: `hedera:${connector.network.toString().toLowerCase()}:${opts.accountId}`,
    transactionList: transactionStrings.join(","),
  });
  
  // Result is JsonRpcResult<TransactionResponseJSON> - access via .result
  const txResponse = (result as any).result;
  
  return {
    transactionId: txResponse?.transactionId || "",
    receipt: txResponse || result,
  };
}

/**
 * Sign transaction only (don't execute)
 * Returns signed transaction
 */
export async function signTransaction(
  connector: DAppConnector,
  opts: {
    accountId: string;
    transaction: Transaction;
  }
): Promise<Transaction> {
  const result = await connector.signTransaction({
    signerAccountId: `hedera:${connector.network.toString().toLowerCase()}:${opts.accountId}`,
    transactionBody: opts.transaction,
  });
  
  return result as Transaction;
}

/**
 * Sign message via wallet
 */
export async function signMessage(
  connector: DAppConnector,
  opts: {
    accountId: string;
    message: string | Uint8Array;
  }
): Promise<Uint8Array> {
  const messageStr = typeof opts.message === "string" 
    ? opts.message 
    : Buffer.from(opts.message).toString("utf-8");
  
  const result = await connector.signMessage({
    signerAccountId: `hedera:${connector.network.toString().toLowerCase()}:${opts.accountId}`,
    message: messageStr,
  });
  
  // Result is JsonRpcResult<{ signatureMap: string }> - access via .result
  const signResult = (result as any).result;
  
  // signResult.signatureMap is base64 encoded signature map
  return new Uint8Array(Buffer.from(signResult?.signatureMap || "", "base64"));
}

/**
 * Execute transaction bytes directly (for pre-signed transactions from backend)
 */
export async function executeTransaction(
  connector: DAppConnector,
  signedTransactionBytes: Uint8Array
): Promise<{ transactionId: string; receipt: any }> {
  const transactionString = Buffer.from(signedTransactionBytes).toString("base64");
  
  const result = await connector.executeTransaction({
    transactionList: transactionString,
  });
  
  // Result is JsonRpcResult<TransactionResponseJSON> - access via .result
  const txResponse = (result as any).result;
  
  return {
    transactionId: txResponse?.transactionId || "",
    receipt: txResponse || result,
  };
}

/**
 * Disconnect wallet
 */
export async function disconnectWallet(connector: DAppConnector): Promise<void> {
  await connector.disconnectAll();
}

/**
 * Complete wallet + purchase integration class
 * Handles: connect → quote → sign HBAR transfer → backend mints tokens
 */
export class WalletPurchaseFlow {
  private connector: DAppConnector | null = null;
  private connection: WalletConnection | null = null;
  
  async initialize(opts: {
    metadata: { name: string; description: string; icon: string };
    network?: "testnet" | "mainnet";
    projectId?: string;
  }): Promise<void> {
    this.connector = await createDAppConnector(opts);
  }
  
  async connect(): Promise<WalletConnection> {
    if (!this.connector) throw new Error("Not initialized");
    this.connection = await connectWallet(this.connector);
    return this.connection;
  }
  
  async disconnect(): Promise<void> {
    if (this.connector) {
      await disconnectWallet(this.connector);
      this.connection = null;
    }
  }
  
  isConnected(): boolean {
    return this.connection !== null;
  }
  
  getAccountId(): string | null {
    return this.connection?.accountId ?? null;
  }
  
  /**
   * Execute purchase flow:
   * 1. Get quote from backend
   * 2. Build HBAR transfer transaction
   * 3. User signs via wallet
   * 4. Send to backend for submission + mint
   */
  async purchase(params: {
    tokenId: string;
    tokenAmount: number;
    pricePerTokenTinybars: number;
    treasuryId: string;
    backendUrl: string; // Your backend endpoint
  }): Promise<{ success: boolean; txId?: string; tokensReceived?: number; error?: string }> {
    if (!this.connector || !this.connection) {
      throw new Error("Wallet not connected");
    }
    
    const client = Client.forTestnet();
    const buyerId = AccountId.fromString(this.connection.accountId);
    const treasuryId = AccountId.fromString(params.treasuryId);
    const totalCost = params.tokenAmount * params.pricePerTokenTinybars;
    
    // 1. Build HBAR transfer (buyer -> treasury)
    const { TransferTransaction, Hbar } = await import("@hashgraph/sdk");
    const hbarTransfer = new TransferTransaction()
      .addHbarTransfer(buyerId, Hbar.fromTinybars(-totalCost))
      .addHbarTransfer(treasuryId, Hbar.fromTinybars(totalCost))
      .setNodeAccountIds([new AccountId(3)])
      .freezeWith(client);
    
    // 2. Sign via wallet
    const signedTx = await signTransaction(this.connector, {
      accountId: this.connection.accountId,
      transaction: hbarTransfer,
    });
    
    // 3. Send signed transaction + purchase params to backend
    const response = await fetch(`${params.backendUrl}/api/purchase`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        signedTransaction: Buffer.from(signedTx.toBytes()).toString("base64"),
        tokenId: params.tokenId,
        tokenAmount: params.tokenAmount,
        buyerAccountId: this.connection.accountId,
      }),
    });
    
    const result = await response.json() as { success: boolean; error?: string; mintTxId?: string; tokensReceived?: number };
    
    if (!result.success) {
      return { success: false, error: result.error };
    }
    
    return {
      success: true,
      txId: result.mintTxId,
      tokensReceived: result.tokensReceived,
    };
  }
}

/**
 * React hook example (add to your React project)
 * 
 * ```tsx
 * import { useState, useCallback } from "react";
 * import { WalletPurchaseFlow } from "./wallet";
 * 
 * export function useWalletPurchase() {
 *   const [flow] = useState(() => new WalletPurchaseFlow());
 *   const [connected, setConnected] = useState(false);
 *   const [accountId, setAccountId] = useState<string | null>(null);
 *   const [loading, setLoading] = useState(false);
 *   
 *   const init = useCallback(async () => {
 *     await flow.initialize({
 *       metadata: { name: "My App", description: "...", icon: "/icon.png" },
 *       network: "testnet",
 *     });
 *   }, [flow]);
 *   
 *   const connect = useCallback(async () => {
 *     const conn = await flow.connect();
 *     setAccountId(conn.accountId);
 *     setConnected(true);
 *   }, [flow]);
 *   
 *   const purchase = useCallback(async (params) => {
 *     setLoading(true);
 *     try {
 *       return await flow.purchase(params);
 *     } finally {
 *       setLoading(false);
 *     }
 *   }, [flow]);
 *   
 *   return { init, connect, purchase, connected, accountId, loading };
 * }
 * ```
 */

// Global singleton for non-React usage
let globalFlow: WalletPurchaseFlow | null = null;

export function getWalletPurchaseFlow(): WalletPurchaseFlow {
  if (!globalFlow) {
    globalFlow = new WalletPurchaseFlow();
  }
  return globalFlow;
}

// Browser exposure
if (typeof window !== "undefined") {
  (window as any).WalletPurchaseFlow = WalletPurchaseFlow;
  (window as any).getWalletPurchaseFlow = getWalletPurchaseFlow;
}