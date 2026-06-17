import "./Header.css";

interface HeaderProps {
  connected: boolean;
  publicKey: string;
  onConnect: () => void;
  onDisconnect: () => void;
}

export default function Header({
  connected,
  publicKey,
  onConnect,
  onDisconnect,
}: HeaderProps) {
  return (
    <header className="header">
      <div className="container header-inner">
        <div className="header-brand">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
          <span className="header-title">zkPay</span>
        </div>

        <div className="header-actions">
          {connected ? (
            <div className="wallet-info">
              <span className="badge badge-success">Connected</span>
              <code className="wallet-address mono">
                {publicKey.slice(0, 6)}...{publicKey.slice(-4)}
              </code>
              <button
                className="btn btn-secondary btn-sm"
                onClick={onDisconnect}
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button className="btn btn-primary" onClick={onConnect}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="1" y="4" width="22" height="16" rx="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
