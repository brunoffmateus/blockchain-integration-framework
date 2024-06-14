import "jest-extended";
import {
  IListenOptions,
  LogLevelDesc,
  LoggerProvider,
  Servers,
} from "@hyperledger/cactus-common";
import { Server as SocketIoServer } from "socket.io";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { Configuration, Constants } from "@hyperledger/cactus-core-api";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import bodyParser from "body-parser";
import http from "http";
import {
  Web3SigningCredentialType as Web3SigningCredentialTypeBesu,
  PluginLedgerConnectorBesu,
  EthContractInvocationType as EthContractInvocationTypeBesu,
  ReceiptType,
  IPluginLedgerConnectorBesuOptions,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";
import {
  GethTestLedger,
  WHALE_ACCOUNT_ADDRESS,
} from "@hyperledger/cactus-test-geth-ledger";
import {
  EthContractInvocationType,
  PluginLedgerConnectorEthereum,
  Web3SigningCredentialType,
  DefaultApi as EthereumApi,
} from "@hyperledger/cactus-plugin-ledger-connector-ethereum";
import {
  BesuTestLedger,
  Containers,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";
import Web3 from "web3";
import { Account } from "web3-core";
import express from "express";
import { AddressInfo } from "net";
import { v4 as uuidv4 } from "uuid";
import { CcModelHephaestus } from "../../../main/typescript/plugin-ccmodel-hephaestus";
import { IPluginCcModelHephaestusOptions } from "../../../main/typescript";
import LockAssetContractJson from "../../solidity/lock-asset-contract/LockAsset.json";
import { CrossChainModelType } from "../../../main/typescript/models/crosschain-model";

const logLevel: LogLevelDesc = "INFO";

let besuLedger: BesuTestLedger;
let besuContractName: string;
let rpcApiHttpHostBesu: string;
let rpcApiWsHost: string;
let web3Besu: Web3;
let firstHighNetWorthAccount: string;
let besuConnector: PluginLedgerConnectorBesu;
let besuKeyPair: { privateKey: string };
let testEthAccountBesu: Account;
let keychainPluginBesu: PluginKeychainMemory;

const containerImageName = "ghcr.io/hyperledger/cacti-geth-all-in-one";
const containerImageVersion = "2023-07-27-2a8c48ed6";
const keychainEntryKey = uuidv4();
let testEthAccount: Account;
let web3Eth: InstanceType<typeof Web3>;
let addressInfo;
let address: string;
let port: number;
let apiHost: string;
let apiConfig;
let ethereumLedger: GethTestLedger;
let ethereumApiClient: EthereumApi;
let ethereumConnector: PluginLedgerConnectorEthereum;
let rpcApiHttpHostEthereum: string;
let keychainPluginEthereum: PluginKeychainMemory;
const expressAppEthereum = express();
expressAppEthereum.use(bodyParser.json({ limit: "250mb" }));
const ethereumServer = http.createServer(expressAppEthereum);
const wsApi = new SocketIoServer(ethereumServer, {
  path: Constants.SocketIoConnectionPathV1,
});

let hephaestus: CcModelHephaestus;
let hephaestusOptions: IPluginCcModelHephaestusOptions;
let modeledTransactions: number;

const log = LoggerProvider.getOrCreate({
  level: logLevel,
  label: "besu-ethereum-asset-transfer.test",
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
    besuLedger = new BesuTestLedger();
    await besuLedger.start();

    rpcApiHttpHostBesu = await besuLedger.getRpcApiHttpHost();
    rpcApiWsHost = await besuLedger.getRpcApiWsHost();
    web3Besu = new Web3(rpcApiHttpHostBesu);
    firstHighNetWorthAccount = besuLedger.getGenesisAccountPubKey();

    testEthAccountBesu = await besuLedger.createEthTestAccount();

    besuKeyPair = {
      privateKey: besuLedger.getGenesisAccountPrivKey(),
    };

    besuContractName = "LockAsset";

    const keychainEntryValue = besuKeyPair.privateKey;
    const keychainEntryKey = uuidv4();
    keychainPluginBesu = new PluginKeychainMemory({
      instanceId: uuidv4(),
      keychainId: uuidv4(),

      backend: new Map([[keychainEntryKey, keychainEntryValue]]),
      logLevel,
    });
    keychainPluginBesu.set(
      LockAssetContractJson.contractName,
      JSON.stringify(LockAssetContractJson),
    );

    const pluginRegistry = new PluginRegistry({
      plugins: [keychainPluginBesu],
    });

    const options: IPluginLedgerConnectorBesuOptions = {
      instanceId: uuidv4(),
      rpcApiHttpHost: rpcApiHttpHostBesu,
      rpcApiWsHost,
      pluginRegistry,
      logLevel,
    };
    besuConnector = new PluginLedgerConnectorBesu(options);
    pluginRegistry.add(besuConnector);

    await besuConnector.transact({
      web3SigningCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: besuKeyPair.privateKey,
        type: Web3SigningCredentialTypeBesu.PrivateKeyHex,
      },
      consistencyStrategy: {
        blockConfirmations: 0,
        receiptType: ReceiptType.NodeTxPoolAck,
      },
      transactionConfig: {
        from: firstHighNetWorthAccount,
        to: testEthAccountBesu.address,
        value: 10e9,
        gas: 1000000,
      },
    });
    const balance = await web3Besu.eth.getBalance(testEthAccountBesu.address);
    expect(balance).toBeTruthy();
    expect(parseInt(balance, 10)).toBeGreaterThan(10e9);

    log.info("Connector initialized");

    const deployOut = await besuConnector.deployContract({
      keychainId: keychainPluginBesu.getKeychainId(),
      contractName: LockAssetContractJson.contractName,
      contractAbi: LockAssetContractJson.abi,
      constructorArgs: [],
      web3SigningCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: besuKeyPair.privateKey,
        type: Web3SigningCredentialTypeBesu.PrivateKeyHex,
      },
      bytecode: LockAssetContractJson.bytecode,
      gas: 1000000,
    });
    expect(deployOut).toBeTruthy();
    expect(deployOut.transactionReceipt).toBeTruthy();
    expect(deployOut.transactionReceipt.contractAddress).toBeTruthy();
    log.info("Contract Deployed successfully");
  }
  {
    ethereumLedger = new GethTestLedger({
      containerImageName,
      containerImageVersion,
    });
    await ethereumLedger.start();

    const listenOptions: IListenOptions = {
      hostname: "127.0.0.1",
      port: 0,
      server: ethereumServer,
    };
    addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
    ({ address, port } = addressInfo);
    apiHost = `http://${address}:${port}`;

    apiConfig = new Configuration({ basePath: apiHost });
    ethereumApiClient = new EthereumApi(apiConfig);
    rpcApiHttpHostEthereum = await ethereumLedger.getRpcApiHttpHost();
    web3Eth = new Web3(rpcApiHttpHostEthereum);
    testEthAccount = web3Eth.eth.accounts.create();

    log.info("Create PluginKeychainMemory...");
    const keychainEntryValue = testEthAccount.privateKey;
    keychainPluginEthereum = new PluginKeychainMemory({
      instanceId: uuidv4(),
      keychainId: uuidv4(),
      backend: new Map([[keychainEntryKey, keychainEntryValue]]),
      logLevel,
    });

    keychainPluginEthereum.set(
      LockAssetContractJson.contractName,
      JSON.stringify(LockAssetContractJson),
    );

    log.info("Create PluginLedgerConnectorEthereum...");
    ethereumConnector = new PluginLedgerConnectorEthereum({
      rpcApiHttpHost: rpcApiHttpHostEthereum,
      logLevel,
      instanceId: uuidv4(),
      pluginRegistry: new PluginRegistry({ plugins: [keychainPluginEthereum] }),
    });

    await ethereumConnector.getOrCreateWebServices();
    await ethereumConnector.registerWebServices(expressAppEthereum, wsApi);

    log.info("Deploy Contract...");
    const deployOut = await ethereumApiClient.deployContract({
      contract: {
        contractName: LockAssetContractJson.contractName,
        keychainId: keychainPluginEthereum.getKeychainId(),
      },
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
    });
    expect(deployOut).toBeTruthy();
    expect(deployOut.data).toBeTruthy();
    expect(deployOut.data.transactionReceipt).toBeTruthy();
    expect(deployOut.data.transactionReceipt.contractAddress).toBeTruthy();
    log.info("contract deployed successfully");

    const initTransferValue = web3Eth.utils.toWei("5000", "ether");
    await ethereumApiClient.runTransactionV1({
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
      transactionConfig: {
        from: WHALE_ACCOUNT_ADDRESS,
        to: testEthAccount.address,
        value: initTransferValue,
      },
    });
    const balance = await web3Eth.eth.getBalance(testEthAccount.address);
    expect(balance).toBeTruthy();
    expect(balance.toString()).toBe(initTransferValue);
  }
  {
    hephaestusOptions = {
      instanceId: uuidv4(),
      logLevel: logLevel,
      besuTxObservable: besuConnector.getTxSubjectObservable(),
      ethTxObservable: ethereumConnector.getTxSubjectObservable(),
    };

    hephaestus = new CcModelHephaestus(hephaestusOptions);
    expect(hephaestus).toBeTruthy();
    log.info("hephaestus plugin initialized successfully");
  }
  {
    const { success: createResBesu1 } = await besuConnector.invokeContract({
      contractName: besuContractName,
      keychainId: keychainPluginBesu.getKeychainId(),
      invocationType: EthContractInvocationTypeBesu.Send,
      methodName: "createAsset",
      params: ["asset1_besu", 10],
      signingCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: besuKeyPair.privateKey,
        type: Web3SigningCredentialTypeBesu.PrivateKeyHex,
      },
      gas: 1000000,
    });
    expect(createResBesu1).toBeTruthy();

    const { success: createResBesu2 } = await besuConnector.invokeContract({
      contractName: besuContractName,
      keychainId: keychainPluginBesu.getKeychainId(),
      invocationType: EthContractInvocationTypeBesu.Send,
      methodName: "createAsset",
      params: ["asset2_besu", 10],
      signingCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: besuKeyPair.privateKey,
        type: Web3SigningCredentialTypeBesu.PrivateKeyHex,
      },
      gas: 1000000,
    });
    expect(createResBesu2).toBeTruthy();

    const { success: createResBesu3 } = await besuConnector.invokeContract({
      contractName: besuContractName,
      keychainId: keychainPluginBesu.getKeychainId(),
      invocationType: EthContractInvocationTypeBesu.Send,
      methodName: "createAsset",
      params: ["asset3_besu", 10],
      signingCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: besuKeyPair.privateKey,
        type: Web3SigningCredentialTypeBesu.PrivateKeyHex,
      },
      gas: 1000000,
    });
    expect(createResBesu3).toBeTruthy();

    const { success: createResBesu4 } = await besuConnector.invokeContract({
      contractName: besuContractName,
      keychainId: keychainPluginBesu.getKeychainId(),
      invocationType: EthContractInvocationTypeBesu.Send,
      methodName: "createAsset",
      params: ["asset4_besu", 10],
      signingCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: besuKeyPair.privateKey,
        type: Web3SigningCredentialTypeBesu.PrivateKeyHex,
      },
      gas: 1000000,
    });
    expect(createResBesu4).toBeTruthy();

    const { success: createResBesu5 } = await besuConnector.invokeContract({
      contractName: besuContractName,
      keychainId: keychainPluginBesu.getKeychainId(),
      invocationType: EthContractInvocationTypeBesu.Send,
      methodName: "createAsset",
      params: ["asset5_besu", 10],
      signingCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: besuKeyPair.privateKey,
        type: Web3SigningCredentialTypeBesu.PrivateKeyHex,
      },
      gas: 1000000,
    });
    expect(createResBesu5).toBeTruthy();

    const { success: createResBesu6 } = await besuConnector.invokeContract({
      contractName: besuContractName,
      keychainId: keychainPluginBesu.getKeychainId(),
      invocationType: EthContractInvocationTypeBesu.Send,
      methodName: "createAsset",
      params: ["asset6_besu", 10],
      signingCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: besuKeyPair.privateKey,
        type: Web3SigningCredentialTypeBesu.PrivateKeyHex,
      },
      gas: 1000000,
    });
    expect(createResBesu6).toBeTruthy();

    const createResEth1 = await ethereumApiClient.invokeContractV1({
      contract: {
        contractName: LockAssetContractJson.contractName,
        keychainId: keychainPluginEthereum.getKeychainId(),
      },
      invocationType: EthContractInvocationType.Send,
      methodName: "createAsset",
      params: ["asset_eth", 10],
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
    });
    expect(createResEth1).toBeTruthy();
  }
});

