# zkPay — Confidential Payments on Stellar

> **Built for [Stellar Hacks: Real-World ZK](https://dorahacks.io/hackathon/stellar-hacks-zk/detail) by DoraHacks**

<img src="assets/demo.gif" alt="zkPay Demo" width="600"/>

Zero-knowledge privacy pool on the Stellar network. Deposit tokens, generate a ZK proof of ownership, and withdraw to any address — all without revealing your identity or which deposit you own.

## How It Works

```
                    ┌─────────────────────┐
                    │  Generate Secret S   │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  commitment =       │
                    │  Pedersen(S, 0)     │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Deposit: store     │
                    │  commitment on-chain│
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Withdraw: generate │
                    │  ZK proof proving   │
                    │  knowledge of S     │
                    │  without revealing  │
                    │  which leaf         │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  On-chain verify:   │
                    │  1. Merkle proof    │
                    │  2. Nullifier check │
                    │  3. Nullifier store │
                    │  4. Transfer funds  │
                    └─────────────────────┘
```

### Protocol

1. **Deposit**: User generates a random secret `S`, computes `commitment = Pedersen(S, 0)`, and submits it to the pool contract. The commitment is inserted into a Merkle tree on-chain.

2. **Withdraw**: User proves knowledge of `S` by generating a zero-knowledge proof (Groth16 on BN254) that:
   - `Pedersen(S, 0)` equals a leaf in the tree (Merkle membership proof)
   - `nullifier = Pedersen(S, leaf_index)` is correctly computed
   - The nullifier has not been used before

3. **ZK Verification**: The on-chain contract verifies the proof, checks the nullifier against spent list, and transfers funds to the recipient address.

## Architecture

```
zkpay/
├── circuits/             # Noir ZK Circuits
│   ├── Nargo.toml        # Noir project config
│   ├── Prover.toml       # Example inputs
│   └── src/
│       └── main.nr       # Merkle membership + nullifier circuit
├── frontend/             # React + Vite + TypeScript
│   ├── src/
│   │   ├── components/   # UI components
│   │   │   ├── DepositPanel.tsx
│   │   │   ├── WithdrawPanel.tsx
│   │   │   └── PoolStatus.tsx
│   │   ├── utils/
│   │   │   ├── noir.ts   # In-browser ZK proof generation
│   │   │   └── stellar.ts# Stellar SDK integration
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
├── backend/              # Node.js + Express API
│   ├── server.js         # REST API + Stellar testnet
│   └── package.json
├── scripts/
│   └── compile.mjs       # Compile Noir circuit via noir_wasm
└── README.md
```

### Tech Stack

| Component | Technology |
|-----------|-----------|
| ZK Circuit | Noir 1.0.0-beta.22 (Groth16 on BN254) |
| ZK Backend | Groth16 + UltraHonkBackend (bb.js) |
| On-chain | Stellar account data entries (Soroban contract pending) |
| Frontend | React 18 + Vite + TypeScript |
| Stellar SDK | `@stellar/stellar-sdk` v12 |
| Hash | Pedersen (BN254) |
| Merkle Tree | Depth 4 (16 leaves), binary Sparse Merkle Tree |
| Prover | In-browser via noir_js + @aztec/bb.js |

## Getting Started

### Prerequisites

- Node.js >= 18
- npm >= 9
- [Freighter Wallet](https://freighter.app/) browser extension (for wallet connection)

### Installation

```bash
# Clone the repo
git clone https://github.com/your-username/zkpay.git
cd zkpay

# Install dependencies
npm run install:all

# Start the backend
npm run dev:backend

# In another terminal, start the frontend
npm run dev:frontend
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Compiling the ZK Circuit

```bash
cd zkpay
node scripts/compile.mjs
```

The compiled circuit JSON will be output to `circuits/target/zkpay.json`.
A pre-compiled artifact is included at `frontend/src/circuits/zkpay.json`.

## ZK Circuit Specification

### Inputs

| Name | Visibility | Type | Description |
|------|-----------|------|-------------|
| `secret` | Private | Field | User's random secret |
| `merkle_path_elements` | Private | [Field; 4] | Merkle path sibling hashes |
| `merkle_path_indices` | Private | [bool; 4] | Direction at each level (false=left, true=right) |
| `leaf_index` | Private | Field | Index of the leaf in the Merkle tree |
| `root` | Public | Field | Current Merkle root of the pool |
| `nullifier` | Public | Field | Unique identifier preventing double-spending |

### Constraints

1. `Pedersen(secret, 0) == leaf_commitment`
2. Merkle proof verifies: walking from `leaf_commitment` to `root` using `merkle_path_elements` and `merkle_path_indices`
3. `Pedersen(secret, leaf_index) == nullifier`
4. `leaf_index < 2^MERKLE_DEPTH` (ensures valid tree index)

### Circuit Size

- ACIR bytecode: ~102 KB
- ABI parameters: 6 (2 public, 4 private)
- Proof generation time: varies by browser (WASM-based via noir_js + bb.js)

## Stellar Integration

### Current On-Chain Integration

In place of a Soroban contract (blocked on Windows build toolchain), the app uses **Stellar account data entries** via `Operation.manageData` to store deposit commitments. The backend API maintains the Merkle root, nullifier set, and coordinates proof verification.

### Contract Architecture (Planned)

The Soroban contract (`contracts/pool/src/lib.rs`) will implement:
- `deposit(commitment: BytesN<32>)` — Insert commitment into Merkle tree, emit `Deposited` event
- `withdraw(proof: Bytes, public_inputs: BytesN<32>[], recipient: Address, amount: i128)` — Verify proof, check nullifier, transfer funds
- `merkle_root() -> BytesN<32>` — Get current Merkle root
- `is_spent(nullifier: BytesN<32>) -> bool` — Check if nullifier was used

## Demo

### Video Walkthrough (2-3 min)

1. **Introduction**: Problem statement — Stellar's transparency means anyone can trace payments.
2 **Solution**: zkPay uses ZK proofs to break the link between depositor and withdrawer.
3. **Deposit Flow**: Generate secret → compute commitment → submit to pool.
4. **ZK Proof Generation**: Secret + Merkle tree → Groth16 proof.
5. **Withdraw Flow**: Submit proof → verify on-chain → funds sent to recipient.
6. **Privacy Analysis**: Show that the withdrawal address cannot be linked to the deposit.

### Screenshots

| Deposit | Withdraw | Pool Stats |
|---------|----------|------------|
| ![Deposit](assets/deposit.png) | ![Withdraw](assets/withdraw.png) | ![Stats](assets/stats.png) |

## Security Considerations

- **Soundness**: The Groth16 proving system is computationally sound under the Knowledge-of-Exponent assumption.
- **Completeness**: Any honest prover with a valid secret can generate a verifying proof.
- **Zero-Knowledge**: The proof reveals only `root` and `nullifier` — no information about `secret`, `leaf_index`, or Merkle path.
- **Double-Spending**: Prevented by the nullifier — each commitment can only be spent once.
- **Front-running**: The nullifier prevents replay attacks; the Merkle root prevents stale state proofs.

## Future Work

- [ ] Deploy Soroban contract to Stellar Testnet
- [ ] Add support for custom Stellar assets (USDC, etc.)
- [ ] Increase Merkle tree depth to 20+ for production scale
- [ ] Add relayer network for gasless withdrawals
- [ ] Deploy to Stellar Mainnet after audit

## Team

Built for the Stellar Hacks: Real-World ZK hackathon by DoraHacks.

## License

MIT
