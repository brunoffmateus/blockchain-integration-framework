import { randomUUID as uuidv4 } from "node:crypto";
import "jest-extended";

import {
  IListenOptions,
  LogLevelDesc,
  LoggerProvider,
  Secp256k1Keys,
  Servers,
} from "@hyperledger/cactus-common";
import { v4 as internalIpV4 } from "internal-ip";

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
  ConnectionProfile,
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
  ISATPGatewayRunnerConstructorOptions,
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
import SATPWrapperContract from "../../../solidity/generated/satp-wrapper.sol/SATPWrapperContract.json";
import { TransactRequest, Asset } from "../../../main/typescript";
import {
  Address,
  GatewayIdentity,
  SupportedChain,
} from "../../../main/typescript/core/types";
import FabricSATPInteraction from "../../../test/typescript/fabric/satp-erc20-interact.json";
import BesuSATPInteraction from "../../solidity/satp-erc20-interact.json";
import { Config } from "node-ssh";
import { createClient } from "../test-utils";
import {
  DEFAULT_PORT_GATEWAY_API,
  DEFAULT_PORT_GATEWAY_CLIENT,
  DEFAULT_PORT_GATEWAY_SERVER,
  SATP_VERSION,
} from "../../../main/typescript/core/constants";
import { bufArray2HexStr } from "../../../main/typescript/gateway-utils";
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

let keychainInstanceId: string;
let keychainId: string;
let keychainEntryKey: string;
let keychainEntryValue: string;

let keychainPluginBridge: PluginKeychainMemory;
let keychainEntryKeyBridge: string;
let keychainEntryValueBridge: string;

let keychainPlugin1: PluginKeychainMemory;
let keychainPlugin2: PluginKeychainMemory;

let besuOptionsKeychainEntryValue: string;
let besuOptionsKeychainEntryKey: string;

let discoveryOptions: DiscoveryOptions;
let sshConfig: Config;

let fabricUser: X509Identity;

let apiClient: FabricApi;

let gatewayRunner1: SATPGatewayRunner;
let gatewayRunner2: SATPGatewayRunner;