test("Monitor asset transfer from Besu to Ethereum blockchain and create a cross-chain model", async () => {
  hephaestus.monitorTransactions(1);

  hephaestus.setCaseId("cctx1");

  const { success: lockResBesu1 } = await besuConnector.invokeContract({
    contractName: besuContractName,
    keychainId: keychainPluginBesu.getKeychainId(),
    invocationType: EthContractInvocationTypeBesu.Send,
    methodName: "lockAsset",
    params: ["asset1_besu"],
    signingCredential: {
      ethAccount: firstHighNetWorthAccount,
      secret: besuKeyPair.privateKey,
      type: Web3SigningCredentialTypeBesu.PrivateKeyHex,
    },
    gas: 1000000,
  });
  expect(lockResBesu1).toBeTruthy();

  const createResEth1 = await ethereumApiClient.invokeContractV1({
    contract: {
      contractName: LockAssetContractJson.contractName,
      keychainId: keychainPluginEthereum.getKeychainId(),
    },
    invocationType: EthContractInvocationType.Send,
    methodName: "createAsset",
    params: ["asset1_eth", 10],
    web3SigningCredential: {
      ethAccount: WHALE_ACCOUNT_ADDRESS,
      secret: "",
      type: Web3SigningCredentialType.GethKeychainPassword,
    },
  });
  expect(createResEth1).toBeTruthy();

  const { success: deleteResBesu1 } = await besuConnector.invokeContract({
    contractName: besuContractName,
    keychainId: keychainPluginBesu.getKeychainId(),
    invocationType: EthContractInvocationTypeBesu.Send,
    methodName: "deleteAsset",
    params: ["asset1_besu"],
    signingCredential: {
      ethAccount: testEthAccountBesu.address,
      secret: besuKeyPair.privateKey,
      type: Web3SigningCredentialTypeBesu.PrivateKeyHex,
    },
    gas: 1000000,
  });
  expect(deleteResBesu1).toBeTruthy();

  expect(hephaestus.numberEventsLog).toEqual(3);

  hephaestus.setCaseId("cctx2");

  const { success: lockResBesu2 } = await besuConnector.invokeContract({
    contractName: besuContractName,
    keychainId: keychainPluginBesu.getKeychainId(),
    invocationType: EthContractInvocationTypeBesu.Send,
    methodName: "lockAsset",
    params: ["asset2_besu"],
    signingCredential: {
      ethAccount: firstHighNetWorthAccount,
      secret: besuKeyPair.privateKey,
      type: Web3SigningCredentialTypeBesu.PrivateKeyHex,
    },
    gas: 1000000,
  });
  expect(lockResBesu2).toBeTruthy();

  const { success: lockResBesu_double } = await besuConnector.invokeContract({
    contractName: besuContractName,
    keychainId: keychainPluginBesu.getKeychainId(),
    invocationType: EthContractInvocationTypeBesu.Send,
    methodName: "lockAsset",
    params: ["asset2_besu"],
    signingCredential: {
      ethAccount: firstHighNetWorthAccount,
      secret: besuKeyPair.privateKey,
      type: Web3SigningCredentialTypeBesu.PrivateKeyHex,
    },
    gas: 1000000,
  });
  expect(lockResBesu_double).toBeTruthy();

  const createResEth2 = await ethereumApiClient.invokeContractV1({
    contract: {
      contractName: LockAssetContractJson.contractName,
      keychainId: keychainPluginEthereum.getKeychainId(),
    },
    invocationType: EthContractInvocationType.Send,
    methodName: "createAsset",
    params: ["asset2_eth", 10],
    web3SigningCredential: {
      ethAccount: WHALE_ACCOUNT_ADDRESS,
      secret: "",
      type: Web3SigningCredentialType.GethKeychainPassword,
    },
  });
  expect(createResEth2).toBeTruthy();

  const { success: deleteResBesu2 } = await besuConnector.invokeContract({
    contractName: besuContractName,
    keychainId: keychainPluginBesu.getKeychainId(),
    invocationType: EthContractInvocationTypeBesu.Send,
    methodName: "deleteAsset",
    params: ["asset2_besu"],
    signingCredential: {
      ethAccount: testEthAccountBesu.address,
      secret: besuKeyPair.privateKey,
      type: Web3SigningCredentialTypeBesu.PrivateKeyHex,
    },
    gas: 1000000,
  });
  expect(deleteResBesu2).toBeTruthy();

  modeledTransactions = 7;
  expect(hephaestus.numberEventsLog).toEqual(modeledTransactions);

  const model = await hephaestus.createModel();
  expect(model).toBeTruthy();
  expect(hephaestus.ccModel.getModel(CrossChainModelType.PetriNet)).toBeTruthy;
  hephaestus.setIsModeling(false);
});

