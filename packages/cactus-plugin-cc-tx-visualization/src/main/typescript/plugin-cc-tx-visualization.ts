/* eslint-disable prettier/prettier */
import { Server } from "http";
import { Server as SecureServer } from "https";
import { Optional } from "typescript-optional";
import { promisify } from "util";
import express, { Express } from "express";
import bodyParser from "body-parser";
import {
  IPluginWebService,
  IWebServiceEndpoint,
  ICactusPlugin,
  ICactusPluginOptions,
  LedgerType,
} from "@hyperledger/cactus-core-api";
//import { BesuApiClient} from "@hyperledger/cactus-plugin-ledger-connector-besu/src/main/typescript/public-api";
import { stringify } from 'csv-stringify';

import fs from 'fs';
import path from 'path';

import { PluginRegistry } from "@hyperledger/cactus-core";

import {
  Checks,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import { calculateCarbonFootPrintBesu, calculateCarbonFootPrintFabric, calculateGasPriceBesu } from "./models/carbon-footprint";
import { PrometheusExporter } from "./prometheus-exporter/prometheus-exporter";
import { CrossChainEvent, CrossChainEventLog } from "./models/cross-chain-event";

export interface IWebAppOptions {
  port: number;
  hostname: string;
}
import * as Amqp from "amqp-ts";
import { CrossChainModel, CrossChainModelType } from "@hyperledger/cactus-plugin-cc-tx-visualization/src/main/typescript/models/crosschain-model";
import { BesuV2TxReceipt, FabricV2TxReceipt } from "@hyperledger/cactus-plugin-cc-tx-visualization/src/main/typescript/models/transaction-receipt";

export interface IChannelOptions {
  queueId: string,
  dltTechnology: LedgerType | null,
  persistMessages: boolean
}

export type APIConfig = {
  type:LedgerType, 
  basePath: string
}

export interface IPluginCcTxVisualizationOptions extends ICactusPluginOptions {
  prometheusExporter?: PrometheusExporter;
  connectorRegistry?: PluginRegistry;
  logLevel?: LogLevelDesc;
  webAppOptions?: IWebAppOptions;
  eventProvider: string;
  channelOptions: IChannelOptions;
  instanceId: string;
}

// TODO - for extensability, modularity, and flexibility,
// this plugin could have a list of connections and list of queues

export class CcTxVisualization
  implements ICactusPlugin, IPluginWebService {
  public prometheusExporter: PrometheusExporter;
  private readonly log: Logger;
  private readonly instanceId: string;
  private endpoints: IWebServiceEndpoint[] | undefined;
  private httpServer: Server | SecureServer | null = null;
  private crossChainLog: CrossChainEventLog;
  private crossChainModel: CrossChainModel;
    private readonly eventProvider: string;
    private amqpConnection: Amqp.Connection;
    private amqpQueue: Amqp.Queue;
    private amqpExchange: Amqp.Exchange;
    public readonly className = "plugin-cc-tx-visualization";
    private readonly queueId: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private txReceipts: any[];
    private readonly persistMessages: boolean;
  constructor(public readonly options: IPluginCcTxVisualizationOptions) {
    const fnTag = `PluginCcTxVisualization#constructor()`;
    if (!options) {
      throw new Error(`${fnTag} options falsy.`);
    }
    //TODO check other mandatory options
    Checks.truthy(options.instanceId, `${fnTag} options.instanceId`);
    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.queueId = options.channelOptions.queueId || "cc-tx-viz-queue";
    this.log = LoggerProvider.getOrCreate({
      label:  label,
      level: level,
    });
    this.prometheusExporter =
      options.prometheusExporter ||
    new PrometheusExporter({ pollingIntervalInMin: 1 });
    this.instanceId = this.options.instanceId;
    this.crossChainLog = new CrossChainEventLog({name:"CC-TX-VIZ_EVENT_LOGS"});
    //todo should allow different models to be instantiated
    this.crossChainModel = new CrossChainModel();
    this.txReceipts = [];
    this.persistMessages = options.channelOptions.persistMessages || false;
    this.eventProvider = options.eventProvider;
    this.log.debug("Initializing connection to RabbitMQ");
    this.amqpConnection = new Amqp.Connection(this.eventProvider);
    this.log.info("Connection to RabbitMQ server initialized");
    this.amqpExchange = this.amqpConnection.declareExchange(`cc-tx-viz-exchange`, "direct", {durable: this.persistMessages});
    this.amqpQueue = this.amqpConnection.declareQueue(this.queueId, {durable: this.persistMessages});
    this.amqpQueue.bind(this.amqpExchange);
  
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

  // todo connection closing is  problematic, tests are left hanging
  public async closeConnection(): Promise<void>  {
    this.log.debug("Closing Amqp connection");
    await this.amqpQueue.stopConsumer();
    await this.amqpQueue.close();
    //await this.amqpConnection.close();
    this.log.debug(" Amqp connection closed");

  }

  public getInstanceId(): string {
    return this.instanceId;
  }

  public async onPluginInit(): Promise<unknown> {
    return;
  }

  public getPrometheusExporter(): PrometheusExporter {
    return this.prometheusExporter;
  }

  public async getPrometheusExporterMetrics(): Promise<string> {
    const res: string = await this.prometheusExporter.getPrometheusMetrics();
    this.log.debug(`getPrometheusExporterMetrics() response: %o`, res);
    return res;
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

  public async registerWebServices(
    app: Express,
  ): Promise<IWebServiceEndpoint[]> {
    const webApp: Express = this.options.webAppOptions ? express() : app;

    if (this.options.webAppOptions) {
      this.log.info(`Creating dedicated HTTP server...`);
      const { port, hostname } = this.options.webAppOptions;

      webApp.use(bodyParser.json({ limit: "50mb" }));

      const address = await new Promise((resolve, reject) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const httpServer = webApp.listen(port, hostname, (err?: any) => {
          if (err) {
            reject(err);
            this.log.error(`Failed to create dedicated HTTP server`, err);
          } else {
            this.httpServer = httpServer;
            const theAddress = this.httpServer.address();
            resolve(theAddress);
          }
        });
      });
      this.log.info(`Creation of HTTP server OK`, { address });
    }

    const webServices = await this.getOrCreateWebServices();
    webServices.forEach((ws) => ws.registerExpress(webApp));
    return webServices;
  }

  public async getOrCreateWebServices(): Promise<IWebServiceEndpoint[]> {
    const { log } = this;
    const pkgName = this.getPackageName();

    if (this.endpoints) {
      return this.endpoints;
    }
    
    const endpoints: IWebServiceEndpoint[] = [];
    this.endpoints = endpoints;

    log.info(`Instantiated web svcs for plugin ${pkgName} OK`, { endpoints });
    return this.endpoints;
  }

  public getHttpServer(): Optional<Server | SecureServer> {
    return Optional.ofNullable(this.httpServer);
  }

  public getPackageName(): string {
    return `@hyperledger/cactus-plugin-cc-tx-visualization`;
  }

  public  pollTxReceipts(): Promise<void>  {
    const fnTag = `${this.className}#pollTxReceipts()`;
    this.log.debug(fnTag);
    return this.amqpQueue.activateConsumer( (message) => {
      const messageContent = message.getContent();
      this.log.debug(`Received message from ${this.queueId}: ${message.content.toString()}`);
      this.txReceipts.push(messageContent);
      message.ack();
    }, { noAck: false });
  }

  // Pipeline: pollTxReceipts (gets RabbitMQ messages)
  //           txReceiptToCrossChainEventLogEntry (messages -> Tx Receipts -> cross chain event log)
  //           aggregateCCTx (cc event log into cc tx log )          


  // convert data into CrossChainEvent
  // returns a list of CrossChainEvent
  public async txReceiptToCrossChainEventLogEntry(): Promise<CrossChainEvent[]|void> {
    const fnTag = `${this.className}#pollTxReceipts()`;
    this.log.debug(fnTag);
    // We are processing receipts to update the CrossChainLog.
    // At the end of the processing, we need to clear the transaction receipts that have been processed
    // Therefore, we need a listen method that cctxviz is always running, doing polls every X seconds, followed by receipt processing (this method)
    try {    
      this.txReceipts.forEach(receipt => {
        switch(receipt.blockchainID) {
          case LedgerType.Besu2X:
            const besuReceipt: BesuV2TxReceipt = receipt;
            const ccEventFromBesu:CrossChainEvent = {
              caseID: besuReceipt.caseID,
              blockchainID:besuReceipt.blockchainID,
              invocationType: besuReceipt.invocationType,
              methodName:besuReceipt.methodName,
              parameters:besuReceipt.parameters,
              timestamp: besuReceipt.timestamp,
              identity: besuReceipt.from,
              cost: calculateGasPriceBesu(besuReceipt.gasPrice, besuReceipt.gasUsed),
              carbonFootprint: calculateCarbonFootPrintBesu(),
              latency: new Date().getTime() - receipt.timestamp,


            };
            this.crossChainLog.addCrossChainEvent(ccEventFromBesu);
            this.log.info("Added Cross Chain event from BESU");
            this.log.debug(`Cross-chain log: ${JSON.stringify(ccEventFromBesu)}`);
            break;
          case LedgerType.Fabric2:
            const fabricReceipt: FabricV2TxReceipt = receipt;
            const ccEventFromFabric:CrossChainEvent = {
              caseID: fabricReceipt.caseID,
              blockchainID: fabricReceipt.blockchainID,
              invocationType: fabricReceipt.invocationType,
              methodName: fabricReceipt.methodName,
              parameters: fabricReceipt.parameters,
              timestamp: fabricReceipt.timestamp,
              identity: fabricReceipt.signingCredentials.keychainRef,
              cost: receipt.cost || 0,
              carbonFootprint: calculateCarbonFootPrintFabric(fabricReceipt.endorsingPeers),
              latency: new Date().getTime() - receipt.timestamp,
            };
            this.crossChainLog.addCrossChainEvent(ccEventFromFabric);
            this.log.info("Added Cross Chain event from FABRIC");
            this.log.debug(`Cross-chain log: ${JSON.stringify(ccEventFromFabric)}`);
            break;
          // used to test cctxviz
          case "TEST":
            const ccEventTest:CrossChainEvent = {
              caseID: receipt.caseID,
              blockchainID: receipt.blockchainID,
              invocationType: receipt.invocationType,
              methodName: receipt.methodName,
              parameters: receipt.parameters,
              timestamp: receipt.timestamp,
              identity: receipt.identity,
              cost: receipt.cost || 0,
              carbonFootprint: 1,
              latency: new Date(new Date().getTime() - new Date(receipt.timestamp).getTime()),
            };
            this.crossChainLog.addCrossChainEvent(ccEventTest);
            this.log.info("Added Cross Chain event TEST");
            this.log.debug(`Cross-chain log: ${JSON.stringify(ccEventTest)}`);
            break;
          default:
            this.log.warn(`Tx Receipt with case ID ${receipt.caseID} is not supported`);
            break;
        }
        
      }); 
      // Clear receipt array
      this.txReceipts = [];
    return;
    } catch (error) {
      this.log.error(error);
    }

  }

  // Parses the cross chain event log and creates a cctx: (local transactions, rules (reference to model), metrics)
  public async aggregateCCTx(): Promise<void> {
    return;
  }

  // Receives raw transaction receipts from RabbitMQ
  // TODO create listen method that is in a loop doing this polling
  // 
  // Calculates e2e latency, e2e throughput, e2e cost
  public async updateModel(): Promise<void> {
    return;
    // 1 step: in a loop, poll for tx receipts
    // 2 step: txReceiptToCrossChainEventLogEntry
    // 3 step update cc model (optionally) 
    // 4 step: calls for updateCrossChainMetrics
  }

  public async updateCrossChainMetrics(): Promise<void> {
    return;
  }

  public async persistCrossChainLogCsv (): Promise<string> {
    const columns = this.crossChainLog.getCrossChainLogAttributes();
    const logName = `cctxviz_log_${new Date().getTime()}.csv`;
    const csvFolder = path.join(__dirname, "../" , "csv");
    const logPath = path.join(csvFolder , logName);
    
    stringify(
      this.crossChainLog.logEntries
    , {
      header: true,
      columns:  columns,
      delimiter: ";",
    }, (err, data) =>{
      if (err)  {
        this.log.error(err);
        throw new Error("failed to stringify log");
      }
      this.log.debug(data);
      fs.writeFileSync(logPath, data);
    });
    return logName;
  }

  // Receives a serialized model
  public async saveModel (modelType: CrossChainModelType, model :string): Promise<void> {
    this.crossChainModel.saveModel(modelType, model);
  }

  public async getModel (modelType: CrossChainModelType): Promise<string|undefined> {
    return this.crossChainModel.getModel(modelType);
  }
}