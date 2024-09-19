import Docker, { Container, ContainerInfo } from "dockerode";
import Joi from "joi";
import { EventEmitter } from "events";
import {
  LogLevelDesc,
  Logger,
  LoggerProvider,
  Bools,
} from "@hyperledger/cactus-common";
import { ITestLedger } from "../i-test-ledger";
import { Containers } from "../common/containers";

export interface ISATPGatewayRunnerConstructorOptions {
  containerImageVersion?: string;
  containerImageName?: string;
  serverPort?: number;
  clientPort?: number;
  apiPort?: number;
  envVars?: string[];
  logLevel?: LogLevelDesc;
  emitContainerLogs?: boolean;
  configFile?: string;
  envFile?: string;
}

export const SATP_GATEWAY_RUNNER_DEFAULT_OPTIONS = Object.freeze({
  containerImageVersion: "18-09",
  containerImageName:
    "ghcr.io/brunoffmateus/cactus-plugin-satp-hermes-satp-hermes-gateway",
  serverPort: 3010,
  clientPort: 3011,
  apiPort: 4010,
  envVars: [
    "SATP_GATEWAY_ID=gateway",
    "SATP_GATEWAY_NAME=ExampleGateway",
    "SATP_SUPPORTED_DLTS=FabricSATPGateway,BesuSATPGateway",
    "SATP_GATEWAY_ADDRESS=http://localhost",
    "SATP_PROOF_ID=mockProofID1",
    "SATP_COUNTER_PARTY_GATEWAYS=[]",
  ],
});

// TODO - log the image and version
export const SATP_GATEWAY_RUNNER_OPTIONS_JOI_SCHEMA: Joi.Schema =
  Joi.object().keys({
    containerImageVersion: Joi.string().min(1).required(),
    containerImageName: Joi.string().min(1).required(),
    serverPort: Joi.number()
      .integer()
      .positive()
      .min(1024)
      .max(65535)
      .required(),
    clientPort: Joi.number()
      .integer()
      .positive()
      .min(1024)
      .max(65535)
      .required(),
    apiPort: Joi.number().integer().positive().min(1024).max(65535).required(),
    envVars: Joi.array().items(Joi.string()).required(),
  });

export class SATPGatewayRunner implements ITestLedger {
  public readonly containerImageVersion: string;
  public readonly containerImageName: string;
  public readonly serverPort: number;
  public readonly clientPort: number;
  public readonly apiPort: number;
  public readonly envVars: string[];
  public readonly emitContainerLogs: boolean;
  public readonly envFile?: string;
  public readonly configFile?: string;

  private readonly log: Logger;
  private container: Container | undefined;
  private containerId: string | undefined;

