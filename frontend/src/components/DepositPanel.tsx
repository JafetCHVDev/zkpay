import { useState } from "react";
import type { StellarService, SecretResult } from "../utils/stellar";
import "./DepositPanel.css";

interface DepositPanelProps {
  onDeposit: (amount: number) => Promise<string | void>;
  stellar: StellarService;
}

export default function DepositPanel({ onDeposit, stellar }: DepositPanelProps) {
  const [amount, setAmount] = useState("");
  const [secretResult, setSecretResult] = useState<SecretResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  function handleGenerateSecret() {
    const result = stellar.generateSecret();
    setSecretResult(result);
    setError("");
  }

  async function handleDeposit() {
    setError("");
    setTxHash("");
    if (!amount || !secretResult) {
      setError("Generate a secret and enter an amount");
      return;
    }
    const numAmount = Number(amount);
    if (numAmount <= 0) {
      setError("Amount must be positive");
      return;
    }
    setLoading(true);
    try {
      const hash = await onDeposit(numAmount);
      if (hash) setTxHash(hash);
      setAmount("");
      setSecretResult(null);
    } catch (e: any) {
      setError(e.message || "Deposit failed");
    } finally {
      setLoading(false);
    }
  }

  function handleCopySecret() {
    if (secretResult?.secret) {
      navigator.clipboard.writeText(secretResult.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2>Deposit</h2>
        <span className="badge badge-accent">Step 1 of 2</span>
      </div>

      <div className="mb-2">
        <label className="label">1. Generate a random secret</label>
        <p className="text-sm text-muted mb-1">
          This secret is your proof of deposit. Save it securely — you'll need it to withdraw.
        </p>
        <button className="btn btn-secondary" onClick={handleGenerateSecret}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
          </svg>
          Generate Secret
        </button>
      </div>

      {secretResult && (
        <div className="secret-box mb-2">
          <div>
            <label className="label">Your Secret (save this!)</label>
            <div className="secret-value mono" onClick={handleCopySecret} style={{ cursor: "pointer" }}>
              {secretResult.secret}
              <span className="text-sm" style={{ float: "right", color: "var(--text-muted)" }}>
                {copied ? "Copied!" : "Click to copy"}
              </span>
            </div>
          </div>
          <div className="mt-1">
            <label className="label">Commitment (stored on-chain)</label>
            <div className="commitment-value mono truncate">
              {secretResult.commitment}
            </div>
          </div>
        </div>
      )}

      <div className="mb-2">
        <label className="label">2. Enter deposit amount (XLM)</label>
        <input
          className="input"
          type="number"
          min="0.01"
          step="0.01"
          placeholder="10"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>

      {error && (
        <div className="error-box mb-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          {error}
        </div>
      )}

      <button
        className="btn btn-primary"
        disabled={!secretResult || !amount || loading}
        onClick={handleDeposit}
      >
        {loading ? (
          <>
            <span className="spinner" />
            Processing...
          </>
        ) : (
          "Deposit to Pool"
        )}
      </button>

      {txHash && (
        <div className="success-box mt-2">
          <p>Deposit Successful!</p>
          <a
            href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm"
          >
            View on Stellar Expert ↗
          </a>
        </div>
      )}
    </div>
  );
}
