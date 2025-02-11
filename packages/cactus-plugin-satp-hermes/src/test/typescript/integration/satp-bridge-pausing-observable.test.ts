import "jest-extended";
import { LogLevelDesc, LoggerProvider } from "@hyperledger/cactus-common";
import {
  pruneDockerAllIfGithubAction,
  Containers,
} from "@hyperledger/cactus-test-tooling";
import {
  SATPGatewayConfig,
  SATPGateway,
  PluginFactorySATPGateway,
} from "../../../main/typescript";
import { Address, GatewayIdentity } from "../../../main/typescript/core/types";
import {
  IPluginFactoryOptions,
  LedgerType,
  PluginImportType,
} from "@hyperledger/cactus-core-api";
import { ClaimFormat } from "../../../main/typescript/generated/proto/cacti/satp/v02/common/message_pb";
import {
  BesuTestEnvironment,
  EthereumTestEnvironment,
  FabricTestEnvironment,
  getTransactRequest,
} from "../test-utils";
import {
  FabricContractInvocationType,
  PluginLedgerConnectorFabric,
} from "@hyperledger/cactus-plugin-ledger-connector-fabric";
import {
  EthContractInvocationType,
  PluginLedgerConnectorBesu,
  Web3SigningCredentialType,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";
import {
  SATP_ARCHITECTURE_VERSION,
  SATP_CORE_VERSION,
  SATP_CRASH_VERSION,
} from "../../../main/typescript/core/constants";
import {
  knexClientConnection,
  knexSourceRemoteConnection,
} from "../knex.config";
import { Knex, knex } from "knex";
import { v4 as uuidv4 } from "uuid";
import {
  CcModelHephaestus,
  IPluginCcModelHephaestusOptions,
  ProcessMiningAlgorithm,
} from "@hyperledger/cactus-plugin-ccmodel-hephaestus";
import { BLODispatcher } from "../../../main/typescript/blo/dispatcher";
import path from "path";
import { TokenType } from "../../../main/typescript/core/stage-services/satp-bridge/types/asset";
import { EvmAsset } from "../../../main/typescript/core/stage-services/satp-bridge/types/evm-asset";
import SATPInteraction from "../../solidity/satp-erc20-interact.json";
import { PluginLedgerConnectorEthereum } from "@hyperledger/cactus-plugin-ledger-connector-ethereum";

const logLevel: LogLevelDesc = "DEBUG";
const log = LoggerProvider.getOrCreate({
  level: logLevel,
  label: "SATP - Hermes",
});

let knexInstanceClient: Knex;
let knexSourceRemoteInstance: Knex;
let gateway: SATPGateway;
let besuEnv: BesuTestEnvironment;
let ethereumEnv: EthereumTestEnvironment;
let fabricEnv: FabricTestEnvironment;
let dispatcher: BLODispatcher | undefined;
const erc20TokenContract = "SATPContract";
const contractNameWrapper = "SATPWrapperContract";
const bridge_id =
  "x509::/OU=org2/OU=client/OU=department1/CN=bridge::/C=UK/ST=Hampshire/L=Hursley/O=org2.example.com/CN=ca.org2.example.com";

let hephaestus: CcModelHephaestus;
let hephaestusOptions: IPluginCcModelHephaestusOptions;

afterAll(async () => {
  if (gateway) {
    if (knexInstanceClient) {
      await knexInstanceClient.destroy();
    }
    if (knexSourceRemoteInstance) {
      await knexSourceRemoteInstance.destroy();
    }
    await gateway.shutdown();
  }
  await besuEnv.tearDown();
  await ethereumEnv.tearDown();
  await fabricEnv.tearDown();

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
    const satpContractName = "satp-contract";
    fabricEnv = await FabricTestEnvironment.setupTestEnvironment(
      satpContractName,
      bridge_id,
      logLevel,
    );
    log.info("Fabric Ledger started successfully");
    await fabricEnv.deployAndSetupContracts(ClaimFormat.DEFAULT);
  }

  {
    besuEnv = await BesuTestEnvironment.setupTestEnvironment(
      erc20TokenContract,
      contractNameWrapper,
      logLevel,
    );
    log.info("Besu Ledger started successfully");
    await besuEnv.deployAndSetupContracts(ClaimFormat.DEFAULT);
  }

  {
    ethereumEnv = await EthereumTestEnvironment.setupTestEnvironment(
      erc20TokenContract,
      contractNameWrapper,
      logLevel,
    );
    log.info("Ethereum Ledger started successfully");
    await ethereumEnv.deployAndSetupContracts(ClaimFormat.DEFAULT);
  }
});

