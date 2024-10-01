// @generated by protoc-gen-es v1.8.0 with parameter "target=ts"
// @generated from file cacti/satp/v02/stage_3.proto (package cacti.satp.v02, syntax proto3)
/* eslint-disable */
// @ts-nocheck

import type { BinaryReadOptions, FieldList, JsonReadOptions, JsonValue, PartialMessage, PlainMessage } from "@bufbuild/protobuf";
import { Message, proto3 } from "@bufbuild/protobuf";
import { AssignmentAssertionClaim, AssignmentAssertionClaimFormat, BurnAssertionClaim, BurnAssertionClaimFormat, CommonSatp, MintAssertionClaim, MintAssertionClaimFormat } from "./common/message_pb.js";

/**
 * @generated from message cacti.satp.v02.CommitPreparationRequestMessage
 */
export class CommitPreparationRequestMessage extends Message<CommitPreparationRequestMessage> {
  /**
   * @generated from field: cacti.satp.v02.common.CommonSatp common = 1;
   */
  common?: CommonSatp;

  /**
   * @generated from field: string client_transfer_number = 2;
   */
  clientTransferNumber = "";

  /**
   * @generated from field: string client_signature = 3;
   */
  clientSignature = "";

  constructor(data?: PartialMessage<CommitPreparationRequestMessage>) {
    super();
    proto3.util.initPartial(data, this);
  }

  static readonly runtime: typeof proto3 = proto3;
  static readonly typeName = "cacti.satp.v02.CommitPreparationRequestMessage";
  static readonly fields: FieldList = proto3.util.newFieldList(() => [
    { no: 1, name: "common", kind: "message", T: CommonSatp },
    { no: 2, name: "client_transfer_number", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 3, name: "client_signature", kind: "scalar", T: 9 /* ScalarType.STRING */ },
  ]);

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): CommitPreparationRequestMessage {
    return new CommitPreparationRequestMessage().fromBinary(bytes, options);
  }

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): CommitPreparationRequestMessage {
    return new CommitPreparationRequestMessage().fromJson(jsonValue, options);
  }

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): CommitPreparationRequestMessage {
    return new CommitPreparationRequestMessage().fromJsonString(jsonString, options);
  }

  static equals(a: CommitPreparationRequestMessage | PlainMessage<CommitPreparationRequestMessage> | undefined, b: CommitPreparationRequestMessage | PlainMessage<CommitPreparationRequestMessage> | undefined): boolean {
    return proto3.util.equals(CommitPreparationRequestMessage, a, b);
  }
}

/**
 * @generated from message cacti.satp.v02.CommitReadyResponseMessage
 */
export class CommitReadyResponseMessage extends Message<CommitReadyResponseMessage> {
  /**
   * @generated from field: cacti.satp.v02.common.CommonSatp common = 1;
   */
  common?: CommonSatp;

  /**
   * @generated from field: cacti.satp.v02.common.MintAssertionClaim mint_assertion_claim = 2;
   */
  mintAssertionClaim?: MintAssertionClaim;

  /**
   * @generated from field: cacti.satp.v02.common.MintAssertionClaimFormat mint_assertion_claim_format = 3;
   */
  mintAssertionClaimFormat?: MintAssertionClaimFormat;

  /**
   * @generated from field: string server_transfer_number = 4;
   */
  serverTransferNumber = "";

  /**
   * @generated from field: string server_signature = 5;
   */
  serverSignature = "";

  constructor(data?: PartialMessage<CommitReadyResponseMessage>) {
    super();
    proto3.util.initPartial(data, this);
  }

