import { useState } from "react";
import type { StellarService } from "../utils/stellar";
import "./DepositPanel.css";

interface WithdrawPanelProps {
  onWithdraw: (amount: number, toAddress: string) => Promise<string | void>;
  stellar: StellarService;
}

export default function WithdrawPanel({ onWithdraw, stellar }: WithdrawPanelProps) {
  const [amount, setAmount] = useState("");
  const [toAddress, setToAddress] = useState("");
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [proofValid, setProofValid] = useState(false);
  const [proofGenerating, setProofGenerating] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState("");

  async function handleGenerateProof() {
    setError("");
    setProofValid(false);
    if (!secret) {
      setError("Enter your deposit secret");
      return;
    }

    setProofGenerating(true);
    try {
      const valid = await stellar.generateProof(secret);
      setProofValid(valid);
      if (!valid) {
        setError("Invalid secret — could not verify commitment in pool");
      }
    } catch (e: any) {
      setError(e.message || "Proof generation failed");
    } finally {
      setProofGenerating(false);
    }
  }

  async function handleWithdraw() {
    setError("");
    setTxHash("");
    if (!amount || !toAddress || !proofValid) {
      setError("Complete all steps before withdrawing");
      return;
    }
    const numAmount = Number(amount);
    if (numAmount <= 0) {
      setError("Amount must be positive");
      return;
    }
    setLoading(true);
    try {
      const hash = await onWithdraw(numAmount, toAddress);
      if (hash) setTxHash(hash);
      setAmount("");
      setToAddress("");
      setSecret("");
      setProofValid(false);
    } catch (e: any) {
      setError(e.message || "Withdrawal failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2>Withdraw (ZK Privacy)</h2>
        <span className={`badge ${proofValid ? "badge-success" : "badge-warning"}`}>
          {proofValid ? "Proof Ready" : "Not Ready"}
        </span>
      </div>

      <div className="mb-2">
        <label className="label">1. Enter your deposit secret</label>
        <p className="text-sm text-muted mb-1">
          The secret you saved when depositing. A ZK proof will be generated
          to prove ownership without revealing the secret.
        </p>
        <input
          className="input mono"
          type="text"
          placeholder="Paste your secret here..."
          value={secret}
          onChange={(e) => {
            setSecret(e.target.value);
            setProofValid(false);
          }}
        />
      </div>

      <button
        className="btn btn-secondary mb-2"
        disabled={!secret || proofGenerating}
        onClick={handleGenerateProof}
      >
        {proofGenerating ? (
          <>
            <span className="spinner" />
            Generating Zero-Knowledge Proof...
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Generate ZK Proof
          </>
        )}
      </button>

      {proofValid && (
        <div className="success-box mb-2">
          <p>ZK Proof Verified</p>
          <p className="text-sm text-muted mt-1">
            The circuit proved you know the secret for a commitment in the pool
            without revealing which one. You can now withdraw anonymously.
          </p>
        </div>
      )}

      <div className="mb-2">
        <label className="label">2. Withdraw amount (XLM)</label>
        <input
          className="input"
          type="number"
          min="0.01"
          step="0.01"
          placeholder="5"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>

      <div className="mb-2">
        <label className="label">3. Recipient wallet address</label>
        <input
          className="input mono"
          type="text"
          placeholder="G...XXXXX"
          value={toAddress}
          onChange={(e) => setToAddress(e.target.value)}
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
        disabled={!proofValid || !amount || !toAddress || loading}
        onClick={handleWithdraw}
      >
        {loading ? (
          <>
            <span className="spinner" />
            Processing...
          </>
        ) : (
          "Withdraw Anonymously"
        )}
      </button>

      {txHash && (
        <div className="success-box mt-2">
          <p>Withdrawal Successful!</p>
          <p className="text-sm text-muted mt-1">
            Funds were sent to {toAddress.slice(0, 6)}...{toAddress.slice(-4)} without revealing your identity.
          </p>
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
