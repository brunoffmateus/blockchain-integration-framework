export type CrossChainEvent = {
  caseID: string;
  receiptID: string | undefined;
  timestamp: Date;
  blockchainID: string;
  invocationType: string;
  methodName: string;
  parameters: string[];
  identity: string;
  cost?: number | string;
  carbonFootprint?: number | string;
  latency?: number | Date;
};

export interface ICrossChainEventLog {
  name: string;
}

export class CrossChainEventLog {
  private crossChainEvents: CrossChainEvent[] = [];
  private creationDate: Date;
  private lastUpdateDate: Date;
  private lastAggregationDate: Date;
  public readonly logName: string;
  //TODO: add a pause boolean?

  constructor(options: ICrossChainEventLog) {
    this.creationDate = new Date();
    this.lastUpdateDate = new Date();
    this.logName = options.name;
  }

  get logEntries(): CrossChainEvent[] {
    return this.crossChainEvents;
  }

  get lastAggregationTime(): Date {
    return this.lastAggregationDate;
  }

  public setLastAggregationDate(date: Date): void {
    this.lastAggregationDate = date;
  }

  public numberEvents(): number {
    return this.crossChainEvents.length;
  }
  public getCreationDate(): Date {
    return this.creationDate;
  }

  public getLastUpdateDate(): Date {
    return this.lastLogEntryDate;
  }

  public purgeLogs(): void {
    this.crossChainEvents = [];
  }

  public addCrossChainEvent(event: CrossChainEvent): void {
    this.crossChainEvents.push(event);
    this.lastLogEntryDate = new Date();
  }

  public getCrossChainLogAttributes(): string[] {
    return [
      "caseID",
      "receiptID",
      "timestamp",
      "blockchainID",
      "invocationType",
      "methodName",
      "parameters",
      "identity",
      "cost",
      "carbonFootprint",
      "latency",
    ];
  }
}
