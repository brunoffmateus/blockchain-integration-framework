import { LogLevelDesc } from "@hyperledger/cactus-common";
import { isLogLevelDesc } from "../validateSatpLogLevel";
import {
  createPluginRegistry,
  isIPluginRegistryOptions,
  PluginRegistryOptionsJSON,
} from "./validatePluginRegistryOptions";
import { IPluginLedgerConnectorBesuOptions } from "@hyperledger/cactus-plugin-ledger-connector-besu";

export interface BesuOptionsJSON {
  instanceId: string;
  rpcApiHttpHost: string;
  rpcApiWsHost: string;
  pluginRegistryOptions: PluginRegistryOptionsJSON;
  logLevel?: LogLevelDesc;
}

// Type guard for BesuOptionsJSON
export function isBesuOptionsJSON(obj: unknown): obj is BesuOptionsJSON {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }
  const objRecord = obj as Record<string, unknown>;
  return (
    "instanceId" in obj &&
    typeof objRecord.instanceId === "string" &&
    "rpcApiHttpHost" in obj &&
    typeof objRecord.rpcApiHttpHost === "string" &&
    "rpcApiWsHost" in obj &&
    typeof objRecord.rpcApiWsHost === "string" &&
    "pluginRegistryOptions" in obj &&
    isIPluginRegistryOptions(objRecord.pluginRegistryOptions) &&
    (!("logLevel" in obj) || isLogLevelDesc(objRecord.logLevel))
  );
}

export function validateBesuOptions(
  options: BesuOptionsJSON,
): IPluginLedgerConnectorBesuOptions {
  if (!options) {
    throw new TypeError("Invalid config.gid: " + JSON.stringify(options));
  }

  return {
    instanceId: options.instanceId,
    rpcApiHttpHost: options.rpcApiHttpHost,
    rpcApiWsHost: options.rpcApiWsHost,
    pluginRegistry: createPluginRegistry(
      options.pluginRegistryOptions,
      options.logLevel,
    ),
    logLevel: options.logLevel,
  };
}