afterAll(async () => {
  await gatewayRunner1.stop();
  await gatewayRunner1.destroy();
  await gatewayRunner2.stop();
  await gatewayRunner2.destroy();
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

  const lanIp = await internalIpV4();
  if (!lanIp) {
    throw new Error(`LAN IP falsy. internal-ip package failed.`);
  }

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
    const connectionProfile: ConnectionProfile =
      await fabricLedger.getConnectionProfileOrg1();
    expect(connectionProfile).not.toBeUndefined();

    const bridgeProfile: ConnectionProfile =
      await fabricLedger.getConnectionProfileOrgX("org2");
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

    keychainInstanceId = uuidv4();
    keychainId = uuidv4();
    keychainEntryKey = "user1";
    keychainEntryValue = JSON.stringify(userIdentity);

    console.log("keychainEntryValue: ", keychainEntryValue);

    const keychainPlugin = new PluginKeychainMemory({
      instanceId: keychainInstanceId,
      keychainId,
      logLevel,
      backend: new Map([
        [keychainEntryKey, keychainEntryValue],
        ["some-other-entry-key", "some-other-entry-value"],
      ]),
    });

    const pluginRegistry = new PluginRegistry({ plugins: [keychainPlugin] });

    const keychainInstanceIdBridge = uuidv4();
    const keychainIdBridge = uuidv4();
    keychainEntryKeyBridge = "bridge1";
    keychainEntryValueBridge = JSON.stringify(bridgeIdentity);

    console.log("keychainEntryValueBridge: ", keychainEntryValueBridge);

    keychainPluginBridge = new PluginKeychainMemory({
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
      keyPair: Secp256k1Keys.generateKeyPairsBuffer(),
      instanceId: uuidv4(),
      pluginRegistry: new PluginRegistry(),
      logLevel,
    };

    pluginOptionsFabricBridge = {
      instanceId: uuidv4(),
      dockerBinary: "/usr/local/bin/docker",
      peerBinary: "/fabric-samples/bin/peer",
      goBinary: "/usr/local/go/bin/go",
      pluginRegistry: pluginRegistryBridge,
      cliContainerEnv: FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_2,
      sshConfig,
      logLevel: "DEBUG",
      connectionProfile: bridgeProfile,
      discoveryOptions,
      eventHandlerOptions: {
        strategy: DefaultEventHandlerStrategy.NetworkScopeAllfortx,
        commitTimeout: 300,
      },
    };

    fabricConfig = {
      network: SupportedChain.FABRIC,
      signingCredential: bridgeFabricSigningCredential,
      channelName: fabricChannelName,
      contractName: satpWrapperContractName,
      options: pluginOptionsFabricBridge,
      bungeeOptions: pluginBungeeFabricOptions,
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
    // rpcApiHttpHost = rpcApiHttpHost.replace("127.0.0.1", lanIp);

    rpcApiWsHost = await besuLedger.getRpcApiWsHost();
    // rpcApiWsHost = rpcApiWsHost.replace("127.0.0.1", lanIp);

    console.log("test - rpcApiHttpHost:");
    console.log(rpcApiHttpHost);
    console.log("test - rpcApiWsHost:");
    console.log(rpcApiWsHost);
    web3 = new Web3(rpcApiHttpHost);
    firstHighNetWorthAccount = besuLedger.getGenesisAccountPubKey();

    bridgeEthAccount = await besuLedger.createEthTestAccount();

    assigneeEthAccount = await besuLedger.createEthTestAccount();

    besuKeyPair = {
      privateKey: besuLedger.getGenesisAccountPrivKey(),
    };

    besuOptionsKeychainEntryValue = besuKeyPair.privateKey;
    besuOptionsKeychainEntryKey = uuidv4();

    keychainPlugin1 = new PluginKeychainMemory({
      instanceId: uuidv4(),
      keychainId: uuidv4(),

      backend: new Map([
        [besuOptionsKeychainEntryKey, besuOptionsKeychainEntryValue],
      ]),
      logLevel,
    });

    keychainPlugin2 = new PluginKeychainMemory({
      instanceId: uuidv4(),
      keychainId: uuidv4(),

      backend: new Map([
        [besuOptionsKeychainEntryKey, besuOptionsKeychainEntryValue],
      ]),
      logLevel,
    });

    erc20TokenContract = "SATPContract";
    contractNameWrapper = "SATPWrapperContract";

    keychainPlugin1.set(erc20TokenContract, JSON.stringify(SATPContract));
    keychainPlugin2.set(
      contractNameWrapper,
      JSON.stringify(SATPWrapperContract),
    );

    const pluginRegistry = new PluginRegistry({
      plugins: [keychainPlugin1, keychainPlugin2],
    });

    besuOptions = {
      instanceId: uuidv4(),
      rpcApiHttpHost,
      rpcApiWsHost,
      pluginRegistry,
      logLevel,
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

    const deployOutSATPContract =
      await testing_connector.deployContractNoKeychain({
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

    const deployOutWrapperContract =
      await testing_connector.deployContractNoKeychain({
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
      keyPair: Secp256k1Keys.generateKeyPairsBuffer(),
      instanceId: uuidv4(),
      pluginRegistry: new PluginRegistry(),
      logLevel,
    };

    besuConfig = {
      network: SupportedChain.BESU,
      keychainId: keychainPlugin2.getKeychainId(),
      signingCredential: {
        ethAccount: bridgeEthAccount.address,
        secret: bridgeEthAccount.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      contractName: contractNameWrapper,
      contractAddress: wrapperContractAddress,
      contractAbi: JSON.stringify(SATPWrapperContract.abi),
      options: besuOptions,
      bungeeOptions: pluginBungeeBesuOptions,
      gas: 999999999999999,
    };

    const giveRoleRes = await testing_connector.invokeContract({
      contractName: erc20TokenContract,
      contractAbi: SATPContract.abi,
      invocationType: EthContractInvocationType.Send,
      contractAddress: assetContractAddress,
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
    contractAbi: SATPContract.abi,
    invocationType: EthContractInvocationType.Send,
    contractAddress: assetContractAddress,
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
    contractAbi: SATPContract.abi,
    invocationType: EthContractInvocationType.Send,
    contractAddress: assetContractAddress,
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
    // besuConfig Json object setup:
    const besuPluginRegistryOptionsJSON = {
      plugins: [
        {
          instanceId: keychainPlugin1.getInstanceId(),
          keychainId: keychainPlugin1.getKeychainId(),
          logLevel,
          backend: [
            {
              keychainEntry: besuOptionsKeychainEntryKey,
              keychainEntryValue: besuOptionsKeychainEntryValue,
            },
          ],
          erc20TokenContract,
        },
        {
          instanceId: keychainPlugin2.getInstanceId(),
          keychainId: keychainPlugin2.getKeychainId(),
          logLevel,
          backend: [
            {
              keychainEntry: besuOptionsKeychainEntryKey,
              keychainEntryValue: besuOptionsKeychainEntryValue,
            },
          ],
        },
      ],
    };

    const besuOptionsJSON = {
      instanceId: besuOptions.instanceId,
      rpcApiHttpHost: besuOptions.rpcApiHttpHost,
      rpcApiWsHost: besuOptions.rpcApiWsHost,
      pluginRegistryOptions: besuPluginRegistryOptionsJSON,
      logLevel: besuOptions.logLevel,
    };

    const besuBungeeOptionsJSON = {
      keyPair: {
        privateKey: Buffer.from(
          pluginBungeeBesuOptions.keyPair!.privateKey,
        ).toString("hex"),
        publicKey: Buffer.from(
          pluginBungeeBesuOptions.keyPair!.publicKey,
        ).toString("hex"),
      },
      instanceId: pluginBungeeBesuOptions.instanceId,
      logLevel: pluginBungeeBesuOptions.logLevel,
    };

    const besuConfigJSON = {
      network: besuConfig.network,
      keychainId: besuConfig.keychainId,
      signingCredential: besuConfig.signingCredential,
      contractName: besuConfig.contractName,
      contractAddress: besuConfig.contractAddress,
      contractAbi: besuConfig.contractAbi,
      gas: besuConfig.gas,
      options: besuOptionsJSON,
      bungeeOptions: besuBungeeOptionsJSON,
    };

    // fabricConfig Json object setup:
    const fabricPluginRegistryOptionsJSON = {
      plugins: [
        {
          instanceId: keychainPluginBridge.getInstanceId(),
          keychainId: keychainPluginBridge.getKeychainId(),
          logLevel,
          backend: [
            {
              keychainEntry: keychainEntryKeyBridge,
              keychainEntryValue: keychainEntryValueBridge,
            },
            {
              keychainEntry: "some-other-entry-key",
              keychainEntryValue: "some-other-entry-value",
            },
          ],
        },
      ],
    };

    const fabricOptionsJSON = {
      instanceId: pluginOptionsFabricBridge.instanceId,
      dockerBinary: pluginOptionsFabricBridge.dockerBinary,
      peerBinary: pluginOptionsFabricBridge.peerBinary,
      goBinary: pluginOptionsFabricBridge.goBinary,
      pluginRegistryOptions: fabricPluginRegistryOptionsJSON,
      cliContainerEnv: pluginOptionsFabricBridge.cliContainerEnv,
      sshConfig: pluginOptionsFabricBridge.sshConfig,
      logLevel: pluginOptionsFabricBridge.logLevel,
      connectionProfile: pluginOptionsFabricBridge.connectionProfile,
      discoveryOptions: pluginOptionsFabricBridge.discoveryOptions,
      eventHandlerOptions: pluginOptionsFabricBridge.eventHandlerOptions,
    };

    const fabricBungeeOptionsJSON = {
      keyPair: {
        privateKey: Buffer.from(
          pluginBungeeFabricOptions.keyPair!.privateKey,
        ).toString("hex"),
        publicKey: Buffer.from(
          pluginBungeeFabricOptions.keyPair!.publicKey,
        ).toString("hex"),
      },
      instanceId: pluginBungeeFabricOptions.instanceId,
      logLevel: pluginBungeeFabricOptions.logLevel,
    };

    const fabricConfigJSON = {
      network: fabricConfig.network,
      signingCredential: fabricConfig.signingCredential,
      channelName: fabricConfig.channelName,
      contractName: fabricConfig.contractName,
      options: fabricOptionsJSON,
      bungeeOptions: fabricBungeeOptionsJSON,
    };

    // gatewayIds setup:
    const gateway1KeyPair = Secp256k1Keys.generateKeyPairsBuffer();
    const gateway2KeyPair = Secp256k1Keys.generateKeyPairsBuffer();
    const address: Address = `http://localhost`;

    const gatewayIdentity1 = {
      id: "mockID-1",
      name: "CustomGateway",
      version: [
        {
          Core: SATP_VERSION,
          Architecture: SATP_VERSION,
          Crash: SATP_VERSION,
        },
      ],
      supportedDLTs: [SupportedChain.BESU],
      proofID: "mockProofID10",
      address,
      gatewayClientPort: DEFAULT_PORT_GATEWAY_CLIENT,
      gatewayServerPort: DEFAULT_PORT_GATEWAY_SERVER,
      gatewayOpenAPIPort: DEFAULT_PORT_GATEWAY_API,
    } as GatewayIdentity;

    const gatewayIdentity2 = {
      id: "mockID-2",
      name: "CustomGateway",
      version: [
        {
          Core: SATP_VERSION,
          Architecture: SATP_VERSION,
          Crash: SATP_VERSION,
        },
      ],
      supportedDLTs: [SupportedChain.FABRIC],
      proofID: "mockProofID11",
      address,
      gatewayServerPort: 3110,
      gatewayClientPort: 3111,
      gatewayOpenAPIPort: 4110,
    } as GatewayIdentity;

    // configFile setup for gateway1:
    console.log("Creating gatewayJSON1...");
    const gatewayJSON1 = {
      gid: gatewayIdentity1,
      logLevel: "DEBUG",
      keyPair: {
        privateKey: Buffer.from(gateway1KeyPair.privateKey).toString("hex"),
        publicKey: Buffer.from(gateway1KeyPair.publicKey).toString("hex"),
      },
      counterPartyGateways: [
        {
          id: "mockID-2",
          name: "CustomGateway",
          pubKey: bufArray2HexStr(gateway2KeyPair.publicKey),
          version: [
            {
              Core: SATP_VERSION,
              Architecture: SATP_VERSION,
              Crash: SATP_VERSION,
            },
          ],
          supportedDLTs: [SupportedChain.FABRIC],
          proofID: "mockProofID11",
          address,
          gatewayServerPort: 3110,
          gatewayClientPort: 3111,
          gatewayOpenAPIPort: 4110,
        },
      ],
      environment: "development",
      enableOpenAPI: true,
      bridgesConfig: [besuConfigJSON],
    };

    // configFile setup for gateway2:
    console.log("Creating gatewayJSON2...");
    const gatewayJSON2 = {
      gid: gatewayIdentity2,
      logLevel: "DEBUG",
      keyPair: {
        privateKey: Buffer.from(gateway2KeyPair.privateKey).toString("hex"),
        publicKey: Buffer.from(gateway2KeyPair.publicKey).toString("hex"),
      },
      counterPartyGateways: [
        {
          id: "mockID-1",
          name: "CustomGateway",
          pubKey: bufArray2HexStr(gateway1KeyPair.publicKey),
          version: [
            {
              Core: SATP_VERSION,
              Architecture: SATP_VERSION,
              Crash: SATP_VERSION,
            },
          ],
          supportedDLTs: [SupportedChain.BESU],
          proofID: "mockProofID10",
          address,
          gatewayClientPort: DEFAULT_PORT_GATEWAY_CLIENT,
          gatewayServerPort: DEFAULT_PORT_GATEWAY_SERVER,
          gatewayOpenAPIPort: DEFAULT_PORT_GATEWAY_API,
        },
      ],
      environment: "development",
      enableOpenAPI: true,
      bridgesConfig: [fabricConfigJSON],
    };

    // gateway 1 configuration setup:
    const configDir1 = path.join(__dirname, "gateway-info/config/gateway-1");
    if (!fs.existsSync(configDir1)) {
      fs.mkdirSync(configDir1, { recursive: true });
    }
    const configFile1 = path.join(configDir1, "gateway-1-config.json");
    console.log("Creating gateway-1-config.json...");
    fs.writeFileSync(configFile1, JSON.stringify(gatewayJSON1, null, 2));
    expect(fs.existsSync(configFile1)).toBe(true);

    // gateway 2 configuration setup:
    const configDir2 = path.join(__dirname, "gateway-info/config/gateway-2");
    if (!fs.existsSync(configDir2)) {
      fs.mkdirSync(configDir2, { recursive: true });
    }
    const configFile2 = path.join(configDir2, "gateway-2-config.json");
    console.log("Creating gateway-2-config.json...");
    fs.writeFileSync(configFile2, JSON.stringify(gatewayJSON2, null, 2));
    expect(fs.existsSync(configFile2)).toBe(true);

    // gateway 1 outputLogFile and errorLogFile setup:
    const logDir1 = path.join(__dirname, "gateway-info/logs/gateway-1");
    if (!fs.existsSync(logDir1)) {
      fs.mkdirSync(logDir1, { recursive: true });
    }
    const outputLogFile1 = path.join(logDir1, "gateway-logs-output.log");
    const errorLogFile1 = path.join(logDir1, "gateway-logs-error.log");
    // Clear any existing logs
    fs.writeFileSync(outputLogFile1, "");
    fs.writeFileSync(errorLogFile1, "");
    // existance check
    expect(fs.existsSync(outputLogFile1)).toBe(true);
    expect(fs.existsSync(errorLogFile1)).toBe(true);

    // gateway 2 outputLogFile and errorLogFile setup:
    const logDir2 = path.join(__dirname, "gateway-info/logs/gateway-2");
    if (!fs.existsSync(logDir2)) {
      fs.mkdirSync(logDir2, { recursive: true });
    }
    const outputLogFile2 = path.join(logDir2, "gateway-logs-output.log");
    const errorLogFile2 = path.join(logDir2, "gateway-logs-error.log");
    // Clear any existing logs
    fs.writeFileSync(outputLogFile2, "");
    fs.writeFileSync(errorLogFile2, "");
    // existance check
    expect(fs.existsSync(outputLogFile2)).toBe(true);
    expect(fs.existsSync(errorLogFile2)).toBe(true);

    // gatewayRunner1 setup:
    const gatewayRunnerOptions1: ISATPGatewayRunnerConstructorOptions = {
      containerImageVersion: "latest",
      containerImageName: "cactus-plugin-satp-hermes-satp-hermes-gateway",
      logLevel,
      emitContainerLogs: true,
      configFile: configFile1,
      outputLogFile: outputLogFile1,
      errorLogFile: errorLogFile1,
      serverPort: gatewayIdentity1.gatewayServerPort,
      clientPort: gatewayIdentity1.gatewayClientPort,
      apiPort: gatewayIdentity1.gatewayOpenAPIPort,
    };

    // gatewayRunner2 setup:
    const gatewayRunnerOptions2: ISATPGatewayRunnerConstructorOptions = {
      containerImageVersion: "latest",
      containerImageName: "cactus-plugin-satp-hermes-satp-hermes-gateway",
      logLevel,
      emitContainerLogs: true,
      configFile: configFile2,
      outputLogFile: outputLogFile2,
      errorLogFile: errorLogFile2,
      serverPort: gatewayIdentity2.gatewayServerPort,
      clientPort: gatewayIdentity2.gatewayClientPort,
      apiPort: gatewayIdentity2.gatewayOpenAPIPort,
    };

    gatewayRunner1 = new SATPGatewayRunner(gatewayRunnerOptions1);
    gatewayRunner2 = new SATPGatewayRunner(gatewayRunnerOptions2);

    console.log("starting gatewayRunner1...");
    await gatewayRunner1.start(true);
    console.log("gatewayRunner1 started sucessfully");
    console.log("starting gatewayRunner2...");
    await gatewayRunner2.start(true);
    console.log("gatewayRunner2 started sucessfully");

    const sourceAsset: Asset = {
      owner: firstHighNetWorthAccount,
      ontology: JSON.stringify(BesuSATPInteraction),
      contractName: erc20TokenContract,
      contractAddress: assetContractAddress,
    };
    const receiverAsset: Asset = {
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
      receiverAsset,
    };

    const port = await gatewayRunner1.getHostPort(DEFAULT_PORT_GATEWAY_API);

    const transactionApiClient = createClient(
      "TransactionApi",
      address,
      port,
      log,
    );
    const adminApi = createClient("AdminApi", address, port, log);

    const res = await transactionApiClient.transact(req);
    log.info(res?.data.statusResponse);

    const sessions = await adminApi.getSessionIds({});
    expect(sessions.data).toBeTruthy();
    expect(sessions.data.length).toBe(1);
    expect(sessions.data[0]).toBe(res.data.sessionID);

    const responseBalanceOwner = await testing_connector.invokeContract({
      contractName: erc20TokenContract,
      contractAbi: SATPContract.abi,
      invocationType: EthContractInvocationType.Call,
      contractAddress: assetContractAddress,
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
    console.log(
      `Balance Besu Owner Account: ${responseBalanceOwner.callOutput}`,
    );
    expect(responseBalanceOwner.callOutput).toBe("0");
    log.info("Amount was transfer correctly from the Owner account");

    const responseBalanceBridge = await testing_connector.invokeContract({
      contractName: erc20TokenContract,
      contractAbi: SATPContract.abi,
      invocationType: EthContractInvocationType.Call,
      contractAddress: assetContractAddress,
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
    console.log(
      `Balance Besu Bridge Account: ${responseBalanceBridge.callOutput}`,
    );
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
    console.log(
      `Balance Fabric Bridge Account: ${responseBalance1.data.functionOutput}`,
    );
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
    console.log(
      `Balance Fabric Owner Account: ${responseBalance2.data.functionOutput}`,
    );
    log.info("Amount was transfer correctly to the Owner account");
  });
});