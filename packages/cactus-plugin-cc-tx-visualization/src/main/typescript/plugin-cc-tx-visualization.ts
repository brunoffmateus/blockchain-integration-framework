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

import { stringify } from "csv-stringify";
import { RuntimeError } from "run-time-error-cjs";

import fs from "fs";
import path from "path";

import { PluginRegistry } from "@hyperledger/cactus-core";
import { Express } from "express";

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
  BesuV2TxReceipt,
  FabricV2TxReceipt,
  millisecondsLatency,
} from "./models/transaction-receipt";
import { randomUUID } from "crypto";
import { RunTransactionV1Exchange } from "@hyperledger/cactus-plugin-ledger-connector-besu";
import { RunTxReqWithTxId } from "@hyperledger/cactus-plugin-ledger-connector-fabric";

import { Observable } from "rxjs";

export interface IPluginCcTxVisualizationOptions extends ICactusPluginOptions {
  connectorRegistry?: PluginRegistry;
  logLevel?: LogLevelDesc;
  webAppOptions?: IWebAppOptions;
  instanceId: string;
  besuTxObservable: Observable<RunTransactionV1Exchange>;
  fabricTxObservable: Observable<RunTxReqWithTxId>;
}

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
  private caseID: string;
  private besuTxObservable: Observable<RunTransactionV1Exchange>;
  private fabricTxObservable: Observable<RunTxReqWithTxId>;

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

    this.caseID = "UNDEFINED_CASE_ID";

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
    return `@hyperledger/cactus-plugin-cc-tx-visualization`;
  }

  public createReceiptFromRunTransactionV1Exchange(
    data: RunTransactionV1Exchange,
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
    };
  }

  public pollTxReceiptsBesu(data: RunTransactionV1Exchange): void {
    const fnTag = `${this.className}#pollTxReceiptsBesu()`;
    this.log.debug(fnTag);

    const besuReceipt = this.createReceiptFromRunTransactionV1Exchange(
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

  public watchRunTransactionV1Exchange(): void {
    const fnTag = `${this.className}#watchRunTransactionV1Exchange()`;
    this.log.debug(fnTag);

    this.besuTxObservable.subscribe({
      next: (data: RunTransactionV1Exchange) => {
        this.pollTxReceiptsBesu(data);
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      error: (error: any) => {
        console.error("Error:", error);
      },
    });
  }

  public watchRunTxReqWithTxId(): void {
    const fnTag = `${this.className}#watchRunTxReqWithTxId()`;
    this.log.debug(fnTag);

    this.fabricTxObservable.subscribe({
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

  public monitorTransactions(): void {
    const fnTag = `${this.className}#monitorTransactions()`;
    this.log.debug(fnTag);

    this.watchRunTxReqWithTxId();
    this.watchRunTransactionV1Exchange();
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private createCrossChainEventFromBesuReceipt(besuReceipt: any): void {
    const ccEventFromBesu: CrossChainEvent = {
      caseID: besuReceipt.caseID,
      receiptID: besuReceipt.transactionID,
      blockchainID: besuReceipt.blockchainID,
      invocationType: besuReceipt.invocationType,
      methodName: besuReceipt.methodName,
      parameters: besuReceipt.parameters,
      timestamp: besuReceipt.timestamp.toISOString(),
      identity: besuReceipt.from,
      cost: gweiToDollar(calculateGasPriceBesu(besuReceipt.gasUsed as number)),
      carbonFootprint: CarbonFootPrintConstants(besuReceipt.blockchainID),
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
      receiptID: fabricReceipt.transactionID || `FABRIC-CALL-${randomUUID()}`,
      blockchainID: fabricReceipt.blockchainID,
      invocationType: fabricReceipt.invocationType,
      methodName: fabricReceipt.methodName,
      parameters: fabricReceipt.parameters,
      timestamp: fabricReceipt.timestamp.toISOString(),
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