  static readonly runtime: typeof proto3 = proto3;
  static readonly typeName = "cacti.satp.v02.CommitReadyResponseMessage";
  static readonly fields: FieldList = proto3.util.newFieldList(() => [
    { no: 1, name: "common", kind: "message", T: CommonSatp },
    { no: 2, name: "mint_assertion_claim", kind: "message", T: MintAssertionClaim },
    { no: 3, name: "mint_assertion_claim_format", kind: "message", T: MintAssertionClaimFormat },
    { no: 4, name: "server_transfer_number", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 5, name: "server_signature", kind: "scalar", T: 9 /* ScalarType.STRING */ },
  ]);

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): CommitReadyResponseMessage {
    return new CommitReadyResponseMessage().fromBinary(bytes, options);
  }

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): CommitReadyResponseMessage {
    return new CommitReadyResponseMessage().fromJson(jsonValue, options);
  }

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): CommitReadyResponseMessage {
    return new CommitReadyResponseMessage().fromJsonString(jsonString, options);
  }

  static equals(a: CommitReadyResponseMessage | PlainMessage<CommitReadyResponseMessage> | undefined, b: CommitReadyResponseMessage | PlainMessage<CommitReadyResponseMessage> | undefined): boolean {
    return proto3.util.equals(CommitReadyResponseMessage, a, b);
  }
}

/**
 * @generated from message cacti.satp.v02.CommitFinalAssertionRequestMessage
 */
export class CommitFinalAssertionRequestMessage extends Message<CommitFinalAssertionRequestMessage> {
  /**
   * @generated from field: cacti.satp.v02.common.CommonSatp common = 1;
   */
  common?: CommonSatp;

  /**
   * @generated from field: cacti.satp.v02.common.BurnAssertionClaim burn_assertion_claim = 2;
   */
  burnAssertionClaim?: BurnAssertionClaim;

  /**
   * @generated from field: cacti.satp.v02.common.BurnAssertionClaimFormat burn_assertion_claim_format = 3;
   */
  burnAssertionClaimFormat?: BurnAssertionClaimFormat;

  /**
   * @generated from field: string client_transfer_number = 4;
   */
  clientTransferNumber = "";

  /**
   * @generated from field: string client_signature = 5;
   */
  clientSignature = "";

  constructor(data?: PartialMessage<CommitFinalAssertionRequestMessage>) {
    super();
    proto3.util.initPartial(data, this);
  }

  static readonly runtime: typeof proto3 = proto3;
  static readonly typeName = "cacti.satp.v02.CommitFinalAssertionRequestMessage";
  static readonly fields: FieldList = proto3.util.newFieldList(() => [
    { no: 1, name: "common", kind: "message", T: CommonSatp },
    { no: 2, name: "burn_assertion_claim", kind: "message", T: BurnAssertionClaim },
    { no: 3, name: "burn_assertion_claim_format", kind: "message", T: BurnAssertionClaimFormat },
    { no: 4, name: "client_transfer_number", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 5, name: "client_signature", kind: "scalar", T: 9 /* ScalarType.STRING */ },
  ]);

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): CommitFinalAssertionRequestMessage {
    return new CommitFinalAssertionRequestMessage().fromBinary(bytes, options);
  }

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): CommitFinalAssertionRequestMessage {
    return new CommitFinalAssertionRequestMessage().fromJson(jsonValue, options);
  }

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): CommitFinalAssertionRequestMessage {
    return new CommitFinalAssertionRequestMessage().fromJsonString(jsonString, options);
  }

  static equals(a: CommitFinalAssertionRequestMessage | PlainMessage<CommitFinalAssertionRequestMessage> | undefined, b: CommitFinalAssertionRequestMessage | PlainMessage<CommitFinalAssertionRequestMessage> | undefined): boolean {
    return proto3.util.equals(CommitFinalAssertionRequestMessage, a, b);
  }
}

/**
 * @generated from message cacti.satp.v02.CommitFinalAcknowledgementReceiptResponseMessage
 */
export class CommitFinalAcknowledgementReceiptResponseMessage extends Message<CommitFinalAcknowledgementReceiptResponseMessage> {
  /**
   * @generated from field: cacti.satp.v02.common.CommonSatp common = 1;
   */
  common?: CommonSatp;

  /**
   * @generated from field: cacti.satp.v02.common.AssignmentAssertionClaim assignment_assertion_claim = 2;
   */
  assignmentAssertionClaim?: AssignmentAssertionClaim;

  /**
   * @generated from field: cacti.satp.v02.common.AssignmentAssertionClaimFormat assignment_assertion_claim_format = 3;
   */
  assignmentAssertionClaimFormat?: AssignmentAssertionClaimFormat;

