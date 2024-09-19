import { v4 as uuidv4 } from "uuid";

export function parseSatpPrivateKeyEnv(opts: {
  readonly envVarValue?: Readonly<string>;
}): string {
  if (!opts || !opts.envVarValue || typeof opts.envVarValue !== "string") {
    return uuidv4();
  }

  let pojo: unknown;
  try {
    pojo = JSON.parse(opts.envVarValue);
  } catch (error) {
    throw new Error(`Invalid JSON in env.SATP_PRIVATE_KEY: ${error}`);
  }

  if (typeof pojo !== "string") {
    throw new TypeError(
      `Invalid env.SATP_PRIVATE_KEY: ${opts.envVarValue}. Expected a string`,
    );
  }

  return pojo;
}
