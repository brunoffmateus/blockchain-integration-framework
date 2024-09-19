import { ValidatorOptions } from "class-validator";

interface ValidationError {
  target?: boolean;
  value?: boolean;
}

// Type guard for strings[]
function isStringArray(input: unknown): input is string[] {
  return (
    Array.isArray(input) && input.every((item) => typeof item === "string")
  );
}

// Type guard for ValidationError
function isValidationError(obj: unknown): obj is ValidationError {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }

  const objRecord = obj as Record<string, unknown>;
  return (
    (!("target" in obj) || typeof objRecord.target === "boolean") &&
    (!("value" in obj) || typeof objRecord.value === "boolean")
  );
}

// Type guard for ValidatorOptions
function isValidatorOptions(obj: unknown): obj is ValidatorOptions {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }

  const objRecord = obj as Record<string, unknown>;

  return (
    (!("enableDebugMessages" in obj) ||
      typeof objRecord.enableDebugMessages === "boolean") &&
    (!("skipUndefinedProperties" in obj) ||
      typeof objRecord.skipUndefinedProperties === "boolean") &&
    (!("skipNullProperties" in obj) ||
      typeof objRecord.skipNullProperties === "boolean") &&
    (!("skipMissingProperties" in obj) ||
      typeof objRecord.skipMissingProperties === "boolean") &&
    (!("whitelist" in obj) || typeof objRecord.whitelist === "boolean") &&
    (!("forbidNonWhitelisted" in obj) ||
      typeof objRecord.forbidNonWhitelisted === "boolean") &&
    (!("groups" in obj) || isStringArray(objRecord.groups)) &&
    (!("always" in obj) || typeof objRecord.always === "boolean") &&
    (!("strictGroups" in obj) || typeof objRecord.strictGroups === "boolean") &&
    (!("dismissDefaultMessages" in obj) ||
      typeof objRecord.dismissDefaultMessages === "boolean") &&
    (!("validationError" in obj) ||
      isValidationError(objRecord.validationError)) &&
    (!("forbidUnknownValues" in obj) ||
      typeof objRecord.forbidUnknownValues === "boolean") &&
    (!("stopAtFirstError" in obj) ||
      typeof objRecord.stopAtFirstError === "boolean")
  );
}

export function parseSatpValidationOptionsEnv(opts: {
  readonly envVarValue?: Readonly<string>;
}): ValidatorOptions {
  if (!opts || !opts.envVarValue || typeof opts.envVarValue !== "string") {
    return {};
  }

  let pojo: unknown;
  try {
    pojo = JSON.parse(opts.envVarValue);
  } catch (error) {
    throw new Error(`Invalid JSON in env.SATP_VALIDATION_OPTIONS: ${error}`);
  }

  if (!isValidatorOptions(pojo)) {
    throw new TypeError(
      "Invalid env.SATP_VALIDATION_OPTIONS: " + opts.envVarValue,
    );
  }

  return pojo;
}
