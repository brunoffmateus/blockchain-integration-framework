import { GatewayIdentity } from "../core/types";
import { isAddress } from "./parseSatpGatewayAddress";
import { isPrivacyDraftVersionsArray } from "./parseSatpGatewayVersion";
import { isSupportedChain } from "./parseSatpSupportedDLTs";

// Type guard for GatewayIdentity
export function isGatewayIdentity(obj: unknown): obj is GatewayIdentity {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "id" in obj &&
    typeof (obj as Record<string, unknown>).id === "string" &&
    "version" in obj &&
    isPrivacyDraftVersionsArray((obj as Record<string, unknown>).version) &&
    "supportedDLTs" in obj &&
    isSupportedChain((obj as Record<string, unknown>).supportedDLTs) &&
    (("pubKey" in obj &&
      typeof (obj as Record<string, unknown>).pubKey === "string") ||
      !("pubKey" in obj)) &&
    (("name" in obj &&
      typeof (obj as Record<string, unknown>).name === "string") ||
      !("name" in obj)) &&
    (("proofID" in obj &&
      typeof (obj as Record<string, unknown>).proofID === "string") ||
      !("proofID" in obj)) &&
    (("gatewayServerPort" in obj &&
      typeof (obj as Record<string, unknown>).gatewayServerPort === "number") ||
      !("gatewayServerPort" in obj)) &&
    (("gatewayClientPort" in obj &&
      typeof (obj as Record<string, unknown>).gatewayClientPort === "number") ||
      !("gatewayClientPort" in obj)) &&
    (("gatewayOpenAPIPort" in obj &&
      typeof (obj as Record<string, unknown>).gatewayOpenAPIPort ===
        "number") ||
      !("gatewayOpenAPIPort" in obj)) &&
    (("gatewayUIPort" in obj &&
      typeof (obj as Record<string, unknown>).gatewayUIPort === "number") ||
      !("gatewayUIPort" in obj)) &&
    (("address" in obj &&
      isAddress((obj as Record<string, unknown>).address)) ||
      !("address" in obj))
  );
}

// Type guard for an array of GatewayIdentity
export function isGatewayIdentityArray(
  input: unknown,
): input is Array<GatewayIdentity> {
  return Array.isArray(input) && input.every(isGatewayIdentity);
}

export function parseSatpCounterPartyGatewaysEnv(opts: {
  readonly envVarValue?: Readonly<string>;
}): GatewayIdentity[] {
  if (!opts || !opts.envVarValue || typeof opts.envVarValue !== "string") {
    return [];
  }

  let pojo: unknown;
  try {
    pojo = JSON.parse(opts.envVarValue);
  } catch (error) {
    throw new Error(
      `Invalid JSON in env.SATP_COUNTER_PARTY_GATEWAYS: ${error}`,
    );
  }

  if (!isGatewayIdentityArray(pojo)) {
    throw new TypeError(
      "Invalid env.SATP_COUNTER_PARTY_GATEWAYS: " + opts.envVarValue,
    );
  }
  return pojo;
}
