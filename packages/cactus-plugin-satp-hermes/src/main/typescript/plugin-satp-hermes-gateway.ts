import {
  Secp256k1Keys,
  Logger,
  Checks,
  LoggerProvider,
  ILoggerOptions,
  JsObjectSigner,
  IJsObjectSignerOptions,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import { v4 as uuidv4 } from "uuid";

import {
  IsDefined,
  IsNotEmptyObject,
  IsObject,
  IsString,
  Contains,
  ValidatorOptions,
} from "class-validator";

import {
  SATPGatewayConfig,
  GatewayIdentity,
  ShutdownHook,
  SupportedChain,
  Address,
  DraftVersions,
} from "./core/types";
import {
  GatewayOrchestrator,
  IGatewayOrchestratorOptions,
} from "./gol/gateway-orchestrator";
export { SATPGatewayConfig };
import express, { Express } from "express";
import http from "http";
import {
  DEFAULT_PORT_GATEWAY_API,
  DEFAULT_PORT_GATEWAY_CLIENT,
  DEFAULT_PORT_GATEWAY_SERVER,
  SATP_VERSION,
} from "./core/constants";
import { bufArray2HexStr } from "./gateway-utils";
import {
  ILocalLogRepository,
  IRemoteLogRepository,
} from "./repository/interfaces/repository";
import { BLODispatcher, BLODispatcherOptions } from "./blo/dispatcher";
import swaggerUi, { JsonObject } from "swagger-ui-express";
import {
  IPluginWebService,
  ICactusPlugin,
  IWebServiceEndpoint,
} from "@hyperledger/cactus-core-api";
import {
  ISATPBridgesOptions,
  SATPBridgesManager,
} from "./gol/satp-bridges-manager";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import { IPrivacyPolicyValue } from "@hyperledger/cactus-plugin-bungee-hermes/dist/lib/main/typescript/view-creation/privacy-policies";
import {
  MergePolicyOpts,
  PrivacyPolicyOpts,
} from "@hyperledger/cactus-plugin-bungee-hermes/dist/lib/main/typescript/generated/openapi/typescript-axios";
import { IMergePolicyValue } from "@hyperledger/cactus-plugin-bungee-hermes/dist/lib/main/typescript/view-merging/merge-policies";
import { ISignerKeyPairs } from "@hyperledger/cactus-common/src/main/typescript/signer-key-pairs";
import { BesuConfig, FabricConfig } from "./types/blockchain-interaction";

import * as OAS from "../json/openapi-blo-bundled.json";
import { jsonc } from "jsonc";
import fs from "fs-extra";
import {
  ConnectionProfile,
  DefaultEventHandlerStrategy,
  IPluginLedgerConnectorFabricOptions,
} from "@hyperledger/cactus-plugin-ledger-connector-fabric";
import { IPluginBungeeHermesOptions } from "@hyperledger/cactus-plugin-bungee-hermes";
import {
  IPluginLedgerConnectorBesuOptions,
  Web3SigningCredentialType,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import SATPWrapperContract from "../../solidity/generated/satp-wrapper.sol/SATPWrapperContract.json";
import SATPContract from "../../test/solidity/generated/satp-erc20.sol/SATPContract.json";
import { FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_2 } from "@hyperledger/cactus-test-tooling";
import { boolean } from "yargs";
import { Config } from "node-ssh";

export class SATPGateway implements IPluginWebService, ICactusPlugin {
  // todo more checks; example port from config is between 3000 and 9000
  @IsDefined()
  @IsNotEmptyObject()
  @IsObject()
  private readonly logger: Logger;

  @IsDefined()
  @IsNotEmptyObject()
  @IsObject()
  private readonly config: SATPGatewayConfig;

  @IsString()
  @Contains("Gateway")
  public readonly className = "SATPGateway";

  @IsString()
  public readonly instanceId: string;
  private supportedDltIDs: SupportedChain[];
  private gatewayOrchestrator: GatewayOrchestrator;
  private bridgesManager: SATPBridgesManager;

  private BLOApplication?: Express;
  private BLOServer?: http.Server;
  private BLODispatcher?: BLODispatcher;
  private GOLApplication?: Express;
  private GOLServer?: http.Server;
  private readonly OAS: JsonObject;
  public OAPIServerEnabled: boolean = false;

  private signer: JsObjectSigner;
  private _pubKey: string;

  public localRepository?: ILocalLogRepository;
  public remoteRepository?: IRemoteLogRepository;
  private readonly shutdownHooks: ShutdownHook[];

  constructor(public readonly options: SATPGatewayConfig) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    this.config = SATPGateway.ProcessGatewayCoordinatorConfig(options);
    this.shutdownHooks = [];
    const level = options.logLevel || "INFO";
    const logOptions: ILoggerOptions = {
      level: level,
      label: this.className,
    };
    this.logger = LoggerProvider.getOrCreate(logOptions);
    this.logger.info("Initializing Gateway Coordinator");

    if (this.config.keyPair == undefined) {
      throw new Error("Key pair is undefined");
    }

    this._pubKey = bufArray2HexStr(this.config.keyPair.publicKey);

    this.logger.info(`Gateway's public key: ${this._pubKey}`);
    this.logger.info(`options.bridgesConfig: ${options.bridgesConfig}`);

    const signerOptions: IJsObjectSignerOptions = {
      privateKey: bufArray2HexStr(this.config.keyPair.privateKey),
      logLevel: "debug",
    };
    this.signer = new JsObjectSigner(signerOptions);

    const gatewayOrchestratorOptions: IGatewayOrchestratorOptions = {
      logLevel: this.config.logLevel,
      localGateway: this.config.gid!,
      counterPartyGateways: this.config.counterPartyGateways,
      signer: this.signer!,
    };

    const bridgesManagerOptions: ISATPBridgesOptions = {
      logLevel: this.config.logLevel,
      supportedDLTs: this.config.gid!.supportedDLTs,
      networks: options.bridgesConfig ? options.bridgesConfig : [],
    };

    this.bridgesManager = new SATPBridgesManager(bridgesManagerOptions);

    if (!this.bridgesManager) {
      throw new Error("BridgesManager is not defined");
    }

    if (this.config.gid) {
      this.logger.info(
        "Initializing gateway connection manager with seed gateways",
      );
      this.gatewayOrchestrator = new GatewayOrchestrator(
        gatewayOrchestratorOptions,
      );
    } else {
      throw new Error("GatewayIdentity is not defined");
    }

    this.instanceId = uuidv4();
    const dispatcherOps: BLODispatcherOptions = {
      logger: this.logger,
      logLevel: this.config.logLevel,
      instanceId: this.config.gid!.id,
      orchestrator: this.gatewayOrchestrator,
      signer: this.signer,
      bridgesManager: this.bridgesManager,
      pubKey: this.pubKey,
    };

    this.supportedDltIDs = this.config.gid!.supportedDLTs;

    if (!this.config.gid || !dispatcherOps.instanceId) {
      throw new Error("Invalid configuration");
    }

    this.BLODispatcher = new BLODispatcher(dispatcherOps);
    this.OAPIServerEnabled = this.config.enableOpenAPI ?? true;

    this.OAS = OAS;
    // const specPath = path.join(__dirname, "../json/openapi-blo-bundled.json");
    // this.OAS = JSON.parse(fs.readFileSync(specPath, "utf8"));
    // if (!this.OAS) {
    //   this.logger.warn("Error loading OAS");
    // }
  }

  /* ICactus Plugin methods */

  public getInstanceId(): string {
    return this.instanceId;
  }

  public getPackageName(): string {
    return `@hyperledger/cactus-plugin-satp-hermes`;
  }

  //for testing
  public getBLODispatcher(): BLODispatcher | undefined {
    return this.BLODispatcher;
  }

  getBLOServer(): http.Server | undefined {
    return this.BLOServer;
  }

  getBLOApplication(): Express | undefined {
    return this.BLOApplication;
  }

  public async onPluginInit(): Promise<unknown> {
    const fnTag = `${this.className}#onPluginInit()`;
    this.logger.trace(`Entering ${fnTag}`);
    // resolve gateways on init
    throw new Error("Not implemented");
  }

  /* IPluginWebService methods */
  async registerWebServices(app: Express): Promise<IWebServiceEndpoint[]> {
    const webServices = await this.getOrCreateWebServices();
    webServices.forEach((ws) => {
      this.logger.debug(`Registering service ${ws.getPath()}`);
      ws.registerExpress(app);
    });
    return webServices;
  }

  public async getOrCreateWebServices(): Promise<IWebServiceEndpoint[]> {
    const fnTag = `${this.className}#getOrCreateWebServices()`;
    this.logger.trace(`Entering ${fnTag}`);
    if (!this.BLODispatcher) {
      throw new Error(`Cannot ${fnTag} because BLODispatcher is erroneous`);
    }
    return this.BLODispatcher?.getOrCreateWebServices();
  }

  /* Getters */

  public get Signer(): JsObjectSigner {
    return this.signer;
  }

  public getSupportedDltIDs(): string[] {
    return this.supportedDltIDs;
  }

  public get gatewaySigner(): JsObjectSigner {
    return this.signer;
  }

  public get pubKey(): string {
    return this._pubKey;
  }

  public getOpenApiSpec(): unknown {
    return this.OAS;
  }

  // TODO: keep getter; add an admin endpoint to get identity of connected gateway to BLO
  public get Identity(): GatewayIdentity {
    const fnTag = `${this.className}#getIdentity()`;
    this.logger.trace(`Entering ${fnTag}`);
    if (!this.config.gid) {
      throw new Error("GatewayIdentity is not defined");
    }
    return this.config.gid!;
  }

  /* Gateway configuration helpers */

  private static processGatewayId(): string {
    return process.env.SATP_GATEWAY_ID || uuidv4();
  }

  private static processGatewayName(): string {
    return process.env.SATP_GATEWAY_NAME || uuidv4();
  }

  private static processGatewayVersion(): DraftVersions[] {
    return [
      {
        Core: process.env.SATP_GATEWAY_VERSION_CORE || SATP_VERSION,
        Architecture:
          process.env.SATP_GATEWAY_VERSION_ARCHITECTURE || SATP_VERSION,
        Crash: process.env.SATP_GATEWAY_VERSION_CRASH || SATP_VERSION,
      },
    ];
  }

  private static processGatewaySupportedDLTs(): SupportedChain[] {
    if (process.env.SATP_SUPPORTED_DLTS) {
      return process.env.SATP_SUPPORTED_DLTS.split(",").filter((dlt) =>
        Object.values(SupportedChain).includes(dlt as SupportedChain),
      ) as SupportedChain[];
    }
    return [];
  }

  private static processGatewayProofID(): string {
    return process.env.SATP_PROOF_ID || uuidv4();
  }

  private static processGatewayServerPort(): number {
    const port = Number(process.env.SATP_GATEWAY_SERVER_PORT);
    if (process.env.SATP_GATEWAY_SERVER_PORT && !isNaN(Number(port))) {
      return parseInt(process.env.SATP_GATEWAY_SERVER_PORT);
    }
    return DEFAULT_PORT_GATEWAY_SERVER;
  }

  private static processGatewayClientPort(): number {
    const port = Number(process.env.SATP_GATEWAY_CLIENT_PORT);
    if (process.env.SATP_GATEWAY_CLIENT_PORT && !isNaN(Number(port))) {
      return parseInt(process.env.SATP_GATEWAY_CLIENT_PORT);
    }
    return DEFAULT_PORT_GATEWAY_CLIENT;
  }

  private static processGatewayOpenAPIPort(): number {
    const port = Number(process.env.SATP_GATEWAY_API_PORT);
    if (process.env.SATP_GATEWAY_API_PORT && !isNaN(Number(port))) {
      return parseInt(process.env.SATP_GATEWAY_API_PORT);
    }
    return DEFAULT_PORT_GATEWAY_API;
  }

  private static processGatewayAddress(): Address {
    return (process.env.SATP_GATEWAY_ADDRESS as Address) || `http://localhost`;
  }

  private static processGatewayIdentity(
    pluginOptions: SATPGatewayConfig,
  ): GatewayIdentity {
    const gid = pluginOptions.gid;
    return {
      id: gid?.id || this.processGatewayId(),
      pubKey: bufArray2HexStr(pluginOptions.keyPair!.publicKey),
      name: gid?.name || this.processGatewayName(),
      version: gid?.version || this.processGatewayVersion(),
      supportedDLTs: gid?.supportedDLTs || this.processGatewaySupportedDLTs(),
      proofID: gid?.proofID || this.processGatewayProofID(),
      gatewayServerPort:
        gid?.gatewayServerPort || this.processGatewayServerPort(),
      gatewayClientPort:
        gid?.gatewayClientPort || this.processGatewayClientPort(),
      gatewayOpenAPIPort: this.processGatewayOpenAPIPort(),
      address: gid?.address || this.processGatewayAddress(),
    };
  }

  private static processCounterPartyGateways(): GatewayIdentity[] {
    if (process.env.SATP_COUNTER_PARTY_GATEWAYS) {
      try {
        const parsedGateways = JSON.parse(
          process.env.SATP_COUNTER_PARTY_GATEWAYS,
        ) as GatewayIdentity[];

        const validGateway = (gateway: unknown): gateway is GatewayIdentity => {
          if (!gateway) {
            return false;
          }
          const gw = gateway as Record<string, unknown>;
          if (
            !("id" in gw) ||
            !("version" in gw) ||
            !("supportedDLTs" in gw) ||
            typeof gw.id !== "string" ||
            typeof gw.version !== "string" ||
            typeof gw.supportedDLTs !== "string"
          ) {
            return false;
          }
          const [Core, Architecture, Crash] = gw.version.split(",");
          if (!Core || !Architecture || !Crash) {
            return false;
          }
          const dlts = gw.supportedDLTs.split(",") as SupportedChain[];
          if (
            !dlts.every((dlt) => Object.values(SupportedChain).includes(dlt)) ||
            dlts.length === 0
          ) {
            return false;
          }
          // validate optional fields if provided
          if (
            ("name" in gw && typeof gw.name !== "string") ||
            ("proofID" in gw && typeof gw.proofID !== "string") ||
            ("gatewayServerPort" in gw &&
              (typeof gw.gatewayServerPort !== "string" ||
                isNaN(Number(gw.gatewayServerPort)))) ||
            ("gatewayClientPort" in gw &&
              (typeof gw.gatewayClientPort !== "string" ||
                isNaN(Number(gw.gatewayClientPort)))) ||
            ("address" in gw && typeof gw.address !== "string")
          ) {
            return false;
          }
          return true;
        };

        if (
          !Array.isArray(parsedGateways) ||
          !parsedGateways.every(validGateway)
        ) {
          throw new Error(
            "SATP_COUNTER_PARTY_GATEWAYS must be an array of valid gateway identities",
          );
        } else {
          return parsedGateways;
        }
      } catch (error) {
        console.warn(
          `Failed to parse SATP_COUNTER_PARTY_GATEWAYS: ${error.message}. Using default.`,
        );
      }
    }
    return [];
  }

  private static processLogLevel(): LogLevelDesc {
    return (
      (process.env.SATP_LOG_LEVEL?.toUpperCase() as LogLevelDesc) || "DEBUG"
    );
  }

  private static processKeyPair(): ISignerKeyPairs {
    if (process.env.SATP_PUBLIC_KEY && process.env.SATP_PRIVATE_KEY) {
      return {
        privateKey: Buffer.from(process.env.SATP_PRIVATE_KEY, "hex"),
        publicKey: Buffer.from(process.env.SATP_PUBLIC_KEY, "hex"),
      };
    }
    return Secp256k1Keys.generateKeyPairsBuffer();
  }

  private static processEnvironment(): "development" | "production" {
    return (
      (process.env.SATP_NODE_ENV as "development" | "production") ||
      "development"
    );
  }

  private static processEnableOpenAPI(): boolean {
    if (process.env.SATP_ENABLE_OPEN_API === "false") {
      return false;
    }
    return true;
  }

  private static processValidationOptions(): ValidatorOptions {
    if (process.env.SATP_VALIDATION_OPTIONS) {
      try {
        const envValidationOptions = JSON.parse(
          process.env.SATP_VALIDATION_OPTIONS,
        ) as ValidatorOptions;

        if (
          typeof envValidationOptions.skipMissingProperties !== "boolean" &&
          envValidationOptions.skipMissingProperties !== undefined
        ) {
          throw new Error(
            "skipMissingProperties must be a boolean if provided",
          );
        } else {
          return envValidationOptions;
        }
      } catch (error) {
        console.warn(
          `Failed to parse SATP_VALIDATION_OPTIONS: ${error}. Using default.`,
        );
      }
    }
    return {};
  }

  private static processPrivacyPolicies(): IPrivacyPolicyValue[] {
    if (process.env.SATP_PRIVACY_POLICIES) {
      try {
        const parsedPolicies = JSON.parse(
          process.env.SATP_PRIVACY_POLICIES,
        ) as IPrivacyPolicyValue[];

        const validPolicies = (
          eachPolicy: unknown,
        ): eachPolicy is IPrivacyPolicyValue => {
          if (!eachPolicy) {
            return false;
          }
          const policy = eachPolicy as Record<string, unknown>;
          return (
            "policy" in policy &&
            "policyHash" in policy &&
            typeof policy.policy === "string" &&
            typeof policy.policyHash === "string" &&
            (policy.policy === PrivacyPolicyOpts.PruneState ||
              policy.policy === PrivacyPolicyOpts.SingleTransaction)
          );
        };

        if (
          !Array.isArray(parsedPolicies) ||
          !parsedPolicies.every(validPolicies)
        ) {
          throw new Error(
            "SATP_PRIVACY_POLICIES must be an array of valid privacy policies",
          );
        } else {
          return parsedPolicies;
        }
      } catch (error) {
        console.warn(
          `Failed to parse SATP_PRIVACY_POLICIES: ${error.message}. Using default.`,
        );
      }
    }
    return [];
  }

  private static processMergePolicies(): IMergePolicyValue[] {
    if (process.env.SATP_MERGE_POLICIES) {
      try {
        const parsedPolicies = JSON.parse(
          process.env.SATP_MERGE_POLICIES,
        ) as IMergePolicyValue[];

        const validPolicies = (
          eachPolicy: unknown,
        ): eachPolicy is IMergePolicyValue => {
          if (!eachPolicy) {
            return false;
          }
          const policy = eachPolicy as Record<string, unknown>;
          return (
            "policy" in policy &&
            "policyHash" in policy &&
            typeof policy.policy === "string" &&
            typeof policy.policyHash === "string" &&
            (policy.policy === MergePolicyOpts.PruneState ||
              policy.policy === MergePolicyOpts.PruneStateFromView ||
              policy.policy === MergePolicyOpts.NONE)
          );
        };

        if (
          !Array.isArray(parsedPolicies) ||
          !parsedPolicies.every(validPolicies)
        ) {
          throw new Error(
            "SATP_MERGE_POLICIES must be an array of valid merge policies if provided",
          );
        } else {
          return parsedPolicies;
        }
      } catch (error) {
        console.warn(
          `Failed to parse SATP_MERGE_POLICIES: ${error.message}. Using default.`,
        );
      }
    }
    return [];
  }

  static ProcessGatewayCoordinatorConfig(
    pluginOptions: SATPGatewayConfig,
  ): SATPGatewayConfig {
    if (!pluginOptions.keyPair) {
      pluginOptions.keyPair = this.processKeyPair();
    }

    pluginOptions.gid = this.processGatewayIdentity(pluginOptions);

    if (!pluginOptions.counterPartyGateways) {
      pluginOptions.counterPartyGateways = this.processCounterPartyGateways();
    }

    if (!pluginOptions.logLevel) {
      pluginOptions.logLevel = this.processLogLevel();
    }

    if (!pluginOptions.environment) {
      pluginOptions.environment = this.processEnvironment();
    }

    if (!pluginOptions.enableOpenAPI) {
      pluginOptions.enableOpenAPI = this.processEnableOpenAPI();
    }

    if (!pluginOptions.validationOptions) {
      pluginOptions.validationOptions = this.processValidationOptions();
    }

    if (!pluginOptions.privacyPolicies) {
      pluginOptions.privacyPolicies = this.processPrivacyPolicies();
    }

    if (!pluginOptions.mergePolicies) {
      pluginOptions.mergePolicies = this.processMergePolicies();
    }

    // if (!pluginOptions.bridgesConfig) {
    //   const configPath = "/bridges-config.jsonc";
    //   try {
    //     console.log("Reading bridgesConfig from:", configPath);
    //     const configFile = fs.readFileSync(configPath, "utf8");
    //     const parsed = jsonc.parse(configFile) as NetworkConfig[]; // not working
    //     console.log("typeof parsed");
    //     console.log(typeof parsed);
    //     console.log("jsonc.parse(configFile) as NetworkConfig[]");
    //     console.log(parsed);

    //     const bridgesConfig: NetworkConfig[] = parsed;

    //     pluginOptions.bridgesConfig = bridgesConfig;
    //     console.log("pluginOptions.bridgesConfig");
    //     console.log(pluginOptions.bridgesConfig);
    //   } catch (error) {
    //     if (
    //       error instanceof Error &&
    //       "code" in error &&
    //       error.code === "ENOENT"
    //     ) {
    //       console.warn(
    //         `Besu config file not found at ${configPath}. Using empty configuration.`,
    //       );
    //       pluginOptions.bridgesConfig = [];
    //     } else {
    //       console.error(
    //         `Error reading or parsing bridge config file at ${configPath}:`,
    //         error,
    //       );
    //       throw new Error(
    //         `Failed to read or parse bridge config file at ${configPath}: ${error instanceof Error ? error.message : "Unknown error"}`,
    //       );
    //     }
    //   }
    // }

    // if (!pluginOptions.bridgesConfig) {
    //   const besuConfigPath = "/besu-config.jsonc";
    //   const fabricConfigPath = "/fabric-config.jsonc";
    //   let besuConfig: BesuConfig | undefined;
    //   let fabricConfig: FabricConfig | undefined;

    //   try {
    //     // Try to read and parse Besu config
    //     console.log("Reading besuConfig from:", besuConfigPath);
    //     console.log(fs.existsSync(besuConfigPath));
    //     const besuConfigFile = fs.readFileSync(besuConfigPath, "utf8");
    //     const parsedBesuConfig = jsonc.parse(besuConfigFile) as BesuConfig;
    //     besuConfig = this.getBesuConfig(parsedBesuConfig);
    //     console.log(typeof besuConfig);

    //     // Try to read and parse Fabric config
    //     console.log("Reading fabricConfig from:", fabricConfigPath);
    //     console.log(fs.existsSync(fabricConfigPath));
    //     const fabricConfigFile = fs.readFileSync(fabricConfigPath, "utf8");
    //     const parsedFabricConfig = jsonc.parse(
    //       fabricConfigFile,
    //     ) as FabricConfig;
    //     fabricConfig = this.getFabricConfig(parsedFabricConfig);
    //     console.log(typeof fabricConfig);

    //     pluginOptions.bridgesConfig = [besuConfig, fabricConfig];
    //   } catch (error) {
    //     if (
    //       error instanceof Error &&
    //       "code" in error &&
    //       error.code === "ENOENT"
    //     ) {
    //       if (!besuConfig) {
    //         console.warn(`Besu config file not found at ${besuConfigPath}.`);
    //       }
    //       if (!fabricConfig) {
    //         console.warn(
    //           `Fabric config file not found at ${fabricConfigPath}.`,
    //         );
    //       }
    //       pluginOptions.bridgesConfig = [];
    //     } else {
    //       console.error(`Error reading or parsing bridge config file:`, error);
    //       throw new Error(
    //         `Failed to read or parse bridge config file: ${error instanceof Error ? error.message : "Unknown error"}`
    //       );
    //     }
    //   }
    // }

    if (!pluginOptions.bridgesConfig) {
      // besu config vars:
      let besuConfig: BesuConfig | undefined;
      let fabricConfig: FabricConfig | undefined;
      const bungeeBesuId = process.env.BESU_BUNGEE_ID;

      const keychainEntryValue = process.env.BESU_OPTS_ENTRY_VALUE;
      const keychainEntryKey = process.env.BESU_OPTS_ENTRY_KEY;
      const besuKeychainPlugin1Id = process.env.BESU_OPTS_PLUGIN1_ID;
      const besuKeychainPlugin1KeychainId =
        process.env.BESU_OPTS_PLUGIN1_KEYCHAIN_ID;
      const besuKeychainPlugin2Id = process.env.BESU_OPTS_PLUGIN2_ID;
      const besuKeychainPlugin2KeychainId =
        process.env.BESU_OPTS_PLUGIN2_KEYCHAIN_ID;

      const erc20TokenContract = process.env.ERC20_TOKEN_CONTRACT;
      const contractNameWrapper = process.env.WRAPPER_CONTRACT_NAME;

      const besuOptionsInstanceID = process.env.BESU_OPTS_ID;
      const besuOptionsHttpHost = process.env.BESU_OPTS_HTTP_HOST;
      const besuOptionsWsHost = process.env.BESU_OPTS_WS_HOST;
      const besuKeychainId = process.env.BESU_KEYCHAIN_ID;
      const besuEthAccount = process.env.BESU_CREDENTIAL_ETH_ACCOUNT;
      const besuSecret = process.env.BESU_CREDENTIAL_SECRET;
      const besuType = process.env.BESU_CREDENTIAL_TYPE;
      const besuContractName = process.env.BESU_CONTRACT_NAME;
      const besuContractAddress = process.env.BESU_CONTRACT_ADDRESS;
      const besuGas = process.env.BESU_GAS;

      // fabric config vars:
      const fabricBungeeId = process.env.FABRIC_BUNGEE_ID;

      const fabricKeychainId = process.env.FABRIC_KEYCHAIN_ID;
      const fabricCredentialKeychainRef =
        process.env.FABRIC_CREDENTIAL_KEYCHAIN_REF;

      const fabricOptsId = process.env.FABRIC_OPTS_ID;
      const fabricOptsDockerBinary = process.env.FABRIC_OPTS_DOCKER_BINARY;
      const fabricOptsPeerBinary = process.env.FABRIC_OPTS_PEER_BINARY;
      const fabricOptsGoBinary = process.env.FABRIC_OPTS_GO_BINARY;

      const keychainInstanceIdBridge =
        process.env.FABRIC_KEYCHAIN_INSTANCE_ID_BRIDGE;
      const keychainIdBridge = process.env.FABRIC_KEYCHAIN_ID_BRIDG;
      const keychainEntryKeyBridge =
        process.env.FABRIC_KEYCHAIN_ENTRY_KEY_BRIDGE;
      const keychainEntryValueBridge =
        process.env.FABRIC_KEYCHAIN_ENTRY_VALUE_BRIDGE;

      const fabricStrategy = process.env.FABRIC_STRATEGY;
      const fabricTimeout = process.env.FABRIC_TIMEOUT;

      const discoveryOptsEnabled = process.env.FABRIC_STRATEGY;
      const discoveryOptsAsLocalhost = process.env.DISCOVERY_OPTS_AS_LOCALHOST;
      const sshConfig = process.env.SSH_CONFIG;
      const bridgeProfile = process.env.BRIDGE_PROFILE;
      const fabricConfigChannel = process.env.FABRIC_CONFIG_CHANNEL;
      const fabricConfigContract = process.env.FABRIC_CONFIG_CONTRACT;

      let logLevel: LogLevelDesc;
      if (process.env.LOG_LEVEL !== undefined) {
        logLevel = process.env.LOG_LEVEL as LogLevelDesc;
      } else {
        logLevel = "DEBUG";
      }

      if (
        bungeeBesuId !== undefined &&
        keychainEntryValue !== undefined &&
        keychainEntryKey !== undefined &&
        besuKeychainPlugin1Id !== undefined &&
        besuKeychainPlugin1KeychainId !== undefined &&
        besuKeychainPlugin2Id !== undefined &&
        besuKeychainPlugin2KeychainId !== undefined &&
        erc20TokenContract !== undefined &&
        contractNameWrapper !== undefined &&
        besuOptionsInstanceID !== undefined &&
        besuOptionsHttpHost !== undefined &&
        besuOptionsWsHost !== undefined &&
        besuKeychainId !== undefined &&
        besuEthAccount !== undefined &&
        besuSecret !== undefined &&
        besuType !== undefined &&
        besuContractName !== undefined &&
        besuContractAddress !== undefined &&
        besuGas !== undefined
      ) {
        const pluginBungeeBesuOptions: IPluginBungeeHermesOptions = {
          keyPair: Secp256k1Keys.generateKeyPairsBuffer(),
          instanceId: bungeeBesuId,
          pluginRegistry: new PluginRegistry(),
          logLevel,
        };

        const keychainPlugin1 = new PluginKeychainMemory({
          instanceId: uuidv4(),
          keychainId: uuidv4(),
          backend: new Map([[keychainEntryKey, keychainEntryValue]]),
          logLevel,
        });
        const keychainPlugin2 = new PluginKeychainMemory({
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

        const besuOptions: IPluginLedgerConnectorBesuOptions = {
          instanceId: besuOptionsInstanceID,
          rpcApiHttpHost: besuOptionsHttpHost,
          rpcApiWsHost: besuOptionsWsHost,
          pluginRegistry,
          logLevel,
        };

        besuConfig = {
          network: SupportedChain.BESU,
          keychainId: besuKeychainId,
          signingCredential: {
            ethAccount: besuEthAccount,
            secret: besuSecret,
            type: besuType as Web3SigningCredentialType,
          },
          contractName: besuContractName,
          contractAddress: besuContractAddress,
          options: besuOptions,
          bungeeOptions: pluginBungeeBesuOptions,
          gas: parseInt(besuGas),
        };
      }

      if (
        fabricBungeeId !== undefined &&
        fabricOptsId !== undefined &&
        fabricOptsDockerBinary !== undefined &&
        fabricOptsPeerBinary !== undefined &&
        fabricOptsGoBinary !== undefined &&
        keychainInstanceIdBridge !== undefined &&
        keychainIdBridge !== undefined &&
        keychainEntryKeyBridge !== undefined &&
        keychainEntryValueBridge !== undefined &&
        fabricStrategy !== undefined &&
        fabricTimeout !== undefined &&
        discoveryOptsEnabled !== undefined &&
        discoveryOptsAsLocalhost !== undefined &&
        sshConfig !== undefined &&
        bridgeProfile !== undefined &&
        fabricConfigChannel !== undefined &&
        fabricKeychainId !== undefined &&
        fabricCredentialKeychainRef !== undefined &&
        fabricConfigContract !== undefined
      ) {
        const pluginBungeeFabricOptions: IPluginBungeeHermesOptions = {
          keyPair: Secp256k1Keys.generateKeyPairsBuffer(),
          instanceId: fabricBungeeId,
          pluginRegistry: new PluginRegistry(),
          logLevel,
        };

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

        const fabricOptions: IPluginLedgerConnectorFabricOptions = {
          instanceId: fabricOptsId,
          dockerBinary: fabricOptsDockerBinary,
          peerBinary: fabricOptsPeerBinary,
          goBinary: fabricOptsGoBinary,
          pluginRegistry: pluginRegistryBridge,
          cliContainerEnv: FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_2,
          sshConfig: JSON.parse(sshConfig) as Config,
          logLevel,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          connectionProfile: bridgeProfile as any as ConnectionProfile,
          discoveryOptions: {
            enabled: discoveryOptsEnabled.toLowerCase() === "true",
            asLocalhost: discoveryOptsAsLocalhost.toLowerCase() === "true",
          },
          eventHandlerOptions: {
            strategy: fabricStrategy as DefaultEventHandlerStrategy,
            commitTimeout: parseInt(fabricTimeout),
          },
        };

        const bridgeFabricSigningCredential = {
          keychainId: keychainIdBridge,
          keychainRef: keychainEntryKeyBridge,
        };
        fabricConfig = {
          network: SupportedChain.FABRIC,
          signingCredential: bridgeFabricSigningCredential,
          channelName: fabricConfigChannel,
          contractName: fabricConfigContract,
          options: fabricOptions,
          bungeeOptions: pluginBungeeFabricOptions,
        } as FabricConfig;
      }
      if (besuConfig && fabricConfig) {
        pluginOptions.bridgesConfig = [besuConfig, fabricConfig];
      } else if (besuConfig) {
        pluginOptions.bridgesConfig = [besuConfig];
      } else if (fabricConfig) {
        pluginOptions.bridgesConfig = [fabricConfig];
      } else {
        pluginOptions.bridgesConfig = [];
      }
    }

    return pluginOptions;
  }

  /**
   * Startup Methods
   * ----------------
   * This section includes methods responsible for starting up the server and its associated services independently of the existence of a Hyperledger Cacti Node.
   * It ensures that both the GatewayServer and BLOServer are initiated concurrently for efficient launch.
   */
  public async startup(): Promise<void> {
    const fnTag = `${this.className}#startup()`;
    this.logger.trace(`Entering ${fnTag}`);

    await Promise.all([this.startupBLOServer()]);

    await Promise.all([this.startupGOLServer()]);
  }

  protected async startupBLOServer(): Promise<void> {
    // starts BOL
    const fnTag = `${this.className}#startupBLOServer()`;
    this.logger.trace(`Entering ${fnTag}`);
    this.logger.info("Starting BOL server");
    const port =
      this.options.gid?.gatewayOpenAPIPort ?? DEFAULT_PORT_GATEWAY_API;

    return new Promise(async (resolve, reject) => {
      if (!this.BLOApplication || !this.BLOServer) {
        if (!this.BLODispatcher) {
          throw new Error("BLODispatcher is not defined");
        }
        this.BLOApplication = express();
        this.BLOApplication.use(bodyParser.json({ limit: "250mb" }));
        this.BLOApplication.use(cors());
        try {
          const webServices = await this.BLODispatcher.getOrCreateWebServices();
          for (const service of webServices) {
            this.logger.debug(`Registering web service: ${service.getPath()}`);
            await service.registerExpress(this.BLOApplication);
          }
        } catch (error) {
          throw new Error(`Failed to register web services: ${error}`);
        }

        if (this.OAPIServerEnabled) {
          this.logger.debug("OpenAPI server is enabled");

          try {
            const webServices =
              await this.BLODispatcher.getOrCreateOAPIWebServices();
            for (const service of webServices) {
              this.logger.debug(
                `Registering OpenAPI web service: ${service.getPath()}`,
              );
              await service.registerExpress(this.BLOApplication);
            }
            this.BLOApplication.use(
              "/api-docs",
              swaggerUi.serve as express.RequestHandler[],
              swaggerUi.setup(this.OAS) as express.RequestHandler,
            );
          } catch (error) {
            throw new Error(`Error to register OpenAPI web services: ${error}`);
          }
        }

        this.BLOServer = http.createServer(this.BLOApplication);

        this.BLOServer.listen(port, () => {
          this.logger.info(`BLO server started and listening on port ${port}`);
          resolve();
        });

        this.BLOServer.on("error", (error) => {
          this.logger.error(`BLO server failed to start: ${error}`);
          reject(error);
        });
      } else {
        this.logger.warn("BLO Server already running.");
        resolve();
      }
    });
  }

  protected async startupGOLServer(): Promise<void> {
    // starts GOL
    const fnTag = `${this.className}#startupGOLServer()`;
    this.logger.trace(`Entering ${fnTag}`);
    this.logger.info("Starting GOL server");

    const port =
      this.options.gid?.gatewayServerPort ?? DEFAULT_PORT_GATEWAY_SERVER;

    //TODO create a server for the client part

    return new Promise(async (resolve, reject) => {
      if (!this.GOLServer) {
        this.GOLApplication = express();

        this.gatewayOrchestrator.addGOLServer(this.GOLApplication!);
        this.gatewayOrchestrator.startServices();

        this.GOLServer = http.createServer(this.GOLApplication);

        this.GOLServer.listen(port, () => {
          this.logger.info(`GOL server started and listening on port ${port}`);
          resolve();
        });

        this.GOLServer.on("error", (error) => {
          this.logger.error(`GOL server failed to start: ${error}`);
          reject(error);
        });
      } else {
        this.logger.warn("GOL Server already running.");
        resolve();
      }
    });
  }

  /**
   * Gateway Connection Methods
   * --------------------------
   * This section encompasses methods dedicated to establishing connections with gateways.
   * It includes functionalities to add gateways based on provided IDs and resolve specific gateway identities.
   * These operations are fundamental for setting up and managing gateway connections within the system.
   */

  // TODO: addGateways as an admin endpoint, simply calls orchestrator
  public async resolveAndAddGateways(IDs: string[]): Promise<void> {
    const fnTag = `${this.className}#resolveAndAddGateways()`;
    this.logger.trace(`Entering ${fnTag}`);
    this.logger.info("Connecting to gateway");
    this.gatewayOrchestrator.resolveAndAddGateways(IDs);

    // todo connect to gateway
  }

  public async addGateways(gateways: GatewayIdentity[]): Promise<void> {
    const fnTag = `${this.className}#addGateways()`;
    this.logger.trace(`Entering ${fnTag}`);
    this.logger.info("Connecting to gateway");
    this.gatewayOrchestrator.addGateways(gateways);

    // todo connect to gateway
  }

  /**
   * Shutdown Methods
   * -----------------
   * This section includes methods responsible for cleanly shutting down the server and its associated services.
   */
  public onShutdown(hook: ShutdownHook): void {
    const fnTag = `${this.className}#onShutdown()`;
    this.logger.trace(`Entering ${fnTag}`);
    this.logger.debug(`Adding shutdown hook: ${hook.name}`);
    this.shutdownHooks.push(hook);
  }

  public async shutdown(): Promise<void> {
    const fnTag = `${this.className}#getGatewaySeeds()`;
    this.logger.debug(`Entering ${fnTag}`);

    this.logger.info("Shutting down Node server - BOL");
    await this.shutdownBLOServer();

    this.logger.debug("Running shutdown hooks");
    for (const hook of this.shutdownHooks) {
      this.logger.debug(`Running shutdown hook: ${hook.name}`);
      await hook.hook();
    }

    this.logger.info("Shutting down Gateway Connection Manager");
    const connectionsClosed = await this.gatewayOrchestrator.disconnectAll();

    this.logger.info(`Closed ${connectionsClosed} connections`);
    this.logger.info("Gateway Coordinator shut down");
    return;
  }

  private async shutdownBLOServer(): Promise<void> {
    const fnTag = `${this.className}#shutdownBLOServer()`;
    this.logger.debug(`Entering ${fnTag}`);
    if (this.BLOServer) {
      try {
        await this.GOLServer?.close();
        await this.BLOServer.closeAllConnections();
        await this.BLOServer.close();
        this.BLOServer = undefined;
        this.logger.info("Server shut down");
      } catch (error) {
        this.logger.error(
          `Error shutting down the gatewayApplication: ${error}`,
        );
      }
    } else {
      this.logger.warn("Server is not running.");
    }
  }
}
