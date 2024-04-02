import test, { Test } from "tape-promise/tape";
import { LogLevelDesc } from "@hyperledger/cactus-common";
import { pruneDockerAllIfGithubAction } from "@hyperledger/cactus-test-tooling";
import { IPluginCcTxVisualizationOptions } from "../../../main/typescript";
import { CcTxVisualization } from "../../../main/typescript/plugin-cc-tx-visualization";
import { randomUUID } from "crypto";
import {
  FabricContractInvocationType,
  RunTxReqWithTxId,
} from "@hyperledger/cactus-plugin-ledger-connector-fabric";
import { ReplaySubject } from "rxjs";
import { RunTransactionV1Exchange } from "@hyperledger/cactus-plugin-ledger-connector-besu";

const testCase = "persist logs";
const logLevel: LogLevelDesc = "TRACE";

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

  const cctxvizOptions: IPluginCcTxVisualizationOptions = {
    instanceId: randomUUID(),
    logLevel: logLevel,
    fabricTxObservable: fabricReplaySubject.asObservable(),
    besuTxObservable: besuReplaySubject.asObservable(),
  };

  const tearDown = async () => {
    await pruneDockerAllIfGithubAction({ logLevel });
  };
  test.onFinish(tearDown);

  // Initialize our plugin
  const cctxViz = new CcTxVisualization(cctxvizOptions);
  t.ok(cctxViz);
  t.comment("cctxviz plugin is ok");

  t.assert(cctxViz.numberUnprocessedReceipts === 0);
  t.assert(cctxViz.numberEventsLog === 0);
  cctxViz.monitorTransactions();

  cctxViz.setCaseId("caseID-TEST 1");
  const txSim1: RunTxReqWithTxId = {
    request: {
      signingCredential: {
        keychainId: "keychainId",
        keychainRef: "person 1",
      },
      channelName: "channelName",
      contractName: "contractName",
      invocationType: FabricContractInvocationType.Call,
      methodName: "methodName",
      params: ["0", "2"],
    },
    transactionId: "txID1",
    timestamp: new Date(),
  };
  fabricReplaySubject.next(txSim1);
  console.log(txSim1);

  cctxViz.setCaseId("case1");
  const txSim2: RunTxReqWithTxId = {
    request: {
      signingCredential: {
        keychainId: "keychainId",
        keychainRef: "person 1",
      },
      channelName: "channelName",
      contractName: "contractName",
      invocationType: FabricContractInvocationType.Call,
      methodName: "methodName",
      params: ["0", "2"],
    },
    transactionId: "txID2",
    timestamp: new Date(),
  };
  fabricReplaySubject.next(txSim2);
  console.log(txSim2);

  t.comment("transactions done");

  t.assert(cctxViz.numberEventsLog === 0);
  t.assert(cctxViz.numberUnprocessedReceipts === 2);

  await cctxViz.txReceiptToCrossChainEventLogEntry();

  t.assert(cctxViz.numberEventsLog === 2);
  t.assert(cctxViz.numberUnprocessedReceipts === 0);

  const logNameCsv = await cctxViz.persistCrossChainLogCsv(
    "persist-cross-chain-log",
  );
  console.log(logNameCsv);
  t.ok(logNameCsv);

  const logNameJson = await cctxViz.persistCrossChainLogJson(
    "persist-cross-chain-log",
  );
  console.log(logNameJson);
  t.ok(logNameJson);

  t.end();
});