describe("Pausing all SATP bridges at once", () => {
  it("should create the gateway and initialize Hephaestus", async () => {
    //setup satp gateway
    const factoryOptions: IPluginFactoryOptions = {
      pluginImportType: PluginImportType.Local,
    };
    const factory = new PluginFactorySATPGateway(factoryOptions);

    const gatewayIdentity = {
      id: "mockID",
      name: "CustomGateway",
      version: [
        {
          Core: SATP_CORE_VERSION,
          Architecture: SATP_ARCHITECTURE_VERSION,
          Crash: SATP_CRASH_VERSION,
        },
      ],
      connectedDLTs: [
        {
          id: BesuTestEnvironment.BESU_NETWORK_ID,
          ledgerType: LedgerType.Besu2X,
        },
        {
          id: EthereumTestEnvironment.ETH_NETWORK_ID,
          ledgerType: LedgerType.Ethereum,
        },
        {
          id: FabricTestEnvironment.FABRIC_NETWORK_ID,
          ledgerType: LedgerType.Fabric2,
        },
      ],
      proofID: "mockProofID10",
      address: "http://localhost" as Address,
    } as GatewayIdentity;

    knexInstanceClient = knex(knexClientConnection);
    await knexInstanceClient.migrate.latest();

    knexSourceRemoteInstance = knex(knexSourceRemoteConnection);
    await knexSourceRemoteInstance.migrate.latest();

    // Gateway needs all Configs
    const options: SATPGatewayConfig = {
      logLevel: "DEBUG",
      gid: gatewayIdentity,
      counterPartyGateways: [], //only knows itself
      bridgesConfig: [
        besuEnv.besuConfig,
        ethereumEnv.ethereumConfig,
        fabricEnv.fabricConfig,
      ],
      knexLocalConfig: knexClientConnection,
      knexRemoteConfig: knexSourceRemoteConnection,
    };

    gateway = await factory.create(options);
    expect(gateway).toBeInstanceOf(SATPGateway);

    const identity = gateway.Identity;
    // default servers
    expect(identity.gatewayServerPort).toBe(3010);
    expect(identity.gatewayClientPort).toBe(3011);
    expect(identity.address).toBe("http://localhost");
    await gateway.startup();
    console.log("gateway started!");

    dispatcher = gateway.getBLODispatcher();
    expect(dispatcher).toBeTruthy();

    const bridgesList = dispatcher!.getBridgesList();
    const methodsToMonitor = new Map<LedgerType, string[]>();
    bridgesList.forEach((network) => {
      const bridge = dispatcher!.getBridge(network);
      const connector = bridge.bridgeConnector();
      const methods = dispatcher!.getBridge(network).getMethodsToBeMonitored();
      if (connector instanceof PluginLedgerConnectorBesu) {
        log.debug(`Connector is ${network}, methods are ${methods}`);
        methodsToMonitor.set(LedgerType.Besu2X, methods);
      } else if (connector instanceof PluginLedgerConnectorEthereum) {
        log.debug(`Connector is ${network}, methods are ${methods}`);
        methodsToMonitor.set(LedgerType.Ethereum, methods);
      } else if (connector instanceof PluginLedgerConnectorFabric) {
        log.debug(`Connector is ${network}, methods are ${methods}`);
        methodsToMonitor.set(LedgerType.Fabric2, methods);
      }
    });
    console.log(`methodsToMonitor: \n${methodsToMonitor}`);
    hephaestusOptions = {
      instanceId: uuidv4(),
      logLevel: logLevel,
      methodsToMonitor,
      ccLogsDir: path.join(__dirname, "..", "..", "hephaestus", "ccLogs"),
      ccModelDir: path.join(__dirname, "..", "..", "hephaestus", "ccModel"),
    };
    hephaestus = new CcModelHephaestus(hephaestusOptions);
    expect(hephaestus).toBeTruthy();
    log.info("hephaestus plugin initialized successfully");
  });

  it("Should connect the gateway with Hephaestus", async () => {
    const bridgesList = dispatcher!.getBridgesList();
    bridgesList.forEach((network) => {
      const bridge = dispatcher!.getBridge(network);
      const connector = bridge.bridgeConnector();
      if (connector instanceof PluginLedgerConnectorBesu) {
        log.debug(`Connector is ${network}`);
        hephaestus.setBesuTxObservable(connector.getTxSubjectObservable());
      } else if (connector instanceof PluginLedgerConnectorEthereum) {
        log.debug(`Connector is ${network}`);
        hephaestus.setEthTxObservable(connector.getTxSubjectObservable());
      } else if (connector instanceof PluginLedgerConnectorFabric) {
        log.debug(`Connector is ${network}`);
        hephaestus.setFabricTxObservable(connector.getTxSubjectObservable());
      }
    });
    console.log("starting to monitor transactions...");
    hephaestus.monitorTransactions(0);
    log.info("hephaestus observables now active");
    const nonConformedTxObservable =
      hephaestus.getNonConformedTxSubjectObservable();
    dispatcher!.setNonConformedTxObservable(nonConformedTxObservable);
    log.info("gateway observable now active");
  });

  it("should monitor the first transaction with Hephaestus", async () => {
    hephaestus.newCaseId("tx1");
    // 1st transaction:
    const req = getTransactRequest(
      "mockContext",
      besuEnv,
      fabricEnv,
      "20",
      "1",
    );
    const res = await dispatcher?.Transact(req);
    log.info(res?.statusResponse);

    const responseBalanceOwner = await besuEnv.connector.invokeContract({
      contractName: besuEnv.erc20TokenContract,
      keychainId: besuEnv.keychainPlugin1.getKeychainId(),
      invocationType: EthContractInvocationType.Call,
      methodName: "checkBalance",
      params: [besuEnv.firstHighNetWorthAccount],
      signingCredential: {
        ethAccount: besuEnv.firstHighNetWorthAccount,
        secret: besuEnv.besuKeyPair.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      gas: 999999999,
    });
    expect(responseBalanceOwner).toBeTruthy();
    expect(responseBalanceOwner.success).toBeTruthy();
    expect(responseBalanceOwner.callOutput).toBe("80");
    log.info("Amount was transfer correctly from the Owner account");

    const responseBalanceBridge = await besuEnv.connector.invokeContract({
      contractName: besuEnv.erc20TokenContract,
      keychainId: besuEnv.keychainPlugin1.getKeychainId(),
      invocationType: EthContractInvocationType.Call,
      methodName: "checkBalance",
      params: [besuEnv.wrapperContractAddress],
      signingCredential: {
        ethAccount: besuEnv.firstHighNetWorthAccount,
        secret: besuEnv.besuKeyPair.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      gas: 999999999,
    });
    expect(responseBalanceBridge).toBeTruthy();
    expect(responseBalanceBridge.success).toBeTruthy();
    expect(responseBalanceBridge.callOutput).toBe("0");
    log.info("Amount was transfer correctly to the Wrapper account");

    const responseBalance1_ = await fabricEnv.apiClient.runTransactionV1({
      contractName: fabricEnv.satpContractName,
      channelName: fabricEnv.fabricChannelName,
      params: [fabricEnv.bridge_id],
      methodName: "ClientIDAccountBalance",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: fabricEnv.fabricSigningCredential,
    });

    expect(responseBalance1_).not.toBeUndefined();
    expect(responseBalance1_.status).toBeGreaterThan(199);
    expect(responseBalance1_.status).toBeLessThan(300);
    expect(responseBalance1_.data).not.toBeUndefined();
    expect(responseBalance1_.data.functionOutput).toBe("0");
    log.info("Amount was transfer correctly from the Bridge account");

    const responseBalance2 = await fabricEnv.apiClient.runTransactionV1({
      contractName: fabricEnv.satpContractName,
      channelName: fabricEnv.fabricChannelName,
      params: [fabricEnv.clientId],
      methodName: "ClientIDAccountBalance",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: fabricEnv.fabricSigningCredential,
    });
    expect(responseBalance2).not.toBeUndefined();
    expect(responseBalance2.status).toBeGreaterThan(199);
    expect(responseBalance2.status).toBeLessThan(300);
    expect(responseBalance2.data).not.toBeUndefined();
    expect(responseBalance2.data.functionOutput).toBe("1");
    log.info("Amount was transfer correctly to the Owner account");
  });

  it("should monitor the second transaction with Hephaestus", async () => {
    hephaestus.newCaseId("tx2");
    // 2nd transaction:
    const req = getTransactRequest(
      "mockContext",
      besuEnv,
      fabricEnv,
      "40",
      "1",
    );
    const res = await dispatcher?.Transact(req);
    log.info(res?.statusResponse);

    const responseBalanceOwner = await besuEnv.connector.invokeContract({
      contractName: besuEnv.erc20TokenContract,
      keychainId: besuEnv.keychainPlugin1.getKeychainId(),
      invocationType: EthContractInvocationType.Call,
      methodName: "checkBalance",
      params: [besuEnv.firstHighNetWorthAccount],
      signingCredential: {
        ethAccount: besuEnv.firstHighNetWorthAccount,
        secret: besuEnv.besuKeyPair.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      gas: 999999999,
    });
    expect(responseBalanceOwner).toBeTruthy();
    expect(responseBalanceOwner.success).toBeTruthy();
    expect(responseBalanceOwner.callOutput).toBe("40");
    log.info("Amount was transfer correctly from the Owner account");

    const responseBalanceBridge = await besuEnv.connector.invokeContract({
      contractName: besuEnv.erc20TokenContract,
      keychainId: besuEnv.keychainPlugin1.getKeychainId(),
      invocationType: EthContractInvocationType.Call,
      methodName: "checkBalance",
      params: [besuEnv.wrapperContractAddress],
      signingCredential: {
        ethAccount: besuEnv.firstHighNetWorthAccount,
        secret: besuEnv.besuKeyPair.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      gas: 999999999,
    });
    expect(responseBalanceBridge).toBeTruthy();
    expect(responseBalanceBridge.success).toBeTruthy();
    expect(responseBalanceBridge.callOutput).toBe("0");
    log.info("Amount was transfer correctly to the Wrapper account");

    const responseBalance1_ = await fabricEnv.apiClient.runTransactionV1({
      contractName: fabricEnv.satpContractName,
      channelName: fabricEnv.fabricChannelName,
      params: [fabricEnv.bridge_id],
      methodName: "ClientIDAccountBalance",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: fabricEnv.fabricSigningCredential,
    });

    expect(responseBalance1_).not.toBeUndefined();
    expect(responseBalance1_.status).toBeGreaterThan(199);
    expect(responseBalance1_.status).toBeLessThan(300);
    expect(responseBalance1_.data).not.toBeUndefined();
    expect(responseBalance1_.data.functionOutput).toBe("0");
    log.info("Amount was transfer correctly from the Bridge account");

    const responseBalance2 = await fabricEnv.apiClient.runTransactionV1({
      contractName: fabricEnv.satpContractName,
      channelName: fabricEnv.fabricChannelName,
      params: [fabricEnv.clientId],
      methodName: "ClientIDAccountBalance",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: fabricEnv.fabricSigningCredential,
    });
    expect(responseBalance2).not.toBeUndefined();
    expect(responseBalance2.status).toBeGreaterThan(199);
    expect(responseBalance2.status).toBeLessThan(300);
    expect(responseBalance2.data).not.toBeUndefined();
    expect(responseBalance2.data.functionOutput).toBe("2");
    log.info("Amount was transfer correctly to the Owner account");
  });

  it("should monitor the third transaction with Hephaestus", async () => {
    hephaestus.newCaseId("tx3");
    // 3rd transaction:
    const req = getTransactRequest(
      "mockContext",
      besuEnv,
      fabricEnv,
      "20",
      "1",
    );
    const res = await dispatcher?.Transact(req);
    log.info(res?.statusResponse);

    const responseBalanceOwner = await besuEnv.connector.invokeContract({
      contractName: besuEnv.erc20TokenContract,
      keychainId: besuEnv.keychainPlugin1.getKeychainId(),
      invocationType: EthContractInvocationType.Call,
      methodName: "checkBalance",
      params: [besuEnv.firstHighNetWorthAccount],
      signingCredential: {
        ethAccount: besuEnv.firstHighNetWorthAccount,
        secret: besuEnv.besuKeyPair.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      gas: 999999999,
    });
    expect(responseBalanceOwner).toBeTruthy();
    expect(responseBalanceOwner.success).toBeTruthy();
    expect(responseBalanceOwner.callOutput).toBe("20");
    log.info("Amount was transfer correctly from the Owner account");

    const responseBalanceBridge = await besuEnv.connector.invokeContract({
      contractName: besuEnv.erc20TokenContract,
      keychainId: besuEnv.keychainPlugin1.getKeychainId(),
      invocationType: EthContractInvocationType.Call,
      methodName: "checkBalance",
      params: [besuEnv.wrapperContractAddress],
      signingCredential: {
        ethAccount: besuEnv.firstHighNetWorthAccount,
        secret: besuEnv.besuKeyPair.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      gas: 999999999,
    });
    expect(responseBalanceBridge).toBeTruthy();
    expect(responseBalanceBridge.success).toBeTruthy();
    expect(responseBalanceBridge.callOutput).toBe("0");
    log.info("Amount was transfer correctly to the Wrapper account");

    const responseBalance1_ = await fabricEnv.apiClient.runTransactionV1({
      contractName: fabricEnv.satpContractName,
      channelName: fabricEnv.fabricChannelName,
      params: [fabricEnv.bridge_id],
      methodName: "ClientIDAccountBalance",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: fabricEnv.fabricSigningCredential,
    });

    expect(responseBalance1_).not.toBeUndefined();
    expect(responseBalance1_.status).toBeGreaterThan(199);
    expect(responseBalance1_.status).toBeLessThan(300);
    expect(responseBalance1_.data).not.toBeUndefined();
    expect(responseBalance1_.data.functionOutput).toBe("0");
    log.info("Amount was transfer correctly from the Bridge account");

    const responseBalance2 = await fabricEnv.apiClient.runTransactionV1({
      contractName: fabricEnv.satpContractName,
      channelName: fabricEnv.fabricChannelName,
      params: [fabricEnv.clientId],
      methodName: "ClientIDAccountBalance",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: fabricEnv.fabricSigningCredential,
    });
    expect(responseBalance2).not.toBeUndefined();
    expect(responseBalance2.status).toBeGreaterThan(199);
    expect(responseBalance2.status).toBeLessThan(300);
    expect(responseBalance2.data).not.toBeUndefined();
    expect(responseBalance2.data.functionOutput).toBe("3");
    log.info("Amount was transfer correctly to the Owner account");
  });

  it("should create a cross chain model", async () => {
    const miningAlgorithm = ProcessMiningAlgorithm.Inductive;
    const model = await hephaestus.createModel(miningAlgorithm);
    expect(model).toBeTruthy();
    expect(hephaestus.getModel(miningAlgorithm)).toBeTruthy;
    hephaestus.stopModeling();
    dispatcher!.monitorNonConformedTxs();
  });

  it("should pause the bridges automatically", async () => {
    hephaestus.newCaseId("unmodeled_tx1");
    // unmodeled behaviour:
    console.log("unmodeled behaviour:");
    const ethBridge = dispatcher?.getBridge("ETH");
    expect(ethBridge).toBeDefined();
    const ETH_UNMODELED_ASSET_ID = uuidv4();
    const unmodeledAsset = {
      tokenId: ETH_UNMODELED_ASSET_ID,
      tokenType: TokenType.NONSTANDARD,
      owner: ethereumEnv.transactRequestPubKey,
      contractName: erc20TokenContract,
      contractAddress: ethereumEnv.assetContractAddress,
      ontology: JSON.stringify(SATPInteraction),
    } as EvmAsset;

    console.log("wrapAsset:");
    await ethBridge!.wrapAsset(unmodeledAsset);
    console.log("lockAsset:");
    await ethBridge!.lockAsset(ETH_UNMODELED_ASSET_ID, 50);
    console.log("lockAsset:");
    await ethBridge!.lockAsset(ETH_UNMODELED_ASSET_ID, 50);

    hephaestus.newCaseId("unmodeled_tx2");
    // 4th transaction:
    const req = getTransactRequest(
      "mockContext",
      besuEnv,
      fabricEnv,
      "20",
      "1",
    );
    const res = await dispatcher?.Transact(req);
    expect(res).toBe(null);
    console.log("Transaction was canceled due to paused bridges.");

    const responseBalanceOwner = await besuEnv.connector.invokeContract({
      contractName: besuEnv.erc20TokenContract,
      keychainId: besuEnv.keychainPlugin1.getKeychainId(),
      invocationType: EthContractInvocationType.Call,
      methodName: "checkBalance",
      params: [besuEnv.firstHighNetWorthAccount],
      signingCredential: {
        ethAccount: besuEnv.firstHighNetWorthAccount,
        secret: besuEnv.besuKeyPair.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      gas: 999999999,
    });
    expect(responseBalanceOwner).toBeTruthy();
    expect(responseBalanceOwner.success).toBeTruthy();
    expect(responseBalanceOwner.callOutput).toBe("20");
    log.info("Amount was correctly not transfered from the Owner account");

    const responseBalanceBridge = await besuEnv.connector.invokeContract({
      contractName: besuEnv.erc20TokenContract,
      keychainId: besuEnv.keychainPlugin1.getKeychainId(),
      invocationType: EthContractInvocationType.Call,
      methodName: "checkBalance",
      params: [besuEnv.wrapperContractAddress],
      signingCredential: {
        ethAccount: besuEnv.firstHighNetWorthAccount,
        secret: besuEnv.besuKeyPair.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      gas: 999999999,
    });
    expect(responseBalanceBridge).toBeTruthy();
    expect(responseBalanceBridge.success).toBeTruthy();
    expect(responseBalanceBridge.callOutput).toBe("0");
    log.info("Amount was correctly not transfered to the Wrapper account");

    const responseBalance1_ = await fabricEnv.apiClient.runTransactionV1({
      contractName: fabricEnv.satpContractName,
      channelName: fabricEnv.fabricChannelName,
      params: [fabricEnv.bridge_id],
      methodName: "ClientIDAccountBalance",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: fabricEnv.fabricSigningCredential,
    });

    expect(responseBalance1_).not.toBeUndefined();
    expect(responseBalance1_.status).toBeGreaterThan(199);
    expect(responseBalance1_.status).toBeLessThan(300);
    expect(responseBalance1_.data).not.toBeUndefined();
    expect(responseBalance1_.data.functionOutput).toBe("0");
    log.info("Amount was correctly not transfer from the Bridge account");

    const responseBalance2 = await fabricEnv.apiClient.runTransactionV1({
      contractName: fabricEnv.satpContractName,
      channelName: fabricEnv.fabricChannelName,
      params: [fabricEnv.clientId],
      methodName: "ClientIDAccountBalance",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: fabricEnv.fabricSigningCredential,
    });
    expect(responseBalance2).not.toBeUndefined();
    expect(responseBalance2.status).toBeGreaterThan(199);
    expect(responseBalance2.status).toBeLessThan(300);
    expect(responseBalance2.data).not.toBeUndefined();
    expect(responseBalance2.data.functionOutput).toBe("3");
    log.info("Amount was correctly not transfered to the Owner account");

    // bridgesArePaused now runs correctly dispite WhenNotPause modifier
    // due to Transact() checking for unmodeled behaviour
    // and pausing the bridges automatically
    console.log("Checking if the bridges are paused...");
    await dispatcher?.bridgesArePaused();
    console.log("Bridges paused...");
  });
});
