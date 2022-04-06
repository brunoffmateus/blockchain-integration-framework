//import { randomUUID } from "crypto";
//import { BesuV2TxReceipt } from "./transaction-receipt";
//import { v4 as uuidv4 } from "uuid";

export type CrossChainEvent = {
  caseID: string;
  timestamp: Date;
  blockchainID: string;
  invocationType: string;
  methodName: string;
  parameters: string[];
  identity: string;
};

export interface ICrossChainEventLog {
  name: string;
}

export class CrossChainEventLog {
  private crossChainEvents: CrossChainEvent[] = [];
  private creationDate: Date;
  private lastUpdateDate: Date;
  public readonly logName: string;
  //TODO: add a pause boolean?

  constructor(options: ICrossChainEventLog) {
    this.creationDate = new Date();
    this.lastUpdateDate = new Date();
    this.logName = options.name;
  }

  public numberEvents(): number {
    return this.crossChainEvents.length;
  }
  public getCreationDate(): Date {
    return this.creationDate;
  }

  public getLastUpdateDate(): Date {
    return this.lastUpdateDate;
  }

  public purgeLogs(): void {
    this.crossChainEvents = [];
  }

  public addCrossChainEvent(event: CrossChainEvent): void {
    this.crossChainEvents.push(event);
    this.lastUpdateDate = new Date();
  }
}
