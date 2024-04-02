import test, { Test } from "tape-promise/tape";
import { LogLevelDesc, LoggerProvider } from "@hyperledger/cactus-common";
import { pruneDockerAllIfGithubAction } from "@hyperledger/cactus-test-tooling";
import { IPluginCcTxVisualizationOptions } from "../../../main/typescript";
import { CcTxVisualization } from "../../../main/typescript/plugin-cc-tx-visualization";
import { CrossChainModelType } from "../../../main/typescript/models/crosschain-model";
import { randomUUID } from "crypto";
import {
  FabricContractInvocationType,
  RunTxReqWithTxId,
} from "@hyperledger/cactus-plugin-ledger-connector-fabric";
import { RunTransactionV1Exchange } from "@hyperledger/cactus-plugin-ledger-connector-besu";
import { ReplaySubject } from "rxjs";

const testCase = "dummy-baseline-invalid";
const logLevel: LogLevelDesc = "TRACE";

const log = LoggerProvider.getOrCreate({
  level: logLevel,
  label: "cctxviz-dummy-demo",
});

test("BEFORE " + testCase, async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning didn't throw OK");
  t.end();
});

test(testCase, async (t: Test) => {
  const setupInfraTime = new Date();
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
    t.comment("shutdown starts");
    await cctxViz.shutdown();
    log.debug("running process exit");
    process.exit(0);
  };
  test.onFinish(tearDown);

  // Initialize our plugin
  const cctxViz = new CcTxVisualization(cctxvizOptions);
  cctxViz.setCaseId("INVALID_FABRIC_BESU");

  const setupInfraTimeEnd = new Date();
  log.debug(
    `EVAL-testFile-SETUP-INFRA:${
      setupInfraTimeEnd.getTime() - setupInfraTime.getTime()
    }`,
  );
  t.ok(cctxViz);
  t.comment("cctxviz plugin is ok");

  t.assert(cctxViz.numberUnprocessedReceipts === 0);
  t.assert(cctxViz.numberEventsLog === 0);

  const currentTime = new Date();

  const timeStartPollReceipts = currentTime;
  t.comment("start monitoring transactions");
  cctxViz.monitorTransactions();

  const numberOfCases = 2;
  let caseNumber = 1;

  t.comment(
    `Simulating ${caseNumber * 6} transactions across ${numberOfCases} cases`,
  );

  const timeStartSimulateTxs = new Date();

  // Simulates the RunTxReqWithTxId instanciation that occurs in Fabric transactions
  while (numberOfCases >= caseNumber) {
    cctxViz.setCaseId("INVALID_FABRIC_BESU_" + caseNumber);

    const txSim1: RunTxReqWithTxId = {
      request: {
        signingCredential: {
          keychainId: "keychainId",
          keychainRef: "A",
        },
        channelName: "channelName",
        contractName: "contractName",
        invocationType: FabricContractInvocationType.Send,
        methodName: "InitializeAsset",
        params: ["asset1", "100"],
      },
      transactionId: "txID1_" + caseNumber,
      timestamp: currentTime,
    };
    fabricReplaySubject.next(txSim1);
    console.log(txSim1);

    // BAD ORDER MINT BEFORE LOCK
    const txSim3: RunTxReqWithTxId = {
      request: {
        signingCredential: {
          keychainId: "keychainId",
          keychainRef: "A",
        },
        channelName: "channelName",
        contractName: "contractName",
        invocationType: FabricContractInvocationType.Send,
        methodName: "CreateAsset",
        params: ["asset1", "100"],
      },
      transactionId: "txID3_" + caseNumber,
      timestamp: new Date(currentTime.getTime() + 2),
    };
    fabricReplaySubject.next(txSim3);
    console.log(txSim3);

    const txSim2: RunTxReqWithTxId = {
      request: {
        signingCredential: {
          keychainId: "keychainId",
          keychainRef: "A",
        },
        channelName: "channelName",
        contractName: "contractName",
        invocationType: FabricContractInvocationType.Send,
        methodName: "LockAsset",
        params: ["asset1"],
      },
      transactionId: "txID2_" + caseNumber,
      timestamp: new Date(currentTime.getTime() + 3),
    };
    fabricReplaySubject.next(txSim2);
    console.log(txSim2);

    const txSim4: RunTxReqWithTxId = {
      request: {
        signingCredential: {
          keychainId: "keychainId",
          keychainRef: "A",
        },
        channelName: "channelName",
        contractName: "contractName",
        invocationType: FabricContractInvocationType.Send,
        methodName: "TransferAsset",
        params: ["asset1", "targetAccount"],
      },
      transactionId: "txID4_" + caseNumber,
      timestamp: new Date(currentTime.getTime() + 4),
    };
    fabricReplaySubject.next(txSim4);
    console.log(txSim4);

    const txSim5: RunTxReqWithTxId = {
      request: {
        signingCredential: {
          keychainId: "keychainId",
          keychainRef: "A",
        },
        channelName: "channelName",
        contractName: "contractName",
        invocationType: FabricContractInvocationType.Send,
        methodName: "TransferAsset",
        params: ["asset1", "targetAccount2"],
      },
      transactionId: "txID5_" + caseNumber,
      timestamp: new Date(currentTime.getTime() + 5),
    };
    fabricReplaySubject.next(txSim5);
    console.log(txSim5);

    const txSim6: RunTxReqWithTxId = {
      request: {
        signingCredential: {
          keychainId: "keychainId",
          keychainRef: "A",
        },
        channelName: "channelName",
        contractName: "contractName",
        invocationType: FabricContractInvocationType.Send,
        methodName: "DeleteAsset",
        params: ["asset1"],
      },
      transactionId: "txID6_" + caseNumber,
      timestamp: new Date(currentTime.getTime() + 6),
    };
    fabricReplaySubject.next(txSim6);
    console.log(txSim6);

    caseNumber++;
  }

  const endTimeSimulateTxs = new Date();
  t.comment(
    `EVAL-testFile-SIMULATE-TRANSACTIONS:${
      endTimeSimulateTxs.getTime() - timeStartSimulateTxs.getTime()
    }`,
  );

  const endTimePollReceipts = new Date();
  const totalTimePoll =
    endTimePollReceipts.getTime() - timeStartPollReceipts.getTime();
  t.comment(`EVAL-testFile-POLL:${totalTimePoll}`);

  const postSimulationPollingDuration =
    endTimePollReceipts.getTime() - endTimeSimulateTxs.getTime();
  t.comment(`EVAL-testFile-POST-SIM-POLL:${postSimulationPollingDuration}`);

  const nrTxs = 6 * numberOfCases;
  t.assert(cctxViz.numberEventsLog === 0);
  t.assert(cctxViz.numberUnprocessedReceipts === nrTxs);

  await cctxViz.txReceiptToCrossChainEventLogEntry();

  t.assert(cctxViz.numberEventsLog === nrTxs);
  t.assert(cctxViz.numberUnprocessedReceipts === 0);

  const logNameCsv = await cctxViz.persistCrossChainLogCsv(
    "dummy-use-case-invalid",
  );

  const logNameJson = await cctxViz.persistCrossChainLogJson(
    "dummy-use-case-invalid",
  );

  const startTimeAggregate = new Date();
  await cctxViz.aggregateCcTx();
  const endTimeAggregate = new Date();
  t.comment(
    `EVAL-testFile-AGGREGATE-CCTX:${
      endTimeAggregate.getTime() - startTimeAggregate.getTime()
    }`,
  );

  const map =
    "{'registerEmission': (node:registerEmission connections:{registerEmission:[0.6666666666666666], getEmissions:[0.6666666666666666]}), 'getEmissions': (node:getEmissions connections:{mintEmissionToken:[0.6666666666666666]}), 'mintEmissionToken': (node:mintEmissionToken connections:{})}";
  // Persist heuristic map that is generated from the script that takes this input
  await cctxViz.saveModel(CrossChainModelType.HeuristicMiner, map);
  const savedModel = await cctxViz.getModel(CrossChainModelType.HeuristicMiner);
  t.assert(map === savedModel);

  console.log(logNameCsv);
  t.ok(logNameCsv);

  console.log(logNameJson);
  t.ok(logNameJson);

  t.end();
});
