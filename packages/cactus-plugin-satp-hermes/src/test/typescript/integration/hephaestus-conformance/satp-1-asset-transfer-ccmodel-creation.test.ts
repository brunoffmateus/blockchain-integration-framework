import "jest-extended";
import {
  LogLevelDesc,
  LoggerProvider,
  Secp256k1Keys,
} from "@hyperledger/cactus-common";
import {
  pruneDockerAllIfGithubAction,
  Containers,
} from "@hyperledger/cactus-test-tooling";
import {
  SATPGatewayConfig,
  SATPGateway,
  PluginFactorySATPGateway,
} from "../../../../main/typescript";
import {
  Address,
  GatewayIdentity,
} from "../../../../main/typescript/core/types";
import {
  IPluginFactoryOptions,
  LedgerType,
  PluginImportType,
} from "@hyperledger/cactus-core-api";
import { ClaimFormat } from "../../../../main/typescript/generated/proto/cacti/satp/v02/common/message_pb";
import {
  BesuTestEnvironment,
  EthereumTestEnvironment,
  FabricTestEnvironment,
  getTransactRequest,
} from "../../test-utils";
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
} from "../../../../main/typescript/core/constants";
import {
  knexClientConnection,
  knexServerConnection,
  knexSourceRemoteConnection,
  knexTargetRemoteConnection,
} from "../../knex.config";
import { Knex, knex } from "knex";
import { v4 as uuidv4 } from "uuid";
import {
  CcModelHephaestus,
  IPluginCcModelHephaestusOptions,
  ProcessMiningAlgorithm,
} from "@hyperledger/cactus-plugin-ccmodel-hephaestus";
import { BLODispatcher } from "../../../../main/typescript/blo/dispatcher";
import path from "path";
import { bufArray2HexStr } from "../../../../main/typescript/gateway-utils";
import { PluginLedgerConnectorEthereum } from "@hyperledger/cactus-plugin-ledger-connector-ethereum";

const logLevelSilent: LogLevelDesc = "SILENT";
const log = LoggerProvider.getOrCreate({
  level: logLevelSilent,
  label: "SATP - Hermes",
});

let knexInstanceClient: Knex;
let knexSourceRemoteInstance: Knex;
let knexTargetRemoteInstance: Knex;
let knexInstanceServer: Knex;
let besuGateway: SATPGateway;
let ethGateway: SATPGateway;
let fabricGateway: SATPGateway;
let besuEnv: BesuTestEnvironment;
let ethereumEnv: EthereumTestEnvironment;
let fabricEnv: FabricTestEnvironment;
let dispatcherBesu: BLODispatcher | undefined;
let dispatcherFabric: BLODispatcher | undefined;
let dispatcherEthereum: BLODispatcher | undefined;
const erc20TokenContract = "SATPContract";
const contractNameWrapper = "SATPWrapperContract";
const bridge_id =
  "x509::/OU=org2/OU=client/OU=department1/CN=bridge::/C=UK/ST=Hampshire/L=Hursley/O=org2.example.com/CN=ca.org2.example.com";

let hephaestus: CcModelHephaestus;
let hephaestusOptions: IPluginCcModelHephaestusOptions;

let startTime: Date;
let endTime: Date;

afterAll(async () => {
  if (besuGateway) {
    if (knexInstanceClient) {
      await knexInstanceClient.destroy();
    }
    if (knexSourceRemoteInstance) {
      await knexSourceRemoteInstance.destroy();
    }
    await besuGateway.shutdown();
  }
  if (ethGateway) {
    if (knexTargetRemoteInstance) {
      await knexTargetRemoteInstance.destroy();
    }
    if (knexInstanceServer) {
      await knexInstanceServer.destroy();
    }
    await ethGateway.shutdown();
  }
  if (fabricGateway) {
    if (knexTargetRemoteInstance) {
      await knexTargetRemoteInstance.destroy();
    }
    if (knexInstanceServer) {
      await knexInstanceServer.destroy();
    }
    await fabricGateway.shutdown();
  }
  await besuEnv.tearDown();
  await ethereumEnv.tearDown();
  await fabricEnv.tearDown();

  await pruneDockerAllIfGithubAction({ logLevel: logLevelSilent })
    .then(() => {
      log.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel: logLevelSilent });
      fail("Pruning didn't throw OK");
    });
});

beforeAll(async () => {
  pruneDockerAllIfGithubAction({ logLevel: logLevelSilent })
    .then(() => {
      log.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel: logLevelSilent });
      fail("Pruning didn't throw OK");
    });
  startTime = new Date();
  {
    const satpContractName = "satp-contract";
    fabricEnv = await FabricTestEnvironment.setupTestEnvironment(
      satpContractName,
      bridge_id,
      logLevelSilent,
    );
    log.info("Fabric Ledger started successfully");
    await fabricEnv.deployAndSetupContracts(ClaimFormat.DEFAULT);
  }

  {
    besuEnv = await BesuTestEnvironment.setupTestEnvironment(
      erc20TokenContract,
      contractNameWrapper,
      logLevelSilent,
    );
    log.info("Besu Ledger started successfully");
    await besuEnv.deployAndSetupContracts(ClaimFormat.DEFAULT);
  }

  {
    ethereumEnv = await EthereumTestEnvironment.setupTestEnvironment(
      erc20TokenContract,
      contractNameWrapper,
      logLevelSilent,
    );
    log.info("Ethereum Ledger started successfully");
    await ethereumEnv.deployAndSetupContracts(ClaimFormat.DEFAULT);
  }
  endTime = new Date();
  console.log(`EVAL-STARTUP-${endTime.getTime() - startTime.getTime()} ms`);
});

