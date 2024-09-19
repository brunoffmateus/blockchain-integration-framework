#!/usr/bin/env node

import { LoggerProvider } from "@hyperledger/cactus-common";
import { SATPGateway, SATPGatewayConfig } from "./plugin-satp-hermes-gateway";
import dotenv from "dotenv";
import fs from "fs-extra";

import { parseSatpCounterPartyGatewaysEnv } from "./parsing-functions/parseSatpCounterPartyGateways";
import { parseSatpEnableOpenAPIEnv } from "./parsing-functions/parseSatpEnableOpenAPI";
import { parseSatpEnvironmentEnv } from "./parsing-functions/parseSatpEnvironment";
import { parseSatpGatewayAddressEnv } from "./parsing-functions/parseSatpGatewayAddress";
import { parseSatpGatewayClientPortEnv } from "./parsing-functions/parseSatpGatewayClientPort";
import { parseSatpGatewayIdEnv } from "./parsing-functions/parseSatpGatewayId";
import { parseSatpGatewayNameEnv } from "./parsing-functions/parseSatpGatewayName";
import { parseSatpGatewayOpenAPIPortEnv } from "./parsing-functions/parseSatpGatewayOpenAPIPort";
import { parseSatpGatewayServerPortEnv } from "./parsing-functions/parseSatpGatewayServerPort";
import { parseSatpGatewayUIPortEnv } from "./parsing-functions/parseSatpGatewayUIPort";
import { parseSatpGatewayVersionEnv } from "./parsing-functions/parseSatpGatewayVersion";
import { parseSatpLogLevelEnv } from "./parsing-functions/parseSatpLogLevel";
import { parseSatpMergePoliciesEnv } from "./parsing-functions/parseSatpMergePolicies";
import { parseSatpPrivacyPoliciesEnv } from "./parsing-functions/parseSatpPrivacyPolicies";
import { parseSatpPrivateKeyEnv } from "./parsing-functions/parseSatpPrivateKey";
import { parseSatpProofIdEnv } from "./parsing-functions/parseSatpProofId";
import { parseSatpPublicKeyEnv } from "./parsing-functions/parseSatpPublicKey";
import { parseSatpSupportedDLTsEnv } from "./parsing-functions/parseSatpSupportedDLTs";
import { parseSatpValidationOptionsEnv } from "./parsing-functions/parseSatpValidationOptions";

