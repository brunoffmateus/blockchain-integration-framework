/* eslint-disable @typescript-eslint/no-unused-vars */
// this file contains a class that encapsulates the logic for managing the SATP bridge (lock, unlock, etc).
// should inject satp gateway session data (having parameters/chains for transactions), and processes smart contract output
import { BridgeManager } from "./bridge-manager";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import { SATPBridgeConfig } from "../../types";
import { Asset } from "./types/asset";
import { TransactionIdUndefinedError } from "../../errors/bridge-erros";
import { ClaimFormat } from "../../../generated/proto/cacti/satp/v02/common/message_pb";
import { LedgerType } from "@hyperledger/cactus-core-api";
import { PluginLedgerConnectorBesu } from "@hyperledger/cactus-plugin-ledger-connector-besu";
import { PluginLedgerConnectorEthereum } from "@hyperledger/cactus-plugin-ledger-connector-ethereum";
import { PluginLedgerConnectorFabric } from "@hyperledger/cactus-plugin-ledger-connector-fabric";

export class SATPBridgeManager implements BridgeManager {
  public static readonly CLASS_NAME = "SATPBridgeManager";

  private _log: Logger;

  public get log(): Logger {
    return this._log;
  }

  constructor(private config: SATPBridgeConfig) {
    const label = SATPBridgeManager.CLASS_NAME;
    this._log = LoggerProvider.getOrCreate({ level: config.logLevel, label });
  }
  public getNetworkType(): LedgerType {
    return this.config.network.getNetworkType();
  }

  public bridgeConnector():
    | PluginLedgerConnectorBesu
    | PluginLedgerConnectorEthereum
    | PluginLedgerConnectorFabric {
    return this.config.network.bridgeConnector();
  }

  public getMethodsToBeMonitored(): string[] {
    return this.config.network.getMethodsToBeMonitored();
  }

  public async pauseBridge(): Promise<string> {
    const fnTag = `${this.className}#pauseBridge()`;
    const response = await this.config.network.pauseBridge();
    if (response.transactionId == undefined) {
      throw new TransactionIdUndefinedError(fnTag);
    }
    const receipt = "";
    //  this.config.network.getReceipt(
    //   response.transactionId,
    // );
    this.log.info(`${fnTag}, proof of pausing the bridge: ${receipt}`);
    return receipt;
  }

  public async unpauseBridge(): Promise<string> {
    const fnTag = `${this.className}#unpauseBridge()`;
    const response = await this.config.network.unpauseBridge();
    if (response.transactionId == undefined) {
      throw new TransactionIdUndefinedError(fnTag);
    }
    const receipt = "";
    //  this.config.network.getReceipt(
    //   response.transactionId,
    // );
    this.log.info(`${fnTag}, proof of unpausing the bridge: ${receipt}`);
    return receipt;
  }

  public async bridgeIsPaused(): Promise<string> {
    const fnTag = `${this.className}#bridgeIsPaused()`;
    const response = await this.config.network.bridgeIsPaused();
    if (response.transactionId == undefined) {
      throw new TransactionIdUndefinedError(fnTag);
    }
    const receipt = "";
    //  this.config.network.getReceipt(
    //   response.transactionId,
    // );
    this.log.info(`${fnTag}, proof that bridge is paused: ${receipt}`);
    return receipt;
  }

  public async wrapAsset(asset: Asset): Promise<string> {
    const fnTag = `${this.className}#wrap()`;

    const startTime = new Date();
    const response = await this.config.network.wrapAsset(asset);
    const finalTime = new Date();
    console.log(
      `ISSUE-WRAP-ASSET: ${finalTime.getTime() - startTime.getTime()} ms`,
    );

    if (response.transactionId == undefined) {
      throw new TransactionIdUndefinedError(fnTag);
    }

    const receipt = await this.config.network.getReceipt(
      response.transactionId,
    );

    this.log.info(`${fnTag}, proof of the asset wrapping: ${receipt}`);

    return receipt;
  }
  public async unwrapAsset(assetId: string): Promise<string> {
    const fnTag = `${this.className}#unwrap()`;

    const startTime = new Date();
    const response = await this.config.network.unwrapAsset(assetId);
    const finalTime = new Date();
    console.log(
      `ISSUE-UNWRAP-ASSET: ${finalTime.getTime() - startTime.getTime()} ms`,
    );

    if (response.transactionId == undefined) {
      throw new TransactionIdUndefinedError(fnTag);
    }

    const receipt = await this.config.network.getReceipt(
      response.transactionId,
    );

    this.log.info(`${fnTag}, proof of the asset unwrapping: ${receipt}`);

    return receipt;
  }

