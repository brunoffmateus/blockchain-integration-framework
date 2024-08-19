#!/bin/bash

set -e

# Ensure the keys directory exists
create_keys_directory() {
    mkdir -p src/keys
}

# Function to generate a secp256k1 private key and derive public key
generate_keypair() {
    create_keys_directory
    openssl ecparam -name secp256k1 -genkey -noout -out src/keys/secp256k1-privkey.pem
    openssl ec -in src/keys/secp256k1-privkey.pem -pubout -out src/keys/secp256k1-pubkey.pem
}

# Function to convert private key PEM to hex
private_pem_to_hex() {
    openssl ec -in src/keys/secp256k1-privkey.pem -text -noout | grep priv -A 3 | tail -n +2 | tr -d '\n[:space:]:' | sed 's/^00//'
}

# Function to convert public key PEM to hex
public_pem_to_hex() {
    openssl ec -in src/keys/secp256k1-pubkey.pem -pubin -text -noout | grep pub -A 5 | tail -n +2 | tr -d '\n[:space:]:' | sed 's/^04//'
}

# Generate new keys
echo "Generating new keys..."
generate_keypair

# Convert keys to hex
echo "Converting keys to hex..."
private_key=$(private_pem_to_hex)
public_key=$(public_pem_to_hex)

# Update .env.example file
echo "Updating .env.example file..."
sed -i "s/^SATP_PRIVATE_KEY=.*/SATP_PRIVATE_KEY=$private_key/" .env.example
sed -i "s/^SATP_PUBLIC_KEY=.*/SATP_PUBLIC_KEY=$public_key/" .env.example

echo "New secp256k1 keys generated, converted to hex, and updated in .env.example:"
echo "SATP_PRIVATE_KEY=$private_key"
echo "SATP_PUBLIC_KEY=$public_key"