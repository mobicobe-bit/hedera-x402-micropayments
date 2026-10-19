import { useState, useCallback, useEffect, useRef } from "react";
import { DAppConnector } from "@hashgraph/hedera-wallet-connect";
import { Client, AccountId, Transaction } from "@hashgraph/sdk";

interface WalletConnection {
  accountId: string;
  publicKey: string;
}

interface PurchaseParams {
  tokenId: string;
  tokenAmount: number;
  pricePerTokenTinybars: number;
  treasuryId: string;
  backendUrl: string;
}

interface PurchaseResult {
  success: boolean;
  txId?: string;
  tokensReceived?: number;
  error?: string;
}

interface UseWalletPurchaseReturn {
  connected: boolean;
  connecting: boolean;
  accountId: string | null;
  balance: { tokenBalance: number; hbarBalance: number } | null;
  quote: { tokenAmount: number; hbarCost: number; feeBreakdown: any } | null;
  purchasing: boolean;
  error: string | null;
  clearError: () => void;
  initialize: () => Promise<void>;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  fetchQuote: (tokenAmount: number) => Promise<void>;
  purchase: (params: PurchaseParams) => Promise<PurchaseResult>;
}

/**
 * Frontend-only wallet integration using @hashgraph/hedera-wallet-connect
 * This runs entirely in the browser - no backend wallet code needed
 */
export function useWalletPurchase(): UseWalletPurchaseReturn {
  const connectorRef = useRef<DAppConnector | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [balance, setBalance] = useState<{ tokenBalance: number; hbarBalance: number } | null>(null);
  const [quote, setQuote] = useState<{ tokenAmount: number; hbarCost: number; feeBreakdown: any } | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const clearError = useCallback(() => setError(null), []);

  const initialize = useCallback(async () => {
    if (initialized) return;
    
    try {
      const { DAppConnector, LedgerId } = await import("@hashgraph/hedera-wallet-connect");
      
      const network = "testnet";
      const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "a2f8b8e8c8b8e8c8b8e8c8b8e8c8b8e8";
      
      const connector = new DAppConnector(
        {
          name: "Hedera Micropayments Demo",
          description: "Buy API credits with HBAR",
          url: window.location.origin,
          icons: ["https://hedera.com/favicon.ico"],
        },
        network === "mainnet" ? LedgerId.MAINNET : LedgerId.TESTNET,
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
        [`hedera:${network}`],
        "info"
      );
      
      await connector.init({ logger: "info" });
      connectorRef.current = connector;
      setInitialized(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to initialize wallet");
      throw err;
    }
  }, [initialized]);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    
    try {
      const connector = connectorRef.current;
      if (!connector) throw new Error("Not initialized");
      
      const session = await connector.openModal();
      
      if (!session.namespaces?.hedera?.accounts?.length) {
        throw new Error("No Hedera accounts in session");
      }
      
      const accountStr = session.namespaces.hedera.accounts[0];
      const acctId = accountStr.split(":").pop() || accountStr;
      
      setAccountId(acctId);
      setConnected(true);
      
      // Fetch initial balance
      await fetchBalance(acctId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect wallet");
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      const connector = connectorRef.current;
      if (connector) {
        await connector.disconnectAll();
      }
      setConnected(false);
      setAccountId(null);
      setBalance(null);
      setQuote(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disconnect");
    }
  }, []);

  const fetchBalance = useCallback(async (acctId: string) => {
    try {
      const tokenId = import.meta.env.VITE_TOKEN_ID || "0.0.123456";
      const response = await fetch(`/api/token/${tokenId}/balance/${acctId}`);
      if (response.ok) {
        const data = await response.json();
        setBalance({
          tokenBalance: data.tokenBalance,
          hbarBalance: data.hbarBalance,
        });
      }
    } catch (err) {
      console.error("Failed to fetch balance:", err);
    }
  }, []);

  const fetchQuote = useCallback(async (tokenAmount: number) => {
    try {
      const response = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenAmount }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setQuote(data);
      } else {
        throw new Error("Failed to fetch quote");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch quote");
    }
  }, []);

  const purchase = useCallback(async (params: PurchaseParams): Promise<PurchaseResult> => {
    setPurchasing(true);
    setError(null);
    
    try {
      const connector = connectorRef.current;
      if (!connector || !accountId) {
        throw new Error("Wallet not connected");
      }
      
      const client = Client.forTestnet();
      const buyerId = AccountId.fromString(accountId);
      const treasuryId = AccountId.fromString(params.treasuryId);
      const totalCost = params.tokenAmount * params.pricePerTokenTinybars;
      
      // Build HBAR transfer transaction
      const { TransferTransaction, Hbar } = await import("@hashgraph/sdk");
      const hbarTransfer = new TransferTransaction()
        .addHbarTransfer(buyerId, Hbar.fromTinybars(-totalCost))
        .addHbarTransfer(treasuryId, Hbar.fromTinybars(totalCost))
        .setNodeAccountIds([new AccountId(3)])
        .freezeWith(client);
      
      // Sign transaction via wallet
      const signResult = await connector.signTransaction({
        signerAccountId: `hedera:testnet:${accountId}`,
        transactionBody: hbarTransfer,
      });
      
      const signedTx = signResult as Transaction;
      const signedTxBytes = Buffer.from(signedTx.toBytes()).toString("base64");
      
      // Send to backend
      const backendUrl = params.backendUrl || ""; // Uses Vite proxy
      const response = await fetch(`${backendUrl}/api/purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signedTransaction: signedTxBytes,
          tokenId: params.tokenId,
          tokenAmount: params.tokenAmount,
          buyerAccountId: accountId,
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Refresh balance after successful purchase
        await fetchBalance(accountId);
      } else {
        setError(result.error || "Purchase failed");
      }
      
      return result;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Purchase failed";
      setError(errMsg);
      return { success: false, error: errMsg };
    } finally {
      setPurchasing(false);
    }
  }, [accountId, fetchBalance]);

  return {
    connected,
    connecting,
    accountId,
    balance,
    quote,
    purchasing,
    error,
    clearError,
    initialize,
    connect,
    disconnect,
    fetchQuote,
    purchase,
  };
}

// Polyfill for Buffer in browser
if (typeof window !== "undefined" && !window.Buffer) {
  import("buffer").then(({ Buffer }) => {
    window.Buffer = Buffer;
  });
}