describe("Create CCModel with Hephaestus", () => {
  it("should create the gateway and initialize Hephaestus", async () => {
    startTime = new Date();
    const factoryOptions: IPluginFactoryOptions = {
      pluginImportType: PluginImportType.Local,
    };
    const factory = new PluginFactorySATPGateway(factoryOptions);

    const gatewayIdentity1 = {
      id: "mockID-1",
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
      ],
      proofID: "mockProofID10",
      address: "http://localhost" as Address,
    } as GatewayIdentity;

    const gateway1KeyPair = Secp256k1Keys.generateKeyPairsBuffer();

    const gatewayIdentity2 = {
      id: "mockID-2",
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
          id: FabricTestEnvironment.FABRIC_NETWORK_ID,
          ledgerType: LedgerType.Fabric2,
        },
      ],
      proofID: "mockProofID11",
      address: "http://localhost" as Address,
      gatewayServerPort: 3110,
      gatewayClientPort: 3111,
      gatewayOpenAPIPort: 4110,
    } as GatewayIdentity;

    const gateway2KeyPair = Secp256k1Keys.generateKeyPairsBuffer();

    const gatewayIdentity3 = {
      id: "mockID-3",
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
          id: EthereumTestEnvironment.ETH_NETWORK_ID,
          ledgerType: LedgerType.Ethereum,
        },
      ],
      proofID: "mockProofID11",
      address: "http://localhost" as Address,
      gatewayServerPort: 3210,
      gatewayClientPort: 3211,
      gatewayOpenAPIPort: 4210,
    } as GatewayIdentity;

    knexInstanceClient = knex(knexClientConnection);
    await knexInstanceClient.migrate.latest();

    knexSourceRemoteInstance = knex(knexSourceRemoteConnection);
    await knexSourceRemoteInstance.migrate.latest();

    const gatewayBesuOptions: SATPGatewayConfig = {
      logLevel: "DEBUG",
      gid: gatewayIdentity1,
      counterPartyGateways: [
        // this need to be like this because the shared memory was being altered
        {
          id: "mockID-2",
          name: "CustomGateway",
          pubKey: bufArray2HexStr(gateway2KeyPair.publicKey),
          version: [
            {
              Core: SATP_CORE_VERSION,
              Architecture: SATP_ARCHITECTURE_VERSION,
              Crash: SATP_CRASH_VERSION,
            },
          ],
          connectedDLTs: [
            {
              id: FabricTestEnvironment.FABRIC_NETWORK_ID,
              ledgerType: LedgerType.Fabric2,
            },
          ],
          proofID: "mockProofID11",
          address: "http://localhost" as Address,
          gatewayServerPort: 3110,
          gatewayClientPort: 3111,
          gatewayOpenAPIPort: 4110,
        },
      ],
      bridgesConfig: [besuEnv.besuConfig],
      keyPair: gateway1KeyPair,
      knexLocalConfig: knexClientConnection,
      knexRemoteConfig: knexSourceRemoteConnection,
    };

    knexInstanceServer = knex(knexServerConnection);
    await knexInstanceServer.migrate.latest();

    knexTargetRemoteInstance = knex(knexTargetRemoteConnection);
    await knexTargetRemoteInstance.migrate.latest();

    const gatewayFabricOptions: SATPGatewayConfig = {
      logLevel: "DEBUG",
      gid: gatewayIdentity2,
      counterPartyGateways: [
        {
          id: "mockID-1",
          name: "CustomGateway",
          pubKey: bufArray2HexStr(gateway1KeyPair.publicKey),
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
          ],
          proofID: "mockProofID10",
          address: "http://localhost" as Address,
        },
      ],
      bridgesConfig: [fabricEnv.fabricConfig],
      keyPair: gateway2KeyPair,
      knexLocalConfig: knexServerConnection,
      knexRemoteConfig: knexTargetRemoteConnection,
    };

    knexInstanceServer = knex(knexServerConnection);
    await knexInstanceServer.migrate.latest();

    knexTargetRemoteInstance = knex(knexTargetRemoteConnection);
    await knexTargetRemoteInstance.migrate.latest();

    const gatewayEthOptions: SATPGatewayConfig = {
      logLevel: "DEBUG",
      gid: gatewayIdentity3,
      counterPartyGateways: [], // only knows itself
      bridgesConfig: [ethereumEnv.ethereumConfig],
      knexLocalConfig: knexServerConnection,
      knexRemoteConfig: knexTargetRemoteConnection,
    };

    besuGateway = await factory.create(gatewayBesuOptions);
    expect(besuGateway).toBeInstanceOf(SATPGateway);

    const identity1 = besuGateway.Identity;
    // default servers
    expect(identity1.gatewayServerPort).toBe(3010);
    expect(identity1.gatewayClientPort).toBe(3011);
    expect(identity1.address).toBe("http://localhost");
    await besuGateway.startup();

    fabricGateway = await factory.create(gatewayFabricOptions);
    expect(fabricGateway).toBeInstanceOf(SATPGateway);

    const identity2 = fabricGateway.Identity;
    // default servers
    expect(identity2.gatewayServerPort).toBe(3110);
    expect(identity2.gatewayClientPort).toBe(3111);
    expect(identity2.address).toBe("http://localhost");
    await fabricGateway.startup();

    ethGateway = await factory.create(gatewayEthOptions);
    expect(ethGateway).toBeInstanceOf(SATPGateway);

    const identity3 = ethGateway.Identity;
    // default servers
    expect(identity3.gatewayServerPort).toBe(3210);
    expect(identity3.gatewayClientPort).toBe(3211);
    expect(identity3.address).toBe("http://localhost");
    await ethGateway.startup();
    console.log("gateways started!");

    dispatcherBesu = besuGateway.getBLODispatcher();
    expect(dispatcherBesu).toBeTruthy();

    dispatcherFabric = fabricGateway.getBLODispatcher();
    expect(dispatcherFabric).toBeTruthy();

    dispatcherEthereum = ethGateway.getBLODispatcher();
    expect(dispatcherEthereum).toBeTruthy();

    const methodsToMonitor = new Map<LedgerType, string[]>();
    methodsToMonitor.set(
      LedgerType.Besu2X,
      dispatcherBesu!.getBridge("BESU").getMethodsToBeMonitored(),
    );
    methodsToMonitor.set(
      LedgerType.Fabric2,
      dispatcherFabric!.getBridge("FABRIC").getMethodsToBeMonitored(),
    );
    methodsToMonitor.set(
      LedgerType.Ethereum,
      dispatcherEthereum!.getBridge("ETH").getMethodsToBeMonitored(),
    );

    hephaestusOptions = {
      instanceId: uuidv4(),
      logLevel: "DEBUG",
      methodsToMonitor,
      ccLogsDir: path.join(__dirname, "..", "..", "..", "hephaestus", "ccLogs"),
      ccModelDir: path.join(
        __dirname,
        "..",
        "..",
        "..",
        "hephaestus",
        "ccModel",
      ),
    };
    hephaestus = new CcModelHephaestus(hephaestusOptions);
    expect(hephaestus).toBeTruthy();
    log.info("hephaestus plugin initialized successfully");

    hephaestus.setBesuTxObservable(
      (
        dispatcherBesu!
          .getBridge("BESU")
          .bridgeConnector() as PluginLedgerConnectorBesu
      ).getTxSubjectObservable(),
    );
    hephaestus.setFabricTxObservable(
      (
        dispatcherFabric!
          .getBridge("FABRIC")
          .bridgeConnector() as PluginLedgerConnectorFabric
      ).getTxSubjectObservable(),
    );
    hephaestus.setEthTxObservable(
      (
        dispatcherEthereum!
          .getBridge("ETH")
          .bridgeConnector() as PluginLedgerConnectorEthereum
      ).getTxSubjectObservable(),
    );

    console.log("starting to monitor transactions...");
    hephaestus.monitorTransactions(0);
    log.info("hephaestus observables now active");
    const nonConformedTxObservable =
      hephaestus.getNonConformingTxSubjectObservable();
    dispatcherBesu!.setNonConformingTxObservable(nonConformedTxObservable);
    dispatcherFabric!.setNonConformingTxObservable(nonConformedTxObservable);
    dispatcherEthereum!.setNonConformingTxObservable(nonConformedTxObservable);
    log.info("gateway observable now active");
    endTime = new Date();
    console.log(`EVAL-STARTUP2-${endTime.getTime() - startTime.getTime()} ms`);
  });

  it("should model the first transaction with Hephaestus", async () => {
    startTime = new Date();
    hephaestus.newCaseId("tx1");
    // 1st transaction:
    const req = getTransactRequest(
      "mockContext",
      besuEnv,
      fabricEnv,
      "20",
      "1",
    );
    const res = await dispatcherBesu?.Transact(req);
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
    endTime = new Date();
    console.log(`EVAL-MONITOR-${endTime.getTime() - startTime.getTime()} ms`);
  });

  it("should create a cross chain model", async () => {
    startTime = new Date();
    const miningAlgorithm = ProcessMiningAlgorithm.Inductive;
    const model = await hephaestus.createModel(miningAlgorithm);
    expect(model).toBeTruthy();
    expect(hephaestus.getModel(miningAlgorithm)).toBeTruthy;
    console.log("CcModel created!");
    endTime = new Date();
    console.log(`EVAL-CCMODEL-${endTime.getTime() - startTime.getTime()} ms`);
  });
});
