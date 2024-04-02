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
  Constants,
} from "@hyperledger/cactus-core-api";

import { stringify } from "csv-stringify";
import { RuntimeError } from "run-time-error-cjs";

import fs from "fs";
import path from "path";

import { PluginRegistry } from "@hyperledger/cactus-core";
import { Express } from "express";

import { Observable, ReplaySubject } from "rxjs";
import { finalize } from "rxjs/operators";
import { Socket, io } from "socket.io-client-fixed-types";

import {
  Checks,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import {
  calculateGasPriceBesu,
  CarbonFootPrintConstants,
  gweiToDollar,
} from "./models/carbon-footprint";
import {
  CrossChainEvent,
  CrossChainEventLog,
} from "./models/cross-chain-event";

export interface IWebAppOptions {
  port: number;
  hostname: string;
}
import {
  CrossChainModel,
  CrossChainModelType,
  CrossChainTransactionSchema,
} from "./models/crosschain-model";
import {
  // BesuV2TxReceipt,
  BesuV2TxReceiptRxJS,
  // FabricV2TxReceipt,
  FabricV2TxReceiptRxJS,
  millisecondsLatency,
} from "./models/transaction-receipt";
import { randomUUID } from "crypto";
import { RunTransactionV1Exchange } from "@hyperledger/cactus-plugin-ledger-connector-besu";
import { RunTxReqWithTxId } from "@hyperledger/cactus-plugin-ledger-connector-fabric";

// used???
export type APIConfig = {
  type: LedgerType;
  basePath: string;
};

export interface IPluginCcTxVisualizationOptions extends ICactusPluginOptions {
  connectorRegistry?: PluginRegistry;
  logLevel?: LogLevelDesc;
  webAppOptions?: IWebAppOptions;
  instanceId: string;
  basePathFabric?: string;
  basePathBesu?: string;
  readonly wsApiHostFabric?: string;
  readonly wsApiHostBesu?: string;
  readonly wsApiPathFabric?: string;
  readonly wsApiPathBesu?: string;
}

declare const WatchRunTxReqWithTxId: {
  readonly Subscribe: "org.hyperledger.cactus.api.async.hlfabric.WatchRunTxReqWithTxId.Subscribe";
  readonly SubscribeDelegatedSign: "org.hyperledger.cactus.api.async.hlfabric.WatchRunTxReqWithTxId.SubscribeDelegatedSign";
  readonly Next: "org.hyperledger.cactus.api.async.hlfabric.WatchRunTxReqWithTxId.Next";
  readonly Unsubscribe: "org.hyperledger.cactus.api.async.hlfabric.WatchRunTxReqWithTxId.Unsubscribe";
  readonly Error: "org.hyperledger.cactus.api.async.hlfabric.WatchRunTxReqWithTxId.Error";
  readonly Complete: "org.hyperledger.cactus.api.async.hlfabric.WatchRunTxReqWithTxId.Complete";
};
type WatchRunTxReqWithTxId =
  (typeof WatchRunTxReqWithTxId)[keyof typeof WatchRunTxReqWithTxId];

declare const WatchRunTransactionV1Exchange: {
  readonly Subscribe: "org.hyperledger.cactus.api.async.besu.WatchRunTransactionV1Exchange.Subscribe";
  readonly SubscribeDelegatedSign: "org.hyperledger.cactus.api.async.besu.WatchRunTransactionV1Exchange.SubscribeDelegatedSign";
  readonly Next: "org.hyperledger.cactus.api.async.besu.WatchRunTransactionV1Exchange.Next";
  readonly Unsubscribe: "org.hyperledger.cactus.api.async.besu.WatchRunTransactionV1Exchange.Unsubscribe";
  readonly Error: "org.hyperledger.cactus.api.async.besu.WatchRunTransactionV1Exchange.Error";
  readonly Complete: "org.hyperledger.cactus.api.async.besu.WatchRunTransactionV1Exchange.Complete";
};
type WatchRunTransactionV1Exchange =
  (typeof WatchRunTransactionV1Exchange)[keyof typeof WatchRunTransactionV1Exchange];

// TODO - for extensability, modularity, and flexibility,
// this plugin could have a list of connections and list of queues
export class CcTxVisualization implements ICactusPlugin, IPluginWebService {
  private readonly log: Logger;
  private readonly instanceId: string;
  private endpoints: IWebServiceEndpoint[] | undefined;
  private httpServer: Server | SecureServer | null = null;
  private crossChainLog: CrossChainEventLog;
  private crossChainModel: CrossChainModel;
  public readonly className = "plugin-cc-tx-visualization";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private txReceipts: any[];
  private readonly wsApiHostFabric: string;
  private readonly wsApiHostBesu: string;
  private readonly wsApiPathFabric: string;
  private readonly wsApiPathBesu: string;
  private caseID?: string;
  private collectTxReceipts: boolean;

  constructor(public readonly options: IPluginCcTxVisualizationOptions) {
    const startTime = new Date();
    const fnTag = `PluginCcTxVisualization#constructor()`;
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
      name: "CC-TX-VIZ_EVENT_LOGS",
    });
    //todo should allow different models to be instantiated
    this.crossChainModel = new CrossChainModel();
    this.txReceipts = [];

    this.wsApiHostFabric =
      options.wsApiHostFabric || options.basePathFabric || location.host;
    this.wsApiPathFabric =
      options.wsApiPathFabric || Constants.SocketIoConnectionPathV1;
    this.wsApiHostBesu =
      options.wsApiHostBesu || options.basePathBesu || location.host;
    this.wsApiPathBesu =
      options.wsApiPathBesu || Constants.SocketIoConnectionPathV1;

    this.caseID = "";
    this.collectTxReceipts = true;

    const finalTime = new Date();
    this.log.debug(
      `EVAL-${this.className}-SETUP-CONSTRUCTOR:${finalTime.getTime() - startTime.getTime()}`,
    );
  }

  getOpenApiSpec(): unknown {
    throw new Error("Method not implemented.");
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
    return this.caseID ?? "UNDEFINED_CASE_ID";
  }

  public setCaseId(id: string): void {
    this.caseID = id;
  }

  public getCollectTxReceipts(): boolean {
    return this.collectTxReceipts;
  }

  public setCollectTxReceipts(bool: boolean): void {
    this.collectTxReceipts = bool;
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
    return `@hyperledger/cactus-plugin-cc-tx-visualization`;
  }

  // Precion minimum is 4ms by convention
  public async hasProcessedXMessages(
    numberMessages: number,
    precision: number,
  ): Promise<void> {
    while (this.txReceipts.length < numberMessages) {
      await new Promise((resolve) => setTimeout(resolve, precision));
    }
    return;
  }

  public createReceiptFromRunTransactionV1Exchange(
    data: RunTransactionV1Exchange,
    caseId: string,
  ): BesuV2TxReceiptRxJS {
    return {
      caseID: caseId,
      blockchainID: LedgerType.Besu2X,
      timestamp: data.timestamp,
      transactionHash: data.response.transactionReceipt.transactionHash,
      from: data.response.transactionReceipt.from,
      invocationType: data.request.invocationType,
      methodName: data.request.methodName,
      parameters: data.request.params,
    };
  }

  public pollTxReceiptsBesu(data: RunTransactionV1Exchange): void {
    const fnTag = `${this.className}#pollTxReceiptsBesu()`;
    this.log.debug(fnTag);

    // if caseID hasn't been set, make tx with caseID: "BESU_TBD"
    const caseId =
      this.caseID === "" || typeof this.caseID === "undefined"
        ? "BESU_TBD"
        : this.caseID;

    const besuReceipt = this.createReceiptFromRunTransactionV1Exchange(
      data,
      caseId,
    );
    this.txReceipts.push(besuReceipt);
    return;
  }

  public createReceiptFromRunTxReqWithTxId(
    data: RunTxReqWithTxId,
    caseId: string,
  ): FabricV2TxReceiptRxJS {
    return {
      caseID: caseId,
      blockchainID: LedgerType.Fabric2,
      timestamp: data.timestamp,
      channelName: data.request.channelName,
      transactionID: data?.transactionId,
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

    // if caseID hasn't been set, make tx with caseID: "FABRIC_TBD"
    const caseId =
      this.caseID === "" || typeof this.caseID === "undefined"
        ? "FABRIC_TBD"
        : this.caseID;

    const fabricReceipt = this.createReceiptFromRunTxReqWithTxId(data, caseId);
    this.txReceipts.push(fabricReceipt);
    return;
  }

  public watchRunTransactionV1Exchange(): Observable<RunTransactionV1Exchange> {
    const fnTag = `${this.className}#watchRunTransactionV1Exchange()`;
    this.log.debug(fnTag);

    const socket: Socket = io(this.wsApiHostBesu, { path: this.wsApiPathBesu });
    const subject = new ReplaySubject<RunTransactionV1Exchange>(0);

    socket.on(
      WatchRunTransactionV1Exchange.Next,
      (data: RunTransactionV1Exchange) => {
        subject.next(data);
      },
    );

    socket.on("connect", () => {
      console.log("connected OK...");
      socket.emit(WatchRunTransactionV1Exchange.Subscribe);
    });

    socket.connect();

    return subject.pipe(
      finalize(() => {
        console.log("FINALIZE - unsubscribing from the stream...");
        socket.emit(WatchRunTransactionV1Exchange.Unsubscribe);
        socket.disconnect();
      }),
    );
  }

  public monitorRunTransactionV1Exchange(): void {
    // Starts monitoring RunTransactionV1Exchange
    const fnTag = `${this.className}#monitorRunTransactionV1Exchange()`;
    this.log.debug(fnTag);

    const watchObservable = this.watchRunTransactionV1Exchange();
    watchObservable.subscribe({
      next: (data: RunTransactionV1Exchange) => {
        // Handle the data received by the observer
        this.pollTxReceiptsBesu(data);
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      error: (error: any) => {
        // Handle errors if any
        console.error("Error:", error);
      },
    });
  }

  public watchRunTxReqWithTxId(): Observable<RunTxReqWithTxId> {
    const fnTag = `${this.className}#watchRunTxReqWithTxId()`;
    this.log.debug(fnTag);

    const socket: Socket = io(this.wsApiHostFabric, {
      path: this.wsApiPathFabric,
    });
    const subject = new ReplaySubject<RunTxReqWithTxId>(0);

    socket.on(WatchRunTxReqWithTxId.Next, (data: RunTxReqWithTxId) => {
      subject.next(data);
    });

    socket.on("connect", () => {
      console.log("connected OK...");
      socket.emit(WatchRunTxReqWithTxId.Subscribe);
    });

    socket.connect();

    return subject.pipe(
      finalize(() => {
        console.log("FINALIZE - unsubscribing from the stream...");
        socket.emit(WatchRunTxReqWithTxId.Unsubscribe);
        socket.disconnect();
      }),
    );
  }

  public monitorRunTxReqWithTxId(): void {
    // Starts monitoring RunTxReqWithTxId
    const fnTag = `${this.className}#monitorRunTxReqWithTxId()`;
    this.log.debug(fnTag);

    const watchObservable = this.watchRunTxReqWithTxId();
    watchObservable.subscribe({
      next: (data: RunTxReqWithTxId) => {
        // Handle the data received by the observer
        this.pollTxReceiptsFabric(data); //trigger whenever a new value is observed
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      error: (error: any) => {
        // Handle errors if any
        console.error("Error:", error);
      },
    });
  }

  public monitorTransactions(blockchain?: string): void {
    const fnTag = `${this.className}#monitorTransactions()`;
    this.log.debug(fnTag);

    if (this.collectTxReceipts!) {
      return;
    }

    if (blockchain == "Fabric") {
      this.monitorRunTxReqWithTxId();
    } else if (blockchain == "Besu") {
      this.monitorRunTransactionV1Exchange();
    } else {
      this.monitorRunTxReqWithTxId();
      this.monitorRunTransactionV1Exchange();
    }
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private createCrossChainEventFromBesuReceipt(besuReceipt: any): void {
    const ccEventFromBesu: CrossChainEvent = {
      caseID: besuReceipt.caseID,
      receiptID: besuReceipt.transactionHash,
      blockchainID: besuReceipt.blockchainID,
      invocationType: besuReceipt.invocationType,
      methodName: besuReceipt.methodName,
      parameters: besuReceipt.parameters,
      timestamp: besuReceipt.timestamp,
      identity: besuReceipt.from,
      cost: gweiToDollar(calculateGasPriceBesu(besuReceipt.gasUsed as number)),
      carbonFootprint: CarbonFootPrintConstants(LedgerType.Besu2X),
      latency: millisecondsLatency(besuReceipt.timestamp),
      revenue: besuReceipt.revenue || 0,
    };

    this.crossChainLog.addCrossChainEvent(ccEventFromBesu);
    this.log.info("Added Cross Chain event from BESU");
    this.log.debug(`Cross-chain log: ${JSON.stringify(ccEventFromBesu)}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private createCrossChainEventFromFabricReceipt(fabricReceipt: any): void {
    const ccEventFromFabric: CrossChainEvent = {
      caseID: fabricReceipt.caseID,
      // not part of RunTransactionRequest
      receiptID: fabricReceipt.transactionID || `FABRIC-CALL-${randomUUID()}`,
      blockchainID: fabricReceipt.blockchainID,
      invocationType: fabricReceipt.invocationType,
      methodName: fabricReceipt.methodName,
      parameters: fabricReceipt.parameters,
      timestamp: fabricReceipt.timestamp,
      identity: fabricReceipt.signingCredentials.keychainRef,
      cost: fabricReceipt.cost || 0,
      carbonFootprint: CarbonFootPrintConstants(fabricReceipt.blockchainID),
      latency: millisecondsLatency(fabricReceipt.timestamp),
      revenue: fabricReceipt.revenue || 0,
    };

    this.crossChainLog.addCrossChainEvent(ccEventFromFabric);
    this.log.info("Added Cross Chain event from FABRIC");
    this.log.debug(`Cross-chain log: ${JSON.stringify(ccEventFromFabric)}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private createCrossChainEventFromReceipt(receipt: any): void {
    switch (receipt.blockchainID) {
      // Process Besu transaction receipt
      case LedgerType.Besu2X:
        this.createCrossChainEventFromBesuReceipt(receipt);
        break;
      // Process Fabric transaction receipt
      case LedgerType.Fabric2:
        this.createCrossChainEventFromFabricReceipt(receipt);
        break;
      default:
        this.log.warn(
          `Tx Receipt with case ID ${receipt.caseID} is not supported`,
        );
        break;
    }
  }

  public async txReceiptToCrossChainEventLogEntry(): Promise<
    CrossChainEvent[] | void
  > {
    const startTime = new Date();
    const fnTag = `${this.className}#txReceiptToCrossChainEventLogEntry()`;
    this.log.debug(fnTag);
    // We are processing receipts to update the CrossChainLog.
    // At the end of the processing, we need to clear the transaction receipts that have been processed
    // Therefore, we need a listen method that cctxviz is always running, doing polls every X seconds, followed by receipt processing (this method)
    try {
      this.txReceipts.forEach((receipt) => {
        this.createCrossChainEventFromReceipt(receipt);
      });
      // Clear receipt array
      this.txReceipts = [];
      const finalTime = new Date();
      this.log.debug(
        `EVAL-${this.className}-RECEIPT2EVENT:${finalTime.getTime() - startTime.getTime()}`,
      );
      return;
    } catch (error) {
      const details = this.txReceipts.map((receipt) => {
        return {
          caseID: receipt.caseID,
          receiptID: receipt.receiptID,
          blockchainID: receipt.blockchainID,
          timestamp: receipt.timestamp,
          invocationType: receipt.invocationType,
          methodName: receipt.methodName,
          parameters: receipt.parameters,
        };
      });
      this.log.error(
        `${fnTag} Failed to create cross chain events from transaction receipts: ${error}. Receipts' details: ${JSON.stringify(details)}`,
      );
      throw error;
    }
  }

  // Parses the cross chain event log and updates the cross chain model
  // This is part of the cc model; have a set that maps case id to data structure; this data structure are the consolidated metrics for a cctx, stores each txid
  // run over cc log; if case id is unique create new entry, otherwise add tx to cctx, update metrics, update last update; this is an updatable model
  public async aggregateCcTx(): Promise<void> {
    const startTime = new Date();
    const lastAggregated = this.crossChainModel.lastAggregation;
    const newAggregationDate = new Date();
    const ccTxSet = this.crossChainModel.getCCTxs();
    const logEntries = this.crossChainLog.logEntries;
    // If entries are more recent than aggregation
    let metrics: CrossChainTransactionSchema = {
      ccTxID: "",
      processedCrossChainEvents: [],
      latency: 0,
      carbonFootprint: 0,
      cost: 0,
      throughput: 0,
      latestUpdate: newAggregationDate,
      revenue: 0,
    };
    const lastAggregatedTime = new Date(lastAggregated).getTime();
    const logsToAggregate = logEntries.filter(
      (log) => new Date(log.timestamp).getTime() > lastAggregatedTime,
    );
    if (logsToAggregate.length === 0) {
      const finalTime = new Date();

      this.log.debug(
        `EVAL-${this.className}-AGGREGATE-CCTX-NO_NEW_LOGS:${finalTime.getTime() - startTime.getTime()}`,
      );
      return;
    }
    logsToAggregate.forEach((eventEntry) => {
      const key = eventEntry.caseID;
      const eventID = eventEntry.receiptID;
      let latency = eventEntry.latency as number;
      let carbonFootprint = eventEntry.carbonFootprint as number;
      let cost = eventEntry.cost as number;
      const revenue = eventEntry.revenue as number;

      if (!latency) {
        latency = 0;
      }
      if (!carbonFootprint) {
        carbonFootprint = 0;
      }
      if (!cost) {
        cost = 0;
      }
      if (ccTxSet?.has(key)) {
        const existingCCTx = ccTxSet.get(key);
        const previousEvents = existingCCTx?.processedCrossChainEvents || [];
        const numberOfCurrentEvents = previousEvents.length + 1;
        const previousLatency = existingCCTx?.latency || 0;
        const previousCarbonFootprint = existingCCTx?.carbonFootprint || 0;
        const previousCost = existingCCTx?.cost || 0;
        const currentCost = (cost + previousCost) / numberOfCurrentEvents;
        const previousRevenue = existingCCTx?.revenue || 0;
        const currentRevenue =
          (revenue + previousRevenue) / numberOfCurrentEvents;

        const updatedMetrics = {
          ccTxID: key,
          processedCrossChainEvents: [...previousEvents, eventID],
          latency: (latency + previousLatency) / numberOfCurrentEvents,
          carbonFootprint:
            (carbonFootprint + previousCarbonFootprint) / numberOfCurrentEvents,
          cost: currentCost,
          throughput: Number(
            latency != 0
              ? ((
                  1 /
                  ((latency + previousLatency) / numberOfCurrentEvents)
                ).toFixed(3) as unknown as number)
              : 0,
          ),
          latestUpdate: lastAggregated,
          revenue: currentRevenue,
        };
        this.crossChainModel.setCCTxs(key, updatedMetrics);
      } else {
        metrics = {
          ccTxID: key,
          processedCrossChainEvents: [eventID],
          latency: latency,
          carbonFootprint: carbonFootprint,
          cost: cost,
          throughput: Number(
            (latency != 0 ? 1 / latency : 0).toFixed(3) as unknown as number,
          ),
          latestUpdate: lastAggregated,
          revenue: revenue,
        };
        this.crossChainModel.setCCTxs(key, metrics);
      }
    });
    this.crossChainModel.setLastAggregationDate(newAggregationDate);
    const finalTime = new Date();
    this.log.debug(
      `${this.className}-AGGREGATE-CCTX-SUCCESS:${finalTime.getTime() - startTime.getTime()}`,
    );
    return;
  }

  public async persistCrossChainLogCsv(name?: string): Promise<string> {
    const startTime = new Date();
    const columns = this.crossChainLog.getCrossChainLogAttributes();
    const logName = name
      ? `${name}.csv`
      : `cctxviz_log_${startTime.getTime()}.csv`;
    const csvFolder = path.join(__dirname, "../", "../", "test", "csv");
    const logPath = path.join(csvFolder, logName);
    const fnTag = `${this.className}#persistCrossChainLogCsv()`;

    stringify(
      this.crossChainLog.logEntries,
      {
        header: true,
        columns: columns,
        delimiter: ";",
      },
      (err: Error | undefined, data: string) => {
        if (err) {
          const errorMessage = `${fnTag} Failed to stringify log: ${err}`;
          throw new RuntimeError(errorMessage, err);
        }
        this.log.debug(data);

        // Create directory if it doesn't exist
        if (!fs.existsSync(csvFolder)) {
          fs.mkdirSync(csvFolder);
        }
        fs.writeFileSync(logPath, data);
      },
    );

    const finalTime = new Date();
    this.log.debug(
      `EVAL-${this.className}-PERSIST-LOG-CVS:${finalTime.getTime() - startTime.getTime()}`,
    );
    return logName;
  }

  public async persistCrossChainLogJson(name?: string): Promise<string> {
    const startTime = new Date();
    const logName = name
      ? `${name}.json`
      : `cctxviz_log_${startTime.getTime()}.json`;
    const jsonFolder = path.join(__dirname, "../", "../", "test", "json");
    const logPath = path.join(jsonFolder, logName);
    const fnTag = `${this.className}#persistCrossChainLogJson()`;

    try {
      const data = JSON.stringify(this.crossChainLog.logEntries, null, 2);
      this.log.debug(data);

      // Create directory if it doesn't exist
      if (!fs.existsSync(jsonFolder)) {
        fs.mkdirSync(jsonFolder);
      }
      fs.writeFileSync(logPath, data);

      const finalTime = new Date();
      this.log.debug(
        `EVAL-${this.className}-PERSIST-LOG-JSON:${finalTime.getTime() - startTime.getTime()}`,
      );

      return logName;
    } catch (error) {
      const errorMessage = `${fnTag} Failed to stringify log: ${error}`;
      throw new RuntimeError(errorMessage, error);
    }
  }

  // Receives a serialized model
  public async saveModel(
    modelType: CrossChainModelType,
    model: string,
  ): Promise<void> {
    this.crossChainModel.saveModel(modelType, model);
  }

  public async getModel(
    modelType: CrossChainModelType,
  ): Promise<string | undefined> {
    return this.crossChainModel.getModel(modelType);
  }
}
