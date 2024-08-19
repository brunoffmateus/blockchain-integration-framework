import "jest-extended";
import { LogLevelDesc } from "@hyperledger/cactus-common";
import {
  ISATPGatewayRunnerConstructorOptions,
  pruneDockerAllIfGithubAction,
  SATPGatewayRunner,
} from "@hyperledger/cactus-test-tooling";
import {
  DEFAULT_PORT_GATEWAY_API,
  DEFAULT_PORT_GATEWAY_CLIENT,
  DEFAULT_PORT_GATEWAY_SERVER,
} from "../../../main/typescript/core/constants";
import path from "path";
import fs from "fs-extra";

const testCase = "Instantiate SATP Gateway Runner";
const logLevel: LogLevelDesc = "TRACE";

describe(testCase, () => {
  let gatewayRunner: SATPGatewayRunner;

  const gatewayRunnerOptions: ISATPGatewayRunnerConstructorOptions = {
    containerImageVersion: "latest",
    containerImageName: "cactus-plugin-satp-hermes-satp-hermes-gateway",
    serverPort: DEFAULT_PORT_GATEWAY_SERVER,
    clientPort: DEFAULT_PORT_GATEWAY_CLIENT,
    apiPort: DEFAULT_PORT_GATEWAY_API,
    logLevel,
    emitContainerLogs: true,
  };

  beforeAll(async () => {
    const pruning = pruneDockerAllIfGithubAction({ logLevel });
    await expect(pruning).toResolve();
  });

  afterAll(async () => {
    await gatewayRunner.stop();
    await gatewayRunner.destroy();
    await pruneDockerAllIfGithubAction({ logLevel });
  });

  test(testCase, async () => {
    // const configDir = path.join(__dirname, "../integration/config");
    // if (!fs.existsSync(configDir)) {
    //   fs.mkdirSync(configDir, { recursive: true });
    // }
    // const besuConfigPath = path.join(configDir, "besu-config.jsonc");
    // gatewayRunnerOptions.besuConfigPath = besuConfigPath;

    // console.log("Reading from file in test:", besuConfigPath);
    // const besuConfigFile = fs.readFileSync(besuConfigPath, "utf8");
    // const parsedBesu: BesuConfig = jsonc.parse(besuConfigFile) as BesuConfig;

    // const fabricConfigPath = path.join(configDir, "fabric-config.jsonc");
    // gatewayRunnerOptions.fabricConfigPath = fabricConfigPath;

    // console.log("Reading from file in test:", fabricConfigPath);
    // const fabricConfigFile = fs.readFileSync(fabricConfigPath, "utf8");
    // const parsedFabric: FabricConfig = jsonc.parse(
    //   fabricConfigFile,
    // ) as FabricConfig;

    gatewayRunner = new SATPGatewayRunner(gatewayRunnerOptions);

    await gatewayRunner.start();
    expect(gatewayRunner).toBeTruthy();
    expect(gatewayRunner.getContainer()).toBeTruthy();

    const serverHost = await gatewayRunner.getServerHost();
    expect(serverHost).toBeTruthy();
    expect(serverHost).toMatch(/^http:\/\/localhost:\d+$/);
    console.log(serverHost);

    const clientHost = await gatewayRunner.getClientHost();
    expect(clientHost).toBeTruthy();
    expect(clientHost).toMatch(/^http:\/\/localhost:\d+$/);
    console.log(clientHost);

    const apiHost = await gatewayRunner.getApiHost();
    expect(apiHost).toBeTruthy();
    expect(apiHost).toMatch(/^http:\/\/localhost:\d+$/);
    console.log(apiHost);
  });
});
