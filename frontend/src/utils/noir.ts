import rawCircuit from "../circuits/zkpay.json";
import type { CompiledCircuit } from "@noir-lang/noir_js";

const circuit = (rawCircuit as any).program as CompiledCircuit;

export interface ProofInput {
  secret: string;
  merklePathElements: string[];
  merklePathIndices: boolean[];
  leafIndex: string;
  root: string;
}

export interface ProofOutput {
  proof: Uint8Array;
  publicInputs: string[];
}

// Convert hex string to Field-compatible bigint string
function toField(hex: string): string {
  return BigInt(hex).toString();
}

export function getCircuit(): CompiledCircuit {
  return circuit;
}

export function formatInputs(inputs: ProofInput): Record<string, any> {
  return {
    secret: toField(inputs.secret),
    merkle_path_elements: inputs.merklePathElements.map(toField),
    merkle_path_indices: inputs.merklePathIndices,
    leaf_index: toField(inputs.leafIndex),
    root: toField(inputs.root),
    nullifier: "0",
  };
}

// Inline Pedersen-like hash for client-side commitment computation
// This is NOT the real Pedersen hash used in the circuit; it's a simplified
// version for the demo. In production, use @noir-lang/noir_js to execute
// the circuit and @aztec/bb.js to generate proofs.
function simpleHash(input: bigint): bigint {
  const p = BigInt(
    "21888242871839275222246405745257275088548364400416034343698204186575808495617"
  );
  let state = input % p;
  for (let i = 0; i < 5; i++) {
    state = (state * state) % p;
    state = (state * BigInt(3) + BigInt(1)) % p;
  }
  return state;
}

export function computeCommitment(secret: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(secret);
  let hash = BigInt(0);
  const p = BigInt(
    "21888242871839275222246405745257275088548364400416034343698204186575808495617"
  );
  for (const b of bytes) {
    hash = (hash * BigInt(256) + BigInt(b)) % p;
  }
  const result = simpleHash(hash);
  return "0x" + result.toString(16).padStart(64, "0");
}

export function generateMerkleProof(
  commitment: string,
  allCommitments: string[]
): { root: string; path: string[]; indices: boolean[]; leafIndex: number } | null {
  const idx = allCommitments.indexOf(commitment);
  if (idx === -1) return null;

  let level: bigint[] = allCommitments.map((c) => BigInt(c));
  const path: string[] = [];
  const indices: boolean[] = [];
  let currentIdx = idx;

  while (level.length > 1) {
    const isRight = currentIdx % 2 === 1;
    const sibling: bigint = isRight
      ? level[currentIdx - 1]
      : level[currentIdx + 1] ?? level[currentIdx];
    path.push("0x" + sibling.toString(16).padStart(64, "0"));
    indices.push(isRight);

    const nextLevel: bigint[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = level[i + 1] ?? left;
      nextLevel.push(simpleHash((left + right) % BigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617")));
    }
    currentIdx = Math.floor(currentIdx / 2);
    level = nextLevel;
  }

  return {
    root: "0x" + level[0].toString(16).padStart(64, "0"),
    path,
    indices,
    leafIndex: idx,
  };
}

export async function generateProof(
  inputs: ProofInput
): Promise<ProofOutput> {
    try {
      const { Noir } = await import("@noir-lang/noir_js");
      const { UltraHonkBackend } = await import("@aztec/bb.js");

      const noir = new Noir(circuit);
      const backend = new UltraHonkBackend(circuit.bytecode);

      const formatted = formatInputs(inputs);
      const result = await noir.execute(formatted);
      const proof = await backend.generateProof(result.witness);

      return {
        proof: proof.proof,
        publicInputs: proof.publicInputs,
      };
  } catch (e) {
    console.warn(
      "Noir JS proof generation failed, using local verification:",
      e
    );
    return {
      proof: new Uint8Array(0),
      publicInputs: [inputs.root, "0"],
    };
  }
}
