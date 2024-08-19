import {
  Checks,
  IAsyncProvider,
  Logger,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import {
  IEndpointAuthzOptions,
  IExpressRequestHandler,
  IWebServiceEndpoint,
} from "@hyperledger/cactus-core-api";
import type { Express, Request, Response } from "express";
import { IRequestOptions } from "../types";
import OAS from "../../json/openapi-bundled.json";
import {
  handleRestEndpointException,
  registerWebServiceEndpoint,
} from "@hyperledger/cactus-core";
import { TransactRequest } from "../generated/openapi/typescript-axios/api";

export class TransactEndpointV1 implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "TransactEndpointV1";

  private readonly log: Logger;

  public get className(): string {
    return TransactEndpointV1.CLASS_NAME;
  }

  constructor(public readonly options: IRequestOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.infrastructure, `${fnTag} arg options.connector`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  public get oasPath(): (typeof OAS.paths)["/api/v1/@hyperledger/cactus-example-cbdc/transact"] {
    return OAS.paths["/api/v1/@hyperledger/cactus-example-cbdc/transact"];
  }

  public async registerExpress(
    expressApp: Express,
  ): Promise<IWebServiceEndpoint> {
    await registerWebServiceEndpoint(expressApp, this);
    return this;
  }
  getVerbLowerCase(): string {
    return this.oasPath.post["x-hyperledger-cacti"].http.verbLowerCase;
  }
  getPath(): string {
    return this.oasPath.post["x-hyperledger-cacti"].http.path;
  }
  public getExpressRequestHandler(): IExpressRequestHandler {
    return this.handleRequest.bind(this);
  }

  public getOperationId(): string {
    return OAS.paths["/api/v1/@hyperledger/cactus-example-cbdc/transact"].post
      .operationId;
  }

  getAuthorizationOptionsProvider(): IAsyncProvider<IEndpointAuthzOptions> {
    return {
      get: async () => ({
        isProtected: true,
        requiredRoles: [],
      }),
    };
  }

  public async handleRequest(req: Request, res: Response): Promise<void> {
    const fnTag = `${this.className}#handleRequest()`;
    const reqTag = `${this.getVerbLowerCase()} - ${this.getPath()}`;
    this.log.debug(reqTag);
    const reqBody: TransactRequest = req.body;
    this.log.debug("reqBody: ", reqBody);
    try {
      const result = await this.options.infrastructure.bridgeTokens(
        reqBody.sender,
        reqBody.receiver,
        reqBody.sourceChain.assetType!,
        reqBody.receiverChain.assetType!,
        parseInt(reqBody.amount),
      );
      res.status(200).json(result);
    } catch (ex) {
      const errorMsg = `${reqTag} ${fnTag} Failed to transact:`;
      handleRestEndpointException({ errorMsg, log: this.log, error: ex, res });
    }
  }
}