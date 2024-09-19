import { v4 as uuidv4 } from "uuid";

export function parseSatpGatewayIdEnv(opts: {
  readonly envVarValue?: Readonly<string>;
}): string {
  if (!opts || !opts.envVarValue) {
    return uuidv4();
  }
  console.log("env.SATP_GATEWAY_ID exists");
  if (typeof opts.envVarValue !== "string") {
    throw new TypeError(
      `Invalid env.SATP_GATEWAY_ID: ${opts.envVarValue}. Expected a string`,
    );
  }
  console.log("env.SATP_GATEWAY_ID is a string");
  return opts.envVarValue;
}
