import test, { Test } from "tape-promise/tape";
import { LogLevelDesc } from "@hyperledger/cactus-common";
import { pruneDockerAllIfGithubAction } from "@hyperledger/cactus-test-tooling";
import { IPluginCcTxVisualizationOptions } from "../../../main/typescript";
import { CcTxVisualization } from "../../../main/typescript/plugin-cc-tx-visualization";
import { randomUUID } from "crypto";
import { RunTxReqWithTxId } from "@hyperledger/cactus-plugin-ledger-connector-fabric";
import { ReplaySubject } from "rxjs";
import { RunTransactionV1Exchange } from "@hyperledger/cactus-plugin-ledger-connector-besu";
import path from "path";
import fs from "fs";

const testCase = "loads cross-chain event log from a CSV file";
const logLevel: LogLevelDesc = "TRACE";
const outputFileName = "cceventLog-output";

test("BEFORE " + testCase, async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning didn't throw OK");
  t.end();
});

test(testCase, async (t: Test) => {
  const fabricReplaySubject: ReplaySubject<RunTxReqWithTxId> =
    new ReplaySubject();
  const besuReplaySubject: ReplaySubject<RunTransactionV1Exchange> =
    new ReplaySubject();

  const ccTxvizOptions: IPluginCcTxVisualizationOptions = {
    instanceId: randomUUID(),
    logLevel: logLevel,
    fabricTxObservable: fabricReplaySubject.asObservable(),
    besuTxObservable: besuReplaySubject.asObservable(),
  };

  const tearDown = async () => {
    await pruneDockerAllIfGithubAction({ logLevel });
  };
  test.onFinish(tearDown);

  // Initialize ccTxViz
  t.comment("initialize ccTxViz");
  const ccTxVizCsv = new CcTxVisualization(ccTxvizOptions);
  const ccTxVizJson = new CcTxVisualization(ccTxvizOptions);
  ccTxVizCsv.setCaseId("TEST");
  ccTxVizJson.setCaseId("TEST");
  t.ok(ccTxVizCsv);
  t.comment("ccTxVizCsv plugin is ok");
  t.ok(ccTxVizJson);
  t.comment("ccTxVizJson plugin is ok");

  /**
   * Load from CSV file
   */
  t.assert(ccTxVizCsv.numberUnprocessedReceipts === 0);
  t.assert(ccTxVizCsv.numberEventsLog === 0);

  const inputFilePathCsv = path.join(
    __dirname,
    "../../csv/cceventLog-input.csv",
  );
  ccTxVizCsv.createCrossChainModelFromCsvFile(inputFilePathCsv);
  const logNameCsv = await ccTxVizCsv.persistCrossChainLogCsv(outputFileName);

  console.log(logNameCsv);
  t.ok(logNameCsv);

  // now has the same number of cross-chain event as cceventLog-input.csv
  t.assert(ccTxVizCsv.numberEventsLog === 1);

  /**
   * Load from JSON file
   */
  t.assert(ccTxVizJson.numberUnprocessedReceipts === 0);
  t.assert(ccTxVizJson.numberEventsLog === 0);

  const inputFilePathJson = path.join(
    __dirname,
    "../../json/cceventLog-input.json",
  );
  ccTxVizJson.createCrossChainModelFromJsonFile(inputFilePathJson);
  const logNameJson =
    await ccTxVizJson.persistCrossChainLogJson(outputFileName);

  console.log(logNameJson);
  t.ok(logNameJson);

  // now has the same number of cross-chain event as cceventLog-input.json
  t.assert(ccTxVizJson.numberEventsLog === 1);

  /**
   * Compare input and output files
   */

  await new Promise((resolve) => setTimeout(resolve, 1000));

  const outputFilePathCsv = path.join(
    __dirname,
    "../../csv/" + outputFileName + ".csv",
  );
  try {
    const inputContentsCsv = fs.readFileSync(inputFilePathCsv, "utf-8");
    const outputContentsCsv = fs.readFileSync(outputFilePathCsv, "utf-8");

    // compare input and output file contents
    t.equal(
      inputContentsCsv,
      outputContentsCsv,
      "Cross-chain event log correctly loaded from CSV file",
    );
  } catch (error) {
    t.fail(`Error reading and comparing CSV files: ${error}`);
  }

  const outputFilePathJson = path.join(
    __dirname,
    "../../json/" + outputFileName + ".json",
  );
  try {
    const inputContentsJson = fs.readFileSync(inputFilePathJson, "utf-8");
    const outputContentsJson = fs.readFileSync(outputFilePathJson, "utf-8");

    // compare input and output file contents
    t.equal(
      inputContentsJson,
      outputContentsJson,
      "Cross-chain event log correctly loaded from JSON file",
    );
  } catch (error) {
    t.fail(`Error reading and comparing JSON files: ${error}`);
  }

  t.end();
});
