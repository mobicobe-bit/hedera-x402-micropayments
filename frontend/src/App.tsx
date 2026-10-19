import { useState, useEffect } from "react";
import { useWalletPurchase } from "./useWalletPurchase";

const DEFAULT_TOKEN_ID = "0.0.123456";
const DEFAULT_TREASURY_ID = "0.0.789012";
const DEFAULT_PRICE = 1000;
const DEFAULT_AMOUNT = 100;

function formatTinybars(tinybars: number) {
  const hbar = tinybars / 100_000_000;
  return hbar < 0.0001 ? `${tinybars.toLocaleString()} tinybars` : `${hbar.toFixed(8)} HBAR`;
}

function formatAccountId(id: string) {
  return `${id.slice(0, 8)}...${id.slice(-4)}`;
}

export default function App() {
  const {
    connected,
    connecting,
    accountId,
    balance,
    quote,
    purchasing,
    error,
    initialize,
    connect,
    disconnect,
    fetchQuote,
    purchase,
  } = useWalletPurchase();

  const [tokenAmount, setTokenAmount] = useState(DEFAULT_AMOUNT);
  const [showToast, setShowToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Initialize on mount
  useEffect(() => {
    initialize().catch(() => {});
  }, [initialize]);

  // Fetch quote when token amount changes
  useEffect(() => {
    if (connected) {
      fetchQuote(tokenAmount);
    }
  }, [connected, tokenAmount, fetchQuote]);

  // Show error toast
  useEffect(() => {
    if (error && !showToast) {
      setShowToast({ message: error, type: "error" });
    }
  }, [error, showToast]);

  const handleConnect = async () => {
    await connect();
  };

  const handlePurchase = async () => {
    const result = await purchase({
      tokenId: DEFAULT_TOKEN_ID,
      tokenAmount,
      pricePerTokenTinybars: DEFAULT_PRICE,
      treasuryId: DEFAULT_TREASURY_ID,
      backendUrl: "", // Uses proxy via Vite config
    });

    if (result.success) {
      setShowToast({ message: `Successfully purchased ${result.tokensReceived} tokens!`, type: "success" });
    } else {
      setShowToast({ message: result.error || "Purchase failed", type: "error" });
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
    setShowToast({ message: "Disconnected", type: "info" });
  };

  return (
    <div className="app">
      <header>
        <h1>Hedera Micropayments</h1>
        <p className="subtitle">Buy API Credits (APIC) with HBAR</p>
      </header>

      {!connected ? (
        <ConnectCard onConnect={handleConnect} connecting={connecting} />
      ) : (
        <>
          <AccountCard
            accountId={accountId!}
            balance={balance}
            onDisconnect={handleDisconnect}
            formatTinybars={formatTinybars}
            formatAccountId={formatAccountId}
          />
          <PurchaseCard
            tokenAmount={tokenAmount}
            setTokenAmount={setTokenAmount}
            quote={quote}
            purchasing={purchasing}
            onPurchase={handlePurchase}
            disabled={!connected || purchasing}
            formatTinybars={formatTinybars}
          />
        </>
      )}

      {showToast && (
        <div className="toast-container">
          <div className={`toast ${showToast.type}`} onClick={() => setShowToast(null)}>
            {showToast.message}
          </div>
        </div>
      )}
    </div>
  );
}

function ConnectCard({ onConnect, connecting }: { onConnect: () => Promise<void>; connecting: boolean }) {
  return (
    <div className="card">
      <div className="card-title">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
          <path d="M12 6v6l4 2"/>
        </svg>
        Connect Wallet
      </div>
      <p style={{ color: "var(--text-muted)", marginBottom: "20px", fontSize: "0.9rem" }}>
        Scan QR code with HashPack or Blade wallet to connect
      </p>
      <button className="btn btn-primary" onClick={onConnect} disabled={connecting}>
        {connecting ? (
          <>
            <span className="spinner"></span>
            Connecting...
          </>
        ) : (
          "Connect Wallet"
        )}
      </button>
      <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "12px", textAlign: "center" }}>
        Supports HashPack, Blade, and other WalletConnect v2 wallets
      </p>
    </div>
  );
}

function AccountCard({ 
  accountId, 
  balance, 
  onDisconnect,
  formatTinybars,
  formatAccountId
}: { 
  accountId: string; 
  balance: { tokenBalance: number; hbarBalance: number } | null; 
  onDisconnect: () => Promise<void>;
  formatTinybars: (n: number) => string;
  formatAccountId: (id: string) => string;
}) {
  return (
    <div className="card">
      <div className="card-title">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 6v6l4 2"/>
        </svg>
        Connected
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <span style={{ fontFamily: "monospace", fontSize: "0.9rem" }}>{formatAccountId(accountId)}</span>
        <button className="btn btn-outline" onClick={onDisconnect} style={{ width: "auto", padding: "8px 16px" }}>
          Disconnect
        </button>
      </div>
      {balance && (
        <div>
          <div className="balance-row">
            <span className="balance-label">APIC Tokens</span>
            <span className="balance-value">{balance.tokenBalance.toLocaleString()}</span>
          </div>
          <div className="balance-row">
            <span className="balance-label">HBAR Balance</span>
            <span className="balance-value">{formatTinybars(balance.hbarBalance)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function PurchaseCard({ 
  tokenAmount, 
  setTokenAmount, 
  quote, 
  purchasing, 
  onPurchase, 
  disabled,
  formatTinybars
}: { 
  tokenAmount: number; 
  setTokenAmount: (n: number) => void;
  quote: { tokenAmount: number; hbarCost: number; feeBreakdown: any } | null;
  purchasing: boolean;
  onPurchase: () => Promise<void>;
  disabled: boolean;
  formatTinybars: (n: number) => string;
}) {
  return (
    <div className="card">
      <div className="card-title">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 6v6l4 2"/>
        </svg>
        Purchase API Credits
      </div>
      
      <div className="section">
        <label>Amount</label>
        <input
          type="number"
          min="1"
          max="1000000"
          value={tokenAmount}
          onChange={(e) => setTokenAmount(Math.max(1, parseInt(e.target.value) || 1))}
          placeholder="Enter amount"
        />
      </div>

      {quote && (
        <div className="quote-display">
          <div className="quote-row">
            <span className="quote-label">Tokens</span>
            <span className="quote-value">{quote.tokenAmount.toLocaleString()} APIC</span>
          </div>
          <div className="quote-row">
            <span className="quote-label">Price per token</span>
            <span className="quote-value">{formatTinybars(quote.feeBreakdown.tokenPrice)}</span>
          </div>
          <div className="quote-row">
            <span className="quote-label">Est. network fee</span>
            <span className="quote-value">{formatTinybars(quote.feeBreakdown.networkFee)}</span>
          </div>
          <div className="quote-row" style={{ borderTop: "2px solid var(--border)", marginTop: "8px", paddingTop: "12px" }}>
            <span className="quote-label">Total</span>
            <span className="quote-value" style={{ color: "var(--primary)" }}>{formatTinybars(quote.hbarCost)}</span>
          </div>
        </div>
      )}

      <button 
        className="btn btn-success" 
        onClick={onPurchase} 
        disabled={disabled}
        style={{ marginTop: "16px" }}
      >
        {purchasing ? (
          <>
            <span className="spinner"></span>
            Processing...
          </>
        ) : (
          `Buy ${tokenAmount.toLocaleString()} APIC`
        )}
      </button>

      <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "12px", textAlign: "center" }}>
        Each API call uses 1 token + auto-fee to treasury
      </p>
    </div>
  );
}