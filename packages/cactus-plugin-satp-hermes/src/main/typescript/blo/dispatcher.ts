import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
  JsObjectSigner,
} from "@hyperledger/cactus-common";

import { IWebServiceEndpoint } from "@hyperledger/cactus-core-api";

//import { GatewayIdentity, GatewayChannel } from "../core/types";
//import { GetStatusError, NonExistantGatewayIdentity } from "../core/errors";
import { GetStatusEndpointV1 } from "../web-services/status-endpoint";

//import { GetAuditRequest, GetAuditResponse } from "../generated/gateway-client/typescript-axios";
import {
  HealthCheckResponse,
  IntegrationsResponse,
  StatusRequest,
  StatusResponse,
  TransactRequest,
  TransactResponse,
} from "../generated/gateway-client/typescript-axios/api";
import { executeGetIntegrations } from "./admin/get-integrations-handler-service";
import { ISATPManagerOptions, SATPManager } from "../gol/satp-manager";
import { GatewayOrchestrator } from "../gol/gateway-orchestrator";
import { SATPBridgesManager } from "../gol/satp-bridges-manager";
import { TransactEndpointV1 } from "../web-services/transact-endpoint";
import { GetSessionIdsEndpointV1 } from "../web-services/get-all-session-ids-endpoints";
import { HealthCheckEndpointV1 } from "../web-services/healthcheck-endpoint";
import { IntegrationsEndpointV1 } from "../web-services/integrations-endpoint";
import { executeGetHealthCheck } from "./admin/get-healthcheck-handler-service";
import { executeGetStatus } from "./admin/get-status-handler-service";
import { executeTransact } from "./transaction/transact-handler-service";
import {
  ILocalLogRepository,
  IRemoteLogRepository,
} from "../repository/interfaces/repository";
import {
  CcModelHephaestus,
  IPluginCcModelHephaestusOptions,
  ProcessMiningAlgorithm,
} from "@hyperledger/cactus-plugin-ccmodel-hephaestus";
import { PluginLedgerConnectorBesu } from "@hyperledger/cactus-plugin-ledger-connector-besu";
import { PluginLedgerConnectorEthereum } from "@hyperledger/cactus-plugin-ledger-connector-ethereum";
import { PluginLedgerConnectorFabric } from "@hyperledger/cactus-plugin-ledger-connector-fabric";
import { SATPBridgeManager } from "../core/stage-services/satp-bridge/satp-bridge-manager";
import { Observable } from "rxjs";
import { NonConformingTx } from "@hyperledger/cactus-plugin-ccmodel-hephaestus/dist/types/main/typescript/plugin-ccmodel-hephaestus";

export interface BLODispatcherOptions {
  logger: Logger;
  logLevel?: LogLevelDesc;
  instanceId: string;
  orchestrator: GatewayOrchestrator;
  signer: JsObjectSigner;
  bridgesManager: SATPBridgesManager;
  pubKey: string;
  defaultRepository: boolean;
  localRepository: ILocalLogRepository;
  remoteRepository?: IRemoteLogRepository;
  hephaestusOptions?: IPluginCcModelHephaestusOptions;
  nonConformedTxObservable?: Observable<NonConformingTx>;
}

export class BLODispatcher {
  public static readonly CLASS_NAME = "BLODispatcher";
  private readonly logger: Logger;
  private readonly level: LogLevelDesc;
  private readonly label: string;
  private endpoints: IWebServiceEndpoint[] | undefined;
  private OAPIEndpoints: IWebServiceEndpoint[] | undefined;
  private readonly instanceId: string;
  private manager: SATPManager;
  private orchestrator: GatewayOrchestrator;
  private bridgeManager: SATPBridgesManager;
  private defaultRepository: boolean;
  private localRepository: ILocalLogRepository;
  private remoteRepository: IRemoteLogRepository | undefined;
  private hephaestus?: CcModelHephaestus;
  private nonConformedTxObservable?: Observable<NonConformingTx>;
  // private pausedBridges: boolean = false;
  private allowTransactions: boolean = true;

