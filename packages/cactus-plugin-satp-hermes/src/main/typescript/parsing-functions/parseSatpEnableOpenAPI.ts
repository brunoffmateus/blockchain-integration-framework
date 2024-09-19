export function parseSatpEnableOpenAPIEnv(opts: {
  readonly envVarValue?: Readonly<string>;
}): boolean {
  if (!opts || !opts.envVarValue || typeof opts.envVarValue !== "string") {
    return false;
  }

  let pojo: unknown;
  try {
    pojo = JSON.parse(opts.envVarValue) as unknown;
  } catch (error) {
    throw new Error(`Invalid JSON in env.SATP_ENABLE_OPEN_API: ${error}`);
  }

  if (pojo !== "true" && pojo !== "false") {
    throw new TypeError(
      `Invalid env.SATP_ENABLE_OPEN_API: ${opts.envVarValue}. Expected "true" or "false"`,
    );
  }
  return pojo === "true";
}
