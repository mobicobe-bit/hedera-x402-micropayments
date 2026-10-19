/**
 * Wallet + Purchase Integration Demo
 * 
 * This demonstrates how to connect a wallet and execute a token purchase
 * Run in browser environment (not Node.js)
 */

import { WalletPurchaseFlow, getWalletPurchaseFlow } from "./wallet.ts";
import { Client, AccountId, PrivateKey, Hbar, TransferTransaction, TokenMintTransaction, TokenAssociateTransaction, TokenId } from "@hashgraph/sdk";

/**
 * Frontend purchase flow using connected wallet
 * 
 * This would run in a browser with HashPack/Blade/MetaMask installed
 */
export async function walletPurchaseFlow() {
  const flow = getWalletPurchaseFlow();
  
  // 1. Initialize with your app metadata
  await flow.initialize({
    metadata: {
      name: "My Hedera App",
      description: "Hedera micropayments demo",
      icon: "https://example.com/icon.png",
    },
    network: "testnet",
    projectId: "your-walletconnect-project-id", // Get from cloud.walletconnect.com
  });
  
  // 2. Connect wallet (shows QR code modal)
  console.log("Connecting wallet...");
  try {
    const connection = await flow.connect();
    console.log("Connected:", connection);
    
    // 3. Get purchase parameters (from your backend/API)
    const purchaseParams = await fetchPurchaseParams(connection.accountId);
    
    // 4. Show quote to user
    console.log("Purchase quote:", purchaseParams.quote);
    
    // 5. User confirms (in real app: UI confirmation)
    const confirmed = true; // await userConfirmation(purchaseParams.quote);
    
    if (!confirmed) {
      console.log("User cancelled");
      return;
    }
    
    // 6. Execute purchase
    const result = await flow.purchase({
      tokenId: purchaseParams.tokenId,
      tokenAmount: purchaseParams.tokenAmount,
      pricePerTokenTinybars: purchaseParams.pricePerTokenTinybars,
      treasuryId: purchaseParams.treasuryId,
      backendUrl: "https://your-backend.example.com", // Your backend
    });
    
    if (result.success) {
      console.log("✅ Purchase successful!", result);
      // Update UI, show tokens in wallet, etc.
    } else {
      console.error("❌ Purchase failed:", result.error);
    }
    
  } catch (error) {
    console.error("Wallet connection failed:", error);
  }
}

/**
 * Fetch purchase parameters from your backend
 */
async function fetchPurchaseParams(buyerAccountId: string) {
  // In real app: call your backend API
  // Backend knows: token ID, price, treasury account, etc.
  
  return {
    tokenId: "0.0.123456", // Your APIC token ID
    tokenAmount: 100,
    pricePerTokenTinybars: 1000,
    treasuryId: "0.0.789012", // Your treasury
    operatorId: "0.0.345678", // Your operator (holds supply key)
    quote: {
      tokenAmount: 100,
      hbarCost: 100_000_000, // 100 tokens * 1000 tinybars + network fee
      feeBreakdown: {
        tokenPrice: 1000,
        networkFee: 5_000_000,
      },
    },
  };
}

/**
 * React component example (if using React)
 * 
 * ```tsx
 * import { useState, useEffect } from "react";
 * import { getWalletManager } from "./wallet";
 * 
 * export function PurchaseButton() {
 *   const [wallet, setWallet] = useState<string | null>(null);
 *   const [accountId, setAccountId] = useState<string | null>(null);
 *   const [buying, setBuying] = useState(false);
 *   
 *   const walletManager = getWalletManager();
 *   
 *   useEffect(() => {
 *     setWallet(walletManager.getAvailableWallets()[0] || null);
 *   }, []);
 *   
 *   const handleConnect = async () => {
 *     if (!wallet) return;
 *     const connection = await walletManager.connect(wallet as any);
 *     setAccountId(connection.accountId);
 *   };
 *   
 *   const handlePurchase = async () => {
 *     setBuying(true);
 *     try {
 *       const params = await fetchPurchaseParams(accountId!);
 *       const result = await executeWalletPurchase(walletManager, accountId!, params);
 *       alert(result.success ? "Success!" : `Failed: ${result.error}`);
 *     } finally {
 *       setBuying(false);
 *     }
 *   };
 *   
 *   return (
 *     <div>
 *       {accountId ? (
 *         <button onClick={handlePurchase} disabled={buying}>
 *           {buying ? "Buying..." : "Buy 100 APIC"}
 *         </button>
 *       ) : (
 *         <button onClick={handleConnect}>
 *           Connect {wallet}
 *         </button>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */

// Export for browser usage
if (typeof window !== "undefined") {
  (window as any).walletPurchaseFlow = walletPurchaseFlow;
  (window as any).getWalletPurchaseFlow = getWalletPurchaseFlow;
}