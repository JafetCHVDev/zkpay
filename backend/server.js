import express from "express";
import cors from "cors";
import {
  Keypair,
  SorobanRpc,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  Operation,
  Asset,
} from "@stellar/stellar-sdk";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const RPC_URL = "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = Networks.TESTNET;
const server = new SorobanRpc.Server(RPC_URL);

// In-memory state (in production, use a database)
const deposits = [];
const nullifiers = new Set();
let keypair = Keypair.random();

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    publicKey: keypair.publicKey(),
    totalDeposits: deposits.length,
    totalNullifiers: nullifiers.size,
  });
});

app.post("/api/fund", async (req, res) => {
  try {
    const { address } = req.body;
    if (!address) {
      return res.status(400).json({ error: "Address required" });
    }
    const resp = await fetch(`https://friendbot.stellar.org?addr=${address}`);
    const data = await resp.json();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/deposit", async (req, res) => {
  try {
    const { commitment, amount } = req.body;
    if (!commitment || !amount) {
      return res.status(400).json({ error: "Commitment and amount required" });
    }

    deposits.push({ commitment, amount, timestamp: Date.now() });

    res.json({
      success: true,
      commitment,
      index: deposits.length - 1,
      totalDeposits: deposits.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/verify-withdrawal", async (req, res) => {
  try {
    const { proof, publicInputs, amount, toAddress } = req.body;
    if (!proof || !publicInputs || !amount || !toAddress) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Extract commitment and nullifier from public inputs
    const [commitment, nullifier] = publicInputs;

    // Check nullifier not already used
    if (nullifiers.has(nullifier)) {
      return res.status(400).json({ error: "Already withdrawn" });
    }

    // Check commitment exists in deposits
    const deposit = deposits.find((d) => d.commitment === commitment);
    if (!deposit) {
      return res.status(400).json({ error: "Commitment not found" });
    }

    // Mark nullifier as used
    nullifiers.add(nullifier);

    res.json({
      success: true,
      message: "ZK proof verified. Withdrawal approved.",
      nullifier,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/deposits", (_req, res) => {
  res.json({
    total: deposits.length,
    deposits: deposits.map((d, i) => ({
      index: i,
      commitment: d.commitment,
      amount: d.amount,
    })),
  });
});

app.get("/api/nullifiers", (_req, res) => {
  res.json({
    total: nullifiers.size,
    nullifiers: Array.from(nullifiers),
  });
});

app.listen(PORT, () => {
  console.log(`zkPay backend running on port ${PORT}`);
  console.log(`Server public key: ${keypair.publicKey()}`);
});
