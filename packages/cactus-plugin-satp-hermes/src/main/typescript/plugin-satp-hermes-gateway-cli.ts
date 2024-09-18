#!/usr/bin/env node

import { LoggerProvider, LogLevelDesc } from "@hyperledger/cactus-common";
import { SATPGateway, SATPGatewayConfig } from "./plugin-satp-hermes-gateway";
import { SupportedChain } from "./core/types";
import { SATP_VERSION } from "./core/constants";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import fs from "fs-extra";
import {
  IMergePolicyValue,
  isMergePolicyValueArray,
} from "@hyperledger/cactus-plugin-bungee-hermes/dist/lib/main/typescript/view-merging/merge-policies";

export async function launchGateway(env?: NodeJS.ProcessEnv): Promise<void> {
  const logLevel: LogLevelDesc =
    (env?.SATP_LOG_LEVEL?.toUpperCase() as LogLevelDesc) || "INFO";
  const logger = LoggerProvider.getOrCreate({
    level: logLevel,
    label: "SATP-Gateway",
  });

  if (fs.existsSync("/opt/cacti/satp-hermes/.env.example")) {
    dotenv.config({ path: "/opt/cacti/satp-hermes/.env.example" });
    //log
  } else {
    dotenv.config({ path: "/.env.example" });
    //log
  }

  const parseSupportedDLTs = (): SupportedChain[] => {
    return env
      ?.SATP_SUPPORTED_DLTS!.split(",")
      .filter((dlt) =>
        Object.values(SupportedChain).includes(dlt as SupportedChain),
      ) as SupportedChain[];
  };

  logger.debug("Parsing Merge Policies...");
  const mergePolicies = parseSatpMergePoliciesEnv({
    envVarValue: env?.SATP_MERGE_POLICIES,
  });
  logger.debug("Merge Policy parsed from env var OK");
  mergePolicies.forEach((p, i) => logger.debug("Merge Policy #%d => %o", i, p));

  const gatewayConfig: SATPGatewayConfig = {
    gid: {
      id: env?.SATP_GATEWAY_ID || uuidv4(),
      name: env?.SATP_GATEWAY_NAME,
      version: [
        {
          Core: env?.SATP_GATEWAY_VERSION_CORE || SATP_VERSION,
          Architecture: env?.SATP_GATEWAY_VERSION_ARCHITECTURE || SATP_VERSION,
          Crash: env?.SATP_GATEWAY_VERSION_CRASH || SATP_VERSION,
        },
      ],
      supportedDLTs: env?.SATP_SUPPORTED_DLTS ? parseSupportedDLTs() : [],
      proofID: env?.SATP_PROOF_ID,
      gatewayServerPort: parseInt(env?.SATP_GATEWAY_SERVER_PORT || "0", 10),
      gatewayClientPort: parseInt(env?.SATP_GATEWAY_CLIENT_PORT || "0", 10),
      gatewayOpenAPIPort: parseInt(env?.DEFAULT_PORT_GATEWAY_API || "0", 10),
      address: env?.SATP_GATEWAY_ADDRESS as
        | `http://${string}`
        | `https://${string}`
        | undefined,
    },
    counterPartyGateways: JSON.parse(env?.SATP_COUNTER_PARTY_GATEWAYS || "[]"),
    logLevel,
    keyPair: {
      privateKey: Buffer.from(env?.SATP_PRIVATE_KEY || "", "hex"),
      publicKey: Buffer.from(env?.SATP_PUBLIC_KEY || "", "hex"),
    },
    environment:
      (env?.SATP_NODE_ENV as "development" | "production") || "development",
    enableOpenAPI: env?.SATP_ENABLE_OPEN_API === "true",
    validationOptions: JSON.parse(env?.SATP_VALIDATION_OPTIONS || "{}"),
    privacyPolicies: JSON.parse(env?.SATP_PRIVACY_POLICIES || "[]"),
    mergePolicies,
  };

  // IMergePolicyValue
  // SATP_MERGE_POLICIES => { "valid": "something"}

  const gateway = new SATPGateway(gatewayConfig);
  try {
    logger.info("Starting SATP Gateway...");
    await gateway.startup();
    logger.info("SATP Gateway started successfully");
  } catch (ex) {
    logger.error(`SATP Gateway crashed. Exiting...`, ex);
    await gateway.shutdown();
    process.exit(-1);
  }
}

export function parseSatpMergePoliciesEnv(opts: {
  readonly envVarValue?: Readonly<string>;
}): Array<IMergePolicyValue> {
  if (!opts) {
    return [];
  }
  if (!opts.envVarValue) {
    return [];
  }
  if (typeof opts.envVarValue !== "string") {
    return [];
  }
  // If the JSON is invalid this will crash
  const pojo = JSON.parse(opts.envVarValue) as unknown;

  // now we have to ensure that pojo is indeed an Array<IMergePolicyValue>

  if (!isMergePolicyValueArray(pojo)) {
    throw new TypeError("env.SATP_MERGE_POLICIES invalid: " + opts.envVarValue);
  }
  return pojo;
}

if (require.main === module) {
  launchGateway(process.env);
}
