import {
  TransferCommenceRequestMessage,
  TransferProposalRequestMessage,
  TransferProposalReceiptMessage,
} from "../../../generated/proto/cacti/satp/v02/stage_1_pb";
import {
  MessageType,
  CommonSatp,
  TransferClaims,
  NetworkCapabilities,
} from "../../../generated/proto/cacti/satp/v02/common/message_pb";
import { bufArray2HexStr, getHash, sign } from "../../../gateway-utils";
import {
  getMessageHash,
  saveHash,
  saveSignature,
  SessionType,
} from "../../session-utils";
import { SupportedChain } from "../../types";
import { SATPSession } from "../../../core/satp-session";
import {
  SATPService,
  SATPServiceType,
  ISATPClientServiceOptions,
  ISATPServiceOptions,
} from "../satp-service";
import { commonBodyVerifier, signatureVerifier } from "../data-verifier";
import { ACCEPTANCE } from "../../../generated/proto/cacti/satp/v02/common/session_pb";
import { SessionError } from "../../errors/satp-service-errors";

export class Stage1ClientService extends SATPService {
  public static readonly SATP_STAGE = "1";
  public static readonly SERVICE_TYPE = SATPServiceType.Client;
  public static readonly SATP_SERVICE_INTERNAL_NAME = `stage-${this.SATP_STAGE}-${SATPServiceType[this.SERVICE_TYPE].toLowerCase()}`;

  constructor(ops: ISATPClientServiceOptions) {
    // for now stage1serverservice does not have any different options than the SATPService class

    const commonOptions: ISATPServiceOptions = {
      stage: Stage1ClientService.SATP_STAGE,
      loggerOptions: ops.loggerOptions,
      serviceName: ops.serviceName,
      signer: ops.signer,
      serviceType: Stage1ClientService.SERVICE_TYPE,
    };
    super(commonOptions);
  }

