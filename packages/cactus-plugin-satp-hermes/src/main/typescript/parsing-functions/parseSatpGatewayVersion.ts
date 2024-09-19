import { SATP_VERSION } from "../core/constants";
import { CurrentDrafts, DraftVersions } from "../core/types";

// Type guard for DraftVersions
export function isDraftVersions(obj: unknown): obj is DraftVersions {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }

  const objRecord = obj as Record<string, unknown>;

  return Object.values(CurrentDrafts).every(
    (draft) => typeof objRecord[draft] === "string",
  );
}

// Type guard for an array of DraftVersions
export function isPrivacyDraftVersionsArray(
  input: unknown,
): input is Array<DraftVersions> {
  return Array.isArray(input) && input.every(isDraftVersions);
}

export function parseSatpGatewayVersionEnv(opts: {
  readonly envVarValue?: Readonly<string>;
}): Array<DraftVersions> {
  if (!opts || !opts.envVarValue || typeof opts.envVarValue !== "string") {
    return [
      { Core: SATP_VERSION, Architecture: SATP_VERSION, Crash: SATP_VERSION },
    ];
  }

  let pojo: unknown;
  try {
    pojo = JSON.parse(opts.envVarValue) as unknown;
  } catch (error) {
    throw new Error(`Invalid JSON in env.SATP_GATEWAY_VERSION: ${error}`);
  }

  if (!isPrivacyDraftVersionsArray(pojo)) {
    throw new TypeError(
      "Invalid env.SATP_GATEWAY_VERSION: " + opts.envVarValue,
    );
  }
  return pojo;
}
