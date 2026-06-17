import {
  Keypair,
  SorobanRpc,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  Operation,
  Asset,
} from "@stellar/stellar-sdk";
import {
  computeCommitment,
  generateMerkleProof,
  generateProof,
} from "./noir";

const RPC_URL = "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = Networks.TESTNET;
const FRIENDBOT_URL = "https://friendbot.stellar.org";

export interface SecretResult {
  secret: string;
  commitment: string;
}

export class StellarService {
  private server: SorobanRpc.Server;
  private keypair: Keypair | null = null;
  private commitments: string[] = [];
  private accountCache: any = null;

  constructor() {
    this.server = new SorobanRpc.Server(RPC_URL);
  }

  async connect(): Promise<string | null> {
    this.keypair = Keypair.random();
    await this.fundAccount();
    return this.keypair.publicKey();
  }

  private async fundAccount() {
    if (!this.keypair) return;
    const pk = this.keypair.publicKey();
    try {
      const resp = await fetch(`${FRIENDBOT_URL}?addr=${pk}`);
      const data = await resp.json();
      if (!resp.ok) {
        console.warn("Friendbot funding failed:", data);
      }
    } catch (e) {
      console.warn("Friendbot error:", e);
    }
  }

  getPublicKey(): string {
    return this.keypair?.publicKey() ?? "";
  }

  async getBalance(): Promise<number> {
    if (!this.keypair) return 0;
    try {
      const account = await this.server.getAccount(this.keypair.publicKey());
      this.accountCache = account;
      return Number((account as any).balance) / 1e7;
    } catch {
      return 0;
    }
  }

  generateSecret(): SecretResult {
    const secret = Array.from({ length: 24 }, () =>
      Math.random().toString(36).charAt(2)
    ).join("");
    const commitment = computeCommitment(secret);
    return { secret, commitment };
  }

  async deposit(amount: number): Promise<string> {
    if (!this.keypair) throw new Error("Wallet not connected");

    const { secret, commitment } = this.generateSecret();
    this.commitments.push(commitment);

    const account =
      this.accountCache ??
      (await this.server.getAccount(this.keypair.publicKey()));
    this.accountCache = account;

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        Operation.manageData({
          name: `zkpay_${Date.now()}`,
          value: commitment,
          source: this.keypair.publicKey(),
        })
      )
      .setTimeout(30)
      .build();

    tx.sign(this.keypair);
    const result = await this.server.sendTransaction(tx);
    const hash = result.hash;

    let status = await this.server.getTransaction(hash);
    while (status.status === "NOT_FOUND") {
      await new Promise((r) => setTimeout(r, 1000));
      status = await this.server.getTransaction(hash);
    }

    if (status.status === "FAILED") {
      throw new Error("Deposit transaction failed");
    }

    return hash;
  }

  async generateProof(secret: string): Promise<boolean> {
    const commitment = computeCommitment(secret);
    const proof = generateMerkleProof(commitment, this.commitments);

    if (!proof) {
      return false;
    }

    try {
      const zkProof = await generateProof({
        secret,
        merklePathElements: proof.path,
        merklePathIndices: proof.indices,
        leafIndex: proof.leafIndex.toString(),
        root: proof.root,
      });
      return zkProof.proof.length > 0;
    } catch {
      return false;
    }
  }

  async withdraw(amount: number, toAddress: string): Promise<string> {
    if (!this.keypair) throw new Error("Wallet not connected");

    const account =
      this.accountCache ??
      (await this.server.getAccount(this.keypair.publicKey()));
    this.accountCache = account;

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        Operation.payment({
          destination: toAddress,
          asset: Asset.native(),
          amount: amount.toFixed(7),
          source: this.keypair.publicKey(),
        })
      )
      .setTimeout(30)
      .build();

    tx.sign(this.keypair);
    const result = await this.server.sendTransaction(tx);
    const hash = result.hash;

    let status = await this.server.getTransaction(hash);
    while (status.status === "NOT_FOUND") {
      await new Promise((r) => setTimeout(r, 1000));
      status = await this.server.getTransaction(hash);
    }

    if (status.status === "FAILED") {
      throw new Error("Withdrawal transaction failed");
    }

    return hash;
  }
}
