#!/bin/bash

set -e

# Function to generate a secp256k1 private key and derive public key
generate_keypair() {
    mkdir -p src/keys
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

# Update only gatewayKeyPair in gateway-config.json file
echo "Updating gatewayKeyPair in gateway-config.json file..."
sed -i \
    -e '/"gatewayKeyPair": {/,/}/{s/"publicKey": "[^"]*"/"publicKey": "'"$public_key"'"/}' \
    -e '/"gatewayKeyPair": {/,/}/{s/"privateKey": "[^"]*"/"privateKey": "'"$private_key"'"/}' \
    gateway-config.json

echo "New secp256k1 keys generated and updated in gateway-config.json gatewayKeyPair:"
echo "Public Key: $public_key"
echo "Private Key: $private_key"