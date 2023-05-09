
// Serialize PublicKey to hexadecimal string
pub fn serialize_public_key(public_key: &PublicKey) -> String {
    let serialized = public_key.serialize(); // Serialize PublicKey as a 33-byte or 65-byte array
    hex::encode(&serialized) // Convert byte array to hexadecimal string
}

// Serialize Signature to hexadecimal string
pub fn serialize_signature(signature: &Signature) -> String {
    let serialized = signature.serialize_compact(); // Serialize Signature as a 64-byte array
    hex::encode(&serialized) // Convert byte array to hexadecimal string
}
