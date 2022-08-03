# `@hyperledger/cactus-plugin-cctxviz`


We might want to give options to the cross chain transaction log / support multiple cross chain models with one instance of cctxviz

## Usage
To install this plugin run:
```sh
npm install @hyperledger/cactus-plugin-cctxviz
```

**yarn**

```sh
yarn add @hyperledger/cactus-plugin-ledger-cctxviz
```


## Installation

1. Install Hyperledger Cactus dependencies, as advised in BUILD.md
2. Run ``yarn run configure```
3. This package is ready to be used. Navigate to packages/cactus-plugin-cc-tx-visualization/src/test/typescript/integration to run integration tests and packages/cactus-plugin-cc-tx-visualization/src/main/python to run the cross-chain model generation scripts

Note:
To run the test files, in Visual Code Studio, go to "Run and Debug", and click on "TAP: Current TS Test File".
If that option does not show up, create a file "launch.json" inside the root directory ".vscode" with the following content:

```
{
    // Use IntelliSense to learn about possible attributes.
    // Hover to view descriptions of existing attributes.
    // For more information, visit: https://go.microsoft.com/fwlink/?linkid=830387
    "version": "0.2.0",
    "configurations": [

      {
        "name": "TAP: Current TS Test File",
        "runtimeExecutable": "node",
        "type": "node",
        "request": "launch",
        "protocol": "inspector",
        "env": {
          "TS_NODE_PROJECT": "tsconfig.json",
          "OFF-HFC_LOGGING": "{\"debug\":\"console\",\"info\":\"console\"}"
        },
        "args": [
          "--async-stack-traces",
          "${relativeFile}"
        ],
        "runtimeArgs": [
          "--require",
          "ts-node/register"
        ],
        "console": "integratedTerminal",
        "sourceMaps": true,
        "sourceMapPathOverrides": {
          "webpack://cactus-*": "${workspaceRoot}/packages/cactus-*",
        },
        // "outFiles": [
        //   "${workspaceRoot}/packages/cactus-*/dist/**/*"
        // ],
        "cwd": "${workspaceRoot}",
        "skipFiles": [
          "<node_internals>/**",
        ]
      },
      {
        "type": "node",
        "request": "launch",
        "name": "JEST: Current TS Test File",
        "cwd": "${workspaceFolder}",
        "args": [
          "${workspaceRoot}/node_modules/.bin/jest",
          "${relativeFile}",
          "--detectOpenHandles"
          "--forceExit"
        ],
        "console": "integratedTerminal",
        "internalConsoleOptions": "neverOpen"
      },
      {
        "type": "node",
        "request": "launch",
        "name": "TAP: Current JS Test File",
        "console": "integratedTerminal",
        "program": "${workspaceFolder}/${relativeFile}",
        "cwd": "${workspaceFolder}",
        "runtimeArgs": [
          "--async-stack-traces",
        ],
        "args": [
          "--timeout=9999999"
        ],
        "outFiles": [
          "dist/lib/*"
        ],
        "env": {},
      },
      {
        "type": "node",
        "request": "launch",
        "name": "cmd-api-server",
        // "program": "${workspaceFolder}/packages/cactus-cmd-api-server/src/main/typescript/cmd/cactus-api.ts",
        "program": "${workspaceFolder}/packages/cactus-cmd-api-server/dist/lib/main/typescript/cmd/cactus-api.js",
        "runtimeArgs": [
          "--preserve-symlinks",
          "--preserve-symlinks-main"
        ],
        // "preLaunchTask": "npm: build:dev:cmd-api-server",
        "args": [
          "--public-key=03aa57b5c6506a6e5a2851dcbc14bf2b3d2b9196aecacc946f630eab5203dca8c4",
          "--private-key=da43d3ce06f7b0eef447ca209c00cf2efdef02a761fb5ba2aaf7fc601ceaf555",
          "--api-cors-domain-csv=*",
          "--config-file=.config.json"
        ],
        "sourceMaps": true,
        "sourceMapPathOverrides": {
          // "webpack://hana-workbench-api-server/../*": "${workspaceRoot}/pkg/*",
          "webpack://cactus-*": "${workspaceRoot}/packages/cactus-*",
          // "webpack://cactus-common/./*": "${workspaceFolder}/packages/cactus-common/*",
        },
        // "outFiles": [
        //   "${workspaceRoot}/packages/cactus-*/dist/lib/**/*",
        // ],
        "skipFiles": [
          "<node_internals>/**"
        ]
      },
      {
        "name": "webpack:dev (Launch via NPM)",
        "request": "launch",
        "runtimeArgs": [
          "run-script",
          "webpack:dev"
        ],
        "runtimeExecutable": "npm",
        "skipFiles": [
          "<node_internals>/**"
        ],
        "type": "pwa-node"
      },
      {
        "name": "TAP: Current TS Test File v2",
        "type": "node",
        "request": "launch",
        "protocol": "inspector",
        "env": {
          "TS_NODE_PROJECT": "tsconfig.json"
        },
        "args": [
          "${relativeFile}"
        ],
        "runtimeArgs": [
          "-r",
          "ts-node/register"
        ],
        "console": "integratedTerminal",
        "sourceMaps": true,
        "cwd": "${workspaceRoot}"
      },
      {
        "name": "Example: Supply Chain App",
        "type": "node",
        "request": "launch",
        "protocol": "inspector",
        "env": {
          "TS_NODE_PROJECT": "${workspaceFolder}/tsconfig.json"
        },
        "args": [
          "../cactus-example-supply-chain-backend/src/main/typescript/supply-chain-app-cli.ts",
          "dotenv_config_path=process.env"
        ],
        "runtimeArgs": [
          "-r",
          "ts-node/register",
          "-r",
          "dotenv/config"
        ],
        "console": "integratedTerminal",
        "sourceMaps": true,
        "cwd": "${workspaceFolder}/examples/supply-chain-app/",
        "outFiles": [
          "${workspaceFolder}/**/*.js",
          "!**/node_modules/**"
        ]
      }
    ]
  }

```