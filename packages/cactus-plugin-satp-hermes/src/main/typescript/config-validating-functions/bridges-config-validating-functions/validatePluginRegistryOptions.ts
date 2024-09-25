import { LogLevelDesc } from "@hyperledger/cactus-common";
import { isLogLevelDesc } from "../validateSatpLogLevel";
import {
  IPluginRegistryOptions,
  PluginRegistry,
} from "@hyperledger/cactus-core";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";

export interface KeychainBackendEntry {
  keychainEntry: string;
  keychainEntryValue: string;
}

export interface KeychainOptions {
  instanceId: string;
  keychainId: string;
  logLevel?: LogLevelDesc;
  backend?: KeychainBackendEntry[];
}

export interface PluginRegistryOptionsJSON {
  logLevel?: LogLevelDesc;
  plugins?: KeychainOptions[];
}

export interface BungeeOptionsJSON {
  instanceId: string;
  pluginRegistryOptions: PluginRegistryOptionsJSON;
  keyPair?: { privateKey: string; publicKey: string };
  logLevel?: LogLevelDesc;
  disableSignalHandlers?: true;
}

// Type guard for the KeychainBackendEntry
function isKeychainBackendEntry(obj: unknown): obj is KeychainBackendEntry {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }
  const objRecord = obj as Record<string, unknown>;
  return (
    "keychainEntry" in obj &&
    typeof objRecord.keychainEntry === "string" &&
    "keychainEntryValue" in obj &&
    typeof objRecord.keychainEntryValue === "string"
  );
}

// Type guard for an array of KeychainBackendEntry
function isKeychainBackendEntryArray(
  value: unknown,
): value is Array<KeychainBackendEntry> {
  return (
    value instanceof Map &&
    Array.from(value.entries()).every(isKeychainBackendEntry)
  );
}

// Type guard for KeychainOptions
function isKeychainOptions(obj: unknown): obj is KeychainOptions {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }
  const objRecord = obj as Record<string, unknown>;
  return (
    "instanceId" in obj &&
    typeof objRecord.instanceId === "string" &&
    "keychainId" in obj &&
    typeof objRecord.keychainId === "string" &&
    (!("logLevel" in obj) || isLogLevelDesc(objRecord.logLevel)) &&
    (!("backend" in obj) || isKeychainBackendEntryArray(objRecord.backend))
  );
}

// Type guard for an array of KeychainOptions
function isKeychainOptionsArray(
  input: unknown,
): input is Array<KeychainOptions> {
  return Array.isArray(input) && input.every(isKeychainOptions);
}

// Type guard for IPluginRegistryOptions
export function isIPluginRegistryOptions(
  obj: unknown,
): obj is IPluginRegistryOptions {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }
  const objRecord = obj as Record<string, unknown>;
  return (
    typeof objRecord.keychainId === "string" &&
    (!("logLevel" in obj) || isLogLevelDesc(objRecord.logLevel)) &&
    (!("plugins" in obj) || isKeychainOptionsArray(objRecord.plugins))
  );
}

export function createPluginRegistry(
  pluginRegistryOptions: PluginRegistryOptionsJSON,
  logLevel?: LogLevelDesc,
): PluginRegistry {
  let plugins: PluginKeychainMemory[] | undefined;

  pluginRegistryOptions.plugins?.forEach((plugin) => {
    const keychainEntries =
      plugin.backend?.map(
        (entry) =>
          [entry.keychainEntry, entry.keychainEntryValue] as [string, string],
      ) ?? [];

    const newPlugin = new PluginKeychainMemory({
      instanceId: plugin.instanceId,
      keychainId: plugin.keychainId,
      logLevel,
      backend: new Map(keychainEntries),
    });

    plugins?.push(newPlugin);
  });
  return new PluginRegistry({
    plugins: plugins,
  });
}
