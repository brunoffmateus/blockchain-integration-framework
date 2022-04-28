import { v4 as uuidv4 } from "uuid";

export class CrossChainModel {
  private modelType: CrossChainModelType | undefined;
  private models = new Map<CrossChainModelType, string>();
  private id: string;

  constructor() {
    this.id = uuidv4();
  }

  public saveModel(type: CrossChainModelType, model: string): void {
    this.models.set(type, model);
  }

  public getModel(type: CrossChainModelType): string | undefined {
    if (this.models.has(type)) {
      return this.models.get(type);
    }
  }
}

export enum CrossChainModelType {
  HeuristicMiner,
  ProcessTree,
  DirectFollowGraph,
}
