import "jest-extended";
import { LogLevelDesc, LoggerProvider } from "@hyperledger/cactus-common";
import { FabricContractInvocationType } from "@hyperledger/cactus-plugin-ledger-connector-fabric";
import {
  pruneDockerAllIfGithubAction,
  Containers,
  SATPGatewayRunner,
  ISATPGatewayRunnerConstructorOptions,
} from "@hyperledger/cactus-test-tooling";
import {
  EthContractInvocationType,
  Web3SigningCredentialType,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";
import SATPContract from "../../solidity/generated/satp-erc20.sol/SATPContract.json";
import { TransactRequest, Asset } from "../../../main/typescript";
import {
  Address,
  GatewayIdentity,
  SupportedChain,
} from "../../../main/typescript/core/types";
import FabricSATPInteraction from "../../../test/typescript/fabric/satp-erc20-interact.json";
import BesuSATPInteraction from "../../solidity/satp-erc20-interact.json";
import {
  createClient,
  setupGatewayDockerFiles,
  BesuTestEnvironment,
  FabricTestEnvironment,
} from "../test-utils";
import {
  DEFAULT_PORT_GATEWAY_API,
  DEFAULT_PORT_GATEWAY_CLIENT,
  DEFAULT_PORT_GATEWAY_SERVER,
  SATP_CORE_VERSION,
  SATP_ARCHITETURE_VERSION,
  SATP_CRASH_VERSION,
} from "../../../main/typescript/core/constants";
import { ClaimFormat } from "../../../main/typescript/generated/proto/cacti/satp/v02/common/message_pb";

const logLevel: LogLevelDesc = "DEBUG";
const log = LoggerProvider.getOrCreate({
  level: logLevel,
  label: "BUNGEE - Hermes",
});

let fabricEnv: FabricTestEnvironment;
let besuEnv: BesuTestEnvironment;
let gatewayRunner: SATPGatewayRunner;

afterAll(async () => {
  await gatewayRunner.stop();
  await gatewayRunner.destroy();
  await besuEnv.tearDown();
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
      logLevel,
    );
    log.info("Fabric Ledger started successfully");

    await fabricEnv.deployAndSetupContracts(ClaimFormat.DEFAULT);
  }

  {
    const erc20TokenContract = "SATPContract";
    const contractNameWrapper = "SATPWrapperContract";

    besuEnv = await BesuTestEnvironment.setupTestEnvironment(
      erc20TokenContract,
      contractNameWrapper,
      logLevel,
    );
    log.info("Besu Ledger started successfully");

    await besuEnv.deployAndSetupContracts(ClaimFormat.DEFAULT);
  }
});

describe("SATPGateway sending a token from Besu to Fabric", () => {
  it("should realize a transfer", async () => {
    const address: Address = `http://localhost`;

    // gateway setup:
    const gatewayIdentity = {
      id: "mockID",
      name: "CustomGateway",
      version: [
        {
          Core: SATP_CORE_VERSION,
          Architecture: SATP_ARCHITETURE_VERSION,
          Crash: SATP_CRASH_VERSION,
        },
      ],
      supportedDLTs: [SupportedChain.FABRIC, SupportedChain.BESU],
      proofID: "mockProofID10",
      address,
      gatewayClientPort: DEFAULT_PORT_GATEWAY_CLIENT,
      gatewayServerPort: DEFAULT_PORT_GATEWAY_SERVER,
      gatewayOpenAPIPort: DEFAULT_PORT_GATEWAY_API,
    } as GatewayIdentity;

    // besuConfig Json object setup:
    const besuConfigJSON = await besuEnv.createBesuConfigJSON(logLevel);

    // fabricConfig Json object setup:
    const fabricConfigJSON = await fabricEnv.createFabricConfigJSON(logLevel);

    const files = setupGatewayDockerFiles(
      gatewayIdentity,
      logLevel,
      [], //only knows itself
      [besuConfigJSON, fabricConfigJSON],
    );

    // gatewayRunner setup:
    const gatewayRunnerOptions: ISATPGatewayRunnerConstructorOptions = {
      containerImageVersion: "2024-10-30T19-54-20-dev-5e06263e0",
      containerImageName: "ghcr.io/hyperledger/cacti-satp-hermes-gateway",
      logLevel,
      emitContainerLogs: true,
      configFile: files.configFile,
      outputLogFile: files.outputLogFile,
      errorLogFile: files.errorLogFile,
    };
    gatewayRunner = new SATPGatewayRunner(gatewayRunnerOptions);
    console.log("starting gatewayRunner...");
    await gatewayRunner.start();
    console.log("gatewayRunner started sucessfully");

    const sourceAsset: Asset = {
      owner: besuEnv.firstHighNetWorthAccount,
      ontology: JSON.stringify(BesuSATPInteraction),
      contractName: besuEnv.erc20TokenContract,
      contractAddress: besuEnv.assetContractAddress,
    };
    const receiverAsset: Asset = {
      owner: fabricEnv.clientId,
      ontology: JSON.stringify(FabricSATPInteraction),
      contractName: fabricEnv.satpContractName,
      mspId: fabricEnv.userIdentity.mspId,
      channelName: fabricEnv.fabricChannelName,
    };
    const req: TransactRequest = {
      contextID: "mockContext",
      fromDLTNetworkID: SupportedChain.BESU,
      toDLTNetworkID: SupportedChain.FABRIC,
      fromAmount: "100",
      toAmount: "1",
      originatorPubkey: besuEnv.assigneeEthAccount.address,
      beneficiaryPubkey: fabricEnv.userIdentity.credentials.certificate,
      sourceAsset,
      receiverAsset,
    };

    const port = await gatewayRunner.getHostPort(DEFAULT_PORT_GATEWAY_API);

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

    const responseBalanceOwner = await besuEnv.connector.invokeContract({
      contractName: besuEnv.erc20TokenContract,
      contractAbi: SATPContract.abi,
      invocationType: EthContractInvocationType.Call,
      contractAddress: besuEnv.assetContractAddress,
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
    console.log(
      `Balance Besu Owner Account: ${responseBalanceOwner.callOutput}`,
    );
    expect(responseBalanceOwner.callOutput).toBe("0");
    log.info("Amount was transfer correctly from the Owner account");

    const responseBalanceBridge = await besuEnv.connector.invokeContract({
      contractName: besuEnv.erc20TokenContract,
      contractAbi: SATPContract.abi,
      invocationType: EthContractInvocationType.Call,
      contractAddress: besuEnv.assetContractAddress,
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
    console.log(
      `Balance Besu Bridge Account: ${responseBalanceBridge.callOutput}`,
    );
    expect(responseBalanceBridge.callOutput).toBe("0");
    log.info("Amount was transfer correctly to the Wrapper account");

    const responseBalance1 = await fabricEnv.apiClient.runTransactionV1({
      contractName: fabricEnv.satpContractName,
      channelName: fabricEnv.fabricChannelName,
      params: [FabricTestEnvironment.BRIDGE_ID],
      methodName: "ClientIDAccountBalance",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: fabricEnv.fabricSigningCredential,
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
    console.log(
      `Balance Fabric Owner Account: ${responseBalance2.data.functionOutput}`,
    );
    log.info("Amount was transfer correctly to the Owner account");
  });
});