test("Unlock after mint", async () => {
  hephaestus.setCaseId("unmodeled_cctx1");

  const { success: lockResBesu } = await besuConnector.invokeContract({
    contractName: besuContractName,
    keychainId: keychainPluginBesu.getKeychainId(),
    invocationType: EthContractInvocationTypeBesu.Send,
    methodName: "lockAsset",
    params: ["asset3_besu"],
    signingCredential: {
      ethAccount: firstHighNetWorthAccount,
      secret: besuKeyPair.privateKey,
      type: Web3SigningCredentialTypeBesu.PrivateKeyHex,
    },
    gas: 1000000,
  });
  expect(lockResBesu).toBeTruthy();
  expect(hephaestus.numberEventsUnmodeledLog).toEqual(1);

  const createResEth = await ethereumApiClient.invokeContractV1({
    contract: {
      contractName: LockAssetContractJson.contractName,
      keychainId: keychainPluginEthereum.getKeychainId(),
    },
    invocationType: EthContractInvocationType.Send,
    methodName: "createAsset",
    params: ["asset3_eth", 10],
    web3SigningCredential: {
      ethAccount: WHALE_ACCOUNT_ADDRESS,
      secret: "",
      type: Web3SigningCredentialType.GethKeychainPassword,
    },
  });
  expect(createResEth).toBeTruthy();
  expect(hephaestus.numberEventsUnmodeledLog).toEqual(2);

  const { success: unlockResBesu } = await besuConnector.invokeContract({
    contractName: besuContractName,
    keychainId: keychainPluginBesu.getKeychainId(),
    invocationType: EthContractInvocationTypeBesu.Send,
    methodName: "unLockAsset",
    params: ["asset3_besu"],
    signingCredential: {
      ethAccount: firstHighNetWorthAccount,
      secret: besuKeyPair.privateKey,
      type: Web3SigningCredentialTypeBesu.PrivateKeyHex,
    },
    gas: 1000000,
  });
  expect(unlockResBesu).toBeTruthy();

  expect(hephaestus.numberEventsUnmodeledLog).toEqual(0);
  expect(hephaestus.numberEventsNonConformedLog).toEqual(3);
  expect(hephaestus.numberEventsLog).toEqual(modeledTransactions);
});

