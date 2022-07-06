// Code generated by protoc-gen-go. DO NOT EDIT.
// versions:
// 	protoc-gen-go v1.28.0
// 	protoc        v3.17.3
// source: common/events.proto

package common

import (
	protoreflect "google.golang.org/protobuf/reflect/protoreflect"
	protoimpl "google.golang.org/protobuf/runtime/protoimpl"
	reflect "reflect"
	sync "sync"
)

const (
	// Verify that this generated code is sufficiently up-to-date.
	_ = protoimpl.EnforceVersion(20 - protoimpl.MinVersion)
	// Verify that runtime/protoimpl is sufficiently up-to-date.
	_ = protoimpl.EnforceVersion(protoimpl.MaxVersion - 20)
)

type EventType int32

const (
	EventType_LedgerState EventType = 0
	EventType_AssetLock   EventType = 1
	EventType_AssetClaim  EventType = 2
)

// Enum value maps for EventType.
var (
	EventType_name = map[int32]string{
		0: "LedgerState",
		1: "AssetLock",
		2: "AssetClaim",
	}
	EventType_value = map[string]int32{
		"LedgerState": 0,
		"AssetLock":   1,
		"AssetClaim":  2,
	}
)

func (x EventType) Enum() *EventType {
	p := new(EventType)
	*p = x
	return p
}

func (x EventType) String() string {
	return protoimpl.X.EnumStringOf(x.Descriptor(), protoreflect.EnumNumber(x))
}

func (EventType) Descriptor() protoreflect.EnumDescriptor {
	return file_common_events_proto_enumTypes[0].Descriptor()
}

func (EventType) Type() protoreflect.EnumType {
	return &file_common_events_proto_enumTypes[0]
}

func (x EventType) Number() protoreflect.EnumNumber {
	return protoreflect.EnumNumber(x)
}

// Deprecated: Use EventType.Descriptor instead.
func (EventType) EnumDescriptor() ([]byte, []int) {
	return file_common_events_proto_rawDescGZIP(), []int{0}
}

type EventSubscriptionState_STATUS int32

const (
	// pending ACK from remote relay
	EventSubscriptionState_PENDING_ACK EventSubscriptionState_STATUS = 0
	// Received ACK, waiting for event subscription confirmation from remote relay
	EventSubscriptionState_PENDING EventSubscriptionState_STATUS = 1
	EventSubscriptionState_ERROR   EventSubscriptionState_STATUS = 2
	EventSubscriptionState_SUCCESS EventSubscriptionState_STATUS = 3
)

// Enum value maps for EventSubscriptionState_STATUS.
var (
	EventSubscriptionState_STATUS_name = map[int32]string{
		0: "PENDING_ACK",
		1: "PENDING",
		2: "ERROR",
		3: "SUCCESS",
	}
	EventSubscriptionState_STATUS_value = map[string]int32{
		"PENDING_ACK": 0,
		"PENDING":     1,
		"ERROR":       2,
		"SUCCESS":     3,
	}
)

func (x EventSubscriptionState_STATUS) Enum() *EventSubscriptionState_STATUS {
	p := new(EventSubscriptionState_STATUS)
	*p = x
	return p
}

func (x EventSubscriptionState_STATUS) String() string {
	return protoimpl.X.EnumStringOf(x.Descriptor(), protoreflect.EnumNumber(x))
}

func (EventSubscriptionState_STATUS) Descriptor() protoreflect.EnumDescriptor {
	return file_common_events_proto_enumTypes[1].Descriptor()
}

func (EventSubscriptionState_STATUS) Type() protoreflect.EnumType {
	return &file_common_events_proto_enumTypes[1]
}

func (x EventSubscriptionState_STATUS) Number() protoreflect.EnumNumber {
	return protoreflect.EnumNumber(x)
}

// Deprecated: Use EventSubscriptionState_STATUS.Descriptor instead.
func (EventSubscriptionState_STATUS) EnumDescriptor() ([]byte, []int) {
	return file_common_events_proto_rawDescGZIP(), []int{2, 0}
}

type EventMatcher struct {
	state         protoimpl.MessageState
	sizeCache     protoimpl.SizeCache
	unknownFields protoimpl.UnknownFields

	Type            EventType `protobuf:"varint,1,opt,name=type,proto3,enum=common.events.EventType" json:"type,omitempty"`
	EventName       string    `protobuf:"bytes,2,opt,name=event_name,json=eventName,proto3" json:"event_name,omitempty"`
	TransactionFunc string    `protobuf:"bytes,3,opt,name=transaction_func,json=transactionFunc,proto3" json:"transaction_func,omitempty"`
}

