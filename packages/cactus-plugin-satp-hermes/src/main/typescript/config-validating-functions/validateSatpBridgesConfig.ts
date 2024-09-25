import { Asset } from "../core/stage-services/satp-bridge/types/asset";
import { BesuAsset } from "../core/stage-services/satp-bridge/types/besu-asset";
import { FabricAsset } from "../core/stage-services/satp-bridge/types/fabric-asset";
import {
  BesuConfig,
  FabricConfig,
  NetworkConfig,
} from "../types/blockchain-interaction";

// Type guard for Asset
function isAsset(obj: unknown): obj is Asset {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "tokenId" in obj &&
    "tokenType" in obj &&
    "owner" in obj &&
    "amount" in obj &&
    "ontology" in obj &&
    "contractName" in obj &&
    typeof (obj as Record<string, unknown>).tokenId === "string" &&
    typeof (obj as Record<string, unknown>).tokenType === "string" &&
    typeof (obj as Record<string, unknown>).owner === "string" &&
    typeof (obj as Record<string, unknown>).amount === "number" &&
    typeof (obj as Record<string, unknown>).ontology === "string" &&
    typeof (obj as Record<string, unknown>).contractName === "string"
  );
}

// Type guard for FabricAsset
function isFabricAsset(obj: unknown): obj is FabricAsset {
  return (
    isAsset(obj) &&
    "mspId" in obj &&
    "channelName" in obj &&
    typeof (obj as Record<string, unknown>).mspId === "string" &&
    typeof (obj as Record<string, unknown>).channelName === "string"
  );
}

// Type guard for BesuAsset
function isBesuAsset(obj: unknown): obj is BesuAsset {
  return (
    isAsset(obj) &&
    "contractAddress" in obj &&
    typeof (obj as Record<string, unknown>).contractAddress === "string"
  );
}

// Type guard for an array of FabricAsset
function isFabricAssetArray(input: unknown): input is Array<FabricAsset> {
  return Array.isArray(input) && input.every(isFabricAsset);
}

// Type guard for an array of BesuAsset
function isBesuAssetArray(input: unknown): input is Array<BesuAsset> {
  return Array.isArray(input) && input.every(isBesuAsset);
}

// Type guard for NetworkConfig
function isNetworkConfig(obj: unknown): obj is NetworkConfig {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "network" in obj &&
    typeof (obj as NetworkConfig).network === "string"
  );
}

// Type guard for FabricConfig
function isFabricConfig(obj: unknown): obj is FabricConfig {
  return (
    isNetworkConfig(obj) &&
    "signingCredential" in obj &&
    "channelName" in obj &&
    "contractName" in obj &&
    "options" in obj &&
    "bungeeOptions" in obj &&
    typeof (obj as Record<string, unknown>).channelName === "string" &&
    typeof (obj as Record<string, unknown>).contractName === "string" &&
    typeof (obj as Record<string, unknown>).options === "object" &&
    typeof (obj as Record<string, unknown>).bungeeOptions === "object" &&
    (!("fabricAssets" in obj) ||
      isFabricAssetArray((obj as Record<string, unknown>).fabricAssets))
  );
}

// Type guard for BesuConfig
function isBesuConfig(obj: unknown): obj is BesuConfig {
  return (
    isNetworkConfig(obj) &&
    "keychainId" in obj &&
    "signingCredential" in obj &&
    "contractName" in obj &&
    "contractAddress" in obj &&
    "gas" in obj &&
    "options" in obj &&
    "bungeeOptions" in obj &&
    typeof (obj as Record<string, unknown>).keychainId === "string" &&
    typeof (obj as Record<string, unknown>).contractName === "string" &&
    typeof (obj as Record<string, unknown>).contractAddress === "string" &&
    typeof (obj as Record<string, unknown>).gas === "number" &&
    typeof (obj as Record<string, unknown>).options === "object" &&
    typeof (obj as Record<string, unknown>).bungeeOptions === "object" &&
    (!("besuAssets" in obj) ||
      isBesuAssetArray((obj as Record<string, unknown>).besuAssets))
  );
}

// Type guard for an Array of NetworkConfig
export function isNetworkConfigArray(
  input: unknown,
): input is Array<NetworkConfig | FabricConfig | BesuConfig> {
  return (
    Array.isArray(input) &&
    input.every(
      (item) => isFabricConfig(item) || isBesuConfig(item), // || isNetworkConfig(item), // FIXME
    )
  );
}

export function validateSatpBridgesConfig(opts: {
  readonly configValue: unknown;
}): Array<NetworkConfig> {
  if (!opts || !opts.configValue) {
    return [];
  }

  if (
    typeof opts.configValue !== "object" ||
    !isNetworkConfigArray(opts.configValue)
  ) {
    throw new TypeError(
      "Invalid config.gid: " + JSON.stringify(opts.configValue),
    );
  }
  return opts.configValue;
}