test("Unlock before mint", async () => {
  hephaestus.setCaseId("unmodeled_cctx2");
  hephaestus.purgeNonConformedEvents();
  expect(hephaestus.numberEventsUnmodeledLog).toEqual(0);
  expect(hephaestus.numberEventsNonConformedLog).toEqual(0);
  expect(hephaestus.numberEventsLog).toEqual(modeledTransactions);

  const { success: lockResBesu } = await besuConnector.invokeContract({
    contractName: besuContractName,
    keychainId: keychainPluginBesu.getKeychainId(),
    invocationType: EthContractInvocationTypeBesu.Send,
    methodName: "lockAsset",
    params: ["asset3_besu"],
    signingCredential: {
      ethAccount: firstHighNetWorthAccount,
      secret: besuKeyPair.privateKey,
      type: Web3SigningCredentialTypeBesu.PrivateKeyHex,
    },
    gas: 1000000,
  });
  expect(lockResBesu).toBeTruthy();
  expect(hephaestus.numberEventsUnmodeledLog).toEqual(1);

  const { success: unlockResBesu } = await besuConnector.invokeContract({
    contractName: besuContractName,
    keychainId: keychainPluginBesu.getKeychainId(),
    invocationType: EthContractInvocationTypeBesu.Send,
    methodName: "unLockAsset",
    params: ["asset3_besu"],
    signingCredential: {
      ethAccount: firstHighNetWorthAccount,
      secret: besuKeyPair.privateKey,
      type: Web3SigningCredentialTypeBesu.PrivateKeyHex,
    },
    gas: 1000000,
  });
  expect(unlockResBesu).toBeTruthy();

  expect(hephaestus.numberEventsUnmodeledLog).toEqual(0);
  expect(hephaestus.numberEventsNonConformedLog).toEqual(2);

  const createResEth = await ethereumApiClient.invokeContractV1({
    contract: {
      contractName: LockAssetContractJson.contractName,
      keychainId: keychainPluginEthereum.getKeychainId(),
    },
    invocationType: EthContractInvocationType.Send,
    methodName: "createAsset",
    params: ["asset3_eth", 10],
    web3SigningCredential: {
      ethAccount: WHALE_ACCOUNT_ADDRESS,
      secret: "",
      type: Web3SigningCredentialType.GethKeychainPassword,
    },
  });
  expect(createResEth).toBeTruthy();
  expect(hephaestus.numberEventsUnmodeledLog).toEqual(0);
  expect(hephaestus.numberEventsNonConformedLog).toEqual(3);
  expect(hephaestus.numberEventsLog).toEqual(modeledTransactions);
});

