import { SupportedChain } from "../core/types";

// Type guard for SupportedChain
export function isSupportedChain(obj: unknown): obj is SupportedChain {
  return (
    typeof obj === "string" &&
    obj !== null &&
    Object.values(SupportedChain).includes(obj as SupportedChain)
  );
}

// Type guard for an array of SupportedChain
export function isSupportedChainArray(
  input: unknown,
): input is Array<SupportedChain> {
  return Array.isArray(input) && input.every(isSupportedChain);
}

export function parseSatpSupportedDLTsEnv(opts: {
  readonly envVarValue?: Readonly<string>;
}): SupportedChain[] {
  if (!opts || !opts.envVarValue || typeof opts.envVarValue !== "string") {
    return [];
  }

  let pojo: unknown;
  try {
    pojo = JSON.parse(opts.envVarValue);
  } catch (error) {
    throw new Error(`Invalid JSON in env.SATP_SUPPORTED_DLTS: ${error}`);
  }

  if (!isSupportedChainArray(pojo)) {
    throw new TypeError("Invalid env.SATP_SUPPORTED_DLTS: " + opts.envVarValue);
  }

  return pojo;
}