  constructor(public readonly options: BLODispatcherOptions) {
    const fnTag = `${BLODispatcher.CLASS_NAME}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);

    this.level = this.options.logLevel || "INFO";
    this.label = this.className;
    this.logger = LoggerProvider.getOrCreate({
      level: this.level,
      label: this.label,
    });
    this.instanceId = options.instanceId;
    this.logger.info(`Instantiated ${this.className} OK`);
    this.orchestrator = options.orchestrator;
    const signer = options.signer;
    const ourGateway = this.orchestrator.ourGateway;
    this.defaultRepository = options.defaultRepository;
    this.localRepository = options.localRepository;
    this.remoteRepository = options.remoteRepository;

    this.bridgeManager = options.bridgesManager;

    const SATPManagerOpts: ISATPManagerOptions = {
      logLevel: "DEBUG",
      instanceId: ourGateway!.id,
      signer: signer,
      connectedDLTs: this.orchestrator.connectedDLTs,
      bridgeManager: this.bridgeManager,
      orchestrator: this.orchestrator,
      pubKey: options.pubKey,
      defaultRepository: this.defaultRepository,
      localRepository: this.localRepository,
      remoteRepository: this.remoteRepository,
    };

    this.manager = new SATPManager(SATPManagerOpts);

    this.nonConformedTxObservable = options.nonConformedTxObservable;

    if (options.hephaestusOptions) {
      this.hephaestus = new CcModelHephaestus(options.hephaestusOptions);
      const bridgeList = this.bridgeManager.getBridgesList();
      bridgeList.forEach((network) => {
        const bridge = this.bridgeManager.getBridge(network);
        const connector = bridge.bridgeConnector();
        if (connector instanceof PluginLedgerConnectorBesu) {
          this.logger.debug(`Connector is ${network}`);
          this.hephaestus!.setBesuTxObservable(
            connector.getTxSubjectObservable(),
          );
        } else if (connector instanceof PluginLedgerConnectorEthereum) {
          this.logger.debug(`Connector is ${network}`);
          this.hephaestus!.setEthTxObservable(
            connector.getTxSubjectObservable(),
          );
        } else if (connector instanceof PluginLedgerConnectorFabric) {
          this.logger.debug(`Connector is ${network}`);
          this.hephaestus!.setFabricTxObservable(
            connector.getTxSubjectObservable(),
          );
        }
      });
    }
  }

  public get className(): string {
    return BLODispatcher.CLASS_NAME;
  }

  // for testing:
  public getBridge(network: string): SATPBridgeManager {
    return this.bridgeManager.getBridge(network);
  }

  public getBridgesList(): string[] {
    return this.bridgeManager.getBridgesList();
  }

  public setNonConformingTxObservable(
    nonConformedTxObservable: Observable<NonConformingTx>,
  ): void {
    this.nonConformedTxObservable = nonConformedTxObservable;
    this.monitorNonConformingTxs();
  }

  private monitorNonConformingTxs(): void {
    const fnTag = `${this.className}#monitorNonConformingTxs()`;
    this.logger.debug(fnTag);

    if (!this.nonConformedTxObservable) {
      this.logger.debug(
        `${fnTag}-No Non-conformed Transaction observable provided, monitoring skipped`,
      );
      return;
    }

    this.nonConformedTxObservable.subscribe({
      next: async (data: NonConformingTx) => {
        // Pauses the bridge automatically whenever a new value is received by the observer
        const receivedTime = new Date().getTime();
        const paused = await this.pauseBridges();
        const createdTime = data.timestamp.getTime();
        const ccEventTime = data.nonConformingEventEvent?.timestamp.getTime();
        if (ccEventTime) {
          this.logger.debug(
            `NON CONFORMITY CAPTURED AT: ${createdTime}. OBSERVER RECEIVED AT: ${receivedTime} | ` +
              `Latency: ${receivedTime - createdTime} ms | ` +
              `Latency from \"invokeContract()\": ${receivedTime - ccEventTime} ms\n` +
              `Latency in \"pauseBridges()\": ${paused.getTime() - ccEventTime} ms | ` +
              `Latency in \"pauseBridges()\" from \"invokeContract()\": ${paused.getTime() - ccEventTime} ms`,
          );
        } else {
          this.logger.debug(
            `CaseId changed without full transaction being completed...`,
            `NON CONFORMITY CAPTURED AT: ${createdTime}. OBSERVER RECEIVED AT: ${receivedTime} | ` +
              `Latency: ${receivedTime - createdTime} ms | ` +
              `Latency in \"pauseBridges()\": ${paused.getTime() - createdTime} ms | `,
          );
        }
      },
      error: (error: unknown) => {
        this.logger.error(
          `${fnTag}- error`,
          error,
          `receiving NonConformingTx by observable`,
          this.nonConformedTxObservable,
        );
        throw error;
      },
    });
  }

  public startMonitoring(duration: number = -1): void {
    this.hephaestus?.monitorTransactions(duration);
  }

  public async getCCModel(
    miningAlgorithm: ProcessMiningAlgorithm = ProcessMiningAlgorithm.Inductive,
  ): Promise<string> {
    return (
      this.hephaestus?.getModel(miningAlgorithm) ||
      "Hephaestus not active in this Gateway"
    );
  }

  public async createModel(
    miningAlgorithm: ProcessMiningAlgorithm = ProcessMiningAlgorithm.Inductive,
  ): Promise<string> {
    return (
      this.hephaestus?.createModel(miningAlgorithm) ||
      "Hephaestus not active in this Gateway"
    );
  }

  public async pauseBridges(): Promise<Date> {
    this.allowTransactions = false;
    return await this.bridgeManager.pauseBridges();
  }
  public async unpauseBridges(): Promise<Date> {
    const unpauseTime = await this.bridgeManager.unpauseBridges();
    this.allowTransactions = true;
    return unpauseTime;
  }
  public async bridgesArePaused(): Promise<void> {
    return await this.bridgeManager.bridgesArePaused();
  }

