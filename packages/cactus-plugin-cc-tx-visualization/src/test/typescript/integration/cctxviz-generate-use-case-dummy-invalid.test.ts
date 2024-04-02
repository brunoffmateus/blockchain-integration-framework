import test, { Test } from "tape-promise/tape";
import {
  IListenOptions,
  LogLevelDesc,
  LoggerProvider,
  Servers,
} from "@hyperledger/cactus-common";
import { pruneDockerAllIfGithubAction } from "@hyperledger/cactus-test-tooling";
import { IPluginCcTxVisualizationOptions } from "../../../main/typescript";
import { CcTxVisualization } from "../../../main/typescript/plugin-cc-tx-visualization";
import { randomUUID } from "crypto";
import {
  FabricContractInvocationType,
  RunTxReqWithTxId,
} from "@hyperledger/cactus-plugin-ledger-connector-fabric";
import { AddressInfo } from "net";
import bodyParser from "body-parser";
import express from "express";
import http from "http";

const testCase = "dummy-baseline-invalid";
const logLevel: LogLevelDesc = "TRACE";

const log = LoggerProvider.getOrCreate({
  level: logLevel,
  label: "cctxviz-dummy-demo",
});

const expressApp = express();
expressApp.use(bodyParser.json({ limit: "250mb" }));
const serverFabric = http.createServer(expressApp);
const serverBesu = http.createServer(expressApp);

test("BEFORE " + testCase, async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning didn't throw OK");
  t.end();
});

test(testCase, async (t: Test) => {
  const setupInfraTime = new Date();
  const listenOptionsFabric: IListenOptions = {
    hostname: "localhost",
    port: 0,
    server: serverFabric,
  };
  const listenOptionsBesu: IListenOptions = {
    hostname: "localhost",
    port: 0,
    server: serverBesu,
  };
  const addressInfoFabric = (await Servers.listen(
    listenOptionsFabric,
  )) as AddressInfo;
  const { port: portFabric } = addressInfoFabric;
  const addressInfoBesu = (await Servers.listen(
    listenOptionsBesu,
  )) as AddressInfo;
  const { port: portBesu } = addressInfoBesu;
  const apiUrlFabric = `http://localhost:${portFabric}`;
  const apiUrlBesu = `http://localhost:${portBesu}`;

  const cctxvizOptions: IPluginCcTxVisualizationOptions = {
    instanceId: randomUUID(),
    logLevel: logLevel,
    basePathFabric: apiUrlFabric,
    basePathBesu: apiUrlBesu,
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
  cctxViz.monitorTransactions("Fabric");
  // await cctxViz.hasProcessedXMessages(6, 4);

  let caseNumber = 1;
  // t.comment(`Sending ${caseNumber * 6} messages across ${caseNumber} cases`);
  t.comment(
    `Sumulating ${caseNumber * 6} transactions across ${caseNumber} cases`,
  );

  const timeStartSimulateTxs = new Date();

  // Simulates the RunTxReqWithTxId instanciation that occurs in Fabric transactions:
  // caseID 1; register emissions; Fabric blockchain; parameters: asset 1, 100 units
  while (caseNumber > 0) {
    cctxViz.setCaseId(cctxViz.getCaseId() + "_" + caseNumber);

    const runTxReq1: RunTxReqWithTxId = {
      request: {
        signingCredential: {
          keychainId: "keychainId",
          keychainRef: "A",
        },
        channelName: "channelName",
        contractName: "contractName",
        invocationType: FabricContractInvocationType.Send,
        methodName: "createAsset",
        // Asset 1, 100 units
        params: ["asset1,5"],
      },
      transactionId: "txID1",
      timestamp: currentTime,
    };
    console.log(runTxReq1);

    // BAD ORDER MINT BEFORE LOCK
    const runTxReq3: RunTxReqWithTxId = {
      request: {
        signingCredential: {
          keychainId: "keychainId",
          keychainRef: "A",
        },
        channelName: "channelName",
        contractName: "contractName",
        invocationType: FabricContractInvocationType.Send,
        methodName: "mintAsset",
        // Asset 1, 100 units
        params: ["asset1", "Green", "19", "owner1", "9999"],
      },
      transactionId: "txID3",
      timestamp: new Date(currentTime.getTime() + 2),
    };
    console.log(runTxReq3);

    const runTxReq2: RunTxReqWithTxId = {
      request: {
        signingCredential: {
          keychainId: "keychainId",
          keychainRef: "A",
        },
        channelName: "channelName",
        contractName: "contractName",
        invocationType: FabricContractInvocationType.Send,
        methodName: "lockAsset",
        // Asset 1, 100 units
        params: ["asset1"],
      },
      transactionId: "txID2",
      timestamp: new Date(currentTime.getTime() + 3),
    };
    console.log(runTxReq2);

    const runTxReq4: RunTxReqWithTxId = {
      request: {
        signingCredential: {
          keychainId: "keychainId",
          keychainRef: "A",
        },
        channelName: "channelName",
        contractName: "contractName",
        invocationType: FabricContractInvocationType.Send,
        methodName: "transferAsset",
        // Asset 1, 100 units
        params: ["asset1", "owner2"],
      },
      transactionId: "txID4",
      timestamp: new Date(currentTime.getTime() + 4),
    };
    console.log(runTxReq4);

    const runTxReq5: RunTxReqWithTxId = {
      request: {
        signingCredential: {
          keychainId: "keychainId",
          keychainRef: "A",
        },
        channelName: "channelName",
        contractName: "contractName",
        invocationType: FabricContractInvocationType.Send,
        methodName: "transferAsset",
        // Asset 1, 100 units
        params: ["asset1", "owner1"],
      },
      transactionId: "txID5",
      timestamp: new Date(currentTime.getTime() + 5),
    };
    console.log(runTxReq5);

    const runTxReq6: RunTxReqWithTxId = {
      request: {
        signingCredential: {
          keychainId: "keychainId",
          keychainRef: "A",
        },
        channelName: "channelName",
        contractName: "contractName",
        invocationType: FabricContractInvocationType.Send,
        methodName: "BurnAsset",
        // Asset 1, 100 units
        params: ["asset1"],
      },
      transactionId: "txID6",
      timestamp: new Date(currentTime.getTime() + 6),
    };
    console.log(runTxReq6);

    caseNumber--;
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

  t.assert(cctxViz.numberEventsLog === 0);
  t.assert(cctxViz.numberUnprocessedReceipts === 6);

  await cctxViz.txReceiptToCrossChainEventLogEntry();

  t.assert(cctxViz.numberEventsLog === 6);
  t.assert(cctxViz.numberUnprocessedReceipts === 0);

  const logName = await cctxViz.persistCrossChainLogCsv(
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

  console.log(logName);
  t.ok(logName);
  t.end();
});
