import { LedgerType } from "@hyperledger/cactus-core-api";
import { Web3SigningCredential } from "@hyperledger/cactus-plugin-ledger-connector-besu";
import {
  FabricSigningCredential,
  GatewayOptions,
  TransactReceiptBlockMetaData,
  TransactReceiptTransactionCreator,
} from "@hyperledger/cactus-plugin-ledger-connector-fabric";

export interface TransactionReceipt {
  caseID: string;
  blockchainID: LedgerType;
  invocationType: string;
  methodName: string;
  parameters: string[];
  timestamp: Date;
}

export interface IsVisualizable {
  // list of transaction receipts, that will be sent to cc-tx-viz
  collectTransactionReceipts: boolean;
}

export interface FabricV2TxReceipt extends TransactionReceipt {
  // used - used making the cross chain event
  channelName: string; //used
  transactionID: string | undefined; //used
  contractName: string; //used
  endorsingPeers?: string[];
  endorsingParties?: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transientData?: any | null;
  gatewayOptions?: GatewayOptions;
  signingCredentials: FabricSigningCredential; //used
  blockNumber?: string;
  transactionCreator?: TransactReceiptTransactionCreator;
  blockMetaData?: TransactReceiptBlockMetaData;
  chainCodeName?: string;
  chainCodeVersion?: string;
  responseStatus?: string;
}

export interface FabricV2TxReceiptRxJS extends TransactionReceipt {
  channelName: string;
  transactionID: string | undefined;
  contractName: string;
  signingCredentials: FabricSigningCredential;
}

export interface BesuV2TxReceipt extends TransactionReceipt {
  // used - used making the cross chain event
  status: boolean;
  transactionHash: string; //used
  transactionIndex: number;
  blockNumber: number;
  blockHash: string;
  contractName: string;
  contractAddress?: string;
  contractAbi?: string[];
  value?: number | string;
  gas?: number | string;
  gasPrice?: number | string;
  gasUsed?: number | string; //used
  cumulativeGasUsed?: number | string;
  from: string; // used
  to: string;
  signingCredentials?: Web3SigningCredential;
  keychainID?: string;
  privateTransactionConfig?: string[];
  timeoutMs?: number | string;
}

export interface BesuV2TxReceiptRxJS extends TransactionReceipt {
  transactionHash: string;
  gasUsed?: number | string;
  from: string;
}

export function toSeconds(date: number): number {
  return Math.floor(date / 1000);
}

export function millisecondsLatency(date: Date): number {
  return new Date().getTime() - date.getTime();
}