  public async getOrCreateWebServices(): Promise<IWebServiceEndpoint[]> {
    const fnTag = `${BLODispatcher.CLASS_NAME}#getOrCreateWebServices()`;
    this.logger.info(
      `${fnTag}, Registering webservices on instanceId=${this.instanceId}`,
    );

    if (Array.isArray(this.endpoints)) {
      return this.endpoints;
    }
    const getStatusEndpointV1 = new GetStatusEndpointV1({
      dispatcher: this,
      logLevel: this.options.logLevel,
    });

    const getHealthCheckEndpoint = new HealthCheckEndpointV1({
      dispatcher: this,
      logLevel: this.options.logLevel,
    });

    const getIntegrationsEndpointV1 = new IntegrationsEndpointV1({
      dispatcher: this,
      logLevel: this.options.logLevel,
    });

    const getSessionIdsEndpointV1 = new GetSessionIdsEndpointV1({
      dispatcher: this,
      logLevel: this.options.logLevel,
    });

    const endpoints = [
      getStatusEndpointV1,
      getHealthCheckEndpoint,
      getIntegrationsEndpointV1,
      getSessionIdsEndpointV1,
    ];
    this.endpoints = endpoints;
    return endpoints;
  }

  public async getOrCreateOAPIWebServices(): Promise<IWebServiceEndpoint[]> {
    const fnTag = `${BLODispatcher.CLASS_NAME}#getOrCreateOAPIWebServices()`;
    this.logger.info(
      `${fnTag}, Registering webservices on instanceId=${this.instanceId}`,
    );

    if (Array.isArray(this.OAPIEndpoints)) {
      return this.OAPIEndpoints;
    }

    const transactEndpointV1 = new TransactEndpointV1({
      dispatcher: this,
      logLevel: this.options.logLevel,
    });

    const endpoints = [transactEndpointV1];
    this.OAPIEndpoints = endpoints;
    return endpoints;
  }

  private getTargetGatewayClient(id: string) {
    const channels = Array.from(this.orchestrator.getChannels());
    channels.filter((ch) => {
      id == ch[0] && ch[1].toGatewayID == id;
    });

    if (channels.length == 0) {
      throw new Error(`No channels with specified target gateway id ${id}`);
    } else if (channels.length > 1) {
      throw new Error(
        `Duplicated channels with specified target gateway id ${id}`,
      );
    } else {
      return channels[0];
    }
  }

  public async healthCheck(): Promise<HealthCheckResponse> {
    return executeGetHealthCheck(this.level, this.manager);
  }

  public async getIntegrations(): Promise<IntegrationsResponse> {
    return executeGetIntegrations(this.level, this.manager);
  }

  public async GetStatus(req: StatusRequest): Promise<StatusResponse> {
    return executeGetStatus(this.level, req, this.manager);
  }

  public async Transact(
    req: TransactRequest,
  ): Promise<TransactResponse | null> {
    // This variable prevents method calls while they are paused, avoiding test failures.
    if (!this.allowTransactions) {
      this.logger.info(
        `Transactions not available at the moment, request canceled: ${req}`,
      );
      return null;
    }
    // this.pausedBridges = await this.checkMisbehaviour();
    // if (this.pausedBridges) {
    //   this.logger.info(
    //     `Bridges are currently paused, transaction request canceled: ${req}`,
    //   );
    //   return null;
    // }

    // const caseId = `TxId_${new Date().getTime()}`;
    // this.logger.debug(`CaseId: ${caseId}`);
    // this.hephaestus?.newCaseId(caseId);

    //TODO pre-verify verify input
    this.logger.info(`Transact request: ${req}`);
    const res = await executeTransact(
      this.level,
      req,
      this.manager,
      this.orchestrator,
    );

    // await this.checkMisbehaviour();

    return res;
  }

  // private async checkMisbehaviour(): Promise<boolean> {
  //   if (this.hephaestus && !this.hephaestus.isCurrentlyModeling) {
  //     const nonConformedEvents = this.hephaestus.numberEventsNonConformedLog;
  //     this.logger.debug(
  //       `Number of non conforming events in asset transaction: ${nonConformedEvents}`,
  //     );
  //     if (nonConformedEvents > 0) {
  //       console.log(`pausing bridges: ${this.pausedBridges}`);
  //       await this.pauseBridges();
  //       return true;
  //     }
  //   }
  //   return false;
  // }

  public async GetSessionIds(): Promise<string[]> {
    this.logger.info(`Get Session Ids request`);
    const res = Array.from(await this.manager.getSessions().keys());
    return res;
  }
  // get channel by caller; give needed client from orchestrator to handler to call
  // for all channels, find session id on request
  // TODO implement handlers GetAudit, Transact, Cancel, Routes
}