export async function launchGateway(env?: NodeJS.ProcessEnv): Promise<void> {
  const logger = LoggerProvider.getOrCreate({
    level: "DEBUG",
    label: "SATP-Gateway",
  });

  logger.debug("Checking for environment file...");
  if (fs.existsSync("/opt/cacti/satp-hermes/.env.example")) {
    dotenv.config({ path: "/opt/cacti/satp-hermes/.env.example" });
    logger.debug("dotenv file path: /opt/cacti/satp-hermes/.env.example");
  } else {
    dotenv.config({ path: "/.env.example" });
    logger.debug("dotenv file path: /.env.example");
  }

  // environment variables parsing

  logger.debug("Parsing env.SATP_GATEWAY_ID...");
  const id = parseSatpGatewayIdEnv({
    envVarValue: env?.SATP_GATEWAY_ID,
  });
  logger.debug("env.SATP_GATEWAY_ID parsed from env var OK");

  logger.debug("Parsing env.SATP_GATEWAY_NAME...");
  const name = parseSatpGatewayNameEnv({
    envVarValue: env?.SATP_GATEWAY_NAME,
  });
  logger.debug("env.SATP_GATEWAY_NAME parsed from env var OK");

  logger.debug("Parsing env.SATP_GATEWAY_VERSION...");
  const version = parseSatpGatewayVersionEnv({
    envVarValue: env?.SATP_GATEWAY_VERSION,
  });
  logger.debug("env.SATP_GATEWAY_VERSION parsed from env var OK");

  logger.debug("Parsing env.SATP_SUPPORTED_DLTS...");
  const supportedDLTs = parseSatpSupportedDLTsEnv({
    envVarValue: env?.SATP_SUPPORTED_DLTS,
  });
  logger.debug("env.SATP_SUPPORTED_DLTS parsed from env var OK");

  logger.debug("Parsing env.SATP_PROOF_ID...");
  const proofID = parseSatpProofIdEnv({
    envVarValue: env?.SATP_PROOF_ID,
  });
  logger.debug("env.SATP_PROOF_ID parsed from env var OK");

  logger.debug("Parsing env.SATP_GATEWAY_SERVER_PORT...");
  const gatewayServerPort = parseSatpGatewayServerPortEnv({
    envVarValue: env?.SATP_GATEWAY_SERVER_PORT,
  });
  logger.debug("env.SATP_GATEWAY_SERVER_PORT parsed from env var OK");

  logger.debug("Parsing env.SATP_GATEWAY_CLIENT_PORT...");
  const gatewayClientPort = parseSatpGatewayClientPortEnv({
    envVarValue: env?.SATP_GATEWAY_CLIENT_PORT,
  });
  logger.debug("env.SATP_GATEWAY_CLIENT_PORT parsed from env var OK");

  logger.debug("Parsing env.SATP_GATEWAY_OPEN_API_PORT...");
  const gatewayOpenAPIPort = parseSatpGatewayOpenAPIPortEnv({
    envVarValue: env?.SATP_GATEWAY_OPEN_API_PORT,
  });
  logger.debug("env.SATP_GATEWAY_OPEN_API_PORT parsed from env var OK");

  logger.debug("Parsing env.SATP_GATEWAY_UI_PORT...");
  const gatewayUIPort = parseSatpGatewayUIPortEnv({
    envVarValue: env?.SATP_GATEWAY_UI_PORT,
  });
  logger.debug("env.SATP_GATEWAY_UI_PORT parsed from env var OK");

  logger.debug("Parsing env.SATP_GATEWAY_ADDRESS...");
  const address = parseSatpGatewayAddressEnv({
    envVarValue: env?.SATP_GATEWAY_ADDRESS,
  });
  logger.debug("env.SATP_GATEWAY_ADDRESS parsed from env var OK");

  logger.debug("Parsing env.SATP_COUNTER_PARTY_GATEWAYS...");
  const counterPartyGateways = parseSatpCounterPartyGatewaysEnv({
    envVarValue: env?.SATP_COUNTER_PARTY_GATEWAYS,
  });
  logger.debug("env.SATP_COUNTER_PARTY_GATEWAYS parsed from env var OK");

  logger.debug("Parsing env.SATP_LOG_LEVEL...");
  const logLevel = parseSatpLogLevelEnv({
    envVarValue: env?.SATP_LOG_LEVEL,
  });
  logger.debug("env.SATP_LOG_LEVEL parsed from env var OK");

  logger.debug("Parsing env.SATP_PUBLIC_KEY...");
  const pubKey = parseSatpPublicKeyEnv({
    envVarValue: env?.SATP_PUBLIC_KEY,
  });
  logger.debug("env.SATP_PUBLIC_KEY parsed from env var OK");

  logger.debug("Parsing env.SATP_PRIVATE_KEY...");
  const privateKey = parseSatpPrivateKeyEnv({
    envVarValue: env?.SATP_PRIVATE_KEY,
  });
  logger.debug("env.SATP_PRIVATE_KEY parsed from env var OK");

  logger.debug("Parsing env.SATP_NODE_ENV...");
  const environment = parseSatpEnvironmentEnv({
    envVarValue: env?.SATP_NODE_ENV,
  });
  logger.debug("env.SATP_NODE_ENV parsed from env var OK");

  logger.debug("Parsing env.SATP_ENABLE_OPEN_API...");
  const enableOpenAPI = parseSatpEnableOpenAPIEnv({
    envVarValue: env?.SATP_ENABLE_OPEN_API,
  });
  logger.debug("env.SATP_ENABLE_OPEN_API parsed from env var OK");

  logger.debug("Parsing env.SATP_VALIDATION_OPTIONS...");
  const validationOptions = parseSatpValidationOptionsEnv({
    envVarValue: env?.SATP_VALIDATION_OPTIONS,
  });
  logger.debug("env.SATP_PRIVACY_POLICIES parsed from env var OK");

  logger.debug("Parsing env.SATP_PRIVACY_POLICIES...");
  const privacyPolicies = parseSatpPrivacyPoliciesEnv({
    envVarValue: env?.SATP_PRIVACY_POLICIES,
  });
  logger.debug("env.SATP_PRIVACY_POLICIES parsed from env var OK");
  privacyPolicies.forEach((p, i) =>
    logger.debug("Privacy Policy #%d => %o", i, p),
  );

  logger.debug("Parsing env.SATP_MERGE_POLICIES...");
  const mergePolicies = parseSatpMergePoliciesEnv({
    envVarValue: env?.SATP_MERGE_POLICIES,
  });
  logger.debug("env.SATP_MERGE_POLICIES parsed from env var OK");
  mergePolicies.forEach((p, i) => logger.debug("Merge Policy #%d => %o", i, p));

  logger.debug("Creating SATPGatewayConfig...");
  const gatewayConfig: SATPGatewayConfig = {
    gid: {
      id,
      pubKey,
      name,
      version,
      supportedDLTs,
      proofID,
      gatewayServerPort,
      gatewayClientPort,
      gatewayOpenAPIPort,
      gatewayUIPort,
      address,
    },
    counterPartyGateways,
    logLevel,
    keyPair: {
      publicKey: Buffer.from(pubKey, "hex"),
      privateKey: Buffer.from(privateKey, "hex"),
    },
    environment,
    enableOpenAPI,
    validationOptions,
    privacyPolicies,
    mergePolicies,
    // bridgesConfig //TODO - problem there can be various besuConfigs and fabricConfigs
    // just start with one first and
  };
  logger.debug("SATPGatewayConfig created successfully");

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

if (require.main === module) {
  launchGateway(process.env);
}