func (x *EventMatcher) Reset() {
	*x = EventMatcher{}
	if protoimpl.UnsafeEnabled {
		mi := &file_common_events_proto_msgTypes[0]
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		ms.StoreMessageInfo(mi)
	}
}

func (x *EventMatcher) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*EventMatcher) ProtoMessage() {}

func (x *EventMatcher) ProtoReflect() protoreflect.Message {
	mi := &file_common_events_proto_msgTypes[0]
	if protoimpl.UnsafeEnabled && x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use EventMatcher.ProtoReflect.Descriptor instead.
func (*EventMatcher) Descriptor() ([]byte, []int) {
	return file_common_events_proto_rawDescGZIP(), []int{0}
}

func (x *EventMatcher) GetType() EventType {
	if x != nil {
		return x.Type
	}
	return EventType_LedgerState
}

func (x *EventMatcher) GetEventName() string {
	if x != nil {
		return x.EventName
	}
	return ""
}

func (x *EventMatcher) GetTransactionFunc() string {
	if x != nil {
		return x.TransactionFunc
	}
	return ""
}

type EventSubscription struct {
	state         protoimpl.MessageState
	sizeCache     protoimpl.SizeCache
	unknownFields protoimpl.UnknownFields

	EventMatcher *EventMatcher `protobuf:"bytes,1,opt,name=eventMatcher,proto3" json:"eventMatcher,omitempty"`
	Query        *Query        `protobuf:"bytes,2,opt,name=query,proto3" json:"query,omitempty"`
}

func (x *EventSubscription) Reset() {
	*x = EventSubscription{}
	if protoimpl.UnsafeEnabled {
		mi := &file_common_events_proto_msgTypes[1]
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		ms.StoreMessageInfo(mi)
	}
}

func (x *EventSubscription) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*EventSubscription) ProtoMessage() {}

func (x *EventSubscription) ProtoReflect() protoreflect.Message {
	mi := &file_common_events_proto_msgTypes[1]
	if protoimpl.UnsafeEnabled && x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use EventSubscription.ProtoReflect.Descriptor instead.
func (*EventSubscription) Descriptor() ([]byte, []int) {
	return file_common_events_proto_rawDescGZIP(), []int{1}
}

func (x *EventSubscription) GetEventMatcher() *EventMatcher {
	if x != nil {
		return x.EventMatcher
	}
	return nil
}

func (x *EventSubscription) GetQuery() *Query {
	if x != nil {
		return x.Query
	}
	return nil
}

type EventSubscriptionState struct {
	state         protoimpl.MessageState
	sizeCache     protoimpl.SizeCache
	unknownFields protoimpl.UnknownFields

	RequestId            string                        `protobuf:"bytes,1,opt,name=request_id,json=requestId,proto3" json:"request_id,omitempty"`
	Status               EventSubscriptionState_STATUS `protobuf:"varint,2,opt,name=status,proto3,enum=common.events.EventSubscriptionState_STATUS" json:"status,omitempty"`
	Message              string                        `protobuf:"bytes,3,opt,name=message,proto3" json:"message,omitempty"`
	EventMatcher         *EventMatcher                 `protobuf:"bytes,4,opt,name=eventMatcher,proto3" json:"eventMatcher,omitempty"`
	EventPublicationSpec *EventPublication             `protobuf:"bytes,5,opt,name=eventPublicationSpec,proto3" json:"eventPublicationSpec,omitempty"`
}

func (x *EventSubscriptionState) Reset() {
	*x = EventSubscriptionState{}
	if protoimpl.UnsafeEnabled {
		mi := &file_common_events_proto_msgTypes[2]
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		ms.StoreMessageInfo(mi)
	}
}

func (x *EventSubscriptionState) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*EventSubscriptionState) ProtoMessage() {}

