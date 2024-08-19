#!/usr/bin/env node

import { LoggerProvider } from "@hyperledger/cactus-common";
import { SATPGateway, SATPGatewayConfig } from "./plugin-satp-hermes-gateway";
import fs from "fs-extra";

import { validateSatpGatewayIdentity } from "./config-validating-functions/validateSatpGatewayIdentity";
import { validateSatpCounterPartyGateways } from "./config-validating-functions/validateSatpCounterPartyGateways";
import { validateSatpLogLevel } from "./config-validating-functions/validateSatpLogLevel";
import { validateSatpEnvironment } from "./config-validating-functions/validateSatpEnvironment";
import { validateSatpEnableOpenAPI } from "./config-validating-functions/validateSatpEnableOpenAPI";
import { validateSatpValidationOptions } from "./config-validating-functions/validateSatpValidationOptions";
import { validateSatpPrivacyPolicies } from "./config-validating-functions/validateSatpPrivacyPolicies";
import { validateSatpMergePolicies } from "./config-validating-functions/validateSatpPrivacyPolicies copy";
import { validateKeyPairJSON } from "./config-validating-functions/validateKeyPairJSON";
import { validateSatpBridgesConfig } from "./config-validating-functions/validateSatpBridgesConfig";

export async function launchGateway(): Promise<void> {
  const logger = LoggerProvider.getOrCreate({
    level: "DEBUG",
    label: "SATP-Gateway",
  });

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

  logger.debug("Validating SATP KeyPair...");
  const keyPair = validateKeyPairJSON({
    configValue: config.keyPair,
  });
  logger.debug("SATP KeyPair is valid.");

  logger.debug("Validating SATP Bridges Config...");
  const bridgesConfig = validateSatpBridgesConfig({
    configValue: config.bridgesConfig,
  });
  logger.debug("SATP Bridges Config is valid.");

  logger.debug("Creating SATPGatewayConfig...");
  const gatewayConfig: SATPGatewayConfig = {
    gid,
    counterPartyGateways,
    logLevel,
    keyPair:
      keyPair === undefined
        ? undefined
        : {
            publicKey: Buffer.from(keyPair.publicKey, "hex"),
            privateKey: Buffer.from(keyPair.privateKey, "hex"),
          },
    environment,
    enableOpenAPI,
    validationOptions,
    privacyPolicies,
    mergePolicies,
    bridgesConfig,
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
