import test, { Test } from "tape-promise/tape";
import {
  IListenOptions,
  LogLevelDesc,
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

const testCase = "persist logs";
const logLevel: LogLevelDesc = "TRACE";

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
  console.log(cctxvizOptions.basePathFabric);
  console.log(cctxvizOptions.basePathBesu);

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
  cctxViz.monitorTransactions("Fabric");

  // Simulates the RunTxReqWithTxId instanciation that occurs in Fabric transactions:
  // caseID 1; Fabric blockchain; parameters: asset 1, 100 units
  cctxViz.setCaseId("caseID-TEST 1");
  const runTxReq1: RunTxReqWithTxId = {
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
  console.log(runTxReq1);

  cctxViz.setCaseId("case1");
  const runTxReq2: RunTxReqWithTxId = {
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
    // cost: 5,
    // revenue: 0,
  };
  console.log(runTxReq2);

  // await new Promise((resolve) => setTimeout(resolve, 1000));
  await cctxViz.txReceiptToCrossChainEventLogEntry();

  t.assert(cctxViz.numberEventsLog === 2);
  // because the second message did not have time to be send to processing before receipts were transformed into cross chain events
  t.assert(cctxViz.numberUnprocessedReceipts === 0);

  await cctxViz.txReceiptToCrossChainEventLogEntry();

  const logName = await cctxViz.persistCrossChainLogCsv();
  console.log(logName);
  t.ok(logName);
  t.end();
});
