import test, { Test } from "tape-promise/tape";
import {
  IListenOptions,
  LoggerProvider,
  LogLevelDesc,
  Servers,
} from "@hyperledger/cactus-common";
import {
  BesuTestLedger,
  Containers,
  FABRIC_25_LTS_AIO_FABRIC_VERSION,
  FABRIC_25_LTS_AIO_IMAGE_VERSION,
  FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1,
  FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_2,
  FabricTestLedgerV1,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";
import { IPluginCcTxVisualizationOptions } from "../../../main/typescript";
import { CcTxVisualization } from "../../../main/typescript/plugin-cc-tx-visualization";
import { randomUUID } from "crypto";
import { v4 as uuidv4 } from "uuid";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { DiscoveryOptions } from "fabric-network";
import { Configuration } from "@hyperledger/cactus-core-api";
import fs from "fs-extra";
import LockAssetContractJson from "../../solidity/lock-asset-contract/LockAsset.json";
import { PluginImportType } from "@hyperledger/cactus-core-api";

import {
  ChainCodeProgrammingLanguage,
  DefaultEventHandlerStrategy,
  FabricContractInvocationType,
  FileBase64,
  PluginLedgerConnectorFabric,
  IPluginLedgerConnectorFabricOptions,
} from "@hyperledger/cactus-plugin-ledger-connector-fabric";
import express from "express";
import bodyParser from "body-parser";
import http from "http";
import path from "path";
import { DefaultApi as FabricApi } from "@hyperledger/cactus-plugin-ledger-connector-fabric";
import { AddressInfo } from "net";
import Web3 from "web3";
import {
  EthContractInvocationType,
  PluginFactoryLedgerConnector,
  PluginLedgerConnectorBesu,
  ReceiptType,
  Web3SigningCredentialType,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";

const testCase = "Instantiate plugin with fabric, send 2 transactions";
const logLevel: LogLevelDesc = "TRACE";
const ccEventLogFile = "ccmodel-update";

const log = LoggerProvider.getOrCreate({
  level: logLevel,
  label: "cctxviz-fabtest",
});

let cctxViz: CcTxVisualization;
let cctxvizOptions: IPluginCcTxVisualizationOptions;
let ledger: FabricTestLedgerV1;
let besuTestLedger: BesuTestLedger;
const expressAppBesu = express();
expressAppBesu.use(bodyParser.json({ limit: "250mb" }));

const expressApp = express();
expressApp.use(bodyParser.json({ limit: "250mb" }));
const server = http.createServer(expressApp);

test(testCase, async (t: Test) => {
  const setupInfraTime = new Date();
  pruneDockerAllIfGithubAction({ logLevel })
    .then(() => {
      log.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning didn't throw OK");
    });

  ledger = new FabricTestLedgerV1({
    emitContainerLogs: true,
    publishAllPorts: true,
    imageVersion: FABRIC_25_LTS_AIO_IMAGE_VERSION,
    imageName: "ghcr.io/hyperledger/cactus-fabric2-all-in-one",
    envVars: new Map([["FABRIC_VERSION", FABRIC_25_LTS_AIO_FABRIC_VERSION]]),
    logLevel,
  });
  await ledger.start();

  besuTestLedger = new BesuTestLedger();
  await besuTestLedger.start();
  const tearDown = async () => {
    await ledger.stop();
    await ledger.destroy();
    await besuTestLedger.stop();
    await besuTestLedger.destroy();
    await pruneDockerAllIfGithubAction({ logLevel });
    log.debug("executing exit");
    process.exit(0);
  };

  test.onFinish(tearDown);
  const channelId = "mychannel";
  const channelName = channelId;

  const connectionProfile = await ledger.getConnectionProfileOrg1();
  const enrollAdminOut = await ledger.enrollAdmin();
  const adminWallet = enrollAdminOut[1];
  const [userIdentity] = await ledger.enrollUser(adminWallet);
  const sshConfig = await ledger.getSshConfig();

  const keychainInstanceId = uuidv4();
  const keychainId = uuidv4();
  const keychainEntryKey = "user2";
  const keychainEntryValue = JSON.stringify(userIdentity);

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

  const discoveryOptions: DiscoveryOptions = {
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
    logLevel,
    connectionProfile,
    discoveryOptions,
    eventHandlerOptions: {
      strategy: DefaultEventHandlerStrategy.NetworkScopeAllfortx,
      commitTimeout: 300,
    },
  };
  const plugin = new PluginLedgerConnectorFabric(pluginOptions);

  const listenOptions: IListenOptions = {
    hostname: "localhost",
    port: 0,
    server,
  };
  const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
  const { port } = addressInfo;

  await plugin.getOrCreateWebServices();
  await plugin.registerWebServices(expressApp);
  const apiUrl = `http://localhost:${port}`;

  const config = new Configuration({ basePath: apiUrl });

  const apiClient = new FabricApi(config);

  // packages/cactus-plugin-ledger-connector-fabric/src/test/typescript/fixtures/go/basic-asset-transfer/chaincode-typescript/package.json

  // /home/peter/a/cacti-upstream/packages/cactus-plugin-cc-tx-visualization/src/test/typescript/fixtures/go/basic-asset-transfer/chaincode-typescript/tsconfig.json

  // const contractRelPath =
  //   "../../../../../cactus-plugin-ledger-connector-fabric/src/test/typescript/fixtures/go/basic-asset-transfer/chaincode-typescript";
  // const contractDir = path.join(__dirname, contractRelPath);

  // packages/cactus-plugin-cc-tx-visualization/src/test/typescript/fabric-contracts/lock-asset/chaincode-typescript/tsconfig.json
  const contractRelPath = "../fabric-contracts/lock-asset/chaincode-typescript";
  const contractDir = path.join(__dirname, contractRelPath);

  // Setup: contract name
  const contractName = "basic-asset-transfer-2";

  // Setup: contract directory
  // const contractRelPath = "go/basic-asset-transfer/chaincode-typescript";

  const sourceFiles: FileBase64[] = [];
  {
    const filename = "./tsconfig.json";
    const relativePath = "./";
    const filePath = path.join(contractDir, relativePath, filename);
    const buffer = await fs.readFile(filePath);
    sourceFiles.push({
      body: buffer.toString("base64"),
      filepath: relativePath,
      filename,
    });
  }
  {
    const filename = "./package.json";
    const relativePath = "./";
    const filePath = path.join(contractDir, relativePath, filename);
    const buffer = await fs.readFile(filePath);
    sourceFiles.push({
      body: buffer.toString("base64"),
      filepath: relativePath,
      filename,
    });
  }
  {
    const filename = "./index.ts";
    const relativePath = "./src/";
    const filePath = path.join(contractDir, relativePath, filename);
    const buffer = await fs.readFile(filePath);
    sourceFiles.push({
      body: buffer.toString("base64"),
      filepath: relativePath,
      filename,
    });
  }
  {
    const filename = "./asset.ts";
    const relativePath = "./src/";
    const filePath = path.join(contractDir, relativePath, filename);
    const buffer = await fs.readFile(filePath);
    sourceFiles.push({
      body: buffer.toString("base64"),
      filepath: relativePath,
      filename,
    });
  }
  {
    const filename = "./assetTransfer.ts";
    const relativePath = "./src/";
    const filePath = path.join(contractDir, relativePath, filename);
    const buffer = await fs.readFile(filePath);
    sourceFiles.push({
      body: buffer.toString("base64"),
      filepath: relativePath,
      filename,
    });
  }

  // Setup: Deploy smart contract
  const res = await apiClient.deployContractV1({
    channelId,
    ccVersion: "1.0.0",
    sourceFiles,
    ccName: contractName,
    targetOrganizations: [
      FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1,
      FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_2,
    ],
    caFile:
      FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1.ORDERER_TLS_ROOTCERT_FILE,
    ccLabel: "basic-asset-transfer-2",
    ccLang: ChainCodeProgrammingLanguage.Typescript,
    ccSequence: 1,
    orderer: "orderer.example.com:7050",
    ordererTLSHostnameOverride: "orderer.example.com",
    connTimeout: 60,
  });

  const { success } = res.data;
  t.assert(success);
  t.assert(res.status === 200);

  const contractNameBesu = "LockAsset";

  const rpcApiHttpHost = await besuTestLedger.getRpcApiHttpHost();
  const rpcApiWsHost = await besuTestLedger.getRpcApiWsHost();

  /**
   * Constant defining the standard 'dev' Besu genesis.json contents.
   *
   * @see https://github.com/hyperledger/besu/blob/1.5.1/config/src/main/resources/dev.json
   */
  const firstHighNetWorthAccount = besuTestLedger.getGenesisAccountPubKey();
  const besuKeyPair = {
    privateKey: besuTestLedger.getGenesisAccountPrivKey(),
  };

  const web3 = new Web3(rpcApiHttpHost);
  const testEthAccount = web3.eth.accounts.create(uuidv4());

  const keychainEntryKeyBesu = uuidv4();
  const keychainEntryValueBesu = testEthAccount.privateKey;
  const keychainPluginBesu = new PluginKeychainMemory({
    instanceId: uuidv4(),
    keychainId: uuidv4(),
    // pre-provision keychain with mock backend holding the private key of the
    // test account that we'll reference while sending requests with the
    // signing credential pointing to this keychain entry.
    backend: new Map([[keychainEntryKeyBesu, keychainEntryValueBesu]]),
    logLevel,
  });
  keychainPluginBesu.set(
    LockAssetContractJson.contractName,
    JSON.stringify(LockAssetContractJson),
  );
  const factory = new PluginFactoryLedgerConnector({
    pluginImportType: PluginImportType.Local,
  });
  const connector: PluginLedgerConnectorBesu = await factory.create({
    rpcApiHttpHost,
    rpcApiWsHost,
    instanceId: uuidv4(),
    pluginRegistry: new PluginRegistry({ plugins: [keychainPluginBesu] }),
  });

  const balance = await web3.eth.getBalance(testEthAccount.address);
  t.ok(balance); // returns On (Javascript zero in BigInt)

  const deployOut = await connector.deployContract({
    keychainId: keychainPluginBesu.getKeychainId(),
    contractName: LockAssetContractJson.contractName,
    contractAbi: LockAssetContractJson.abi,
    constructorArgs: [],
    web3SigningCredential: {
      ethAccount: firstHighNetWorthAccount,
      secret: besuKeyPair.privateKey,
      type: Web3SigningCredentialType.PrivateKeyHex,
    },
    bytecode: LockAssetContractJson.bytecode,
    gas: 1000000,
  });
  t.ok(deployOut);
  t.ok(deployOut.transactionReceipt);

  const setupInfraTimeEnd = new Date();
  log.debug(
    `EVAL-testFile-SETUP-INFRA:${
      setupInfraTimeEnd.getTime() - setupInfraTime.getTime()
    }`,
  );

  cctxvizOptions = {
    instanceId: randomUUID(),
    logLevel: logLevel,
    besuTxObservable: connector.getTxSubjectObservable(),
    fabricTxObservable: plugin.getTxSubjectObservable(),
  };

  // Initialize CcTxVisualization plugin
  cctxViz = new CcTxVisualization(cctxvizOptions);
  cctxViz.setCaseId("FABRIC_BESU");
  t.ok(cctxViz);
  log.info("cctxviz plugin is ok");

  // create the blank file
  let logNameCsv = await cctxViz.persistCrossChainLogCsv(ccEventLogFile);
  console.log(logNameCsv);
  t.ok(logNameCsv);

  const filePath = path.join(__dirname, "../../csv/" + ccEventLogFile + ".csv");

  t.comment("start monitor transactions");
  cctxViz.monitorTransactions();
  cctxViz.periodicCCModelUpdateFromFile(1000, filePath);

  const numberOfCases = 10;
  const txsPerCase = 6;
  let caseNumber = 1;
  let previousAggregation = cctxViz.ccModel.lastAggregation;
  let updateCount = 0;

  t.comment("start transactions");
  const startTransactions = new Date();

  await connector.transact({
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
      to: testEthAccount.address,
      value: 10e9,
      gas: 1000000,
    },
  });

  while (numberOfCases >= caseNumber) {
    if (cctxViz.ccModel.lastAggregation > previousAggregation) {
      previousAggregation = cctxViz.ccModel.lastAggregation;
      console.log(`Cross-chain model has been updated: ${previousAggregation}`);
      t.ok(cctxViz.getModel);
      updateCount++;
    }

    const { success: createResBesu } = await connector.invokeContract({
      contractName: contractNameBesu,
      keychainId: keychainPluginBesu.getKeychainId(),
      invocationType: EthContractInvocationType.Send,
      methodName: "createAsset",
      params: ["asset1", 5],
      signingCredential: {
        ethAccount: testEthAccount.address,
        secret: besuKeyPair.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      gas: 1000000,
    });
    t.ok(createResBesu);
    t.assert(createResBesu === true);
    log.warn("create ok");

    const { success: lockResBesu } = await connector.invokeContract({
      contractName: contractNameBesu,
      keychainId: keychainPluginBesu.getKeychainId(),
      invocationType: EthContractInvocationType.Send,
      methodName: "lockAsset",
      params: ["asset1"],
      signingCredential: {
        ethAccount: testEthAccount.address,
        secret: besuKeyPair.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      gas: 1000000,
    });
    log.warn("checking lock res");
    t.ok(lockResBesu);
    const assetId = "asset1";

    const createResFabric = await apiClient.runTransactionV1({
      contractName,
      channelName,
      params: [assetId, "19", "fabricUser"],
      methodName: "CreateAsset",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: {
        keychainId,
        keychainRef: keychainEntryKey,
      },
    });
    t.ok(createResFabric);

    // READS are not considered transactions, but are relevant to our use case
    // const readResFabric = await apiClient.runTransactionV1({
    //   contractName,
    //   channelName,
    //   params: [assetId],
    //   methodName: "ReadAsset",
    //   invocationType: FabricContractInvocationType.Send,
    //   signingCredential: {
    //     keychainId,
    //     keychainRef: keychainEntryKey,
    //   },
    // });
    // t.ok(readResFabric);

    const transferResFabric = await apiClient.runTransactionV1({
      contractName,
      channelName,
      params: [assetId, "owner2"],
      methodName: "TransferAsset",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: {
        keychainId,
        keychainRef: keychainEntryKey,
      },
    });
    t.ok(transferResFabric);

    const transferResBackFabric = await apiClient.runTransactionV1({
      contractName,
      channelName,
      params: [assetId, "owner1"],
      methodName: "TransferAsset",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: {
        keychainId,
        keychainRef: keychainEntryKey,
      },
    });
    t.ok(transferResBackFabric);

    const deleteResFabric = await apiClient.runTransactionV1({
      contractName,
      channelName,
      params: [assetId],
      methodName: "DeleteAsset",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: {
        keychainId,
        keychainRef: keychainEntryKey,
      },
    });
    t.ok(deleteResFabric);

    // export the cross chain event log
    await cctxViz.txReceiptToCrossChainEventLogEntry();
    logNameCsv = await cctxViz.persistCrossChainLogCsv(ccEventLogFile);
    console.log(logNameCsv);
    log.debug(`numberEventsLog:${cctxViz.numberEventsLog}`);
    log.debug(
      `getProcessedCCEvents():${cctxViz.ccModel.getProcessedCCEvents()}`,
    );
    t.ok(logNameCsv);

    caseNumber++;
  }
  t.comment("transactions done");
  const endTransactions = new Date();
  log.debug(
    `EVAL-testFile-SEND-MESSAGES:${
      endTransactions.getTime() - startTransactions.getTime()
    }`,
  );

  t.comment("stop updating cross chain model");
  await cctxViz.stopPeriodicCCModelUpdate(filePath);
  const totalTxs = txsPerCase * numberOfCases;
  t.assert(cctxViz.numberEventsLog === totalTxs);
  log.debug(`numberEventsLog:${cctxViz.numberEventsLog}`);
  t.assert(cctxViz.numberUnprocessedReceipts === 0);
  log.debug(`numberUnprocessedReceipts:${cctxViz.numberUnprocessedReceipts}`);

  // check if model contains all events totalTxs
  // t.assert(cctxViz.ccModel.getProcessedCCEvents() === cctxViz.numberEventsLog);
  t.assert(cctxViz.ccModel.getProcessedCCEvents() === totalTxs);
  log.debug(`numberEventsLog:${cctxViz.numberEventsLog}`);
  log.debug(`getProcessedCCEvents():${cctxViz.ccModel.getProcessedCCEvents()}`);

  log.debug(`EVAL-testFile-UPDATE-CROSS-CHAIN-MODEL:${updateCount}`);
  log.debug(`EVAL-testFile-UPDATE-CROSS-CHAIN-MODEL:${updateCount}`);

  // export cross-chain event log
  await cctxViz.persistCrossChainLogCsv("usecase-fabric-besu-ccmodel-update");
  await cctxViz.persistCrossChainLogJson("usecase-fabric-besu-ccmodel-update");
});
