import { LedgerType } from "@hyperledger/cactus-core-api";
import { v4 as uuidv4 } from "uuid";
import { ProcessMiningAlgorithm } from "../plugin-ccmodel-hephaestus";

export class CrossChainModel {
  private modelType: ProcessMiningAlgorithm | undefined;
  private crossChainTransactions:
    | Map<string, CrossChainTransactionSchema>
    | undefined;
  private models = new Map<ProcessMiningAlgorithm, string>();
  private id: string;
  private lastAggregationDate: Date;
  private crossChainState: Map<string, AssetState>;

  constructor() {
    this.id = uuidv4();
    this.crossChainTransactions = new Map<
      string,
      CrossChainTransactionSchema
    >();
    this.lastAggregationDate = new Date();
    this.crossChainState = new Map<string, AssetState>();
  }

  get lastAggregation(): Date {
    return this.lastAggregationDate;
  }

  get ccModelType(): ProcessMiningAlgorithm | undefined {
    return this.modelType;
  }

  public setType(modelType: ProcessMiningAlgorithm): void {
    this.modelType = modelType;
  }

  public setLastAggregationDate(date: Date): void {
    this.lastAggregationDate = date;
  }

  public saveModel(type: ProcessMiningAlgorithm, model: string): void {
    this.models.set(type, model);
  }

  public getModel(type: ProcessMiningAlgorithm): string | undefined {
    if (this.models.has(type)) {
      return this.models.get(type);
    }
  }

  public getOneCCTx(txKey: string): CrossChainTransactionSchema | undefined {
    if (this.crossChainTransactions && this.crossChainTransactions.has(txKey)) {
      return this.crossChainTransactions.get(txKey);
    }
  }

  public getCCTxs(): Map<string, CrossChainTransactionSchema> | undefined {
    if (this.crossChainTransactions) {
      return this.crossChainTransactions;
    }
  }

  public setCCTxs(
    key: string,
    mapDefintion: CrossChainTransactionSchema,
  ): void {
    this.crossChainTransactions?.set(key, mapDefintion);
  }

  public setAssetState(ccTxID: string, details: AssetState): void {
    this.crossChainState.set(ccTxID, details);
  }

  public getCrossChainState(): string | undefined {
    let ccState: string = "";
    for (const [ccTxID, assetState] of this.crossChainState.entries()) {
      const txData =
        ccTxID +
        "\n" +
        assetState.assetID +
        ";" +
        assetState.assetState +
        ";" +
        assetState.ledger +
        ";" +
        assetState.lastStateUpdate +
        "\n";
      ccState = ccState + txData + "\n";
    }
    return ccState;
  }
}

export type CrossChainTransactionSchema = {
  // the IDs of all cross chain events of the cross chain transaction
  processedCrossChainEvents: string[];
  latency: number;
  carbonFootprint: number | undefined;
  cost: number | undefined;
  throughput: number;
  latestUpdate: Date;
};

export type AssetState = {
  assetID: string;
  assetState: string;
  ledger: LedgerType;
  lastStateUpdate: Date;
};
