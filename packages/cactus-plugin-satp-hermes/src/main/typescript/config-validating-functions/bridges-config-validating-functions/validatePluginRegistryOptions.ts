import { LogLevelDesc } from "@hyperledger/cactus-common";
import { isLogLevelDesc } from "../validateSatpLogLevel";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import SATPContract from "../../../../test/solidity/generated/satp-erc20.sol/SATPContract.json";
import SATPWrapperContract from "../../../../solidity/generated/satp-wrapper.sol/SATPWrapperContract.json";
// import Web3 from "web3";

export interface KeychainBackendEntry {
  keychainEntry: string;
  keychainEntryValue: string;
}

export interface KeychainOptionsJSON {
  instanceId: string;
  keychainId: string;
  logLevel?: LogLevelDesc;
  backend?: KeychainBackendEntry[];
  erc20TokenContract?: string;
  contractNameWrapper?: string;
}

export interface PluginRegistryOptionsJSON {
  logLevel?: LogLevelDesc;
  plugins?: KeychainOptionsJSON[];
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
  input: unknown,
): input is Array<KeychainBackendEntry> {
  return Array.isArray(input) && input.every(isKeychainBackendEntry);
}

// Type guard for KeychainOptionsJSON
function isKeychainOptionsJSON(obj: unknown): obj is KeychainOptionsJSON {
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
    (!("backend" in obj) || isKeychainBackendEntryArray(objRecord.backend)) &&
    (!("erc20TokenContract" in obj) ||
      typeof objRecord.erc20TokenContract === "string") &&
    (!("contractNameWrapper" in obj) ||
      typeof objRecord.contractNameWrapper === "string")
  );
}

// Type guard for an array of KeychainOptionsJSON
function isKeychainOptionsJSONArray(
  input: unknown,
): input is Array<KeychainOptionsJSON> {
  return Array.isArray(input) && input.every(isKeychainOptionsJSON);
}

// Type guard for PluginRegistryOptionsJSON
export function isPluginRegistryOptionsJSON(
  obj: unknown,
): obj is PluginRegistryOptionsJSON {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }
  const objRecord = obj as Record<string, unknown>;
  return (
    (!("logLevel" in obj) || isLogLevelDesc(objRecord.logLevel)) &&
    (!("plugins" in obj) || isKeychainOptionsJSONArray(objRecord.plugins))
  );
}

type KeyValuePair = [string, string];

export function createPluginRegistry(
  pluginRegistryOptions?: PluginRegistryOptionsJSON,
  logLevel?: LogLevelDesc,
): PluginRegistry {
  console.log("creating pluginResgistry...");
  if (
    pluginRegistryOptions === undefined ||
    pluginRegistryOptions.plugins === undefined
  ) {
    console.log("returning default pluginResgistry");
    return new PluginRegistry();
  }

  const plugins: PluginKeychainMemory[] = [];
  pluginRegistryOptions.plugins.forEach(async (pluginJSON) => {
    const entryValuesArray: KeyValuePair[] = [];
    pluginJSON.backend?.forEach((entry) => {
      entryValuesArray.push([entry.keychainEntry, entry.keychainEntryValue]);
    });
    console.log(`- instanceId: ${pluginJSON.instanceId}`);
    console.log(`- keychainId: ${pluginJSON.keychainId}`);
    console.log(
      `- entryValuesArray: ${JSON.stringify(entryValuesArray, null, 2)}`,
    );
    const backend: Map<string, string> = new Map(entryValuesArray);
    const newPluginKeychainMemory = new PluginKeychainMemory({
      instanceId: pluginJSON.instanceId,
      keychainId: pluginJSON.keychainId,
      logLevel,
      backend,
    });

    if (pluginJSON.erc20TokenContract) {
      console.log(
        `- setting erc20TokenContract: ${pluginJSON.erc20TokenContract}`,
      );
      // // forge compiler outputs a different JSON object than the one we want
      // const erc20TokenContractObject = {
      //   contactName: pluginJSON.erc20TokenContract,
      //   abi: SATPContract.abi,
      //   bytecode: Web3.utils.utf8ToHex(SATPContract.bytecode.object),
      // };
      // newPluginKeychainMemory.set(
      //   pluginJSON.erc20TokenContract,
      //   JSON.stringify(erc20TokenContractObject),
      // );

      await newPluginKeychainMemory.set(
        pluginJSON.erc20TokenContract,
        JSON.stringify(SATPContract),
      );

      // const contractStr = JSON.stringify(SATPContract);
      // const contractJSON = JSON.parse(contractStr);
      // const networkInfo = { address: contractAddress }; // in besuOptions
      // const networkId = await this.connector.web3.eth.net.getId(); // is it possible to add this in BesuBridge???
      // const network = { [networkId]: networkInfo };
      // contractJSON.networks = network; // with this we won't enter the if - i think

      // await newPluginKeychainMemory.set(
      //   pluginJSON.erc20TokenContract,
      //   JSON.stringify(contractJSON),
      // );
    }
    if (pluginJSON.contractNameWrapper) {
      console.log(
        `- setting contractNameWrapper: ${pluginJSON.contractNameWrapper}`,
      );
      // // forge compiler outputs a different JSON object than the one we want
      // const wrapperContractObject = {
      //   contactName: pluginJSON.contractNameWrapper,
      //   abi: SATPWrapperContract.abi,
      //   bytecode: Web3.utils.utf8ToHex(SATPWrapperContract.bytecode.object),
      // };
      // newPluginKeychainMemory.set(
      //   pluginJSON.contractNameWrapper,
      //   JSON.stringify(wrapperContractObject),
      // );
      await newPluginKeychainMemory.set(
        pluginJSON.contractNameWrapper,
        JSON.stringify(SATPWrapperContract),
      );
    }

    console.log(`- pushing pluginKeychainMemory...`);
    plugins.push(newPluginKeychainMemory);
  });

  console.log(`plugins length: ${plugins.length}`);
  return new PluginRegistry({
    plugins: plugins,
  });
}
