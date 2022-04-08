type TupleUnion<U extends string, R extends string[] = []> = {
  [S in U]: Exclude<U, S> extends never
    ? [...R, S]
    : TupleUnion<Exclude<U, S>, [...R, S]>;
}[U] &
  string[];

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

  get logEntries(): CrossChainEvent[] {
    return this.crossChainEvents;
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

  public getCrossChainLogAttributes(): string[] {
    const CrossChainLogSchema: TupleUnion<keyof CrossChainEvent> = [
      "caseID",
      "timestamp",
      "blockchainID",
      "invocationType",
      "methodName",
      "parameters",
      "identity",
    ];
    return CrossChainLogSchema;
  }
}