  constructor(
    public readonly options: ISATPGatewayRunnerConstructorOptions = {},
  ) {
    if (!options) {
      throw new TypeError(`SATPGatewayRunner#ctor options was falsy.`);
    }
    this.containerImageVersion =
      options.containerImageVersion ||
      SATP_GATEWAY_RUNNER_DEFAULT_OPTIONS.containerImageVersion;
    this.containerImageName =
      options.containerImageName ||
      SATP_GATEWAY_RUNNER_DEFAULT_OPTIONS.containerImageName;
    this.serverPort =
      options.serverPort || SATP_GATEWAY_RUNNER_DEFAULT_OPTIONS.serverPort;
    this.clientPort =
      options.clientPort || SATP_GATEWAY_RUNNER_DEFAULT_OPTIONS.clientPort;
    this.apiPort =
      options.apiPort || SATP_GATEWAY_RUNNER_DEFAULT_OPTIONS.apiPort;
    this.envVars =
      options.envVars || SATP_GATEWAY_RUNNER_DEFAULT_OPTIONS.envVars;
    this.configFile = options.configFile;
    this.envFile = options.envFile;

    this.emitContainerLogs = Bools.isBooleanStrict(options.emitContainerLogs)
      ? (options.emitContainerLogs as boolean)
      : true;

    this.validateConstructorOptions();
    const label = "satp-gateway-runner";
    const level = options.logLevel || "INFO";
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  public getContainer(): Container {
    const fnTag = "SATPGatewayRunner#getContainer()";
    if (!this.container) {
      throw new Error(`${fnTag} container not yet started by this instance.`);
    } else {
      return this.container;
    }
  }

  public getContainerImageName(): string {
    return `${this.containerImageName}:${this.containerImageVersion}`;
  }

  public async getServerHost(): Promise<string> {
    const containerInfo = await this.getContainerInfo();
    const hostPort = await Containers.getPublicPort(
      this.serverPort,
      containerInfo,
    );
    return `http://localhost:${hostPort}`;
  }

  public async getClientHost(): Promise<string> {
    const containerInfo = await this.getContainerInfo();
    const hostPort = await Containers.getPublicPort(
      this.clientPort,
      containerInfo,
    );
    return `http://localhost:${hostPort}`;
  }

  public async getApiHost(): Promise<string> {
    const containerInfo = await this.getContainerInfo();
    const hostPort = await Containers.getPublicPort(
      this.apiPort,
      containerInfo,
    );
    this.log.debug(`getApiHost: ${hostPort}`);
    return `http://localhost:${hostPort}`;
  }

  public async start(omitPull = false): Promise<Container> {
    const imageFqn = this.getContainerImageName();

    if (this.container) {
      await this.container.stop();
      await this.container.remove();
    }
    const docker = new Docker();

    omitPull = true; //TODO: remove!!

    if (!omitPull) {
      this.log.debug(`Pulling container image ${imageFqn} ...`);
      await Containers.pullImage(imageFqn, {}, "DEBUG");
      this.log.debug(`Pulled ${imageFqn} OK. Starting container...`);
    }

    return new Promise<Container>((resolve, reject) => {
      const hostConfig: Docker.HostConfig = {
        PublishAllPorts: true,
        Binds: [],
      };

      // if (this.envFile) {
      //   const containerPath = "/opt/cacti/satp-hermes/.env.example";
      //   hostConfig.Binds!.push(`${this.envFile}:${containerPath}:ro`);
      // }

      if (this.configFile) {
        const containerPath = "/opt/cacti/satp-hermes/config.json";
        hostConfig.Binds!.push(`${this.configFile}:${containerPath}:ro`);
      }

      const eventEmitter: EventEmitter = docker.run(
        imageFqn,
        [],
        [],
        {
          ExposedPorts: {
            "3010/tcp": {}, // SERVER_PORT
            "3011/tcp": {}, // CLIENT_PORT
            "4010/tcp": {}, // API_PORT
          },
          Healthcheck: {
            Test: [
              "CMD-SHELL",
              `curl -f http://localhost:4010/api/v1/@hyperledger/cactus-plugin-satp-hermes/healthcheck`,
            ],
            Interval: 5000000000, // 5 seconds
            Timeout: 1000000000, // 1 second
            Retries: 5,
            StartPeriod: 1000000000, // 1 second
          },
          HostConfig: hostConfig,
          Env: this.envVars,
        },
        {},
        (err: unknown) => {
          if (err) {
            reject(err);
          }
        },
      );

      eventEmitter.once("start", async (container: Container) => {
        this.log.debug(`Started container OK. Waiting for healthcheck...`);
        this.container = container;
        this.containerId = container.id;

        if (this.emitContainerLogs) {
          const fnTag = `[${this.getContainerImageName()}]`;
          await Containers.streamLogs({
            container: this.getContainer(),
            tag: fnTag,
            log: this.log,
          });
        }
        try {
          await this.waitForHealthCheck();
          this.log.debug(`Healthcheck passing OK.`);
          resolve(container);
        } catch (ex) {
          reject(ex);
        }
      });
    });
  }

  public async waitForHealthCheck(timeoutMs = 60000): Promise<void> {
    const fnTag = "SATPGatewayRunner#waitForHealthCheck()";
    const startedAt = Date.now();
    let isHealthy = false;
    do {
      if (Date.now() >= startedAt + timeoutMs) {
        throw new Error(`${fnTag} timed out (${timeoutMs}ms)`);
      }
      const { Status, State } = await this.getContainerInfo();
      this.log.debug(`ContainerInfo.Status=%o, State=O%`, Status, State);
      isHealthy = Status.endsWith("(healthy)");
      if (!isHealthy) {
        await new Promise((resolve2) => setTimeout(resolve2, 1000));
      }
    } while (!isHealthy);
    this.log.debug(`Left waitForHealthCheck`);
  }

  public stop(): Promise<unknown> {
    const fnTag = "SATPGatewayRunner#stop()";
    return new Promise((resolve, reject) => {
      if (this.container) {
        this.container.stop({}, (err: unknown, result: unknown) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        });
      } else {
        return reject(new Error(`${fnTag} Container was not running.`));
      }
    });
  }

  public destroy(): Promise<unknown> {
    const fnTag = "SATPGatewayRunner#destroy()";
    if (this.container) {
      return this.container.remove();
    } else {
      const ex = new Error(`${fnTag} Container not found, nothing to destroy.`);
      return Promise.reject(ex);
    }
  }

  public async getContainerInfo(): Promise<ContainerInfo> {
    const docker = new Docker();
    const containerInfos = await docker.listContainers({});

    let aContainerInfo;
    if (this.containerId !== undefined) {
      aContainerInfo = containerInfos.find((ci) => ci.Id === this.containerId);
    }

    if (aContainerInfo) {
      return aContainerInfo;
    } else {
      throw new Error(
        `SATPGatewayRunner#getContainerInfo() no container with ID "${this.containerId}"`,
      );
    }
  }

  private validateConstructorOptions(): void {
    const validationResult = SATP_GATEWAY_RUNNER_OPTIONS_JOI_SCHEMA.validate({
      containerImageVersion: this.containerImageVersion,
      containerImageName: this.containerImageName,
      serverPort: this.serverPort,
      clientPort: this.clientPort,
      apiPort: this.apiPort,
      envVars: this.envVars,
    });

    if (validationResult.error) {
      throw new Error(
        `SATPGatewayRunner#ctor ${validationResult.error.annotate()}`,
      );
    }
  }
}