func (x *EventSubscriptionState) ProtoReflect() protoreflect.Message {
	mi := &file_common_events_proto_msgTypes[2]
	if protoimpl.UnsafeEnabled && x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use EventSubscriptionState.ProtoReflect.Descriptor instead.
func (*EventSubscriptionState) Descriptor() ([]byte, []int) {
	return file_common_events_proto_rawDescGZIP(), []int{2}
}

func (x *EventSubscriptionState) GetRequestId() string {
	if x != nil {
		return x.RequestId
	}
	return ""
}

func (x *EventSubscriptionState) GetStatus() EventSubscriptionState_STATUS {
	if x != nil {
		return x.Status
	}
	return EventSubscriptionState_PENDING_ACK
}

func (x *EventSubscriptionState) GetMessage() string {
	if x != nil {
		return x.Message
	}
	return ""
}

func (x *EventSubscriptionState) GetEventMatcher() *EventMatcher {
	if x != nil {
		return x.EventMatcher
	}
	return nil
}

func (x *EventSubscriptionState) GetEventPublicationSpec() *EventPublication {
	if x != nil {
		return x.EventPublicationSpec
	}
	return nil
}

type ContractTransaction struct {
	state         protoimpl.MessageState
	sizeCache     protoimpl.SizeCache
	unknownFields protoimpl.UnknownFields

	DriverId        string   `protobuf:"bytes,1,opt,name=driverId,proto3" json:"driverId,omitempty"`
	LedgerId        string   `protobuf:"bytes,2,opt,name=ledgerId,proto3" json:"ledgerId,omitempty"`
	ContractId      string   `protobuf:"bytes,3,opt,name=contractId,proto3" json:"contractId,omitempty"`
	Func            string   `protobuf:"bytes,4,opt,name=func,proto3" json:"func,omitempty"`
	Args            [][]byte `protobuf:"bytes,5,rep,name=args,proto3" json:"args,omitempty"`
	ReplaceArgIndex uint64   `protobuf:"varint,6,opt,name=replaceArgIndex,proto3" json:"replaceArgIndex,omitempty"`
}

func (x *ContractTransaction) Reset() {
	*x = ContractTransaction{}
	if protoimpl.UnsafeEnabled {
		mi := &file_common_events_proto_msgTypes[3]
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		ms.StoreMessageInfo(mi)
	}
}

func (x *ContractTransaction) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*ContractTransaction) ProtoMessage() {}

func (x *ContractTransaction) ProtoReflect() protoreflect.Message {
	mi := &file_common_events_proto_msgTypes[3]
	if protoimpl.UnsafeEnabled && x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use ContractTransaction.ProtoReflect.Descriptor instead.
func (*ContractTransaction) Descriptor() ([]byte, []int) {
	return file_common_events_proto_rawDescGZIP(), []int{3}
}

func (x *ContractTransaction) GetDriverId() string {
	if x != nil {
		return x.DriverId
	}
	return ""
}

func (x *ContractTransaction) GetLedgerId() string {
	if x != nil {
		return x.LedgerId
	}
	return ""
}

func (x *ContractTransaction) GetContractId() string {
	if x != nil {
		return x.ContractId
	}
	return ""
}

func (x *ContractTransaction) GetFunc() string {
	if x != nil {
		return x.Func
	}
	return ""
}

func (x *ContractTransaction) GetArgs() [][]byte {
	if x != nil {
		return x.Args
	}
	return nil
}

func (x *ContractTransaction) GetReplaceArgIndex() uint64 {
	if x != nil {
		return x.ReplaceArgIndex
	}
	return 0
}

type EventPublication struct {
	state         protoimpl.MessageState
	sizeCache     protoimpl.SizeCache
	unknownFields protoimpl.UnknownFields

	// Types that are assignable to PublicationTarget:
	//	*EventPublication_Ctx
	//	*EventPublication_AppUrl
	PublicationTarget isEventPublication_PublicationTarget `protobuf_oneof:"publication_target"`
}

func (x *EventPublication) Reset() {
	*x = EventPublication{}
	if protoimpl.UnsafeEnabled {
		mi := &file_common_events_proto_msgTypes[4]
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		ms.StoreMessageInfo(mi)
	}
}

func (x *EventPublication) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*EventPublication) ProtoMessage() {}

