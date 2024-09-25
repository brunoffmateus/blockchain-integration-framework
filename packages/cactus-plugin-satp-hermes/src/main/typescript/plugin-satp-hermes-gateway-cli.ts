#!/usr/bin/env node

import { LoggerProvider } from "@hyperledger/cactus-common";
import { SATPGateway, SATPGatewayConfig } from "./plugin-satp-hermes-gateway";
import dotenv from "dotenv";
import fs from "fs-extra";

import { validateSatpGatewayIdentity } from "./config-validating-functions/validateSatpGatewayIdentity";
import { validateSatpCounterPartyGateways } from "./config-validating-functions/validateSatpCounterPartyGateways";
import { validateSatpLogLevel } from "./config-validating-functions/validateSatpLogLevel";
import { validateSatpEnvironment } from "./config-validating-functions/validateSatpEnvironment";
import { validateSatpEnableOpenAPI } from "./config-validating-functions/validateSatpEnableOpenAPI";
import { validateSatpValidationOptions } from "./config-validating-functions/validateSatpValidationOptions";
import { validateSatpPrivacyPolicies } from "./config-validating-functions/validateSatpPrivacyPolicies";
import { validateSatpMergePolicies } from "./config-validating-functions/validateSatpPrivacyPolicies copy";
import { validateSatpKey } from "./config-validating-functions/validateSatpKey";
import { validateBridgesConfig } from "./config-validating-functions/bridges-config-validating-functions/validateBridgesConfig";

export async function launchGateway(): Promise<void> {
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

  logger.debug("Checking for configuration file...");
  let configFilePath: string;

  if (fs.existsSync("/opt/cacti/satp-hermes/gateway-config.json")) {
    configFilePath = "/opt/cacti/satp-hermes/gateway-config.json";
    logger.debug(
      "gateway-config.json file path: /opt/cacti/satp-hermes/gateway-config.json",
    );
  } else {
    configFilePath = "/gateway-config.json";
    logger.debug("gateway-config.json file path: /gateway-config.json");
  }

  logger.debug(`Reading configuration from: ${configFilePath}`);
  const config = await fs.readJson(configFilePath);
  logger.debug(`Configuration read OK`);

  // validating gateway-config.json

  logger.debug("Validating SATP Gateway Identity...");
  const gid = validateSatpGatewayIdentity({
    configValue: config.gid,
  });
  logger.debug("Valid SATP Gateway Identity");

  logger.debug("Validating SATP Counter Party Gateways...");
  const counterPartyGateways = validateSatpCounterPartyGateways({
    configValue: config.counterPartyGateways,
  });
  logger.debug("Valid SATP Counter Party Gateways");

  logger.debug("Validating SATP Log Level...");
  const logLevel = validateSatpLogLevel({
    configValue: config.logLevel,
  });
  logger.debug("SATP Log Level is valid.");

  logger.debug("Validating SATP Environment...");
  const environment = validateSatpEnvironment({
    configValue: config.environment,
  });
  logger.debug("SATP Environment is valid.");

  logger.debug("Validating SATP Enable OpenAPI...");
  const enableOpenAPI = validateSatpEnableOpenAPI({
    configValue: config.enableOpenAPI,
  });
  logger.debug("SATP Enable OpenAPI is valid.");

  logger.debug("Validating SATP Validation Options...");
  const validationOptions = validateSatpValidationOptions({
    configValue: config.validationOptions,
  });
  logger.debug("SATP Validation Options is valid.");

  logger.debug("Validating SATP Privacy Policies...");
  const privacyPolicies = validateSatpPrivacyPolicies({
    configValue: config.validationOptions,
  });
  logger.debug("SATP Privacy Policies is valid.");
  privacyPolicies.forEach((p, i) =>
    logger.debug("Privacy Policy #%d => %o", i, p),
  );

  logger.debug("Validating SATP Merge Policies...");
  const mergePolicies = validateSatpMergePolicies({
    configValue: config.mergePolicies,
  });
  logger.debug("SATP Merge Policies is valid.");
  mergePolicies.forEach((p, i) => logger.debug("Merge Policy #%d => %o", i, p));

  logger.debug("Validating SATP Public Key...");
  const pubKey = validateSatpKey(
    {
      configValue: config.keyPair.publicKey,
    },
    "config.keyPair.publicKey",
  );
  gid.pubKey = pubKey;
  logger.debug("SATP Public Key is valid.");

  logger.debug("Validating SATP Private Key...");
  const privKey = validateSatpKey(
    {
      configValue: config.keyPair.privateKey,
    },
    "config.keyPair.privateKey",
  );
  logger.debug("SATP Private Key is valid.");

  // this causes yarn lerna run build:bundle --scope=@hyperledger/cactus-plugin-satp-hermes !!
  // logger.debug("Validating SATP Bridges Config...");
  // const bridgesConfig = validateBridgesConfig({
  //   configValue: config.bridgesConfig,
  // });
  // logger.debug("SATP Bridges Config is valid.");

  logger.debug("Creating SATPGatewayConfig...");
  const gatewayConfig: SATPGatewayConfig = {
    gid,
    counterPartyGateways,
    logLevel,
    keyPair: {
      publicKey: Buffer.from(pubKey, "hex"),
      privateKey: Buffer.from(privKey, "hex"),
    },
    environment,
    enableOpenAPI,
    validationOptions,
    privacyPolicies,
    mergePolicies,
    // bridgesConfig,
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
  launchGateway();
}
