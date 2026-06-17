import { ConnectButton } from "stellar-wallet-kit";
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
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
