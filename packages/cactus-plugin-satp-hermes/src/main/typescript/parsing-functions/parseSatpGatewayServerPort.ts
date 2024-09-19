import { DEFAULT_PORT_GATEWAY_SERVER } from "../core/constants";

export function parseSatpGatewayServerPortEnv(opts: {
  readonly envVarValue?: Readonly<string>;
}): number {
  if (!opts || !opts.envVarValue || typeof opts.envVarValue !== "string") {
    return DEFAULT_PORT_GATEWAY_SERVER;
  }

  let pojo: unknown;
  try {
    pojo = JSON.parse(opts.envVarValue);
  } catch (error) {
    throw new Error(`Invalid JSON in env.SATP_GATEWAY_SERVER_PORT: ${error}`);
  }

  if (
    typeof pojo !== "number" ||
    !Number.isInteger(pojo) ||
    pojo < 0 ||
    pojo > 65535
  ) {
    throw new TypeError(
      `Invalid env.SATP_GATEWAY_SERVER_PORT: ${opts.envVarValue}. Expected an integer between 0 and 65535`,
    );
  }

  return pojo;
}
