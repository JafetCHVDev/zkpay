interface PoolStatusProps {
  stats: {
    totalDeposits: number;
    totalWithdrawals: number;
    currentRoot: string;
  };
  connected: boolean;
}

export default function PoolStatus({ stats, connected }: PoolStatusProps) {
  return (
    <div className="card">
      <div className="card-header">
        <h3>Pool Status</h3>
        <span
          className={`badge ${connected ? "badge-success" : "badge-error"}`}
        >
          {connected ? "Active" : "Offline"}
        </span>
      </div>

      <div className="stat-list">
        <div className="stat-item">
          <span className="stat-label">Total Deposits</span>
          <span className="stat-value">{stats.totalDeposits}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Total Withdrawals</span>
          <span className="stat-value">{stats.totalWithdrawals}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">ZK Method</span>
          <span className="stat-value">
            <code className="mono">Groth16</code>
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Curve</span>
          <span className="stat-value">
            <code className="mono">BN254</code>
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Hash</span>
          <span className="stat-value">
            <code className="mono">Poseidon</code>
          </span>
        </div>
      </div>

      <div className="mt-2">
        <label className="label">Merkle Root</label>
        <div className="root-display mono truncate">
          {stats.currentRoot || "0x0000...0000"}
        </div>
      </div>
    </div>
  );
}
