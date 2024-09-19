export function parseSatpEnvironmentEnv(opts: {
  readonly envVarValue?: Readonly<string>;
}): "development" | "production" {
  if (!opts || !opts.envVarValue || typeof opts.envVarValue !== "string") {
    return "development";
  }

  let pojo: unknown;
  try {
    pojo = JSON.parse(opts.envVarValue) as unknown;
  } catch (error) {
    throw new Error(`Invalid JSON in env.SATP_NODE_ENV: ${error}`);
  }

  if (pojo !== "development" && pojo !== "production") {
    throw new TypeError(
      `Invalid env.SATP_NODE_ENV: ${opts.envVarValue}. Expected "development" or "production"`,
    );
  }
  return pojo;
}
