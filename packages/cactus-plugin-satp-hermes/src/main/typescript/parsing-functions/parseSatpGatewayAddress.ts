import { Address } from "../core/types";

export function isAddress(input: unknown): input is Address {
  if (typeof input !== "string") {
    return false;
  }

  if (input.startsWith("http://") || input.startsWith("https://")) {
    return true;
  }

  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Pattern.test(input)) {
    const octets = input.split(".").map(Number);
    return octets.every((octet) => octet >= 0 && octet <= 255);
  }
  return false;
}

export function parseSatpGatewayAddressEnv(opts: {
  readonly envVarValue?: Readonly<string>;
}): Address {
  if (!opts || !opts.envVarValue || typeof opts.envVarValue !== "string") {
    return "http://localhost";
  }

  let pojo: unknown;
  try {
    pojo = JSON.parse(opts.envVarValue) as unknown;
  } catch (error) {
    throw new Error(`Invalid JSON in env.SATP_GATEWAY_ADDRESS: ${error}`);
  }

  if (!isAddress(pojo)) {
    throw new TypeError(
      `Invalid address: env.SATP_GATEWAY_ADDRESS: ${opts.envVarValue}. Expected an Adress with format:` +
        `"http://<domain>", "https://<domain>", or a valid IPv4 address (e.g., "192.168.0.1").`,
    );
  }
  return pojo;
}
