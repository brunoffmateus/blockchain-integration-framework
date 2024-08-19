import { BesuAsset } from "../../core/stage-services/satp-bridge/types/besu-asset";
import {
  Web3SigningCredential,
  Web3SigningCredentialCactusKeychainRef,
  Web3SigningCredentialNone,
  Web3SigningCredentialPrivateKeyHex,
  Web3SigningCredentialType,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";
import { isAsset } from "./validateAsset";
import { NetworkConfigJSON } from "./validateBridgesConfig";
import { BungeeOptionsJSON } from "./validatePluginRegistryOptions";
import { BesuOptionsJSON, isBesuOptionsJSON } from "./validateBesuOptions";
import { isBungeeOptionsJSON } from "./validateBungeeOptions";

export interface BesuConfigJSON extends NetworkConfigJSON {
  keychainId: string;
  signingCredential: Web3SigningCredential;
  contractName: string;
  contractAddress: string;
  gas: number;
  options: BesuOptionsJSON;
  bungeeOptions: BungeeOptionsJSON;
  besuAssets?: BesuAsset[];
}

// Type guard for BesuAsset
function isBesuAsset(obj: unknown): obj is BesuAsset {
  const objRecord = obj as Record<string, unknown>;
  return (
    isAsset(obj) &&
    "contractAddress" in obj &&
    typeof objRecord.contractAddress === "string"
  );
}

// Type guard for an array of BesuAsset
function isBesuAssetArray(input: unknown): input is Array<BesuAsset> {
  return Array.isArray(input) && input.every(isBesuAsset);
}

// Type guard for Web3SigningCredentialType
function isWeb3SigningCredentialType(
  value: unknown,
): value is Web3SigningCredentialType {
  return (
    typeof value === "string" &&
    value !== null &&
    (value === "CACTUS_KEYCHAIN_REF" ||
      value === "GETH_KEYCHAIN_PASSWORD" ||
      value === "PRIVATE_KEY_HEX" ||
      value === "NONE")
  );
}

// Type guard for Web3SigningCredentialCactusKeychainRef
function isWeb3SigningCredentialCactusKeychainRef(
  obj: unknown,
): obj is Web3SigningCredentialCactusKeychainRef {
  const objRecord = obj as Record<string, unknown>;
  return (
    typeof obj === "object" &&
    obj !== null &&
    "ethAccount" in obj &&
    typeof objRecord.ethAccount === "string" &&
    "keychainEntryKey" in obj &&
    typeof objRecord.keychainEntryKey === "string" &&
    "keychainId" in obj &&
    typeof objRecord.keychainId === "string" &&
    "type" in obj &&
    isWeb3SigningCredentialType(objRecord.type)
  );
}

// Type guard for Web3SigningCredentialNone
function isWeb3SigningCredentialNone(
  obj: unknown,
): obj is Web3SigningCredentialNone {
  const objRecord = obj as Record<string, unknown>;
  return (
    typeof obj === "object" &&
    obj !== null &&
    "type" in obj &&
    isWeb3SigningCredentialType(objRecord.type)
  );
}

// Type guard for Web3SigningCredentialPrivateKeyHex
function isWeb3SigningCredentialPrivateKeyHex(
  obj: unknown,
): obj is Web3SigningCredentialPrivateKeyHex {
  const objRecord = obj as Record<string, unknown>;
  return (
    typeof obj === "object" &&
    obj !== null &&
    "ethAccount" in obj &&
    typeof objRecord.ethAccount === "string" &&
    "secret" in obj &&
    typeof objRecord.secret === "string" &&
    "type" in obj &&
    isWeb3SigningCredentialType(objRecord.type)
  );
}

// Type guard for Web3SigningCredential
function isWeb3SigningCredential(obj: unknown): obj is Web3SigningCredential {
  if (!obj || typeof obj !== "object") {
    return false;
  }
  return (
    isWeb3SigningCredentialCactusKeychainRef(obj) ||
    isWeb3SigningCredentialPrivateKeyHex(obj) ||
    isWeb3SigningCredentialNone(obj)
  );
}

// Type guard for BesuConfigJSON
export function isBesuConfigJSON(obj: unknown): obj is BesuConfigJSON {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }
  const objRecord = obj as Record<string, unknown>;
  return (
    "keychainId" in obj &&
    typeof objRecord.keychainId === "string" &&
    "contractName" in obj &&
    typeof objRecord.contractName === "string" &&
    "contractAddress" in obj &&
    typeof objRecord.contractAddress === "string" &&
    "gas" in obj &&
    typeof objRecord.gas === "number" &&
    "signingCredential" in obj &&
    isWeb3SigningCredential(objRecord.signingCredential) &&
    (!("besuAssets" in obj) || isBesuAssetArray(objRecord.besuAssets)) &&
    "bungeeOptions" in obj &&
    isBungeeOptionsJSON(objRecord.bungeeOptions) &&
    "options" in obj &&
    isBesuOptionsJSON(objRecord.options)
  );
}