func (x *EventPublication) ProtoReflect() protoreflect.Message {
	mi := &file_common_events_proto_msgTypes[4]
	if protoimpl.UnsafeEnabled && x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use EventPublication.ProtoReflect.Descriptor instead.
func (*EventPublication) Descriptor() ([]byte, []int) {
	return file_common_events_proto_rawDescGZIP(), []int{4}
}

func (m *EventPublication) GetPublicationTarget() isEventPublication_PublicationTarget {
	if m != nil {
		return m.PublicationTarget
	}
	return nil
}

func (x *EventPublication) GetCtx() *ContractTransaction {
	if x, ok := x.GetPublicationTarget().(*EventPublication_Ctx); ok {
		return x.Ctx
	}
	return nil
}

func (x *EventPublication) GetAppUrl() string {
	if x, ok := x.GetPublicationTarget().(*EventPublication_AppUrl); ok {
		return x.AppUrl
	}
	return ""
}

type isEventPublication_PublicationTarget interface {
	isEventPublication_PublicationTarget()
}

type EventPublication_Ctx struct {
	Ctx *ContractTransaction `protobuf:"bytes,1,opt,name=ctx,proto3,oneof"`
}

type EventPublication_AppUrl struct {
	AppUrl string `protobuf:"bytes,2,opt,name=app_url,json=appUrl,proto3,oneof"`
}

func (*EventPublication_Ctx) isEventPublication_PublicationTarget() {}

func (*EventPublication_AppUrl) isEventPublication_PublicationTarget() {}

var File_common_events_proto protoreflect.FileDescriptor

var file_common_events_proto_rawDesc = []byte{
	0x0a, 0x13, 0x63, 0x6f, 0x6d, 0x6d, 0x6f, 0x6e, 0x2f, 0x65, 0x76, 0x65, 0x6e, 0x74, 0x73, 0x2e,
	0x70, 0x72, 0x6f, 0x74, 0x6f, 0x12, 0x0d, 0x63, 0x6f, 0x6d, 0x6d, 0x6f, 0x6e, 0x2e, 0x65, 0x76,
	0x65, 0x6e, 0x74, 0x73, 0x1a, 0x12, 0x63, 0x6f, 0x6d, 0x6d, 0x6f, 0x6e, 0x2f, 0x71, 0x75, 0x65,
	0x72, 0x79, 0x2e, 0x70, 0x72, 0x6f, 0x74, 0x6f, 0x22, 0x86, 0x01, 0x0a, 0x0c, 0x45, 0x76, 0x65,
	0x6e, 0x74, 0x4d, 0x61, 0x74, 0x63, 0x68, 0x65, 0x72, 0x12, 0x2c, 0x0a, 0x04, 0x74, 0x79, 0x70,
	0x65, 0x18, 0x01, 0x20, 0x01, 0x28, 0x0e, 0x32, 0x18, 0x2e, 0x63, 0x6f, 0x6d, 0x6d, 0x6f, 0x6e,
	0x2e, 0x65, 0x76, 0x65, 0x6e, 0x74, 0x73, 0x2e, 0x45, 0x76, 0x65, 0x6e, 0x74, 0x54, 0x79, 0x70,
	0x65, 0x52, 0x04, 0x74, 0x79, 0x70, 0x65, 0x12, 0x1d, 0x0a, 0x0a, 0x65, 0x76, 0x65, 0x6e, 0x74,
	0x5f, 0x6e, 0x61, 0x6d, 0x65, 0x18, 0x02, 0x20, 0x01, 0x28, 0x09, 0x52, 0x09, 0x65, 0x76, 0x65,
	0x6e, 0x74, 0x4e, 0x61, 0x6d, 0x65, 0x12, 0x29, 0x0a, 0x10, 0x74, 0x72, 0x61, 0x6e, 0x73, 0x61,
	0x63, 0x74, 0x69, 0x6f, 0x6e, 0x5f, 0x66, 0x75, 0x6e, 0x63, 0x18, 0x03, 0x20, 0x01, 0x28, 0x09,
	0x52, 0x0f, 0x74, 0x72, 0x61, 0x6e, 0x73, 0x61, 0x63, 0x74, 0x69, 0x6f, 0x6e, 0x46, 0x75, 0x6e,
	0x63, 0x22, 0x7f, 0x0a, 0x11, 0x45, 0x76, 0x65, 0x6e, 0x74, 0x53, 0x75, 0x62, 0x73, 0x63, 0x72,
	0x69, 0x70, 0x74, 0x69, 0x6f, 0x6e, 0x12, 0x3f, 0x0a, 0x0c, 0x65, 0x76, 0x65, 0x6e, 0x74, 0x4d,
	0x61, 0x74, 0x63, 0x68, 0x65, 0x72, 0x18, 0x01, 0x20, 0x01, 0x28, 0x0b, 0x32, 0x1b, 0x2e, 0x63,
	0x6f, 0x6d, 0x6d, 0x6f, 0x6e, 0x2e, 0x65, 0x76, 0x65, 0x6e, 0x74, 0x73, 0x2e, 0x45, 0x76, 0x65,
	0x6e, 0x74, 0x4d, 0x61, 0x74, 0x63, 0x68, 0x65, 0x72, 0x52, 0x0c, 0x65, 0x76, 0x65, 0x6e, 0x74,
	0x4d, 0x61, 0x74, 0x63, 0x68, 0x65, 0x72, 0x12, 0x29, 0x0a, 0x05, 0x71, 0x75, 0x65, 0x72, 0x79,
	0x18, 0x02, 0x20, 0x01, 0x28, 0x0b, 0x32, 0x13, 0x2e, 0x63, 0x6f, 0x6d, 0x6d, 0x6f, 0x6e, 0x2e,
	0x71, 0x75, 0x65, 0x72, 0x79, 0x2e, 0x51, 0x75, 0x65, 0x72, 0x79, 0x52, 0x05, 0x71, 0x75, 0x65,
	0x72, 0x79, 0x22, 0xed, 0x02, 0x0a, 0x16, 0x45, 0x76, 0x65, 0x6e, 0x74, 0x53, 0x75, 0x62, 0x73,
	0x63, 0x72, 0x69, 0x70, 0x74, 0x69, 0x6f, 0x6e, 0x53, 0x74, 0x61, 0x74, 0x65, 0x12, 0x1d, 0x0a,
	0x0a, 0x72, 0x65, 0x71, 0x75, 0x65, 0x73, 0x74, 0x5f, 0x69, 0x64, 0x18, 0x01, 0x20, 0x01, 0x28,
	0x09, 0x52, 0x09, 0x72, 0x65, 0x71, 0x75, 0x65, 0x73, 0x74, 0x49, 0x64, 0x12, 0x44, 0x0a, 0x06,
	0x73, 0x74, 0x61, 0x74, 0x75, 0x73, 0x18, 0x02, 0x20, 0x01, 0x28, 0x0e, 0x32, 0x2c, 0x2e, 0x63,
	0x6f, 0x6d, 0x6d, 0x6f, 0x6e, 0x2e, 0x65, 0x76, 0x65, 0x6e, 0x74, 0x73, 0x2e, 0x45, 0x76, 0x65,
	0x6e, 0x74, 0x53, 0x75, 0x62, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74, 0x69, 0x6f, 0x6e, 0x53, 0x74,
	0x61, 0x74, 0x65, 0x2e, 0x53, 0x54, 0x41, 0x54, 0x55, 0x53, 0x52, 0x06, 0x73, 0x74, 0x61, 0x74,
	0x75, 0x73, 0x12, 0x18, 0x0a, 0x07, 0x6d, 0x65, 0x73, 0x73, 0x61, 0x67, 0x65, 0x18, 0x03, 0x20,
	0x01, 0x28, 0x09, 0x52, 0x07, 0x6d, 0x65, 0x73, 0x73, 0x61, 0x67, 0x65, 0x12, 0x3f, 0x0a, 0x0c,
	0x65, 0x76, 0x65, 0x6e, 0x74, 0x4d, 0x61, 0x74, 0x63, 0x68, 0x65, 0x72, 0x18, 0x04, 0x20, 0x01,
	0x28, 0x0b, 0x32, 0x1b, 0x2e, 0x63, 0x6f, 0x6d, 0x6d, 0x6f, 0x6e, 0x2e, 0x65, 0x76, 0x65, 0x6e,
	0x74, 0x73, 0x2e, 0x45, 0x76, 0x65, 0x6e, 0x74, 0x4d, 0x61, 0x74, 0x63, 0x68, 0x65, 0x72, 0x52,
	0x0c, 0x65, 0x76, 0x65, 0x6e, 0x74, 0x4d, 0x61, 0x74, 0x63, 0x68, 0x65, 0x72, 0x12, 0x53, 0x0a,
	0x14, 0x65, 0x76, 0x65, 0x6e, 0x74, 0x50, 0x75, 0x62, 0x6c, 0x69, 0x63, 0x61, 0x74, 0x69, 0x6f,
	0x6e, 0x53, 0x70, 0x65, 0x63, 0x18, 0x05, 0x20, 0x01, 0x28, 0x0b, 0x32, 0x1f, 0x2e, 0x63, 0x6f,
	0x6d, 0x6d, 0x6f, 0x6e, 0x2e, 0x65, 0x76, 0x65, 0x6e, 0x74, 0x73, 0x2e, 0x45, 0x76, 0x65, 0x6e,
	0x74, 0x50, 0x75, 0x62, 0x6c, 0x69, 0x63, 0x61, 0x74, 0x69, 0x6f, 0x6e, 0x52, 0x14, 0x65, 0x76,
	0x65, 0x6e, 0x74, 0x50, 0x75, 0x62, 0x6c, 0x69, 0x63, 0x61, 0x74, 0x69, 0x6f, 0x6e, 0x53, 0x70,
	0x65, 0x63, 0x22, 0x3e, 0x0a, 0x06, 0x53, 0x54, 0x41, 0x54, 0x55, 0x53, 0x12, 0x0f, 0x0a, 0x0b,
	0x50, 0x45, 0x4e, 0x44, 0x49, 0x4e, 0x47, 0x5f, 0x41, 0x43, 0x4b, 0x10, 0x00, 0x12, 0x0b, 0x0a,
	0x07, 0x50, 0x45, 0x4e, 0x44, 0x49, 0x4e, 0x47, 0x10, 0x01, 0x12, 0x09, 0x0a, 0x05, 0x45, 0x52,
	0x52, 0x4f, 0x52, 0x10, 0x02, 0x12, 0x0b, 0x0a, 0x07, 0x53, 0x55, 0x43, 0x43, 0x45, 0x53, 0x53,
	0x10, 0x03, 0x22, 0xbf, 0x01, 0x0a, 0x13, 0x43, 0x6f, 0x6e, 0x74, 0x72, 0x61, 0x63, 0x74, 0x54,
	0x72, 0x61, 0x6e, 0x73, 0x61, 0x63, 0x74, 0x69, 0x6f, 0x6e, 0x12, 0x1a, 0x0a, 0x08, 0x64, 0x72,
	0x69, 0x76, 0x65, 0x72, 0x49, 0x64, 0x18, 0x01, 0x20, 0x01, 0x28, 0x09, 0x52, 0x08, 0x64, 0x72,
	0x69, 0x76, 0x65, 0x72, 0x49, 0x64, 0x12, 0x1a, 0x0a, 0x08, 0x6c, 0x65, 0x64, 0x67, 0x65, 0x72,
	0x49, 0x64, 0x18, 0x02, 0x20, 0x01, 0x28, 0x09, 0x52, 0x08, 0x6c, 0x65, 0x64, 0x67, 0x65, 0x72,
	0x49, 0x64, 0x12, 0x1e, 0x0a, 0x0a, 0x63, 0x6f, 0x6e, 0x74, 0x72, 0x61, 0x63, 0x74, 0x49, 0x64,
	0x18, 0x03, 0x20, 0x01, 0x28, 0x09, 0x52, 0x0a, 0x63, 0x6f, 0x6e, 0x74, 0x72, 0x61, 0x63, 0x74,
	0x49, 0x64, 0x12, 0x12, 0x0a, 0x04, 0x66, 0x75, 0x6e, 0x63, 0x18, 0x04, 0x20, 0x01, 0x28, 0x09,
	0x52, 0x04, 0x66, 0x75, 0x6e, 0x63, 0x12, 0x12, 0x0a, 0x04, 0x61, 0x72, 0x67, 0x73, 0x18, 0x05,
	0x20, 0x03, 0x28, 0x0c, 0x52, 0x04, 0x61, 0x72, 0x67, 0x73, 0x12, 0x28, 0x0a, 0x0f, 0x72, 0x65,
	0x70, 0x6c, 0x61, 0x63, 0x65, 0x41, 0x72, 0x67, 0x49, 0x6e, 0x64, 0x65, 0x78, 0x18, 0x06, 0x20,
	0x01, 0x28, 0x04, 0x52, 0x0f, 0x72, 0x65, 0x70, 0x6c, 0x61, 0x63, 0x65, 0x41, 0x72, 0x67, 0x49,
	0x6e, 0x64, 0x65, 0x78, 0x22, 0x7b, 0x0a, 0x10, 0x45, 0x76, 0x65, 0x6e, 0x74, 0x50, 0x75, 0x62,
	0x6c, 0x69, 0x63, 0x61, 0x74, 0x69, 0x6f, 0x6e, 0x12, 0x36, 0x0a, 0x03, 0x63, 0x74, 0x78, 0x18,
	0x01, 0x20, 0x01, 0x28, 0x0b, 0x32, 0x22, 0x2e, 0x63, 0x6f, 0x6d, 0x6d, 0x6f, 0x6e, 0x2e, 0x65,
	0x76, 0x65, 0x6e, 0x74, 0x73, 0x2e, 0x43, 0x6f, 0x6e, 0x74, 0x72, 0x61, 0x63, 0x74, 0x54, 0x72,
	0x61, 0x6e, 0x73, 0x61, 0x63, 0x74, 0x69, 0x6f, 0x6e, 0x48, 0x00, 0x52, 0x03, 0x63, 0x74, 0x78,
	0x12, 0x19, 0x0a, 0x07, 0x61, 0x70, 0x70, 0x5f, 0x75, 0x72, 0x6c, 0x18, 0x02, 0x20, 0x01, 0x28,
	0x09, 0x48, 0x00, 0x52, 0x06, 0x61, 0x70, 0x70, 0x55, 0x72, 0x6c, 0x42, 0x14, 0x0a, 0x12, 0x70,
	0x75, 0x62, 0x6c, 0x69, 0x63, 0x61, 0x74, 0x69, 0x6f, 0x6e, 0x5f, 0x74, 0x61, 0x72, 0x67, 0x65,
	0x74, 0x2a, 0x3b, 0x0a, 0x09, 0x45, 0x76, 0x65, 0x6e, 0x74, 0x54, 0x79, 0x70, 0x65, 0x12, 0x0f,
	0x0a, 0x0b, 0x4c, 0x65, 0x64, 0x67, 0x65, 0x72, 0x53, 0x74, 0x61, 0x74, 0x65, 0x10, 0x00, 0x12,
	0x0d, 0x0a, 0x09, 0x41, 0x73, 0x73, 0x65, 0x74, 0x4c, 0x6f, 0x63, 0x6b, 0x10, 0x01, 0x12, 0x0e,
	0x0a, 0x0a, 0x41, 0x73, 0x73, 0x65, 0x74, 0x43, 0x6c, 0x61, 0x69, 0x6d, 0x10, 0x02, 0x42, 0x72,
	0x0a, 0x1f, 0x63, 0x6f, 0x6d, 0x2e, 0x77, 0x65, 0x61, 0x76, 0x65, 0x72, 0x2e, 0x70, 0x72, 0x6f,
	0x74, 0x6f, 0x73, 0x2e, 0x63, 0x6f, 0x6d, 0x6d, 0x6f, 0x6e, 0x2e, 0x65, 0x76, 0x65, 0x6e, 0x74,
	0x73, 0x5a, 0x4f, 0x67, 0x69, 0x74, 0x68, 0x75, 0x62, 0x2e, 0x63, 0x6f, 0x6d, 0x2f, 0x68, 0x79,
	0x70, 0x65, 0x72, 0x6c, 0x65, 0x64, 0x67, 0x65, 0x72, 0x2d, 0x6c, 0x61, 0x62, 0x73, 0x2f, 0x77,
	0x65, 0x61, 0x76, 0x65, 0x72, 0x2d, 0x64, 0x6c, 0x74, 0x2d, 0x69, 0x6e, 0x74, 0x65, 0x72, 0x6f,
	0x70, 0x65, 0x72, 0x61, 0x62, 0x69, 0x6c, 0x69, 0x74, 0x79, 0x2f, 0x63, 0x6f, 0x6d, 0x6d, 0x6f,
	0x6e, 0x2f, 0x70, 0x72, 0x6f, 0x74, 0x6f, 0x73, 0x2d, 0x67, 0x6f, 0x2f, 0x63, 0x6f, 0x6d, 0x6d,
	0x6f, 0x6e, 0x62, 0x06, 0x70, 0x72, 0x6f, 0x74, 0x6f, 0x33,
}

var (
	file_common_events_proto_rawDescOnce sync.Once
	file_common_events_proto_rawDescData = file_common_events_proto_rawDesc
)

func file_common_events_proto_rawDescGZIP() []byte {
	file_common_events_proto_rawDescOnce.Do(func() {
		file_common_events_proto_rawDescData = protoimpl.X.CompressGZIP(file_common_events_proto_rawDescData)
	})
	return file_common_events_proto_rawDescData
}

var file_common_events_proto_enumTypes = make([]protoimpl.EnumInfo, 2)
var file_common_events_proto_msgTypes = make([]protoimpl.MessageInfo, 5)
var file_common_events_proto_goTypes = []interface{}{
	(EventType)(0),                     // 0: common.events.EventType
	(EventSubscriptionState_STATUS)(0), // 1: common.events.EventSubscriptionState.STATUS
	(*EventMatcher)(nil),               // 2: common.events.EventMatcher
	(*EventSubscription)(nil),          // 3: common.events.EventSubscription
	(*EventSubscriptionState)(nil),     // 4: common.events.EventSubscriptionState
	(*ContractTransaction)(nil),        // 5: common.events.ContractTransaction
	(*EventPublication)(nil),           // 6: common.events.EventPublication
	(*Query)(nil),                      // 7: common.query.Query
}
var file_common_events_proto_depIdxs = []int32{
	0, // 0: common.events.EventMatcher.type:type_name -> common.events.EventType
	2, // 1: common.events.EventSubscription.eventMatcher:type_name -> common.events.EventMatcher
	7, // 2: common.events.EventSubscription.query:type_name -> common.query.Query
	1, // 3: common.events.EventSubscriptionState.status:type_name -> common.events.EventSubscriptionState.STATUS
	2, // 4: common.events.EventSubscriptionState.eventMatcher:type_name -> common.events.EventMatcher
	6, // 5: common.events.EventSubscriptionState.eventPublicationSpec:type_name -> common.events.EventPublication
	5, // 6: common.events.EventPublication.ctx:type_name -> common.events.ContractTransaction
	7, // [7:7] is the sub-list for method output_type
	7, // [7:7] is the sub-list for method input_type
	7, // [7:7] is the sub-list for extension type_name
	7, // [7:7] is the sub-list for extension extendee
	0, // [0:7] is the sub-list for field type_name
}

func init() { file_common_events_proto_init() }
func file_common_events_proto_init() {
	if File_common_events_proto != nil {
		return
	}
	file_common_query_proto_init()
	if !protoimpl.UnsafeEnabled {
		file_common_events_proto_msgTypes[0].Exporter = func(v interface{}, i int) interface{} {
			switch v := v.(*EventMatcher); i {
			case 0:
				return &v.state
			case 1:
				return &v.sizeCache
			case 2:
				return &v.unknownFields
			default:
				return nil
			}
		}
		file_common_events_proto_msgTypes[1].Exporter = func(v interface{}, i int) interface{} {
			switch v := v.(*EventSubscription); i {
			case 0:
				return &v.state
			case 1:
				return &v.sizeCache
			case 2:
				return &v.unknownFields
			default:
				return nil
			}
		}
		file_common_events_proto_msgTypes[2].Exporter = func(v interface{}, i int) interface{} {
			switch v := v.(*EventSubscriptionState); i {
			case 0:
				return &v.state
			case 1:
				return &v.sizeCache
			case 2:
				return &v.unknownFields
			default:
				return nil
			}
		}
		file_common_events_proto_msgTypes[3].Exporter = func(v interface{}, i int) interface{} {
			switch v := v.(*ContractTransaction); i {
			case 0:
				return &v.state
			case 1:
				return &v.sizeCache
			case 2:
				return &v.unknownFields
			default:
				return nil
			}
		}
		file_common_events_proto_msgTypes[4].Exporter = func(v interface{}, i int) interface{} {
			switch v := v.(*EventPublication); i {
			case 0:
				return &v.state
			case 1:
				return &v.sizeCache
			case 2:
				return &v.unknownFields
			default:
				return nil
			}
		}
	}
	file_common_events_proto_msgTypes[4].OneofWrappers = []interface{}{
		(*EventPublication_Ctx)(nil),
		(*EventPublication_AppUrl)(nil),
	}
	type x struct{}
	out := protoimpl.TypeBuilder{
		File: protoimpl.DescBuilder{
			GoPackagePath: reflect.TypeOf(x{}).PkgPath(),
			RawDescriptor: file_common_events_proto_rawDesc,
			NumEnums:      2,
			NumMessages:   5,
			NumExtensions: 0,
			NumServices:   0,
		},
		GoTypes:           file_common_events_proto_goTypes,
		DependencyIndexes: file_common_events_proto_depIdxs,
		EnumInfos:         file_common_events_proto_enumTypes,
		MessageInfos:      file_common_events_proto_msgTypes,
	}.Build()
	File_common_events_proto = out.File
	file_common_events_proto_rawDesc = nil
	file_common_events_proto_goTypes = nil
	file_common_events_proto_depIdxs = nil
}
