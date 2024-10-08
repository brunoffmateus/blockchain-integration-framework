import { SupportedChain } from "../../core/types";
import {
  BesuConfig,
  FabricConfig,
  NetworkConfig,
} from "../../types/blockchain-interaction";
import { isBesuConfigJSON } from "./validateBesuConfig";
import { validateBesuOptions } from "./validateBesuOptions";
import { validateBungeeOptions } from "./validateBungeeOptions";
import { isFabricConfigJSON } from "./validateFabricConfig";
import { validateFabricOptions } from "./validateFabricOptions";

export interface NetworkConfigJSON {
  network: string;
}

// Type guard for NetworkConfigJSON
function isNetworkConfigJSON(obj: unknown): obj is NetworkConfigJSON {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }
  const objRecord = obj as Record<string, unknown>;
  if (
    !("network" in obj) ||
    typeof objRecord.network !== "string" ||
    (objRecord.network !== SupportedChain.FABRIC &&
      objRecord.network !== SupportedChain.BESU)
  ) {
    return false;
  }
  return isFabricConfigJSON(objRecord) || isBesuConfigJSON(objRecord);
}

// Type guard for an array of NetworkConfigJSON
function isNetworkConfigJSONArray(
  input: unknown,
): input is Array<NetworkConfigJSON> {
  return Array.isArray(input) && input.every(isNetworkConfigJSON);
}

export function validateSatpBridgesConfig(opts: {
  readonly configValue: unknown;
}): Array<NetworkConfig> {
  if (!opts || !opts.configValue) {
    return [];
  }

  if (!isNetworkConfigJSONArray(opts.configValue)) {
    throw new TypeError(
      "Invalid config.bridgesConfig: " + JSON.stringify(opts.configValue),
    );
  }

  const bridgesConfigParsed: NetworkConfig[] = [];
  opts.configValue.forEach((config) => {
    if (isFabricConfigJSON(config)) {
      console.log("Validating FabricConfig BungeeOptions...");
      const bungeeOptions = validateBungeeOptions(config.bungeeOptions);
      console.log("FabricConfig BungeeOptions is valid.");
      console.log("Validating FabricConfig Options...");
      const fabricOptions = validateFabricOptions(config.options);
      console.log("FabricConfig Options is valid.");

      const fabricConfig: FabricConfig = {
        network: config.network,
        signingCredential: config.signingCredential,
        channelName: config.channelName,
        contractName: config.contractName,
        options: fabricOptions,
        bungeeOptions: bungeeOptions,
        fabricAssets: config.fabricAssets,
      };

      console.log("pushing fabricConfig:");
      console.log(`- network: ${fabricConfig.network}`);
      console.log(
        `- signingCredential: ${fabricConfig.signingCredential.keychainId} ${fabricConfig.signingCredential.keychainRef}`,
      );
      console.log(`- channelName: ${fabricConfig.channelName}`);
      console.log(`- contractName: ${fabricConfig.contractName}`);
      console.log(`- fabricAssets: ${fabricConfig.fabricAssets}`);

      bridgesConfigParsed.push(fabricConfig);
    } else if (isBesuConfigJSON(config)) {
      console.log("Validating BesuConfig BungeeOptions...");
      const bungeeOptions = validateBungeeOptions(config.bungeeOptions);
      console.log("BesuConfig BungeeOptions is valid.");
      console.log("Validating BesuConfig Options...");
      const besuOptions = validateBesuOptions(config.options);
      console.log("BesuConfig Options is valid.");

      const besuConfig: BesuConfig = {
        network: config.network,
        keychainId: config.keychainId,
        signingCredential: config.signingCredential,
        contractName: config.contractName,
        contractAddress: config.contractAddress,
        gas: config.gas,
        options: besuOptions,
        bungeeOptions: bungeeOptions,
        besuAssets: config.besuAssets,
      };

      console.log("pushing besuConfig:");
      console.log(`- network: ${besuConfig.network}`);
      console.log(`- keychainId: ${besuConfig.keychainId}`);
      console.log(`- signingCredential: ${besuConfig.signingCredential.type}`);
      console.log(`- contractName: ${besuConfig.contractName}`);
      console.log(`- contractAddress: ${besuConfig.contractAddress}`);
      console.log(`- gas: ${besuConfig.gas}`);
      console.log(`- besuAssets: ${besuConfig.besuAssets}`);

      bridgesConfigParsed.push(besuConfig);
    }
  });
  return bridgesConfigParsed;
}
