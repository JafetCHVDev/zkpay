import {
  SorobanRpc,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  Operation,
  Asset,
  Transaction,
} from "@stellar/stellar-sdk";
import {
  computeCommitment,
  generateMerkleProof,
  generateProof,
} from "./noir";

const RPC_URL = "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = Networks.TESTNET;

export interface SecretResult {
  secret: string;
  commitment: string;
}

type SignTxFn = (
  xdr: string,
  options?: { networkPassphrase?: string; accountToSign?: string }
) => Promise<{ signedTxXdr: string }>;

export class StellarService {
  private server: SorobanRpc.Server;
  private _publicKey: string = "";
  private signTx: SignTxFn | null = null;
  private commitments: string[] = [];
  private accountCache: any = null;

  constructor() {
    this.server = new SorobanRpc.Server(RPC_URL);
  }

  setWallet(publicKey: string, signTxFn: SignTxFn) {
    this._publicKey = publicKey;
    this.signTx = signTxFn;
    this.accountCache = null;
  }

  get isReady(): boolean {
    return !!this._publicKey && !!this.signTx;
  }

  getPublicKey(): string {
    return this._publicKey;
  }

  async getBalance(): Promise<number> {
    if (!this._publicKey) return 0;
    try {
      const account = await this.server.getAccount(this._publicKey);
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
    if (!this._publicKey || !this.signTx) throw new Error("Wallet not connected");

    const { secret, commitment } = this.generateSecret();
    this.commitments.push(commitment);

    const account =
      this.accountCache ??
      (await this.server.getAccount(this._publicKey));
    this.accountCache = account;

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        Operation.manageData({
          name: `zkpay_${Date.now()}`,
          value: commitment,
        })
      )
      .setTimeout(30)
      .build();

    const { signedTxXdr } = await this.signTx(tx.toXDR(), {
      networkPassphrase: NETWORK_PASSPHRASE,
      accountToSign: this._publicKey,
    });

    const signedTx = new Transaction(signedTxXdr, NETWORK_PASSPHRASE);
    const result = await this.server.sendTransaction(signedTx);
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
    if (!this._publicKey || !this.signTx) throw new Error("Wallet not connected");

    const account =
      this.accountCache ??
      (await this.server.getAccount(this._publicKey));
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
        })
      )
      .setTimeout(30)
      .build();

    const { signedTxXdr } = await this.signTx(tx.toXDR(), {
      networkPassphrase: NETWORK_PASSPHRASE,
      accountToSign: this._publicKey,
    });

    const signedTx = new Transaction(signedTxXdr, NETWORK_PASSPHRASE);
    const result = await this.server.sendTransaction(signedTx);
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