  async transferProposalRequest(
    session: SATPSession,
    supportedDLTs: SupportedChain[],
  ): Promise<void | TransferProposalRequestMessage> {
    const stepTag = `transferProposalRequest()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    this.Log.debug(`${fnTag}, transferProposalRequest...`);

    if (session == undefined) {
      throw new SessionError(fnTag);
    }

    session.verify(fnTag, SessionType.CLIENT);

    const sessionData = session.getClientSessionData();

    if (
      !supportedDLTs.includes(
        sessionData.senderGatewayNetworkId as SupportedChain,
      )
    ) {
      throw new Error( //todo change this to the transferClaims check
        `${fnTag}, recipient gateway dlt system is not supported by this gateway`,
      );
    }

    const commonBody = new CommonSatp();
    commonBody.version = sessionData.version;
    commonBody.messageType = MessageType.INIT_PROPOSAL;
    commonBody.sessionId = sessionData.id;
    commonBody.sequenceNumber = sessionData.lastSequenceNumber =
      sessionData.lastSequenceNumber + BigInt(1);
    commonBody.resourceUrl = sessionData.resourceUrl;

    if (sessionData.transferContextId != undefined) {
      commonBody.transferContextId = sessionData.transferContextId;
    }

    commonBody.clientGatewayPubkey = sessionData.clientGatewayPubkey;
    commonBody.serverGatewayPubkey = sessionData.serverGatewayPubkey;
    commonBody.hashPreviousMessage = "";

    const transferInitClaims = new TransferClaims();
    transferInitClaims.digitalAssetId = sessionData.digitalAssetId;
    transferInitClaims.assetProfileId = sessionData.assetProfileId;
    transferInitClaims.verifiedOriginatorEntityId =
      sessionData.verifiedOriginatorEntityId;
    transferInitClaims.verifiedBeneficiaryEntityId =
      sessionData.verifiedBeneficiaryEntityId;
    transferInitClaims.originatorPubkey = sessionData.originatorPubkey;
    transferInitClaims.beneficiaryPubkey = sessionData.beneficiaryPubkey;
    transferInitClaims.senderGatewayNetworkId =
      sessionData.senderGatewayNetworkId;
    transferInitClaims.recipientGatewayNetworkId =
      sessionData.recipientGatewayNetworkId;
    transferInitClaims.clientGatewayPubkey = sessionData.clientGatewayPubkey;
    transferInitClaims.serverGatewayPubkey = sessionData.serverGatewayPubkey;
    transferInitClaims.senderGatewayOwnerId = sessionData.senderGatewayOwnerId;
    transferInitClaims.receiverGatewayOwnerId =
      sessionData.receiverGatewayOwnerId;

    sessionData.hashTransferInitClaims = getHash(transferInitClaims);

    const networkCapabilities = new NetworkCapabilities();
    networkCapabilities.senderGatewayNetworkId =
      sessionData.senderGatewayNetworkId;
    networkCapabilities.signatureAlgorithm = sessionData.signatureAlgorithm;
    networkCapabilities.lockType = sessionData.lockType;
    networkCapabilities.lockExpirationTime = sessionData.lockExpirationTime;
    networkCapabilities.credentialProfile = sessionData.credentialProfile;
    networkCapabilities.loggingProfile = sessionData.loggingProfile;
    networkCapabilities.accessControlProfile = sessionData.accessControlProfile;

    if (sessionData.permissions != undefined) {
      this.Log.info(`${fnTag}, Optional variable loaded: permissions...`);
      networkCapabilities.permissions = sessionData.permissions;
    }

    if (sessionData.developerUrn != "") {
      this.Log.info(`${fnTag}, Optional variable loaded: developerUrn...`);
      networkCapabilities.developerUrn = sessionData.developerUrn;
    }

    if (sessionData.applicationProfile != "") {
      this.Log.info(
        `${fnTag}, Optional variable loaded: applicationProfile...`,
      );
      networkCapabilities.applicationProfile = sessionData.applicationProfile;
    }

    if (sessionData.subsequentCalls != undefined) {
      this.Log.info(`${fnTag}, Optional variable loaded: subsequentCalls...`);
      networkCapabilities.subsequentCalls = sessionData.subsequentCalls;
    }

    if (sessionData.history.length > 0) {
      this.Log.info(`${fnTag}, Optional variable loaded: history...`);
      networkCapabilities.history = sessionData.history;
    }

    const transferProposalRequestMessage = new TransferProposalRequestMessage();
    transferProposalRequestMessage.common = commonBody;
    transferProposalRequestMessage.transferInitClaims = transferInitClaims;
    transferProposalRequestMessage.networkCapabilities = networkCapabilities;

    if (sessionData.transferClaimsFormat != undefined) {
      this.Log.info(
        `${fnTag}, Optional variable loaded: transferInitClaimsFormat...`,
      );
      transferProposalRequestMessage.transferInitClaimsFormat =
        sessionData.transferClaimsFormat;
    }
    if (sessionData.multipleCancelsAllowed) {
      this.Log.info(
        `${fnTag}, Optional variable loaded: multipleCancelsAllowed...`,
      );
      transferProposalRequestMessage.multipleCancelsAllowed =
        sessionData.multipleCancelsAllowed;
    }
    if (sessionData.multipleClaimsAllowed) {
      this.Log.info(
        `${fnTag}, Optional variable loaded: multipleClaimsAllowed...`,
      );
      transferProposalRequestMessage.multipleClaimsAllowed =
        sessionData.multipleClaimsAllowed;
    }

    const messageSignature = bufArray2HexStr(
      sign(this.Signer, JSON.stringify(transferProposalRequestMessage)),
    );

    transferProposalRequestMessage.clientSignature = messageSignature;

    saveSignature(sessionData, MessageType.INIT_PROPOSAL, messageSignature);

    saveHash(
      sessionData,
      MessageType.INIT_PROPOSAL,
      getHash(transferProposalRequestMessage),
    );

    /*
    await storeLog(gateway, {
      sessionID: sessionID,
      type: "transferProposalRequest",
      operation: "validate",
      data: JSON.stringify(sessionData),
    });
    */
    this.Log.info(`${fnTag}, sending TransferProposalRequest...`);

    return transferProposalRequestMessage;
  }

  async transferCommenceRequest(
    response: TransferProposalReceiptMessage,
    session: SATPSession,
  ): Promise<void | TransferCommenceRequestMessage> {
    const stepTag = `transferCommenceRequest()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    this.Log.debug(`${fnTag}, transferCommenceRequest...`);

    if (session == undefined) {
      throw new SessionError(fnTag);
    }

    session.verify(fnTag, SessionType.CLIENT);

    const sessionData = session.getClientSessionData();

    const commonBody = new CommonSatp();
    commonBody.version = sessionData.version;
    commonBody.messageType = MessageType.TRANSFER_COMMENCE_REQUEST;
    commonBody.sequenceNumber = response.common!.sequenceNumber + BigInt(1);

    //todo check when reject
    commonBody.hashPreviousMessage = getMessageHash(
      sessionData,
      MessageType.INIT_RECEIPT,
    );

    commonBody.clientGatewayPubkey = sessionData.clientGatewayPubkey;
    commonBody.serverGatewayPubkey = sessionData.serverGatewayPubkey;
    commonBody.sessionId = sessionData.id;
    commonBody.transferContextId = sessionData.transferContextId;
    commonBody.resourceUrl = sessionData.resourceUrl;

    sessionData.lastSequenceNumber = commonBody.sequenceNumber;

    const transferCommenceRequestMessage = new TransferCommenceRequestMessage();
    transferCommenceRequestMessage.common = commonBody;
    transferCommenceRequestMessage.hashTransferInitClaims =
      sessionData.hashTransferInitClaims;

    const messageSignature = bufArray2HexStr(
      sign(this.Signer, JSON.stringify(transferCommenceRequestMessage)),
    );

    transferCommenceRequestMessage.clientSignature = messageSignature;

    saveSignature(
      sessionData,
      MessageType.TRANSFER_COMMENCE_REQUEST,
      messageSignature,
    );

    saveHash(
      sessionData,
      MessageType.TRANSFER_COMMENCE_REQUEST,
      getHash(transferCommenceRequestMessage),
    );

    /*
    await storeLog(gateway, {
      sessionID: sessionData.id,
      type: "transferCommenceRequest",
      operation: "validate",
      data: JSON.stringify(sessionData),
    });
    */
    this.Log.info(`${fnTag}, sending TransferCommenceRequest...`);

    return transferCommenceRequestMessage;
  }

