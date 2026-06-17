import { useState, useEffect } from "react";
import Header from "./components/Header";
import DepositPanel from "./components/DepositPanel";
import WithdrawPanel from "./components/WithdrawPanel";
import PoolStatus from "./components/PoolStatus";
import { StellarService } from "./utils/stellar";
import "./App.css";

function App() {
  const [stellar, setStellar] = useState<StellarService | null>(null);
  const [connected, setConnected] = useState(false);
  const [publicKey, setPublicKey] = useState("");
  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">("deposit");
  const [poolStats, setPoolStats] = useState({
    totalDeposits: 0,
    totalWithdrawals: 0,
    currentRoot: "",
  });

  useEffect(() => {
    const s = new StellarService();
    setStellar(s);
    checkConnection(s);
  }, []);

  async function checkConnection(s: StellarService) {
    const pk = await s.connect();
    if (pk) {
      setConnected(true);
      setPublicKey(pk);
    }
  }

  async function handleConnect() {
    if (!stellar) return;
    const pk = await stellar.connect();
    if (pk) {
      setConnected(true);
      setPublicKey(pk);
    }
  }

  async function handleDisconnect() {
    setConnected(false);
    setPublicKey("");
  }

  async function handleDeposit(amount: number) {
    if (!stellar) return;
    const commitment = await stellar.deposit(amount);
    setPoolStats((s) => ({ ...s, totalDeposits: s.totalDeposits + 1 }));
    return commitment;
  }

  async function handleWithdraw(amount: number, toAddress: string) {
    if (!stellar) return;
    const result = await stellar.withdraw(amount, toAddress);
    setPoolStats((s) => ({ ...s, totalWithdrawals: s.totalWithdrawals + 1 }));
    return result;
  }

  return (
    <div className="app">
      <Header
        connected={connected}
        publicKey={publicKey}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
      />

      <main className="container main-content">
        <div className="hero">
          <div className="hero-badge">
            <span className="badge badge-accent">Stellar + Noir ZK</span>
          </div>
          <h1 className="hero-title">
            Confidential Payments
            <br />
            <span className="hero-highlight">on Stellar</span>
          </h1>
          <p className="hero-subtitle">
            zkPay uses zero-knowledge proofs to enable private transactions on
            the Stellar network. Deposit tokens, prove ownership with ZK, and
            withdraw to any address — all without revealing your identity.
          </p>
        </div>

        <div className="layout">
          <div className="layout-main">
            <div className="tabs">
              <button
                className={`tab ${activeTab === "deposit" ? "tab-active" : ""}`}
                onClick={() => setActiveTab("deposit")}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Deposit
              </button>
              <button
                className={`tab ${activeTab === "withdraw" ? "tab-active" : ""}`}
                onClick={() => setActiveTab("withdraw")}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Withdraw (ZK)
              </button>
            </div>

            {!connected ? (
              <div className="connect-prompt card text-center">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.5, marginBottom: "1rem" }}>
                  <rect x="1" y="4" width="22" height="16" rx="2" />
                  <line x1="1" y1="10" x2="23" y2="10" />
                </svg>
                <h3>Connect Your Wallet</h3>
                <p className="text-muted text-sm mt-1">
                  Connect Freighter wallet to interact with the zkPay pool on
                  Stellar Testnet
                </p>
                <button className="btn btn-primary mt-2" onClick={handleConnect}>
                  Connect Freighter
                </button>
              </div>
            ) : (
              <>
                {activeTab === "deposit" && (
                  <DepositPanel onDeposit={handleDeposit} stellar={stellar!} />
                )}
                {activeTab === "withdraw" && (
                  <WithdrawPanel
                    onWithdraw={handleWithdraw}
                    stellar={stellar!}
                  />
                )}
              </>
            )}
          </div>

          <div className="layout-side">
            <PoolStatus stats={poolStats} connected={connected} />
            
            <div className="card mt-2">
              <div className="card-header">
                <h3>How It Works</h3>
              </div>
              <div className="steps">
                <div className="step">
                  <div className="step-number">1</div>
                  <div>
                    <strong>Generate Secret</strong>
                    <p className="text-sm text-muted">
                      A random secret is created locally - it never leaves your
                      device
                    </p>
                  </div>
                </div>
                <div className="step">
                  <div className="step-number">2</div>
                  <div>
                    <strong>Deposit</strong>
                    <p className="text-sm text-muted">
                      The commitment (hash of secret) is stored on-chain
                    </p>
                  </div>
                </div>
                <div className="step">
                  <div className="step-number">3</div>
                  <div>
                    <strong>Generate ZK Proof</strong>
                    <p className="text-sm text-muted">
                      A zero-knowledge proof is generated proving you know the
                      secret
                    </p>
                  </div>
                </div>
                <div className="step">
                  <div className="step-number">4</div>
                  <div>
                    <strong>Withdraw</strong>
                    <p className="text-sm text-muted">
                      The proof is verified on-chain. Your funds are released
                      without revealing your identity
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="footer">
        <div className="container">
          <p>
            Built for{" "}
            <a
              href="https://dorahacks.io/hackathon/stellar-hacks-zk/detail"
              target="_blank"
              rel="noopener noreferrer"
            >
              Stellar Hacks: Real-World ZK
            </a>{" "}
            by DoraHacks
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
