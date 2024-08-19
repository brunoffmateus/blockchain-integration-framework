interface keyPairJSON {
  privateKey: string;
  publicKey: string;
}

// Type guard for the keyPairJSON
export function iskeyPairJSON(obj: unknown): obj is keyPairJSON {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "privateKey" in obj &&
    typeof (obj as Record<string, unknown>).privateKey === "string" &&
    "publicKey" in obj &&
    typeof (obj as Record<string, unknown>).publicKey === "string"
  );
}

export function validateKeyPairJSON(opts: {
  readonly configValue: unknown;
}): keyPairJSON | undefined {
  if (!opts || !opts.configValue) {
    return;
  }

  if (!iskeyPairJSON(opts.configValue)) {
    throw new TypeError(
      `Invalid config.keyPair: ${JSON.stringify(opts.configValue)}. Expected a keyPair in string format.`,
    );
  }
  return opts.configValue;
}