  /**
   * @generated from field: string server_transfer_number = 4;
   */
  serverTransferNumber = "";

  /**
   * @generated from field: string server_signature = 5;
   */
  serverSignature = "";

  constructor(data?: PartialMessage<CommitFinalAcknowledgementReceiptResponseMessage>) {
    super();
    proto3.util.initPartial(data, this);
  }

  static readonly runtime: typeof proto3 = proto3;
  static readonly typeName = "cacti.satp.v02.CommitFinalAcknowledgementReceiptResponseMessage";
  static readonly fields: FieldList = proto3.util.newFieldList(() => [
    { no: 1, name: "common", kind: "message", T: CommonSatp },
    { no: 2, name: "assignment_assertion_claim", kind: "message", T: AssignmentAssertionClaim },
    { no: 3, name: "assignment_assertion_claim_format", kind: "message", T: AssignmentAssertionClaimFormat },
    { no: 4, name: "server_transfer_number", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 5, name: "server_signature", kind: "scalar", T: 9 /* ScalarType.STRING */ },
  ]);

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): CommitFinalAcknowledgementReceiptResponseMessage {
    return new CommitFinalAcknowledgementReceiptResponseMessage().fromBinary(bytes, options);
  }

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): CommitFinalAcknowledgementReceiptResponseMessage {
    return new CommitFinalAcknowledgementReceiptResponseMessage().fromJson(jsonValue, options);
  }

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): CommitFinalAcknowledgementReceiptResponseMessage {
    return new CommitFinalAcknowledgementReceiptResponseMessage().fromJsonString(jsonString, options);
  }

  static equals(a: CommitFinalAcknowledgementReceiptResponseMessage | PlainMessage<CommitFinalAcknowledgementReceiptResponseMessage> | undefined, b: CommitFinalAcknowledgementReceiptResponseMessage | PlainMessage<CommitFinalAcknowledgementReceiptResponseMessage> | undefined): boolean {
    return proto3.util.equals(CommitFinalAcknowledgementReceiptResponseMessage, a, b);
  }
}

/**
 * @generated from message cacti.satp.v02.TransferCompleteRequestMessage
 */
export class TransferCompleteRequestMessage extends Message<TransferCompleteRequestMessage> {
  /**
   * @generated from field: cacti.satp.v02.common.CommonSatp common = 1;
   */
  common?: CommonSatp;

  /**
   * @generated from field: string hash_transfer_commence = 2;
   */
  hashTransferCommence = "";

  /**
   * @generated from field: string client_transfer_number = 3;
   */
  clientTransferNumber = "";

  /**
   * @generated from field: string client_signature = 4;
   */
  clientSignature = "";

  constructor(data?: PartialMessage<TransferCompleteRequestMessage>) {
    super();
    proto3.util.initPartial(data, this);
  }

  static readonly runtime: typeof proto3 = proto3;
  static readonly typeName = "cacti.satp.v02.TransferCompleteRequestMessage";
  static readonly fields: FieldList = proto3.util.newFieldList(() => [
    { no: 1, name: "common", kind: "message", T: CommonSatp },
    { no: 2, name: "hash_transfer_commence", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 3, name: "client_transfer_number", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 4, name: "client_signature", kind: "scalar", T: 9 /* ScalarType.STRING */ },
  ]);

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): TransferCompleteRequestMessage {
    return new TransferCompleteRequestMessage().fromBinary(bytes, options);
  }

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): TransferCompleteRequestMessage {
    return new TransferCompleteRequestMessage().fromJson(jsonValue, options);
  }

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): TransferCompleteRequestMessage {
    return new TransferCompleteRequestMessage().fromJsonString(jsonString, options);
  }

  static equals(a: TransferCompleteRequestMessage | PlainMessage<TransferCompleteRequestMessage> | undefined, b: TransferCompleteRequestMessage | PlainMessage<TransferCompleteRequestMessage> | undefined): boolean {
    return proto3.util.equals(TransferCompleteRequestMessage, a, b);
  }
}

