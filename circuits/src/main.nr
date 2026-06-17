// zkPay - Zero-Knowledge Privacy Pool for Stellar
//
// Proves: "I know a secret whose hash is in the Merkle tree,
//          producing a unique nullifier for this leaf"
//
// Public inputs:  root, nullifier
// Private inputs: secret, merkle_path, leaf_index

use std::hash::pedersen_hash;

global MERKLE_DEPTH: u32 = 4;

fn main(
    secret: Field,
    merkle_path_elements: [Field; MERKLE_DEPTH],
    merkle_path_indices: [bool; MERKLE_DEPTH],
    leaf_index: Field,
    root: pub Field,
    nullifier: pub Field,
) {
    // Compute leaf commitment = Pedersen(secret, 0)
    let leaf = pedersen_hash([secret, 0]);

    // Verify Merkle membership proof
    let mut current = leaf;
    for i in 0..MERKLE_DEPTH {
        let sibling = merkle_path_elements[i];
        if merkle_path_indices[i] {
            current = pedersen_hash([sibling, current]);
        } else {
            current = pedersen_hash([current, sibling]);
        }
    }
    assert(current == root);

    // Compute nullifier = Pedersen(secret, leaf_index)
    let computed_nullifier = pedersen_hash([secret, leaf_index]);
    assert(computed_nullifier == nullifier);

    // Constrain leaf_index to be within tree bounds
    assert((leaf_index as u64) < (1 << MERKLE_DEPTH) as u64);
}
