import { LogLevelDesc } from "@hyperledger/cactus-common";
import { isLogLevelDesc } from "./validateSatpLogLevel";
import {
  createPluginRegistry,
  isPluginRegistryOptionsJSON,
  PluginRegistryOptionsJSON,
} from "./bridges-config-validating-functions/validatePluginRegistryOptions";
import { IPluginCcModelHephaestusOptions } from "@hyperledger/cactus-plugin-ccmodel-hephaestus";

export interface HephaestusOptionsJSON {
  pluginRegistryOptions?: PluginRegistryOptionsJSON;
  logLevel?: LogLevelDesc;
  instanceId: string;
  ccLogsDir: string;
  ccModelDir: string;
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
      "Invalid bungeeOptions in NetworkConfig: " + JSON.stringify(options),
    );
  }

  return {
    instanceId: options.instanceId,
    connectorRegistry: createPluginRegistry(
      options.pluginRegistryOptions,
      options.logLevel,
    ),
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
      `Invalid config.enableCrashRecovery: ${opts.configValue}. Expected a boolean`,
    );
  }
  return createHephaestusOptions(opts.configValue);
}
