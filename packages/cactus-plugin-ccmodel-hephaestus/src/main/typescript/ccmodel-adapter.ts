import { execSync } from "child_process";

import path from "path";

export enum ProcessMiningAlgorithm {
  Alpha,
  Heuristics,
  Inductive,
}

export function createModelPM4PY(
  logPath: string,
  miningAlgorithm: ProcessMiningAlgorithm,
): string {
  const createModelScript = path.join(__dirname, "../python/create_model.py");
  let command = `python3 ${createModelScript} ${logPath}`;

  try {
    switch (miningAlgorithm) {
      case ProcessMiningAlgorithm.Alpha:
        command += " alpha";
        break;
      case ProcessMiningAlgorithm.Heuristics:
        command += " heuristics";
        break;
      case ProcessMiningAlgorithm.Inductive:
        command += " inductive";
        break;
      default:
        throw new Error("Unsupported mining algorithm");
    }

    console.log("COMMAND: " + command);

    const startTime = new Date();
    const serializedCCModel = execSync(command).toString("utf-8");
    const finalTime = new Date();
    console.log(
      `CREATE-MODEL-PM4PY:${finalTime.getTime() - startTime.getTime()}`,
    );
    return serializedCCModel;
  } catch (error) {
    console.error(`Error executing ${command}:`, error);
    throw error;
  }
}

export function checkConformancePM4PY(
  logPath: string,
  serializedCCModel: string,
): string {
  const checkConformanceScript = path.join(
    __dirname,
    "../python/check_conformance.py",
  );
  const command = `python3 ${checkConformanceScript} ${logPath} \'${serializedCCModel}\'`;

  // console.log(command);
  try {
    const checkOutput = execSync(command).toString("utf-8");
    return checkOutput;
  } catch (error) {
    console.error(`Error executing ${command}:`, error);
    throw error;
  }
}