test("Skip lock", async () => {
  hephaestus.setCaseId("unmodeled_cctx3");
  hephaestus.purgeNonConformedEvents();
  expect(hephaestus.numberEventsUnmodeledLog).toEqual(0);
  expect(hephaestus.numberEventsNonConformedLog).toEqual(0);
  expect(hephaestus.numberEventsLog).toEqual(modeledTransactions);

  const { success: unlockResBesu } = await besuConnector.invokeContract({
    contractName: besuContractName,
    keychainId: keychainPluginBesu.getKeychainId(),
    invocationType: EthContractInvocationTypeBesu.Send,
    methodName: "unLockAsset",
    params: ["asset4_besu"],
    signingCredential: {
      ethAccount: firstHighNetWorthAccount,
      secret: besuKeyPair.privateKey,
      type: Web3SigningCredentialTypeBesu.PrivateKeyHex,
    },
    gas: 1000000,
  });
  expect(unlockResBesu).toBeTruthy();

  expect(hephaestus.numberEventsUnmodeledLog).toEqual(0);
  expect(hephaestus.numberEventsNonConformedLog).toEqual(1);

  const createResEth = await ethereumApiClient.invokeContractV1({
    contract: {
      contractName: LockAssetContractJson.contractName,
      keychainId: keychainPluginEthereum.getKeychainId(),
    },
    invocationType: EthContractInvocationType.Send,
    methodName: "createAsset",
    params: ["asset4_eth", 10],
    web3SigningCredential: {
      ethAccount: WHALE_ACCOUNT_ADDRESS,
      secret: "",
      type: Web3SigningCredentialType.GethKeychainPassword,
    },
  });
  expect(createResEth).toBeTruthy();
  expect(hephaestus.numberEventsUnmodeledLog).toEqual(0);
  expect(hephaestus.numberEventsNonConformedLog).toEqual(2);
  expect(hephaestus.numberEventsLog).toEqual(modeledTransactions);
});

