import { execSync } from "child_process";

import {
  CrossChainModel,
  CrossChainModelType,
} from "../models/crosschain-model";
import path from "path";

export function checkConformance(
  file1: string,
  file2: string,
): string | undefined {
  const converterCSV = path.join(__dirname, "ccmodel_converter_csv.py");
  const converterJSON = path.join(__dirname, "ccmodel_converter_json.py");

  let command: string;
  if (file1.endsWith(".csv")) {
    command = `python3 ${converterCSV} ${file1} ${file2}`;
  } else if (file1.endsWith(".json")) {
    command = `python3 ${converterJSON} ${file1} ${file2}`;
  } else {
    return "failed";
  }

  try {
    const output = execSync(command, { encoding: "utf-8" });
    console.log("Command output:", output);
    return output;
  } catch (error) {
    console.error("Error executing ccmodel_converter_csv.py:", error);
    throw error;
  }
}

export function parseMP4PYOutput(output: string | undefined): string {
  // parse and return the output?

  // if it starts with file does not exist throw an error
  if (!output) {
    return "failed";
  }
  const parsedOutput = output;
  return parsedOutput;
}

export function ProcessModelToccModel(modelString: string): CrossChainModel {
  // parse output to create ccmodel?
  modelString = parseMP4PYOutput(modelString);
  return new CrossChainModel();
}

export function ccModelToProcessModel(model: CrossChainModel): string {
  if (!model.ccModelType) {
    return "failed";
  }

  if (model.ccModelType == CrossChainModelType.DirectFollowGraph) {
    // call pm4py to make DirectFollowGraph
  } else if (model.ccModelType == CrossChainModelType.ProcessTree) {
    // call pm4py to make ProcessTree
  } else if (model.ccModelType == CrossChainModelType.HeuristicMiner) {
    // call pm4py to make HeuristicMiner
  } else {
    //throw error?
  }
  return "change later";
}
