import { LogLevelDesc } from "@hyperledger/cactus-common";
import { isLogLevelDesc } from "./validateSatpLogLevel";
import {
  createPluginRegistry,
  isPluginRegistryOptionsJSON,
  PluginRegistryOptionsJSON,
} from "./bridges-config-validating-functions/validatePluginRegistryOptions";
import { IPluginCcModelHephaestusOptions } from "@hyperledger/cactus-plugin-ccmodel-hephaestus";
import { LedgerType } from "@hyperledger/cactus-core-api";

export interface HephaestusOptionsJSON {
  pluginRegistryOptions?: PluginRegistryOptionsJSON;
  logLevel?: LogLevelDesc;
  instanceId: string;
  methodsToMonitor: Map<LedgerType, string[]>;
  ccLogsDir: string;
  ccModelDir: string;
}

// Type guard for methodsToMonitor
function isMethodsToMonitor(obj: unknown): obj is Map<LedgerType, string[]> {
  if (!(obj instanceof Map)) {
    return false;
  }
  for (const [key, value] of obj.entries()) {
    if (
      typeof key !== "string" ||
      !Object.values(LedgerType).includes(key as LedgerType)
    ) {
      return false;
    }
    if (
      !Array.isArray(value) ||
      !value.every((item) => typeof item === "string")
    ) {
      return false;
    }
  }

  return true;
}

// Type guard for HephaestusOptionsJSON
export function isHephaestusOptionsJSON(
  obj: unknown,
): obj is HephaestusOptionsJSON {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }
  const objRecord = obj as Record<string, unknown>;
  return (
    "instanceId" in obj &&
    typeof objRecord.instanceId === "string" &&
    "methodsToMonitor" in obj &&
    isMethodsToMonitor(obj.methodsToMonitor) &&
    "ccLogsDir" in obj &&
    typeof objRecord.ccLogsDir === "string" &&
    "ccModelDir" in obj &&
    typeof objRecord.ccModelDir === "string" &&
    (!("pluginRegistryOptions" in obj) ||
      isPluginRegistryOptionsJSON(objRecord.pluginRegistryOptions)) &&
    (!("logLevel" in obj) || isLogLevelDesc(objRecord.logLevel))
  );
}

// Function to create IPluginCcModelHephaestusOptions from HephaestusOptionsJSON
function createHephaestusOptions(
  options: HephaestusOptionsJSON,
): IPluginCcModelHephaestusOptions {
  if (!options) {
    throw new TypeError(
      "Invalid hephaestusOptions in NetworkConfig: " + JSON.stringify(options),
    );
  }

  return {
    instanceId: options.instanceId,
    connectorRegistry: createPluginRegistry(
      options.pluginRegistryOptions,
      options.logLevel,
    ),
    methodsToMonitor: options.methodsToMonitor,
    logLevel: options.logLevel,
    ccLogsDir: options.ccLogsDir,
    ccModelDir: options.ccModelDir,
  };
}

export function validateHephaestusOptions(opts: {
  readonly configValue: unknown;
}): IPluginCcModelHephaestusOptions | undefined {
  if (!opts || opts.configValue === undefined) {
    return;
  }

  if (!isHephaestusOptionsJSON(opts.configValue)) {
    throw new TypeError(
      `Invalid config.hephaestusOptions: ${opts.configValue}. Expected a boolean`,
    );
  }
  return createHephaestusOptions(opts.configValue);
}