test("Skip mint", async () => {
  hephaestus.setCaseId("unmodeled_cctx4");
  hephaestus.purgeNonConformedEvents();
  expect(hephaestus.numberEventsUnmodeledLog).toEqual(0);
  expect(hephaestus.numberEventsNonConformedLog).toEqual(0);
  expect(hephaestus.numberEventsLog).toEqual(modeledTransactions);

  const { success: lockResBesu } = await besuConnector.invokeContract({
    contractName: besuContractName,
    keychainId: keychainPluginBesu.getKeychainId(),
    invocationType: EthContractInvocationTypeBesu.Send,
    methodName: "lockAsset",
    params: ["asset5_besu"],
    signingCredential: {
      ethAccount: firstHighNetWorthAccount,
      secret: besuKeyPair.privateKey,
      type: Web3SigningCredentialTypeBesu.PrivateKeyHex,
    },
    gas: 1000000,
  });
  expect(lockResBesu).toBeTruthy();
  expect(hephaestus.numberEventsUnmodeledLog).toEqual(1);

  const { success: deleteResBesu1 } = await besuConnector.invokeContract({
    contractName: besuContractName,
    keychainId: keychainPluginBesu.getKeychainId(),
    invocationType: EthContractInvocationTypeBesu.Send,
    methodName: "deleteAsset",
    params: ["asset5_besu"],
    signingCredential: {
      ethAccount: testEthAccountBesu.address,
      secret: besuKeyPair.privateKey,
      type: Web3SigningCredentialTypeBesu.PrivateKeyHex,
    },
    gas: 1000000,
  });
  expect(deleteResBesu1).toBeTruthy();

  expect(hephaestus.numberEventsUnmodeledLog).toEqual(0);
  expect(hephaestus.numberEventsNonConformedLog).toEqual(2);
  expect(hephaestus.numberEventsLog).toEqual(modeledTransactions);
});

