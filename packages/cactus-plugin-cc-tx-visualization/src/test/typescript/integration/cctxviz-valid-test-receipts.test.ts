import test, { Test } from "tape-promise/tape";
import { LogLevelDesc } from "@hyperledger/cactus-common";
import { RabbitMQTestServer } from "@hyperledger/cactus-test-tooling";
import { pruneDockerAllIfGithubAction } from "@hyperledger/cactus-test-tooling";
import { IPluginCcTxVisualizationOptions } from "@hyperledger/cactus-plugin-cc-tx-visualization/src/main/typescript";
import {
  CcTxVisualization,
  IChannelOptions,
} from "@hyperledger/cactus-plugin-cc-tx-visualization/src/main/typescript/plugin-cc-tx-visualization";
import { randomUUID } from "crypto";
import * as amqp from "amqp-ts";
//import { LedgerType } from "@hyperledger/cactus-core-api/src/main/typescript/public-api";

const testCase = "Instantiate plugin, send test receipts in different orders";
const logLevel: LogLevelDesc = "TRACE";
const queueName = "cc-tx-log-entry-test";

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
    // Connections to the RabbitMQ server need to be closed
    await cctxViz.closeConnection();
    await connection.close();
    await testServer.stop();
    await pruneDockerAllIfGithubAction({ logLevel });
  };

  test.onFinish(tearDown);

  await testServer.start();
  t.ok(testServer);

  // Simulates a Cactus Ledger Connector plugin
  const connection = new amqp.Connection();
  const queue = connection.declareQueue(queueName, { durable: false });

  // Initialize our plugin
  const cctxViz = new CcTxVisualization(cctxvizOptions);
  t.ok(cctxViz);
  t.comment("cctxviz plugin is ok");

  test("receipt,poll, receipt, 2cc, receipt, check logs", async (t: Test) => {
    const testMessage = new amqp.Message({
      caseID: "caseID-TEST 1",
      timestamp: "timestamp-TEST",
      blockchainID: "TEST",
      invocationType: "invocationType-TEST",
      methodName: "methodName-TEST",
      parameters: ["TEST"],
      identity: "test",
    });
    queue.send(testMessage);

    await cctxViz.pollTxReceipts();

    const testMessage2 = new amqp.Message({
      caseID: "caseID-TEST 2",
      timestamp: "timestamp-TEST",
      blockchainID: "TEST",
      invocationType: "invocationType-TEST",
      methodName: "methodName-TEST",
      parameters: ["TEST"],
      identity: "test",
    });
    queue.send(testMessage2);

    await cctxViz.txReceiptToCrossChainEventLogEntry();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    t.assert(cctxViz.numberEventsLog === 1);
    // because the second message did not have time to be send to processing before receipts were transformed into cross chain events
    t.assert(cctxViz.numberUnprocessedReceipts === 1);

    const testMessage3 = new amqp.Message({
      caseID: "caseID-TEST 3",
      timestamp: "timestamp-TEST",
      blockchainID: "TEST",
      invocationType: "invocationType-TEST",
      methodName: "methodName-TEST",
      parameters: ["TEST"],
      identity: "test",
    });
    queue.send(testMessage3);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // one log because there was no time to process message 2 into a cross chain event
    t.assert(cctxViz.numberEventsLog === 1);
    // one unprocessed receipt because we did not call txReceiptToCrossChainEventLogEntry + message 2
    t.assert(cctxViz.numberUnprocessedReceipts === 2);
  });

  test("receipt,poll, receipt, receipt, 2cc, check logs", async (t: Test) => {
    // purge previous events
    await cctxViz.txReceiptToCrossChainEventLogEntry();
    await cctxViz.purgeCrossChainEvents();
    t.assert(cctxViz.numberUnprocessedReceipts === 0);
    t.assert(cctxViz.numberEventsLog === 0);

    // already activated by previous test
    //await cctxViz.pollTxReceipts();

    const testMessage = new amqp.Message({
      caseID: "caseID-TEST 4",
      timestamp: "timestamp-TEST",
      blockchainID: "TEST",
      invocationType: "invocationType-TEST",
      methodName: "methodName-TEST",
      parameters: ["TEST"],
      identity: "test",
    });
    queue.send(testMessage);

    const testMessage2 = new amqp.Message({
      caseID: "caseID-TEST 5",
      timestamp: "timestamp-TEST",
      blockchainID: "TEST",
      invocationType: "invocationType-TEST",
      methodName: "methodName-TEST",
      parameters: ["TEST"],
      identity: "test",
    });
    queue.send(testMessage2);

    await new Promise((resolve) => setTimeout(resolve, 1000));
    await cctxViz.txReceiptToCrossChainEventLogEntry();

    t.assert(cctxViz.numberEventsLog === 2);
    // because the second message did not have time to be send to processing before receipts were transformed into cross chain events
    t.assert(cctxViz.numberUnprocessedReceipts === 0);

    const testMessage3 = new amqp.Message({
      caseID: "caseID-TEST 6",
      timestamp: "timestamp-TEST",
      blockchainID: "TEST",
      invocationType: "invocationType-TEST",
      methodName: "methodName-TEST",
      parameters: ["TEST"],
      identity: "test",
    });
    queue.send(testMessage3);

    await new Promise((resolve) => setTimeout(resolve, 1000));
    await cctxViz.txReceiptToCrossChainEventLogEntry();

    // one log because there was no time to process message 2 into a cross chain event
    t.assert(cctxViz.numberEventsLog === 3);
    // one unprocessed receipt because we did not call txReceiptToCrossChainEventLogEntry + message 2
    t.assert(cctxViz.numberUnprocessedReceipts === 0);
  });

  t.end();
});
