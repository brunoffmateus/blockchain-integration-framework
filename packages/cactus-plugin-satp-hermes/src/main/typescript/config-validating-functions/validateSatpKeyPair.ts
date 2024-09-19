import {
  ISignerKeyPairs,
  Secp256k1Keys,
} from "@hyperledger/cactus-common/src/main/typescript/signer-key-pairs";

// Type guard for the input object structure
function isKeyPairInput(
  obj: unknown,
): obj is { privateKey: string; publicKey: string } {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "privateKey" in obj &&
    typeof (obj as Record<string, unknown>).privateKey === "string" &&
    "publicKey" in obj &&
    typeof (obj as Record<string, unknown>).publicKey === "string"
  );
}

export function validateSatpKeyPair(opts: {
  readonly configValue: unknown;
}): ISignerKeyPairs {
  if (!opts || !opts.configValue) {
    Secp256k1Keys.generateKeyPairsBuffer();
  }

  if (!isKeyPairInput(opts.configValue)) {
    throw new TypeError(
      `Invalid config.keyPair: ${JSON.stringify(opts.configValue)}. Expected object with privateKey and publicKey as strings.`,
    );
  }
  return {
    privateKey: Buffer.from(opts.configValue.privateKey, "hex"),
    publicKey: Buffer.from(opts.configValue.publicKey, "hex"),
  };
}
