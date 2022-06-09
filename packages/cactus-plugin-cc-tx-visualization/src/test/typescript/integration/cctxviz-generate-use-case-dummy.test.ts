import test, { Test } from "tape-promise/tape";
import { LoggerProvider, LogLevelDesc } from "@hyperledger/cactus-common";
import { RabbitMQTestServer } from "@hyperledger/cactus-test-tooling";
import { pruneDockerAllIfGithubAction } from "@hyperledger/cactus-test-tooling";
import { IPluginCcTxVisualizationOptions } from "@hyperledger/cactus-plugin-cc-tx-visualization/src/main/typescript";
import {
  CcTxVisualization,
  IChannelOptions,
} from "@hyperledger/cactus-plugin-cc-tx-visualization/src/main/typescript/plugin-cc-tx-visualization";
import { randomUUID } from "crypto";
import * as amqp from "amqp-ts";
import { CrossChainModelType } from "../../../main/typescript/models/crosschain-model";
//import { LedgerType } from "@hyperledger/cactus-core-api/src/main/typescript/public-api";

const testCase = "persist logs";
const logLevel: LogLevelDesc = "TRACE";
const queueName = "cc-tx-log-entry-test";

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
  //initialize rabbitmq
  const options = {
    publishAllPorts: true,
    port: 5672,
    logLevel: logLevel,
    imageName: "rabbitmq",
    imageTag: "3.9-management",
    emitContainerLogs: true,
    envVars: new Map([["AnyNecessaryEnvVar", "Can be set here"]]),
  };
  const channelOptions: IChannelOptions = {
    queueId: queueName,
    dltTechnology: null,
    persistMessages: false,
  };

  const cctxvizOptions: IPluginCcTxVisualizationOptions = {
    instanceId: randomUUID(),
    logLevel: logLevel,
    eventProvider: "amqp://localhost",
    channelOptions: channelOptions,
  };

  const testServer = new RabbitMQTestServer(options);
  const tearDown = async () => {
    t.comment("shutdown starts");
    // Connections to the RabbitMQ server need to be closed

    await testServer.stop();
    // todo problem connection closing is hanging here and l56
    // await connection.close();
    await cctxViz.shutdown();
    await cctxViz.closeConnection();
    // await new Promise((resolve) => setTimeout(resolve, 5000));
    log.debug("executing exit");
    process.exit(0);

    log.debug("exit done");
    //await testServer.destroy();
    //await pruneDockerAllIfGithubAction({ logLevel });
  };

  test.onFinish(tearDown);
  const startTime = new Date();
  await testServer.start(true);
  t.ok(testServer);

  // Simulates a Cactus Ledger Connector plugin
  const connection = new amqp.Connection();
  const queue = connection.declareQueue(queueName, { durable: false });
  const finalTime = new Date();
  log.debug(
    `EVAL-testFile-SETUP-EVENT-COLLECTOR:${
      finalTime.getTime() - startTime.getTime()
    }`,
  );

  // Initialize our plugin
  const cctxViz = new CcTxVisualization(cctxvizOptions);
  t.ok(cctxViz);
  t.comment("cctxviz plugin is ok");
  t.comment("cctxviz plugin is ok");
  const timeStartPollReceipts = new Date();
  await cctxViz.pollTxReceipts();
  const endTimePollReceipts = new Date();
  t.comment(
    `EVAL-testFile-POLL:${
      endTimePollReceipts.getTime() - timeStartPollReceipts.getTime()
    }`,
  );
  t.comment("cctxviz plugin is ok");

  t.assert(cctxViz.numberUnprocessedReceipts === 0);
  t.assert(cctxViz.numberEventsLog === 0);

  // dummy use case based on Fig. 3 paper "[1] “Do You Need a Distributed Ledger Technology Interoperability Solution?,” Feb. 2022, doi: 10.36227/.18786527.v1"
  // consider 2 emission consortia (two different case ids);

  const currentTime = new Date();
  const timeStartSendMessages = new Date();

  // caseID 1; registar emissions; Fabric blockchain, test message; parameters: asset 1, 100 units
  const testMessage1 = new amqp.Message({
    caseID: "1",
    timestamp: currentTime,
    blockchainID: "TEST",
    invocationType: "send",
    methodName: "initialize asset",
    // Asset 1, 100 units
    parameters: ["1,100"],
    identity: "A",
  });
  queue.send(testMessage1);

  const testMessage2 = new amqp.Message({
    caseID: "1",
    timestamp: new Date(currentTime.getTime() + 2),
    blockchainID: "TEST",
    invocationType: "send",
    methodName: "lock asset",
    // Asset 1, 100 units
    parameters: ["1,100"],
    identity: "A",
  });
  queue.send(testMessage2);

  const testMessage3 = new amqp.Message({
    caseID: "1",
    timestamp: new Date(currentTime.getTime() + 3),
    blockchainID: "TEST",
    invocationType: "send",
    methodName: "mint asset",
    // Asset 1, 100 units
    parameters: ["1,100"],
    identity: "A",
  });
  queue.send(testMessage3);

  const testMessage4 = new amqp.Message({
    caseID: "1",
    timestamp: new Date(currentTime.getTime() + 4),
    blockchainID: "TEST",
    invocationType: "send",
    methodName: "transfer asset",
    // Asset 1, 100 units
    parameters: ["A"],
    identity: "A",
  });
  queue.send(testMessage4);

  const testMessage5 = new amqp.Message({
    caseID: "1",
    timestamp: new Date(currentTime.getTime() + 5),
    blockchainID: "TEST",
    invocationType: "send",
    methodName: "transfer asset",
    // Asset 1, 100 units
    parameters: [""],
    identity: "A",
  });
  queue.send(testMessage5);

  const testMessage6 = new amqp.Message({
    caseID: "1",
    timestamp: new Date(currentTime.getTime() + 6),
    blockchainID: "TEST",
    invocationType: "send",
    methodName: "burn asset",
    // Asset 1, 100 units
    parameters: [""],
    identity: "A",
  });
  queue.send(testMessage6);
  const endTimeSendMessages = new Date();
  t.comment(
    `EVAL-testFile-SEND-MESSAGES:${
      endTimeSendMessages.getTime() - timeStartSendMessages.getTime()
    }`,
  );

  await new Promise((resolve) => setTimeout(resolve, 2000));
  await cctxViz.txReceiptToCrossChainEventLogEntry();

  t.assert(cctxViz.numberEventsLog === 6);
  // because the second message did not have time to be send to processing before receipts were transformed into cross chain events
  t.assert(cctxViz.numberUnprocessedReceipts === 0);

  await cctxViz.txReceiptToCrossChainEventLogEntry();

  const logName = await cctxViz.persistCrossChainLogCsv("dummy-use-case");
  await cctxViz.aggregateCcTx();
  const map =
    "{'registerEmission': (node:registerEmission connections:{registerEmission:[0.6666666666666666], getEmissions:[0.6666666666666666]}), 'getEmissions': (node:getEmissions connections:{mintEmissionToken:[0.6666666666666666]}), 'mintEmissionToken': (node:mintEmissionToken connections:{})}";
  // Persist heuristic map that is generated from the script that takes this input
  await cctxViz.saveModel(CrossChainModelType.HeuristicMiner, map);
  const savedModel = await cctxViz.getModel(CrossChainModelType.HeuristicMiner);
  t.assert(map === savedModel);

  console.log(logName);
  t.ok(logName);
  t.end();
});
