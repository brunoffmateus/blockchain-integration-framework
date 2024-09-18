import "jest-extended";

import {
  IListenOptions,
  LogLevelDesc,
  LoggerProvider,
  Secp256k1Keys,
  Servers,
} from "@hyperledger/cactus-common";
import { v4 as uuidv4 } from "uuid";

import { PluginRegistry } from "@hyperledger/cactus-core";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import {
  ChainCodeProgrammingLanguage,
  Configuration,
  DefaultEventHandlerStrategy,
  FabricSigningCredential,
  FileBase64,
  IPluginLedgerConnectorFabricOptions,
  PluginLedgerConnectorFabric,
  DefaultApi as FabricApi,
  FabricContractInvocationType,
} from "@hyperledger/cactus-plugin-ledger-connector-fabric";
import http, { Server } from "http";
import fs from "fs-extra";

import {
  pruneDockerAllIfGithubAction,
  Containers,
  FabricTestLedgerV1,
  BesuTestLedger,
  FABRIC_25_LTS_AIO_FABRIC_VERSION,
  FABRIC_25_LTS_AIO_IMAGE_VERSION,
  FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1,
  FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_2,
  SATPGatewayRunner,
} from "@hyperledger/cactus-test-tooling";
import bodyParser from "body-parser";
import express from "express";
import { DiscoveryOptions, X509Identity } from "fabric-network";
import { AddressInfo } from "net";
import path from "path";
import {
  BesuConfig,
  FabricConfig,
} from "../../../main/typescript/types/blockchain-interaction";
import { IPluginBungeeHermesOptions } from "@hyperledger/cactus-plugin-bungee-hermes";
import { Account } from "web3-core";
import {
  EthContractInvocationType,
  IPluginLedgerConnectorBesuOptions,
  PluginLedgerConnectorBesu,
  ReceiptType,
  Web3SigningCredentialType,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";
import Web3 from "web3";
import SATPContract from "../../solidity/generated/satp-erc20.sol/SATPContract.json";
import {
  AdminApi,
  TransactionApi,
  Configuration as GatewayConfiguration,
} from "../../../main/typescript/generated/gateway-client/typescript-axios";
import SATPWrapperContract from "../../../solidity/generated/satp-wrapper.sol/SATPWrapperContract.json";
import { TransactRequest, Asset } from "../../../main/typescript";
import { SupportedChain } from "../../../main/typescript/core/types";
import FabricSATPInteraction from "../../../test/typescript/fabric/satp-erc20-interact.json";
import BesuSATPInteraction from "../../solidity/satp-erc20-interact.json";
import { Config } from "node-ssh";
const logLevel: LogLevelDesc = "DEBUG";
const log = LoggerProvider.getOrCreate({
  level: logLevel,
  label: "BUNGEE - Hermes",
});

let fabricServer: Server;

let besuLedger: BesuTestLedger;

let fabricLedger: FabricTestLedgerV1;
let fabricSigningCredential: FabricSigningCredential;
let bridgeFabricSigningCredential: FabricSigningCredential;
let configFabric: Configuration;
let fabricChannelName: string;

const FABRIC_ASSET_ID = uuidv4();

const BRIDGE_ID =
  "x509::/OU=org2/OU=client/OU=department1/CN=bridge::/C=UK/ST=Hampshire/L=Hursley/O=org2.example.com/CN=ca.org2.example.com";

let clientId: string;
let fabricConfig: FabricConfig;
let pluginOptionsFabricBridge: IPluginLedgerConnectorFabricOptions;
let pluginBungeeFabricOptions: IPluginBungeeHermesOptions;

let erc20TokenContract: string;
let contractNameWrapper: string;

let rpcApiHttpHost: string;
let rpcApiWsHost: string;
let web3: Web3;
let firstHighNetWorthAccount: string;
let testing_connector: PluginLedgerConnectorBesu;
let besuKeyPair: { privateKey: string };
let bridgeEthAccount: Account;
let assigneeEthAccount: Account;
const BESU_ASSET_ID = uuidv4();
let assetContractAddress: string;
let wrapperContractAddress: string;
let satpContractName: string;

let pluginBungeeBesuOptions: IPluginBungeeHermesOptions;

let besuConfig: BesuConfig;
let besuOptions: IPluginLedgerConnectorBesuOptions;

let keychainInstanceIdBridge: string;
let keychainIdBridge: string;
let keychainEntryKeyBridge: string;
let keychainEntryValueBridge: string;

let keychainEntryValue: string;
let keychainEntryKey: string;
let keychainPlugin1: PluginKeychainMemory;
let keychainPlugin2: PluginKeychainMemory;

let discoveryOptions: DiscoveryOptions;
let sshConfig: Config;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let bridgeProfile: any;

let fabricUser: X509Identity;

let apiClient: FabricApi;

let gatewayTransactionApi: TransactionApi;
let gatewayAdminApi: AdminApi;
let gatewayRunner: SATPGatewayRunner;

afterAll(async () => {
  await gatewayRunner.stop();
  await gatewayRunner.destroy();
  await besuLedger.stop();
  await besuLedger.destroy();
  await fabricLedger.stop();
  await fabricLedger.destroy();
  await Servers.shutdown(fabricServer);

  await pruneDockerAllIfGithubAction({ logLevel })
    .then(() => {
      log.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning didn't throw OK");
    });
});

beforeAll(async () => {
  pruneDockerAllIfGithubAction({ logLevel })
    .then(() => {
      log.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning didn't throw OK");
    });
  {
    besuLedger = new BesuTestLedger({
      logLevel,
      emitContainerLogs: true,
      envVars: ["BESU_NETWORK=dev"],
    });
    await besuLedger.start();

    // Fabric ledger connection
    const channelId = "mychannel";
    fabricChannelName = channelId;

    fabricLedger = new FabricTestLedgerV1({
      emitContainerLogs: true,
      publishAllPorts: true,
      imageName: "ghcr.io/hyperledger/cactus-fabric2-all-in-one",
      imageVersion: FABRIC_25_LTS_AIO_IMAGE_VERSION,
      envVars: new Map([["FABRIC_VERSION", FABRIC_25_LTS_AIO_FABRIC_VERSION]]),
      logLevel: "INFO",
    });

    await fabricLedger.start();

    log.info("Both Ledgers started successfully");
  }

  {
    // setup fabric ledger
    const connectionProfile = await fabricLedger.getConnectionProfileOrg1();
    expect(connectionProfile).not.toBeUndefined();

    bridgeProfile = await fabricLedger.getConnectionProfileOrgX("org2");
    expect(bridgeProfile).not.toBeUndefined();

    const enrollAdminOut = await fabricLedger.enrollAdmin();
    const adminWallet = enrollAdminOut[1];

    const enrollAdminBridgeOut = await fabricLedger.enrollAdminV2({
      organization: "org2",
    });
    const bridgeWallet = enrollAdminBridgeOut[1];

    const [userIdentity] = await fabricLedger.enrollUser(adminWallet);
    fabricUser = userIdentity;
    const opts = {
      enrollmentID: "bridge",
      organization: "org2",
      wallet: bridgeWallet,
    };

    const [bridgeIdentity] = await fabricLedger.enrollUserV2(opts);

    sshConfig = await fabricLedger.getSshConfig();

    log.info("enrolled admin");

    const keychainInstanceId = uuidv4();
    const keychainId = uuidv4();
    const keychainEntryKey = "user1";
    const keychainEntryValue = JSON.stringify(userIdentity);

    console.log("keychainEntryValue: ", keychainEntryValue);

    keychainInstanceIdBridge = uuidv4();
    keychainIdBridge = uuidv4();
    keychainEntryKeyBridge = "bridge1";
    keychainEntryValueBridge = JSON.stringify(bridgeIdentity);

    console.log("keychainEntryValue: ", keychainEntryValueBridge);

    const keychainPlugin = new PluginKeychainMemory({
      instanceId: keychainInstanceId,
      keychainId,
      logLevel,
      backend: new Map([
        [keychainEntryKey, keychainEntryValue],
        ["some-other-entry-key", "some-other-entry-value"],
      ]),
    });

    const keychainPluginBridge = new PluginKeychainMemory({
      instanceId: keychainInstanceIdBridge,
      keychainId: keychainIdBridge,
      logLevel,
      backend: new Map([
        [keychainEntryKeyBridge, keychainEntryValueBridge],
        ["some-other-entry-key", "some-other-entry-value"],
      ]),
    });

    const pluginRegistryBridge = new PluginRegistry({
      plugins: [keychainPluginBridge],
    });

    const pluginRegistry = new PluginRegistry({ plugins: [keychainPlugin] });

    discoveryOptions = {
      enabled: true,
      asLocalhost: true,
    };

    const pluginOptions: IPluginLedgerConnectorFabricOptions = {
      instanceId: uuidv4(),
      dockerBinary: "/usr/local/bin/docker",
      peerBinary: "/fabric-samples/bin/peer",
      goBinary: "/usr/local/go/bin/go",
      pluginRegistry,
      cliContainerEnv: FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1,
      sshConfig,
      logLevel: "DEBUG",
      connectionProfile,
      discoveryOptions,
      eventHandlerOptions: {
        strategy: DefaultEventHandlerStrategy.NetworkScopeAllfortx,
        commitTimeout: 300,
      },
    };

    const fabricConnector = new PluginLedgerConnectorFabric(pluginOptions);

    const expressApp = express();
    expressApp.use(bodyParser.json({ limit: "250mb" }));
    fabricServer = http.createServer(expressApp);
    const listenOptions: IListenOptions = {
      hostname: "127.0.0.1",
      port: 3000,
      server: fabricServer,
    };
    const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
    const { address, port } = addressInfo;

    await fabricConnector.getOrCreateWebServices();
    await fabricConnector.registerWebServices(expressApp);

    log.info("Fabric Ledger connector check");

    const apiUrl = `http://${address}:${port}`;

    configFabric = new Configuration({ basePath: apiUrl });

    apiClient = new FabricApi(configFabric);

    // deploy contracts ...
    satpContractName = "satp-contract";
    const satpWrapperContractName = "satp-wrapper-contract";
    const satpContractRelPath =
      "../../../test/typescript/fabric/contracts/satp-contract/chaincode-typescript";
    const wrapperSatpContractRelPath =
      "../../../main/typescript/fabric-contracts/satp-wrapper/chaincode-typescript";
    const satpContractDir = path.join(__dirname, satpContractRelPath);

    // ├── package.json
    // ├── src
    // │   ├── index.ts
    // │   ├── ITraceableContract.ts
    // │   ├── satp-contract-interface.ts
    // │   ├── satp-contract.ts
    // ├── tsconfig.json
    // ├── lib
    // │   └── tokenERC20.js
    // --------
    const satpSourceFiles: FileBase64[] = [];
    {
      const filename = "./tsconfig.json";
      const relativePath = "./";
      const filePath = path.join(satpContractDir, relativePath, filename);
      const buffer = await fs.readFile(filePath);
      satpSourceFiles.push({
        body: buffer.toString("base64"),
        filepath: relativePath,
        filename,
      });
    }
    {
      const filename = "./package.json";
      const relativePath = "./";
      const filePath = path.join(satpContractDir, relativePath, filename);
      const buffer = await fs.readFile(filePath);
      satpSourceFiles.push({
        body: buffer.toString("base64"),
        filepath: relativePath,
        filename,
      });
    }
    {
      const filename = "./index.ts";
      const relativePath = "./src/";
      const filePath = path.join(satpContractDir, relativePath, filename);
      const buffer = await fs.readFile(filePath);
      satpSourceFiles.push({
        body: buffer.toString("base64"),
        filepath: relativePath,
        filename,
      });
    }
    {
      const filename = "./ITraceableContract.ts";
      const relativePath = "./src/";
      const filePath = path.join(satpContractDir, relativePath, filename);
      const buffer = await fs.readFile(filePath);
      satpSourceFiles.push({
        body: buffer.toString("base64"),
        filepath: relativePath,
        filename,
      });
    }
    {
      const filename = "./satp-contract-interface.ts";
      const relativePath = "./src/";
      const filePath = path.join(satpContractDir, relativePath, filename);
      const buffer = await fs.readFile(filePath);
      satpSourceFiles.push({
        body: buffer.toString("base64"),
        filepath: relativePath,
        filename,
      });
    }
    {
      const filename = "./satp-contract.ts";
      const relativePath = "./src/";
      const filePath = path.join(satpContractDir, relativePath, filename);
      const buffer = await fs.readFile(filePath);
      satpSourceFiles.push({
        body: buffer.toString("base64"),
        filepath: relativePath,
        filename,
      });
    }
    {
      const filename = "./tokenERC20.ts";
      const relativePath = "./src/";
      const filePath = path.join(satpContractDir, relativePath, filename);
      const buffer = await fs.readFile(filePath);
      satpSourceFiles.push({
        body: buffer.toString("base64"),
        filepath: relativePath,
        filename,
      });
    }

    const wrapperSatpContractDir = path.join(
      __dirname,
      wrapperSatpContractRelPath,
    );

    // ├── package.json
    // ├── src
    // │   ├── index.ts
    // │   ├── interaction-signature.ts
    // │   ├── ITraceableContract.ts
    // │   ├── satp-wrapper.ts
    // │   └── token.ts
    // ├── tsconfig.json
    // --------
    const wrapperSourceFiles: FileBase64[] = [];
    {
      const filename = "./tsconfig.json";
      const relativePath = "./";
      const filePath = path.join(
        wrapperSatpContractDir,
        relativePath,
        filename,
      );
      const buffer = await fs.readFile(filePath);
      wrapperSourceFiles.push({
        body: buffer.toString("base64"),
        filepath: relativePath,
        filename,
      });
    }
    {
      const filename = "./package.json";
      const relativePath = "./";
      const filePath = path.join(
        wrapperSatpContractDir,
        relativePath,
        filename,
      );
      const buffer = await fs.readFile(filePath);
      wrapperSourceFiles.push({
        body: buffer.toString("base64"),
        filepath: relativePath,
        filename,
      });
    }
    {
      const filename = "./index.ts";
      const relativePath = "./src/";
      const filePath = path.join(
        wrapperSatpContractDir,
        relativePath,
        filename,
      );
      const buffer = await fs.readFile(filePath);
      wrapperSourceFiles.push({
        body: buffer.toString("base64"),
        filepath: relativePath,
        filename,
      });
    }
    {
      const filename = "./interaction-signature.ts";
      const relativePath = "./src/";
      const filePath = path.join(
        wrapperSatpContractDir,
        relativePath,
        filename,
      );
      const buffer = await fs.readFile(filePath);
      wrapperSourceFiles.push({
        body: buffer.toString("base64"),
        filepath: relativePath,
        filename,
      });
    }
    {
      const filename = "./ITraceableContract.ts";
      const relativePath = "./src/";
      const filePath = path.join(
        wrapperSatpContractDir,
        relativePath,
        filename,
      );
      const buffer = await fs.readFile(filePath);
      wrapperSourceFiles.push({
        body: buffer.toString("base64"),
        filepath: relativePath,
        filename,
      });
    }
    {
      const filename = "./satp-wrapper.ts";
      const relativePath = "./src/";
      const filePath = path.join(
        wrapperSatpContractDir,
        relativePath,
        filename,
      );
      const buffer = await fs.readFile(filePath);
      wrapperSourceFiles.push({
        body: buffer.toString("base64"),
        filepath: relativePath,
        filename,
      });
    }
    {
      const filename = "./token.ts";
      const relativePath = "./src/";
      const filePath = path.join(
        wrapperSatpContractDir,
        relativePath,
        filename,
      );
      const buffer = await fs.readFile(filePath);
      wrapperSourceFiles.push({
        body: buffer.toString("base64"),
        filepath: relativePath,
        filename,
      });
    }

    const res = await apiClient.deployContractV1({
      channelId: fabricChannelName,
      ccVersion: "1.0.0",
      sourceFiles: satpSourceFiles,
      ccName: satpContractName,
      targetOrganizations: [
        FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1,
        FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_2,
      ],
      caFile:
        FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1.ORDERER_TLS_ROOTCERT_FILE,
      ccLabel: "satp-contract",
      ccLang: ChainCodeProgrammingLanguage.Typescript,
      ccSequence: 1,
      orderer: "orderer.example.com:7050",
      ordererTLSHostnameOverride: "orderer.example.com",
      connTimeout: 60,
    });

    const { packageIds, lifecycle, success } = res.data;
    expect(res.status).toBe(200);
    expect(success).toBe(true);
    expect(lifecycle).not.toBeUndefined();

    const {
      approveForMyOrgList,
      installList,
      queryInstalledList,
      commit,
      packaging,
      queryCommitted,
    } = lifecycle;

    expect(packageIds).toBeTruthy();
    expect(packageIds).toBeArray();

    expect(approveForMyOrgList).toBeTruthy();
    expect(approveForMyOrgList).toBeArray();

    expect(installList).toBeTruthy();
    expect(installList).toBeArray();
    expect(queryInstalledList).toBeTruthy();
    expect(queryInstalledList).toBeArray();

    expect(commit).toBeTruthy();
    expect(packaging).toBeTruthy();
    expect(queryCommitted).toBeTruthy();
    log.info("SATP Contract deployed");

    const res2 = await apiClient.deployContractV1({
      channelId: fabricChannelName,
      ccVersion: "1.0.0",
      sourceFiles: wrapperSourceFiles,
      ccName: satpWrapperContractName,
      targetOrganizations: [
        FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1,
        FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_2,
      ],
      caFile:
        FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_2.ORDERER_TLS_ROOTCERT_FILE,
      ccLabel: "satp-wrapper-contract",
      ccLang: ChainCodeProgrammingLanguage.Typescript,
      ccSequence: 1,
      orderer: "orderer.example.com:7050",
      ordererTLSHostnameOverride: "orderer.example.com",
      connTimeout: 60,
    });

    const {
      packageIds: packageIds2,
      lifecycle: lifecycle2,
      success: success2,
    } = res2.data;
    expect(res2.status).toBe(200);
    expect(success2).toBe(true);

    const {
      approveForMyOrgList: approveForMyOrgList2,
      installList: installList2,
      queryInstalledList: queryInstalledList2,
      commit: commit2,
      packaging: packaging2,
      queryCommitted: queryCommitted2,
    } = lifecycle2;

    expect(packageIds2).toBeTruthy();
    expect(packageIds2).toBeArray();

    expect(approveForMyOrgList2).toBeTruthy();
    expect(approveForMyOrgList2).toBeArray();

    expect(installList2).toBeTruthy();
    expect(installList2).toBeArray();
    expect(queryInstalledList2).toBeTruthy();
    expect(queryInstalledList2).toBeArray();

    expect(commit2).toBeTruthy();
    expect(packaging2).toBeTruthy();
    expect(queryCommitted2).toBeTruthy();

    log.info("SATP Wrapper Contract deployed");

    fabricSigningCredential = {
      keychainId,
      keychainRef: keychainEntryKey,
    };

    bridgeFabricSigningCredential = {
      keychainId: keychainIdBridge,
      keychainRef: keychainEntryKeyBridge,
    };

    const mspId: string = userIdentity.mspId;

    const initializeResponse = await apiClient.runTransactionV1({
      contractName: satpContractName,
      channelName: fabricChannelName,
      params: [mspId, FABRIC_ASSET_ID],
      methodName: "InitToken",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: fabricSigningCredential,
    });

    expect(initializeResponse).not.toBeUndefined();
    expect(initializeResponse.status).toBeGreaterThan(199);
    expect(initializeResponse.status).toBeLessThan(300);

    log.info(
      `SATPContract.InitToken(): ${JSON.stringify(initializeResponse.data)}`,
    );

    const initializeResponse2 = await apiClient.runTransactionV1({
      contractName: satpWrapperContractName,
      channelName: fabricChannelName,
      params: [mspId],
      methodName: "Initialize",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: fabricSigningCredential,
    });

    expect(initializeResponse2).not.toBeUndefined();
    expect(initializeResponse2.status).toBeGreaterThan(199);
    expect(initializeResponse2.status).toBeLessThan(300);

    log.info(
      `SATPWrapper.Initialize(): ${JSON.stringify(initializeResponse2.data)}`,
    );

    const setBridgeResponse = await apiClient.runTransactionV1({
      contractName: satpContractName,
      channelName: fabricChannelName,
      params: ["Org2MSP"],
      methodName: "setBridge",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: fabricSigningCredential,
    });

    const setBridgeResponse2 = await apiClient.runTransactionV1({
      contractName: satpWrapperContractName,
      channelName: fabricChannelName,
      params: ["Org2MSP", BRIDGE_ID],
      methodName: "setBridge",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: fabricSigningCredential,
    });

    expect(setBridgeResponse2).not.toBeUndefined();
    expect(setBridgeResponse2.status).toBeGreaterThan(199);
    expect(setBridgeResponse2.status).toBeLessThan(300);

    log.info(
      `SATPWrapper.setBridge(): ${JSON.stringify(setBridgeResponse.data)}`,
    );

    const responseClientId = await apiClient.runTransactionV1({
      contractName: satpWrapperContractName,
      channelName: fabricChannelName,
      params: [],
      methodName: "ClientAccountID",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: fabricSigningCredential,
    });

    clientId = responseClientId.data.functionOutput.toString();

    pluginBungeeFabricOptions = {
      keyPair: Secp256k1Keys.generateKeyPairsBuffer(), // criar
      instanceId: uuidv4(), // enviar
      pluginRegistry: new PluginRegistry(),
      logLevel,
    };

    pluginOptionsFabricBridge = {
      instanceId: uuidv4(),
      dockerBinary: "/usr/local/bin/docker",
      peerBinary: "/fabric-samples/bin/peer",
      goBinary: "/usr/local/go/bin/go",
      pluginRegistry: pluginRegistryBridge, // criar
      cliContainerEnv: FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_2, // criar ou enviar
      sshConfig, // what - depends on the connector...
      logLevel: "DEBUG", // criar
      connectionProfile: bridgeProfile, // what - depends on the ledger...
      discoveryOptions, // enviar
      eventHandlerOptions: { // criar ou enviar
        strategy: DefaultEventHandlerStrategy.NetworkScopeAllfortx,
        commitTimeout: 300,
      },
    };

    fabricConfig = {
      network: SupportedChain.FABRIC, // fazer la
      signingCredential: bridgeFabricSigningCredential, // criar com enviados
      channelName: fabricChannelName, // enviar
      contractName: satpWrapperContractName, // enviar
      options: pluginOptionsFabricBridge, // criar
      bungeeOptions: pluginBungeeFabricOptions, // criar
    } as FabricConfig;

    // networkDetails = {
    //   connectorApiPath: fabricPath,
    //   signingCredential: fabricSigningCredential,
    //   channelName: fabricChannelName,
    //   contractName: satpContractName,
    //   participant: "Org1MSP",
    // };
  }

  {
    //setup besu ledger
    rpcApiHttpHost = await besuLedger.getRpcApiHttpHost();
    rpcApiWsHost = await besuLedger.getRpcApiWsHost();
    web3 = new Web3(rpcApiHttpHost);
    firstHighNetWorthAccount = besuLedger.getGenesisAccountPubKey();

    bridgeEthAccount = await besuLedger.createEthTestAccount();

    assigneeEthAccount = await besuLedger.createEthTestAccount();

    besuKeyPair = {
      privateKey: besuLedger.getGenesisAccountPrivKey(),
    };

    erc20TokenContract = "SATPContract";
    contractNameWrapper = "SATPWrapperContract";

    keychainEntryValue = besuKeyPair.privateKey;
    keychainEntryKey = uuidv4();
    keychainPlugin1 = new PluginKeychainMemory({
      instanceId: uuidv4(),
      keychainId: uuidv4(),

      backend: new Map([[keychainEntryKey, keychainEntryValue]]),
      logLevel,
    });

    keychainPlugin2 = new PluginKeychainMemory({
      instanceId: uuidv4(),
      keychainId: uuidv4(),

      backend: new Map([[keychainEntryKey, keychainEntryValue]]),
      logLevel,
    });

    keychainPlugin1.set(erc20TokenContract, JSON.stringify(SATPContract));
    keychainPlugin2.set(
      contractNameWrapper,
      JSON.stringify(SATPWrapperContract),
    );

    const pluginRegistry = new PluginRegistry({
      plugins: [keychainPlugin1, keychainPlugin2],
    });

    besuOptions = {
      instanceId: uuidv4(), // enviar
      rpcApiHttpHost, // enviar
      rpcApiWsHost, // enviar
      pluginRegistry, // criar
      logLevel, // criar
    };
    testing_connector = new PluginLedgerConnectorBesu(besuOptions);

    await testing_connector.transact({
      web3SigningCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: besuKeyPair.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      consistencyStrategy: {
        blockConfirmations: 0,
        receiptType: ReceiptType.NodeTxPoolAck,
      },
      transactionConfig: {
        from: firstHighNetWorthAccount,
        to: bridgeEthAccount.address,
        value: 10e9,
        gas: 1000000,
      },
    });

    const balance = await web3.eth.getBalance(bridgeEthAccount.address);
    expect(balance).toBeTruthy();
    expect(parseInt(balance, 10)).toBeGreaterThan(10e9);
    log.info("Connector initialized");

    const deployOutSATPContract = await testing_connector.deployContract({
      keychainId: keychainPlugin1.getKeychainId(),
      contractName: erc20TokenContract,
      contractAbi: SATPContract.abi,
      constructorArgs: [firstHighNetWorthAccount, BESU_ASSET_ID],
      web3SigningCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: besuKeyPair.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      bytecode: SATPContract.bytecode.object,
      gas: 999999999999999,
    });
    expect(deployOutSATPContract).toBeTruthy();
    expect(deployOutSATPContract.transactionReceipt).toBeTruthy();
    expect(
      deployOutSATPContract.transactionReceipt.contractAddress,
    ).toBeTruthy();

    assetContractAddress =
      deployOutSATPContract.transactionReceipt.contractAddress ?? "";

    log.info("SATPContract Deployed successfully");

    const deployOutWrapperContract = await testing_connector.deployContract({
      keychainId: keychainPlugin2.getKeychainId(),
      contractName: contractNameWrapper,
      contractAbi: SATPWrapperContract.abi,
      constructorArgs: [bridgeEthAccount.address],
      web3SigningCredential: {
        ethAccount: bridgeEthAccount.address,
        secret: bridgeEthAccount.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      bytecode: SATPWrapperContract.bytecode.object,
      gas: 999999999999999,
    });
    expect(deployOutWrapperContract).toBeTruthy();
    expect(deployOutWrapperContract.transactionReceipt).toBeTruthy();
    expect(
      deployOutWrapperContract.transactionReceipt.contractAddress,
    ).toBeTruthy();
    log.info("SATPWrapperContract Deployed successfully");

    wrapperContractAddress =
      deployOutWrapperContract.transactionReceipt.contractAddress ?? "";

    pluginBungeeBesuOptions = {
      keyPair: Secp256k1Keys.generateKeyPairsBuffer(), // criar
      instanceId: uuidv4(), // enviar
      pluginRegistry: new PluginRegistry(), // criar
      logLevel, // criar
    };

    besuConfig = {
      network: SupportedChain.BESU, // criar
      keychainId: keychainPlugin2.getKeychainId(), // enviar
      signingCredential: {
        ethAccount: bridgeEthAccount.address,
        secret: bridgeEthAccount.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      }, // enviar
      contractName: contractNameWrapper, // enviar
      contractAddress: wrapperContractAddress, // enviar
      options: besuOptions, // criar
      bungeeOptions: pluginBungeeBesuOptions, // criar
      gas: 999999999999999, // enviar
    };

    const giveRoleRes = await testing_connector.invokeContract({
      contractName: erc20TokenContract,
      keychainId: keychainPlugin1.getKeychainId(),
      invocationType: EthContractInvocationType.Send,
      methodName: "giveRole",
      params: [wrapperContractAddress],
      signingCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: besuKeyPair.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      gas: 1000000,
    });

    expect(giveRoleRes).toBeTruthy();
    expect(giveRoleRes.success).toBeTruthy();
    log.info("BRIDGE_ROLE given to SATPWrapperContract successfully");
  }

  const responseMint = await testing_connector.invokeContract({
    contractName: erc20TokenContract,
    keychainId: keychainPlugin1.getKeychainId(),
    invocationType: EthContractInvocationType.Send,
    methodName: "mint",
    params: [firstHighNetWorthAccount, "100"],
    signingCredential: {
      ethAccount: firstHighNetWorthAccount,
      secret: besuKeyPair.privateKey,
      type: Web3SigningCredentialType.PrivateKeyHex,
    },
    gas: 999999999,
  });
  expect(responseMint).toBeTruthy();
  expect(responseMint.success).toBeTruthy();
  log.info("Minted 100 tokens to firstHighNetWorthAccount");

  const responseApprove = await testing_connector.invokeContract({
    contractName: erc20TokenContract,
    keychainId: keychainPlugin1.getKeychainId(),
    invocationType: EthContractInvocationType.Send,
    methodName: "approve",
    params: [wrapperContractAddress, "100"],
    signingCredential: {
      ethAccount: firstHighNetWorthAccount,
      secret: besuKeyPair.privateKey,
      type: Web3SigningCredentialType.PrivateKeyHex,
    },
    gas: 999999999,
  });
  expect(responseApprove).toBeTruthy();
  expect(responseApprove.success).toBeTruthy();
  log.info("Approved 100 tokens to SATPWrapperContract");
});
describe("SATPGateway sending a token from Besu to Fabric", () => {
  it("should realize a transfer", async () => {
    // besu config vars:
    const bungeeBesuId = pluginBungeeBesuOptions.instanceId;

    const besuKeychainEntryValue = keychainEntryValue; // enviar
    const besuKeychainEntryKey = keychainEntryKey; // enviar
    const besuKeychainPlugin1Id = keychainPlugin1.getInstanceId(); // enviar
    const besuKeychainPlugin1KeychainId = keychainPlugin1.getKeychainId(); // enviar
    const besuKeychainPlugin2Id = keychainPlugin2.getInstanceId(); // enviar
    const besuKeychainPlugin2KeychainId = keychainPlugin2.getKeychainId(); // enviar

    const besuOptionsInstanceID = besuOptions.instanceId;
    const besuOptionsHttpHost = besuOptions.rpcApiHttpHost;
    const besuOptionsWsHost = besuOptions.rpcApiWsHost;
    const besuKeychainId = besuConfig.keychainId;
    // const besuSigningCredential = besuConfig.signingCredential;
    const besuEthAccount = bridgeEthAccount.address;
    const besuSecret = bridgeEthAccount.privateKey;
    const besuType = Web3SigningCredentialType.PrivateKeyHex;
    const besuContractName = besuConfig.contractName;
    const besuContractAddress = besuConfig.contractAddress;
    const besuGas = besuConfig.gas;

    // fabric config vars:
    const fabricBungeeId = pluginBungeeBesuOptions.instanceId;

    const fabricOptsId = pluginOptionsFabricBridge.instanceId;
    const fabricOptsDockerBinary = pluginOptionsFabricBridge.dockerBinary;
    const fabricOptsPeerBinary = pluginOptionsFabricBridge.peerBinary;
    const fabricOptsGoBinary = pluginOptionsFabricBridge.goBinary;
    const fabricConfigChannel = fabricConfig.channelName;
    const fabricConfigContract = fabricConfig.contractName;
    const fabricStrategy =
      pluginOptionsFabricBridge.eventHandlerOptions?.strategy;
    const fabricTimeout =
      pluginOptionsFabricBridge.eventHandlerOptions?.commitTimeout;
    const discoveryOptsEnabled = discoveryOptions.enabled;
    const discoveryOptsAsLocalhost = discoveryOptions.asLocalhost;

    gatewayRunner = new SATPGatewayRunner({
      logLevel,
      emitContainerLogs: true,
      envVars: [
        "SATP_GATEWAY_ID=mockID",
        "SATP_GATEWAY_NAME=CustomGateway",
        "SATP_SUPPORTED_DLTS=FabricSATPGateway,BesuSATPGateway",
        "SATP_GATEWAY_ADDRESS=http://localhost",
        "SATP_PROOF_ID=mockProofID10",
        "SATP_COUNTER_PARTY_GATEWAYS=[]",

        `LOG_LEVEL=${logLevel}`,

        `BESU_BUNGEE_ID=${bungeeBesuId}`,

        `BESU_OPTS_ENTRY_VALUE=${besuKeychainEntryValue}`,
        `BESU_OPTS_ENTRY_KEY=${besuKeychainEntryKey}`,
        `BESU_OPTS_PLUGIN1_ID=${besuKeychainPlugin1Id}`,
        `BESU_OPTS_PLUGIN1_KEYCHAIN_ID=${besuKeychainPlugin1KeychainId}`,
        `BESU_OPTS_PLUGIN2_ID=${besuKeychainPlugin2Id}`,
        `BESU_OPTS_PLUGIN2_KEYCHAIN_ID=${besuKeychainPlugin2KeychainId}`,

        `ERC20_TOKEN_CONTRACT=${erc20TokenContract}`,
        `WRAPPER_CONTRACT_NAME=${contractNameWrapper}`,

        `BESU_OPTS_ID=${besuOptionsInstanceID}`,
        `BESU_OPTS_HTTP_HOST=${besuOptionsHttpHost}`,
        `BESU_OPTS_WS_HOST=${besuOptionsWsHost}`,

        `BESU_KEYCHAIN_ID=${besuKeychainId}`,
        `BESU_CREDENTIAL_ETH_ACCOUNT=${besuEthAccount}`,
        `BESU_CREDENTIAL_SECRET=${besuSecret}`,
        `BESU_CREDENTIAL_TYPE=${besuType}`,
        `BESU_CONTRACT_NAME=${besuContractName}`,
        `BESU_CONTRACT_ADDRESS=${besuContractAddress}`,
        `BESU_GAS=${besuGas}`,

        `FABRIC_BUNGEE_ID=${fabricBungeeId}`,

        `FABRIC_KEYCHAIN_INSTANCE_ID_BRIDGE=${keychainInstanceIdBridge}`,
        `FABRIC_KEYCHAIN_ID_BRIDG=${keychainIdBridge}`,
        `FABRIC_KEYCHAIN_ENTRY_KEY_BRIDGE=${keychainEntryKeyBridge}`,
        `FABRIC_KEYCHAIN_ENTRY_VALUE_BRIDGE=${keychainEntryValueBridge}`,

        `FABRIC_STRATEGY=${fabricStrategy}`,
        `FABRIC_TIMEOUT=${fabricTimeout}`,

        `DISCOVERY_OPTS_ENABLED=${discoveryOptsEnabled}`,
        `DISCOVERY_OPTS_AS_LOCALHOST=${discoveryOptsAsLocalhost}`,

        `SSH_CONFIG=${JSON.stringify(sshConfig)}`,
        `BRIDGE_PROFILE=${JSON.stringify(bridgeProfile)}`,

        `FABRIC_OPTS_ID=${fabricOptsId}`,
        `FABRIC_OPTS_DOCKER_BINARY=${fabricOptsDockerBinary}`,
        `FABRIC_OPTS_PEER_BINARY=${fabricOptsPeerBinary}`,
        `FABRIC_OPTS_GO_BINARY=${fabricOptsGoBinary}`,
        `FABRIC_CONFIG_CHANNEL=${fabricConfigChannel}`,
        `FABRIC_CONFIG_CONTRACT=${fabricConfigContract}`,
      ],

      envFile: "../../../../.env.example",
    });
    await gatewayRunner.start();

    const sourceAsset: Asset = {
      owner: firstHighNetWorthAccount,
      ontology: JSON.stringify(BesuSATPInteraction),
      contractName: erc20TokenContract,
      contractAddress: assetContractAddress,
    };
    const destinyAsset: Asset = {
      owner: clientId,
      ontology: JSON.stringify(FabricSATPInteraction),
      contractName: satpContractName,
      mspId: fabricUser.mspId,
      channelName: fabricChannelName,
    };
    const req: TransactRequest = {
      contextID: "mockContext",
      fromDLTNetworkID: SupportedChain.BESU,
      toDLTNetworkID: SupportedChain.FABRIC,
      fromAmount: "100",
      toAmount: "1",
      originatorPubkey: assigneeEthAccount.address,
      beneficiaryPubkey: fabricUser.credentials.certificate,
      sourceAsset,
      destinyAsset,
    };

    const apiUrl = await gatewayRunner.getApiHost();
    console.log(apiUrl);
    const config = new GatewayConfiguration({ basePath: apiUrl });
    gatewayTransactionApi = new TransactionApi(config);
    gatewayAdminApi = new AdminApi(config);

    const responseHealth = await gatewayAdminApi.getHealthCheck();
    expect(responseHealth).not.toBeUndefined();

    const responseTransact = await gatewayTransactionApi.transact(req);
    expect(responseTransact).not.toBeUndefined();

    const responseBalanceOwner = await testing_connector.invokeContract({
      contractName: erc20TokenContract,
      keychainId: keychainPlugin1.getKeychainId(),
      invocationType: EthContractInvocationType.Call,
      methodName: "checkBalance",
      params: [firstHighNetWorthAccount],
      signingCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: besuKeyPair.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      gas: 999999999,
    });
    expect(responseBalanceOwner).toBeTruthy();
    expect(responseBalanceOwner.success).toBeTruthy();
    expect(responseBalanceOwner.callOutput).toBe("0");
    log.info("Amount was transfer correctly from the Owner account");

    const responseBalanceBridge = await testing_connector.invokeContract({
      contractName: erc20TokenContract,
      keychainId: keychainPlugin1.getKeychainId(),
      invocationType: EthContractInvocationType.Call,
      methodName: "checkBalance",
      params: [wrapperContractAddress],
      signingCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: besuKeyPair.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      gas: 999999999,
    });
    expect(responseBalanceBridge).toBeTruthy();
    expect(responseBalanceBridge.success).toBeTruthy();
    expect(responseBalanceBridge.callOutput).toBe("0");
    log.info("Amount was transfer correctly to the Wrapper account");

    const responseBalance1 = await apiClient.runTransactionV1({
      contractName: satpContractName,
      channelName: fabricChannelName,
      params: [BRIDGE_ID],
      methodName: "ClientIDAccountBalance",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: fabricSigningCredential,
    });

    expect(responseBalance1).not.toBeUndefined();
    expect(responseBalance1.status).toBeGreaterThan(199);
    expect(responseBalance1.status).toBeLessThan(300);
    expect(responseBalance1.data).not.toBeUndefined();
    expect(responseBalance1.data.functionOutput).toBe("0");
    log.info("Amount was transfer correctly from the Bridge account");

    const responseBalance2 = await apiClient.runTransactionV1({
      contractName: satpContractName,
      channelName: fabricChannelName,
      params: [clientId],
      methodName: "ClientIDAccountBalance",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: fabricSigningCredential,
    });
    expect(responseBalance2).not.toBeUndefined();
    expect(responseBalance2.status).toBeGreaterThan(199);
    expect(responseBalance2.status).toBeLessThan(300);
    expect(responseBalance2.data).not.toBeUndefined();
    expect(responseBalance2.data.functionOutput).toBe("1");
    log.info("Amount was transfer correctly to the Owner account");
  });
});