  public get className(): string {
    return SATPBridgeManager.CLASS_NAME;
  }

  public async lockAsset(assetId: string, amount: number): Promise<string> {
    const fnTag = `${this.className}#lockAsset()`;

    const startTime = new Date();
    const response = await this.config.network.lockAsset(assetId, amount);
    const finalTime = new Date();
    console.log(
      `ISSUE-LOCK-ASSET:  ${finalTime.getTime() - startTime.getTime()} ms`,
    );

    if (response.transactionId == undefined) {
      throw new TransactionIdUndefinedError(fnTag);
    }
    const receipt = await this.config.network.getReceipt(
      response.transactionId,
    );
    this.log.info(`${fnTag}, proof of the asset lock: ${receipt}`);

    return receipt;
  }

  public async unlockAsset(assetId: string, amount: number): Promise<string> {
    const fnTag = `${this.className}#unlockAsset()`;

    const startTime = new Date();
    const response = await this.config.network.unlockAsset(assetId, amount);
    const finalTime = new Date();
    console.log(
      `ISSUE-UNLOCK-ASSET: ${finalTime.getTime() - startTime.getTime()} ms`,
    );

    if (response.transactionId == undefined) {
      throw new TransactionIdUndefinedError(fnTag);
    }

    const receipt = await this.config.network.getReceipt(
      response.transactionId,
    );

    this.log.info(`${fnTag}, proof of the asset unlock: ${receipt}`);

    return receipt;
  }

  public async mintAsset(assetId: string, amount: number): Promise<string> {
    const fnTag = `${this.className}#mintAsset()`;

    const startTime = new Date();
    const transaction = await this.config.network.mintAsset(assetId, amount);
    const finalTime = new Date();
    console.log(
      `ISSUE-MINT-ASSET: ${finalTime.getTime() - startTime.getTime()} ms`,
    );

    if (transaction.transactionId == undefined) {
      throw new TransactionIdUndefinedError(fnTag);
    }

    const receipt = await this.config.network.getReceipt(
      transaction.transactionId,
    );
    this.log.info(`${fnTag}, proof of the asset creation: ${receipt}`);

    return receipt;
  }

  public async burnAsset(assetId: string, amount: number): Promise<string> {
    const fnTag = `${this.className}#burnAsset()`;

    const startTime = new Date();
    const transaction = await this.config.network.burnAsset(assetId, amount);
    const finalTime = new Date();
    console.log(
      `ISSUE-BURN-ASSET: ${finalTime.getTime() - startTime.getTime()} ms`,
    );

    if (transaction.transactionId == undefined) {
      throw new TransactionIdUndefinedError(fnTag);
    }

    const receipt = await this.config.network.getReceipt(
      transaction.transactionId,
    );

    this.log.info(`${fnTag}, proof of the asset deletion: ${receipt}`);

    return receipt;
  }

  public async assignAsset(
    assetId: string,
    recipient: string,
    amount: number,
  ): Promise<string> {
    const fnTag = `${this.className}#assignAsset()`;

    const startTime = new Date();
    const response = await this.config.network.assignAsset(
      assetId,
      recipient,
      amount,
    );
    const finalTime = new Date();
    console.log(
      `ISSUE-ASSIGN-ASSET: ${finalTime.getTime() - startTime.getTime()} ms`,
    );

    if (response.transactionId == undefined) {
      throw new TransactionIdUndefinedError(fnTag);
    }

    const receipt = await this.config.network.getReceipt(
      response.transactionId,
    );
    this.log.info(`${fnTag}, proof of the asset assignment: ${receipt}`);

    return receipt;
  }
  public async verifyAssetExistence(
    assetId: string,
    invocationType: unknown,
  ): Promise<boolean | undefined> {
    //todo: implement this
    const assetExists = await this.config.network.runTransaction(
      "AssetExists",
      [assetId],
      invocationType,
    );

    if (assetExists == undefined) {
      return false;
    }

    return true;
  }
  public async verifyLockAsset(
    assetId: string,
    invocationType: unknown,
  ): Promise<boolean | undefined> {
    //todo: implement this
    const lockAsset = await this.config.network.runTransaction(
      "LockAsset",
      [assetId],
      invocationType,
    );

    if (lockAsset.output == undefined) {
      return false;
    }

    return true;
  }
  getReceiptFormat() {
    return this.config.network.claimFormat;
  }
  async getProof(assetId: string): Promise<string> {
    // different receipt/proof formats
    switch (this.getReceiptFormat()) {
      case ClaimFormat.DEFAULT:
        return "";
      case ClaimFormat.BUNGEE:
        const view = await this.config.network.getView(assetId);
        return view;
      default:
        return "";
    }
  }
}