  async checkTransferProposalReceiptMessage(
    response: TransferProposalReceiptMessage,
    session: SATPSession,
  ): Promise<boolean> {
    const stepTag = `checkTransferProposalReceiptMessage()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    this.Log.debug(`${fnTag}, checkTransferProposalReceiptMessage...`);

    if (session == undefined) {
      throw new SessionError(fnTag);
    }

    session.verify(fnTag, SessionType.CLIENT);

    const sessionData = session.getClientSessionData();

    commonBodyVerifier(
      fnTag,
      response.common,
      sessionData,
      MessageType.INIT_RECEIPT,
      MessageType.INIT_REJECT,
    );

    signatureVerifier(fnTag, this.Signer, response, sessionData);

    if (
      response.common!.messageType == MessageType.INIT_REJECT &&
      response.transferCounterClaims == undefined
    ) {
      this.Log.info(
        `${fnTag}, TransferProposalReceipt proposedTransferClaims were rejected`,
      );
      sessionData.acceptance = ACCEPTANCE.ACCEPTANCE_REJECTED;
      sessionData.completed = true;
      saveHash(sessionData, MessageType.INIT_REJECT, getHash(response));
      return false;
    } else if (
      response.common!.messageType == MessageType.INIT_REJECT &&
      response.transferCounterClaims != undefined
    ) {
      sessionData.acceptance = ACCEPTANCE.ACCEPTANCE_CONDITIONAL;
      saveHash(sessionData, MessageType.INIT_REJECT, getHash(response));
      if (
        await this.checkProposedTransferClaims(response.transferCounterClaims)
      ) {
        sessionData.proposedTransferInitClaims = getHash(
          response.transferCounterClaims,
        );
        return true;
      } else {
        this.Log.info(
          `${fnTag}, TransferProposalReceipt proposedTransferClaims were rejected conditional`,
        );
        sessionData.completed = true;
        return false;
      }
    }

    sessionData.acceptance = ACCEPTANCE.ACCEPTANCE_ACCEPTED;
    saveHash(sessionData, MessageType.INIT_RECEIPT, getHash(response));

    this.Log.info(`${fnTag}, TransferProposalReceipt passed all checks.`);
    return true;
  }

  async checkProposedTransferClaims(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    counterTransfer: TransferClaims,
  ): Promise<boolean> {
    //const fnTag = `${this.className}#checkCounterTransferClaims()`;
    //todo
    return true;
  }
}
