export function validateSatpKey(
  opts: {
    readonly configValue: unknown;
  },
  key: string,
): string {
  if (!opts || !opts.configValue) {
    return "";
  }

  if (typeof opts.configValue !== "string") {
    throw new TypeError(
      `Invalid ${key}: ${JSON.stringify(opts.configValue)}. Expected a strings.`,
    );
  }
  return opts.configValue;
}