test("Double mint", async () => {
  hephaestus.setCaseId("unmodeled_cctx5");
  hephaestus.purgeNonConformedEvents();
  expect(hephaestus.numberEventsUnmodeledLog).toEqual(0);
  expect(hephaestus.numberEventsNonConformedLog).toEqual(0);
  expect(hephaestus.numberEventsLog).toEqual(modeledTransactions);

  const { success: lockResBesu } = await besuConnector.invokeContract({
    contractName: besuContractName,
    keychainId: keychainPluginBesu.getKeychainId(),
    invocationType: EthContractInvocationTypeBesu.Send,
    methodName: "lockAsset",
    params: ["asset6_besu"],
    signingCredential: {
      ethAccount: firstHighNetWorthAccount,
      secret: besuKeyPair.privateKey,
      type: Web3SigningCredentialTypeBesu.PrivateKeyHex,
    },
    gas: 1000000,
  });
  expect(lockResBesu).toBeTruthy();
  expect(hephaestus.numberEventsUnmodeledLog).toEqual(1);

  const createResEth = await ethereumApiClient.invokeContractV1({
    contract: {
      contractName: LockAssetContractJson.contractName,
      keychainId: keychainPluginEthereum.getKeychainId(),
    },
    invocationType: EthContractInvocationType.Send,
    methodName: "createAsset",
    params: ["asset6_eth", 10],
    web3SigningCredential: {
      ethAccount: WHALE_ACCOUNT_ADDRESS,
      secret: "",
      type: Web3SigningCredentialType.GethKeychainPassword,
    },
  });
  expect(createResEth).toBeTruthy();
  expect(hephaestus.numberEventsUnmodeledLog).toEqual(2);

  const createResEth2 = await ethereumApiClient.invokeContractV1({
    contract: {
      contractName: LockAssetContractJson.contractName,
      keychainId: keychainPluginEthereum.getKeychainId(),
    },
    invocationType: EthContractInvocationType.Send,
    methodName: "createAsset",
    params: ["asset6_eth", 10],
    web3SigningCredential: {
      ethAccount: WHALE_ACCOUNT_ADDRESS,
      secret: "",
      type: Web3SigningCredentialType.GethKeychainPassword,
    },
  });
  expect(createResEth2).toBeTruthy();
  expect(hephaestus.numberEventsUnmodeledLog).toEqual(0);
  expect(hephaestus.numberEventsNonConformedLog).toEqual(3);

  const { success: deleteResBesu1 } = await besuConnector.invokeContract({
    contractName: besuContractName,
    keychainId: keychainPluginBesu.getKeychainId(),
    invocationType: EthContractInvocationTypeBesu.Send,
    methodName: "deleteAsset",
    params: ["asset6_besu"],
    signingCredential: {
      ethAccount: testEthAccountBesu.address,
      secret: besuKeyPair.privateKey,
      type: Web3SigningCredentialTypeBesu.PrivateKeyHex,
    },
    gas: 1000000,
  });
  expect(deleteResBesu1).toBeTruthy();

  expect(hephaestus.numberEventsUnmodeledLog).toEqual(0);
  expect(hephaestus.numberEventsNonConformedLog).toEqual(4);
  expect(hephaestus.numberEventsLog).toEqual(modeledTransactions);
});

