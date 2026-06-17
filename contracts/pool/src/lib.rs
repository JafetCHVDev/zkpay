#![no_std]

use soroban_sdk::{
    contract, contractimpl, contractclient, contracttype, symbol_short, Address, Bytes, BytesN, Env,
    Vec,
};

const TREE_DEPTH: u32 = 10;
const MAX_DEPOSITS: u32 = 1024;

fn zero_bytes_n(env: &Env) -> BytesN<32> {
    BytesN::from_array(env, &[0u8; 32])
}

fn hash_pair(env: &Env, left: &BytesN<32>, right: &BytesN<32>) -> BytesN<32> {
    let mut data = [0u8; 64];
    data[..32].copy_from_slice(&left.to_array());
    data[32..].copy_from_slice(&right.to_array());
    let hash = env.crypto().sha256(&Bytes::from_slice(env, &data));
    let mut arr = [0u8; 32];
    arr.copy_from_slice(&hash.to_array());
    BytesN::from_array(env, &arr)
}

#[contractclient(name = "VerifierClient")]
pub trait Verifier {
    fn verify(env: Env, proof: BytesN<32>) -> bool;
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct MerkleProof {
    pub path_elements: Vec<BytesN<32>>,
    pub path_indices: Vec<u32>,
}

#[contracttype]
#[derive(Clone)]
pub struct PoolConfig {
    pub token: Address,
    pub verifier: Address,
}

#[contracttype]
#[derive(Clone)]
pub struct PoolData {
    pub current_index: u32,
    pub filled_subtrees: Vec<BytesN<32>>,
    pub roots: Vec<BytesN<32>>,
}

#[contracttype]
pub enum DataKey {
    Config,
    Pool,
    Nullifier(BytesN<32>),
}

#[contracttype]
pub struct DepositEvent {
    pub commitment: BytesN<32>,
    pub leaf_index: u32,
    pub timestamp: u64,
}

#[contracttype]
pub struct WithdrawEvent {
    pub to: Address,
    pub nullifier: BytesN<32>,
    pub amount: i128,
    pub timestamp: u64,
}

#[contract]
pub struct ZkPayPool;

#[contractimpl]
impl ZkPayPool {
    pub fn init(env: Env, token: Address, verifier: Address) {
        let filled_subtrees: Vec<BytesN<32>> = Vec::new(&env);
        let roots: Vec<BytesN<32>> = Vec::new(&env);

        let config = PoolConfig { token, verifier };
        let pool = PoolData {
            current_index: 0,
            filled_subtrees,
            roots,
        };

        env.storage().instance().set(&DataKey::Config, &config);
        env.storage().instance().set(&DataKey::Pool, &pool);
    }

    pub fn deposit(env: Env, commitment: BytesN<32>) -> u32 {
        let mut pool: PoolData = env.storage().instance().get(&DataKey::Pool).unwrap();
        let index = pool.current_index;

        if index >= MAX_DEPOSITS {
            panic!("pool is full");
        }

        let mut current = commitment;
        let mut hash_index = index;

        for level in 0..TREE_DEPTH {
            let left;
            let right;
            if hash_index & 1 == 0 {
                left = current.clone();
                if pool.filled_subtrees.len() > level {
                    right = pool.filled_subtrees.get(level).unwrap();
                } else {
                    right = zero_bytes_n(&env);
                }
            } else {
                if pool.filled_subtrees.len() > level {
                    left = pool.filled_subtrees.get(level).unwrap();
                } else {
                    left = zero_bytes_n(&env);
                }
                right = current.clone();
            }
            current = hash_pair(&env, &left, &right);
            if pool.filled_subtrees.len() > level {
                pool.filled_subtrees.set(level, current.clone());
            } else {
                pool.filled_subtrees.push_back(current.clone());
            }
            hash_index >>= 1;
        }

        pool.roots.push_back(current);
        pool.current_index = index + 1;
        env.storage().instance().set(&DataKey::Pool, &pool);

        env.events().publish(
            symbol_short!("deposit"),
            DepositEvent {
                commitment,
                leaf_index: index,
                timestamp: env.ledger().timestamp(),
            },
        );

        index
    }

    pub fn withdraw(
        env: Env,
        to: Address,
        nullifier: BytesN<32>,
        proof: BytesN<32>,
        merkle_proof: MerkleProof,
    ) {
        if env.storage().instance().has(&DataKey::Nullifier(nullifier.clone())) {
            panic!("nullifier already used");
        }

        let config: PoolConfig = env.storage().instance().get(&DataKey::Config).unwrap();
        let verifier = VerifierClient::new(&env, &config.verifier);
        let is_valid = verifier.verify(&proof);
        if !is_valid {
            panic!("proof verification failed");
        }

        let pool: PoolData = env.storage().instance().get(&DataKey::Pool).unwrap();
        let computed_root = ZkPayPool::compute_root(&env, merkle_proof);
        let root_valid = pool.roots.iter().any(|r| r == computed_root);
        if !root_valid {
            panic!("invalid merkle root");
        }

        env.storage()
            .instance()
            .set(&DataKey::Nullifier(nullifier.clone()), &true);

        env.events().publish(
            symbol_short!("withdraw"),
            WithdrawEvent {
                to,
                nullifier,
                amount: 0,
                timestamp: env.ledger().timestamp(),
            },
        );
    }

    pub fn compute_root(env: &Env, proof: MerkleProof) -> BytesN<32> {
        let mut computed = proof.path_elements.get(0).unwrap();
        for i in 1..proof.path_elements.len() {
            let sibling = proof.path_elements.get(i).unwrap();
            let bit = proof.path_indices.get(i).unwrap();
            if bit & 1 == 0 {
                computed = hash_pair(env, &computed, &sibling);
            } else {
                computed = hash_pair(env, &sibling, &computed);
            }
        }
        computed
    }

    pub fn is_nullifier_used(env: Env, nullifier: BytesN<32>) -> bool {
        env.storage().instance().has(&DataKey::Nullifier(nullifier))
    }

    pub fn get_config(env: Env) -> PoolConfig {
        env.storage().instance().get(&DataKey::Config).unwrap()
    }

    pub fn get_pool_data(env: Env) -> PoolData {
        env.storage().instance().get(&DataKey::Pool).unwrap()
    }

    pub fn get_deposit_count(env: Env) -> u32 {
        let pool: PoolData = env.storage().instance().get(&DataKey::Pool).unwrap();
        pool.current_index
    }
}
