import {
  IPrivacyPolicyValue,
  isPrivacyPolicyValueArray,
} from "@hyperledger/cactus-plugin-bungee-hermes/dist/lib/main/typescript/view-creation/privacy-policies";

export function parseSatpPrivacyPoliciesEnv(opts: {
  readonly envVarValue?: Readonly<string>;
}): Array<IPrivacyPolicyValue> {
  if (!opts || !opts.envVarValue || typeof opts.envVarValue !== "string") {
    return [];
  }

  let pojo: unknown;
  try {
    pojo = JSON.parse(opts.envVarValue) as unknown;
  } catch (error) {
    throw new Error(`Invalid JSON in env.SATP_PRIVACY_POLICIES: ${error}`);
  }

  if (!isPrivacyPolicyValueArray(pojo)) {
    throw new TypeError(
      "Invalid env.SATP_PRIVACY_POLICIES: " + opts.envVarValue,
    );
  }
  return pojo;
}
