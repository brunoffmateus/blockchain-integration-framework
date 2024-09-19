import {
  IMergePolicyValue,
  isMergePolicyValueArray,
} from "@hyperledger/cactus-plugin-bungee-hermes/dist/lib/main/typescript/view-merging/merge-policies";

export function parseSatpMergePoliciesEnv(opts: {
  readonly envVarValue?: Readonly<string>;
}): Array<IMergePolicyValue> {
  if (!opts || !opts.envVarValue || typeof opts.envVarValue !== "string") {
    return [];
  }

  let pojo: unknown;
  try {
    pojo = JSON.parse(opts.envVarValue) as unknown;
  } catch (error) {
    throw new Error(`Invalid JSON in env.SATP_MERGE_POLICIES: ${error}`);
  }

  // now we have to ensure that pojo is indeed an Array<IMergePolicyValue>
  if (!isMergePolicyValueArray(pojo)) {
    throw new TypeError("Invalid env.SATP_MERGE_POLICIES: " + opts.envVarValue);
  }
  return pojo;
}
