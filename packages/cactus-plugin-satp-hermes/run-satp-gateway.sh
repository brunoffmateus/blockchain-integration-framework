#!/bin/bash
function main()
{
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
  nvm use 18.18.2

  until docker info >/dev/null 2>&1; do
    echo "Sleeping to let dockerd spin up..."
    sleep 10
  done

  docker pull ghcr.io/hyperledger/cactus-besu-all-in-one:2021-01-08-7a055c3
  docker pull ghcr.io/hyperledger/cactus-fabric-all-in-one:v1.0.0-rc.2
  docker pull ipfs/go-ipfs:v0.8.0

  # /root/.nvm/versions/node/v18.18.2/bin/node -r ts-node/register /usr/src/app/cactus/packages/cactus-plugin-satp-hermes/src/main/typescript/plugin-satp-hermes-gateway-cli.ts
  node --max-old-space-size=3072 -r ts-node/register /usr/src/app/cactus/packages/cactus-plugin-satp-hermes/src/main/typescript/plugin-satp-hermes-gateway-cli.ts
}

main