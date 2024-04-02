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

const testCase = "basic transaction";
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

  // Initialize cctxViz
  t.comment("initialize cctxViz");
  const cctxViz = new CcTxVisualization(cctxvizOptions);
  cctxViz.setCaseId("basic-TEST");
  t.ok(cctxViz);
  t.comment("cctxviz plugin is ok");

  t.assert(cctxViz.numberUnprocessedReceipts === 0);
  t.assert(cctxViz.numberEventsLog === 0);

  t.comment("start monitoring transactions");
  cctxViz.monitorTransactions("Fabric");

  // Simulates one transaction
  const runTxReq1: RunTxReqWithTxId = {
    request: {
      signingCredential: {
        keychainId: "keychainId",
        keychainRef: "person 1",
      },
      channelName: "channelName",
      contractName: "contractName",
      invocationType: FabricContractInvocationType.Send,
      methodName: "methodName",
      params: ["0", "2"],
    },
    transactionId: "txID1",
    timestamp: new Date(),
  };
  console.log(runTxReq1);
  t.comment("transactions done");

  t.assert(cctxViz.numberEventsLog === 0);
  t.assert(cctxViz.numberUnprocessedReceipts === 1); // fails - receipts are not being received by subscribers
  console.log(cctxViz.numberUnprocessedReceipts);

  await cctxViz.txReceiptToCrossChainEventLogEntry();

  t.assert(cctxViz.numberEventsLog === 1);
  t.assert(cctxViz.numberUnprocessedReceipts === 0);

  t.end(); // doesn't end
});