test("Asset transfer from Ethereum to Besu", async () => {
  hephaestus.setCaseId("unmodeled_cctx6");
  hephaestus.purgeNonConformedEvents();
  expect(hephaestus.numberEventsUnmodeledLog).toEqual(0);
  expect(hephaestus.numberEventsNonConformedLog).toEqual(0);
  expect(hephaestus.numberEventsLog).toEqual(modeledTransactions);

  const createResEth = await ethereumApiClient.invokeContractV1({
    contract: {
      contractName: LockAssetContractJson.contractName,
      keychainId: keychainPluginEthereum.getKeychainId(),
    },
    invocationType: EthContractInvocationType.Send,
    methodName: "lockAsset",
    params: ["asset_eth"],
    web3SigningCredential: {
      ethAccount: WHALE_ACCOUNT_ADDRESS,
      secret: "",
      type: Web3SigningCredentialType.GethKeychainPassword,
    },
  });
  expect(createResEth).toBeTruthy();
  expect(hephaestus.numberEventsUnmodeledLog).toEqual(1);

  const { success: lockResBesu } = await besuConnector.invokeContract({
    contractName: besuContractName,
    keychainId: keychainPluginBesu.getKeychainId(),
    invocationType: EthContractInvocationTypeBesu.Send,
    methodName: "createAsset",
    params: ["asset_besu", 10],
    signingCredential: {
      ethAccount: firstHighNetWorthAccount,
      secret: besuKeyPair.privateKey,
      type: Web3SigningCredentialTypeBesu.PrivateKeyHex,
    },
    gas: 1000000,
  });
  expect(lockResBesu).toBeTruthy();
  expect(hephaestus.numberEventsUnmodeledLog).toEqual(2);

  const deleteResEth = await ethereumApiClient.invokeContractV1({
    contract: {
      contractName: LockAssetContractJson.contractName,
      keychainId: keychainPluginEthereum.getKeychainId(),
    },
    invocationType: EthContractInvocationType.Send,
    methodName: "deleteAsset",
    params: ["asset_eth"],
    web3SigningCredential: {
      ethAccount: WHALE_ACCOUNT_ADDRESS,
      secret: "",
      type: Web3SigningCredentialType.GethKeychainPassword,
    },
  });
  expect(deleteResEth).toBeTruthy();
  expect(hephaestus.numberEventsUnmodeledLog).toEqual(0);
  expect(hephaestus.numberEventsNonConformedLog).toEqual(0);
  expect(hephaestus.numberEventsLog).toEqual(modeledTransactions + 3);
});

// test("Skip burn", async () => {}); // unlock after burn is the same thing

afterAll(async () => {
  await besuLedger.stop();
  await besuLedger.destroy();

  await ethereumConnector.shutdown();
  await ethereumLedger.stop();
  await ethereumLedger.destroy();
  await Servers.shutdown(ethereumServer);

  await pruneDockerAllIfGithubAction({ logLevel })
    .then(() => {
      log.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning didn't throw OK");
    });
});
