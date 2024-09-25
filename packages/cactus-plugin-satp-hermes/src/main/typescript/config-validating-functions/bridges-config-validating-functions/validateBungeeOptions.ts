import { Secp256k1Keys } from "@hyperledger/cactus-common";
import { IPluginBungeeHermesOptions } from "@hyperledger/cactus-plugin-bungee-hermes/dist/lib/main/typescript/plugin-bungee-hermes";
import { isKeyPairInput } from "../validateSatpKeyPair";
import { isLogLevelDesc } from "../validateSatpLogLevel";
import {
  BungeeOptionsJSON,
  createPluginRegistry,
  isIPluginRegistryOptions,
} from "./validatePluginRegistryOptions";

// Type guard for BungeeOptionsJSON
export function isBungeeOptionsJSON(obj: unknown): obj is BungeeOptionsJSON {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }
  const objRecord = obj as Record<string, unknown>;
  return (
    "instanceId" in obj &&
    typeof objRecord.instanceId === "string" &&
    "pluginRegistryOptions" in obj &&
    isIPluginRegistryOptions(objRecord.pluginRegistryOptions) &&
    (!("keyPair" in obj) || isKeyPairInput(objRecord.keyPair)) &&
    (!("logLevel" in obj) || isLogLevelDesc(objRecord.logLevel)) &&
    (!("disableSignalHandlers" in obj) ||
      objRecord.disableSignalHandlers === true)
  );
}

export function validateBungeeOptions(
  options: BungeeOptionsJSON,
): IPluginBungeeHermesOptions {
  if (!options) {
    throw new TypeError("Invalid BungeeOptions: " + JSON.stringify(options));
  }

  return {
    instanceId: options.instanceId,
    pluginRegistry: createPluginRegistry(
      options.pluginRegistryOptions,
      options.logLevel,
    ),
    keyPair:
      options.keyPair?.privateKey && options.keyPair?.publicKey
        ? {
            privateKey: Buffer.from(options.keyPair.privateKey, "hex"),
            publicKey: Buffer.from(options.keyPair.publicKey, "hex"),
          }
        : Secp256k1Keys.generateKeyPairsBuffer(),
    logLevel: options.logLevel,
  };
}
