import { LogLevelDesc } from "@hyperledger/cactus-common";

// Type guard for LogLevelDesc
function isLogLevelDesc(input: unknown): input is LogLevelDesc {
  if (typeof input === "number") {
    return input >= 0 && input <= 5;
  }

  if (typeof input === "string") {
    const normalizedInput = input.toUpperCase();
    return ["TRACE", "DEBUG", "INFO", "WARN", "ERROR", "SILENT"].includes(
      normalizedInput,
    );
  }
  return false;
}

export function parseSatpLogLevelEnv(opts: {
  readonly envVarValue?: Readonly<string>;
}): LogLevelDesc {
  if (!opts || !opts.envVarValue || typeof opts.envVarValue !== "string") {
    return "DEBUG";
  }

  let pojo: unknown;
  try {
    pojo = JSON.parse(opts.envVarValue);
  } catch (error) {
    throw new Error(`Invalid JSON in env.SATP_LOG_LEVEL: ${error}`);
  }

  if (!isLogLevelDesc(pojo)) {
    throw new TypeError(
      `Invalid env.SATP_LOG_LEVEL: ${opts.envVarValue}. Expected a string`,
    );
  }
  return pojo;
}
