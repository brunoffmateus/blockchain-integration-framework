import { Server } from "http";
import { Server as SecureServer } from "https";
import { Optional } from "typescript-optional";
import { promisify } from "util";
import {
  IPluginWebService,
  IWebServiceEndpoint,
  ICactusPlugin,
  ICactusPluginOptions,
  LedgerType,
} from "@hyperledger/cactus-core-api";

import { PluginRegistry } from "@hyperledger/cactus-core";
import { Express } from "express";

import {
  Checks,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import { CrossChainEventLog } from "./models/cross-chain-event";

export interface IWebAppOptions {
  port: number;
  hostname: string;
}
import { CrossChainModel } from "./models/crosschain-model";
import {
  BesuV2TxReceipt,
  EthereumTxReceipt,
  FabricV2TxReceipt,
} from "./models/transaction-receipt";
import { RunTransactionV1Exchange as RunTransactionV1ExchangeBesu } from "@hyperledger/cactus-plugin-ledger-connector-besu";
import { RunTransactionV1Exchange as RunTransactionV1ExchangeEth } from "@hyperledger/cactus-plugin-ledger-connector-ethereum";
import { RunTxReqWithTxId } from "@hyperledger/cactus-plugin-ledger-connector-fabric";

import { Observable } from "rxjs";
import { filter, tap } from "rxjs/operators";

export interface IPluginCcModelHephaestusOptions extends ICactusPluginOptions {
  connectorRegistry?: PluginRegistry;
  logLevel?: LogLevelDesc;
  webAppOptions?: IWebAppOptions;
  instanceId: string;
  ethTxObservable?: Observable<RunTransactionV1ExchangeEth>;
  besuTxObservable?: Observable<RunTransactionV1ExchangeBesu>;
  fabricTxObservable?: Observable<RunTxReqWithTxId>;
}

export class CcModelHephaestus implements ICactusPlugin, IPluginWebService {
  private readonly log: Logger;
  private readonly instanceId: string;
  private endpoints: IWebServiceEndpoint[] | undefined;
  private httpServer: Server | SecureServer | null = null;
  private crossChainLog: CrossChainEventLog;
  private crossChainModel: CrossChainModel;
  public readonly className = "plugin-ccmodel-hephaestus";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private txReceipts: any[];
  private caseID: string;
  private ethTxObservable?: Observable<RunTransactionV1ExchangeEth>;
  private besuTxObservable?: Observable<RunTransactionV1ExchangeBesu>;
  private fabricTxObservable?: Observable<RunTxReqWithTxId>;
  private startMonitoring: number | null = null;

  constructor(public readonly options: IPluginCcModelHephaestusOptions) {
    const startTime = new Date();
    const fnTag = `PluginCcModelHephaestus#constructor()`;
    if (!options) {
      throw new Error(`${fnTag} options falsy.`);
    }
    Checks.truthy(options.instanceId, `${fnTag} options.instanceId`);
    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({
      label: label,
      level: level,
    });
    this.instanceId = this.options.instanceId;
    this.crossChainLog = new CrossChainEventLog({
      name: "HEPHAESTUS_EVENT_LOGS",
    });

    //todo should allow different models to be instantiated
    this.crossChainModel = new CrossChainModel();
    this.txReceipts = [];

    this.caseID = "UNDEFINED_CASE_ID";

    this.ethTxObservable = options.ethTxObservable;
    this.besuTxObservable = options.besuTxObservable;
    this.fabricTxObservable = options.fabricTxObservable;

    const finalTime = new Date();
    this.log.debug(
      `EVAL-${this.className}-SETUP-CONSTRUCTOR:${finalTime.getTime() - startTime.getTime()}`,
    );
  }

  getOpenApiSpec(): unknown {
    throw new Error("Method not implemented.");
  }

  get ccModel(): CrossChainModel {
    return this.crossChainModel;
  }

  get numberEventsLog(): number {
    return this.crossChainLog.numberEvents();
  }

  get numberUnprocessedReceipts(): number {
    return this.txReceipts.length;
  }

  public purgeCrossChainEvents(): void {
    this.crossChainLog.purgeLogs();
  }

  public getInstanceId(): string {
    return this.instanceId;
  }

  public getCaseId(): string {
    return this.caseID;
  }

  public setCaseId(id: string): void {
    this.caseID = id;
  }

  public async onPluginInit(): Promise<unknown> {
    return;
  }

  public async shutdown(): Promise<void> {
    this.log.info(`Shutting down...`);
    const serverMaybe = this.getHttpServer();
    if (serverMaybe.isPresent()) {
      this.log.info(`Awaiting server.close() ...`);
      const server = serverMaybe.get();
      await promisify(server.close.bind(server))();
      this.log.info(`server.close() OK`);
    } else {
      this.log.info(`No HTTP server found, skipping...`);
    }
  }

  async registerWebServices(app: Express): Promise<IWebServiceEndpoint[]> {
    const webServices = await this.getOrCreateWebServices();
    await Promise.all(webServices.map((ws) => ws.registerExpress(app)));
    return webServices;
  }

  public async getOrCreateWebServices(): Promise<IWebServiceEndpoint[]> {
    if (Array.isArray(this.endpoints)) {
      return this.endpoints;
    }

    const { log } = this;

    log.info(`Installing web services for plugin ${this.getPackageName()}...`);

    const endpoints: IWebServiceEndpoint[] = [];

    // TODO implement endpoints

    const pkg = this.getPackageName();
    log.info(`Installed web services for plugin ${pkg} OK`, { endpoints });

    return endpoints;
  }

  public getHttpServer(): Optional<Server | SecureServer> {
    return Optional.ofNullable(this.httpServer);
  }

  public getPackageName(): string {
    return `@hyperledger/cactus-plugin-ccmodel-hephaestus`;
  }

  public createReceiptFromRunTransactionV1ExchangeEth(
    data: RunTransactionV1ExchangeEth,
    caseId: string,
  ): EthereumTxReceipt {
    return {
      caseID: caseId,
      blockchainID: LedgerType.Ethereum,
      timestamp: data.timestamp,
      transactionID: data.response.transactionReceipt.transactionHash,
      from: data.response.transactionReceipt.from,
      invocationType: data.request.invocationType,
      methodName: data.request.methodName,
      parameters: data.request.params,
      gasUsed: data.response.transactionReceipt.gasUsed,
      effectiveGasPrice: data.response.transactionReceipt.effectiveGasPrice,
    };
  }

  public pollTxReceiptsEth(data: RunTransactionV1ExchangeEth): void {
    const fnTag = `${this.className}#pollTxReceiptsEth()`;
    this.log.debug(fnTag);

    const ethReceipt = this.createReceiptFromRunTransactionV1ExchangeEth(
      data,
      this.caseID,
    );
    this.txReceipts.push(ethReceipt);
    return;
  }

  public createReceiptFromRunTransactionV1ExchangeBesu(
    data: RunTransactionV1ExchangeBesu,
    caseId: string,
  ): BesuV2TxReceipt {
    return {
      caseID: caseId,
      blockchainID: LedgerType.Besu2X,
      timestamp: data.timestamp,
      transactionID: data.response.transactionReceipt.transactionHash,
      from: data.response.transactionReceipt.from,
      invocationType: data.request.invocationType,
      methodName: data.request.methodName,
      parameters: data.request.params,
      gasUsed: data.response.transactionReceipt.gasUsed,
      gasPrice: data.request.gasPrice as number,
    };
  }

  public pollTxReceiptsBesu(data: RunTransactionV1ExchangeBesu): void {
    const fnTag = `${this.className}#pollTxReceiptsBesu()`;
    this.log.debug(fnTag);

    const besuReceipt = this.createReceiptFromRunTransactionV1ExchangeBesu(
      data,
      this.caseID,
    );
    this.txReceipts.push(besuReceipt);
    return;
  }

  public createReceiptFromRunTxReqWithTxId(
    data: RunTxReqWithTxId,
    caseId: string,
  ): FabricV2TxReceipt {
    return {
      caseID: caseId,
      blockchainID: LedgerType.Fabric2,
      timestamp: data.timestamp,
      channelName: data.request.channelName,
      transactionID: data.transactionId,
      contractName: data.request.contractName,
      signingCredentials: data.request.signingCredential,
      invocationType: data.request.invocationType,
      methodName: data.request.methodName,
      parameters: data.request.params,
    };
  }

  public pollTxReceiptsFabric(data: RunTxReqWithTxId): void {
    const fnTag = `${this.className}#pollTxReceiptsFabric()`;
    this.log.debug(fnTag);

    const fabricReceipt = this.createReceiptFromRunTxReqWithTxId(
      data,
      this.caseID,
    );
    this.txReceipts.push(fabricReceipt);
    return;
  }

  public watchRunTransactionV1ExchangeEth(duration: number = 0): void {
    const fnTag = `${this.className}#watchRunTransactionV1ExchangeEth()`;
    this.log.debug(fnTag);

    if (!this.ethTxObservable) {
      this.log.debug(
        `${fnTag}-No Ethereum transaction observable provided, monitoring skipped`,
      );
      return;
    }
    if (duration < 0) {
      this.log.debug(
        `${fnTag}-Negative duration provided (${duration}), monitoring all transactions`,
      );
    }
    !this.startMonitoring || (this.startMonitoring = Date.now());

    this.ethTxObservable
      .pipe(
        // Filter only the values emitted within the specified duration
        // if no duration provided, skip filtering
        duration > 0
          ? filter(
              (data) =>
                this.startMonitoring! - data.timestamp.getTime() <= duration,
            )
          : tap(),
      )
      .subscribe({
        next: (data: RunTransactionV1ExchangeEth) => {
          // Handle the data whenever a new value is received by the observer
          this.pollTxReceiptsEth(data);
        },
        error: (error: unknown) => {
          this.log.error(
            `${fnTag}- error`,
            error,
            `receiving RunTransactionV1ExchangeEth by Ethereum transaction observable`,
            this.ethTxObservable,
          );
          throw error;
        },
      });
  }

  public watchRunTransactionV1ExchangeBesu(duration: number = 0): void {
    const fnTag = `${this.className}#watchRunTransactionV1ExchangeBesu()`;
    this.log.debug(fnTag);

    if (!this.besuTxObservable) {
      this.log.debug(
        `${fnTag}-No Besu transaction observable provided, monitoring skipped`,
      );
      return;
    }
    if (duration < 0) {
      this.log.debug(
        `${fnTag}-Negative duration provided (${duration}), monitoring all transactions`,
      );
    }

    !this.startMonitoring || (this.startMonitoring = Date.now());

    this.besuTxObservable
      .pipe(
        // Filter only the values emitted within the specified duration
        // if no duration provided, skip filtering
        duration > 0
          ? filter(
              (data) =>
                this.startMonitoring! - data.timestamp.getTime() <= duration,
            )
          : tap(),
      )
      .subscribe({
        next: (data: RunTransactionV1ExchangeBesu) => {
          // Handle the data whenever a new value is received by the observer
          this.pollTxReceiptsBesu(data);
        },
        error: (error: unknown) => {
          this.log.error(
            `${fnTag}- error`,
            error,
            `receiving RunTransactionV1ExchangeBesu by Besu transaction observable`,
            this.besuTxObservable,
          );
          throw error;
        },
      });
  }

  public watchRunTxReqWithTxId(duration: number = 0): void {
    const fnTag = `${this.className}#watchRunTxReqWithTxId()`;
    this.log.debug(fnTag);

    if (!this.fabricTxObservable) {
      this.log.debug(
        `${fnTag}-No Fabric transaction observable provided, monitoring skipped`,
      );
      return;
    }
    if (duration < 0) {
      this.log.debug(
        `${fnTag}-Negative duration provided (${duration}), monitoring all transactions`,
      );
    }
    !this.startMonitoring || (this.startMonitoring = Date.now());

    this.fabricTxObservable
      .pipe(
        // Filter only the values emitted within the specified duration
        // if no duration provided, skip filtering
        duration > 0
          ? filter(
              (data) =>
                this.startMonitoring! - data.timestamp.getTime() <= duration,
            )
          : tap(),
      )
      .subscribe({
        next: (data: RunTxReqWithTxId) => {
          // Handle the data whenever a new value is received by the observer
          this.pollTxReceiptsFabric(data);
        },
        error: (error: unknown) => {
          this.log.error(
            `${fnTag}- error`,
            error,
            `receiving RunTxReqWithTxId by Fabric transaction observable`,
            this.fabricTxObservable,
          );
          throw error;
        },
      });
  }

  public monitorTransactions(duration: number = 0): void {
    const fnTag = `${this.className}#monitorTransactions()`;
    this.log.debug(fnTag);

    this.startMonitoring = Date.now();
    this.watchRunTxReqWithTxId(duration);
    this.watchRunTransactionV1ExchangeBesu(duration);
    this.watchRunTransactionV1ExchangeEth(duration);
    return;
  }
}
