// Code generated by protoc-gen-go. DO NOT EDIT.
// versions:
// 	protoc-gen-go v1.28.0
// 	protoc        v3.17.3
// source: common/interop_payload.proto

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

type ConfidentialPayload_HashType int32

const (
	ConfidentialPayload_HMAC ConfidentialPayload_HashType = 0
)

// Enum value maps for ConfidentialPayload_HashType.
var (
	ConfidentialPayload_HashType_name = map[int32]string{
		0: "HMAC",
	}
	ConfidentialPayload_HashType_value = map[string]int32{
		"HMAC": 0,
	}
)

func (x ConfidentialPayload_HashType) Enum() *ConfidentialPayload_HashType {
	p := new(ConfidentialPayload_HashType)
	*p = x
	return p
}

func (x ConfidentialPayload_HashType) String() string {
	return protoimpl.X.EnumStringOf(x.Descriptor(), protoreflect.EnumNumber(x))
}

func (ConfidentialPayload_HashType) Descriptor() protoreflect.EnumDescriptor {
	return file_common_interop_payload_proto_enumTypes[0].Descriptor()
}

func (ConfidentialPayload_HashType) Type() protoreflect.EnumType {
	return &file_common_interop_payload_proto_enumTypes[0]
}

func (x ConfidentialPayload_HashType) Number() protoreflect.EnumNumber {
	return protoreflect.EnumNumber(x)
}

// Deprecated: Use ConfidentialPayload_HashType.Descriptor instead.
func (ConfidentialPayload_HashType) EnumDescriptor() ([]byte, []int) {
	return file_common_interop_payload_proto_rawDescGZIP(), []int{1, 0}
}

type InteropPayload struct {
	state         protoimpl.MessageState
	sizeCache     protoimpl.SizeCache
	unknownFields protoimpl.UnknownFields

	Payload              []byte `protobuf:"bytes,1,opt,name=payload,proto3" json:"payload,omitempty"`
	Address              string `protobuf:"bytes,2,opt,name=address,proto3" json:"address,omitempty"`
	Confidential         bool   `protobuf:"varint,3,opt,name=confidential,proto3" json:"confidential,omitempty"`
	RequestorCertificate string `protobuf:"bytes,4,opt,name=requestor_certificate,json=requestorCertificate,proto3" json:"requestor_certificate,omitempty"`
	Nonce                string `protobuf:"bytes,5,opt,name=nonce,proto3" json:"nonce,omitempty"`
}

func (x *InteropPayload) Reset() {
	*x = InteropPayload{}
	if protoimpl.UnsafeEnabled {
		mi := &file_common_interop_payload_proto_msgTypes[0]
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		ms.StoreMessageInfo(mi)
	}
}

func (x *InteropPayload) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*InteropPayload) ProtoMessage() {}

func (x *InteropPayload) ProtoReflect() protoreflect.Message {
	mi := &file_common_interop_payload_proto_msgTypes[0]
	if protoimpl.UnsafeEnabled && x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use InteropPayload.ProtoReflect.Descriptor instead.
func (*InteropPayload) Descriptor() ([]byte, []int) {
	return file_common_interop_payload_proto_rawDescGZIP(), []int{0}
}

func (x *InteropPayload) GetPayload() []byte {
	if x != nil {
		return x.Payload
	}
	return nil
}

func (x *InteropPayload) GetAddress() string {
	if x != nil {
		return x.Address
	}
	return ""
}

func (x *InteropPayload) GetConfidential() bool {
	if x != nil {
		return x.Confidential
	}
	return false
}

func (x *InteropPayload) GetRequestorCertificate() string {
	if x != nil {
		return x.RequestorCertificate
	}
	return ""
}

func (x *InteropPayload) GetNonce() string {
	if x != nil {
		return x.Nonce
	}
	return ""
}

type ConfidentialPayload struct {
	state         protoimpl.MessageState
	sizeCache     protoimpl.SizeCache
	unknownFields protoimpl.UnknownFields

	EncryptedPayload []byte                       `protobuf:"bytes,1,opt,name=encrypted_payload,json=encryptedPayload,proto3" json:"encrypted_payload,omitempty"`
	HashType         ConfidentialPayload_HashType `protobuf:"varint,2,opt,name=hash_type,json=hashType,proto3,enum=common.interop_payload.ConfidentialPayload_HashType" json:"hash_type,omitempty"`
	Hash             []byte                       `protobuf:"bytes,3,opt,name=hash,proto3" json:"hash,omitempty"`
}

func (x *ConfidentialPayload) Reset() {
	*x = ConfidentialPayload{}
	if protoimpl.UnsafeEnabled {
		mi := &file_common_interop_payload_proto_msgTypes[1]
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		ms.StoreMessageInfo(mi)
	}
}

func (x *ConfidentialPayload) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*ConfidentialPayload) ProtoMessage() {}

func (x *ConfidentialPayload) ProtoReflect() protoreflect.Message {
	mi := &file_common_interop_payload_proto_msgTypes[1]
	if protoimpl.UnsafeEnabled && x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use ConfidentialPayload.ProtoReflect.Descriptor instead.
func (*ConfidentialPayload) Descriptor() ([]byte, []int) {
	return file_common_interop_payload_proto_rawDescGZIP(), []int{1}
}

func (x *ConfidentialPayload) GetEncryptedPayload() []byte {
	if x != nil {
		return x.EncryptedPayload
	}
	return nil
}

func (x *ConfidentialPayload) GetHashType() ConfidentialPayload_HashType {
	if x != nil {
		return x.HashType
	}
	return ConfidentialPayload_HMAC
}

func (x *ConfidentialPayload) GetHash() []byte {
	if x != nil {
		return x.Hash
	}
	return nil
}

type ConfidentialPayloadContents struct {
	state         protoimpl.MessageState
	sizeCache     protoimpl.SizeCache
	unknownFields protoimpl.UnknownFields

	Payload []byte `protobuf:"bytes,1,opt,name=payload,proto3" json:"payload,omitempty"`
	Random  []byte `protobuf:"bytes,2,opt,name=random,proto3" json:"random,omitempty"`
}

func (x *ConfidentialPayloadContents) Reset() {
	*x = ConfidentialPayloadContents{}
	if protoimpl.UnsafeEnabled {
		mi := &file_common_interop_payload_proto_msgTypes[2]
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		ms.StoreMessageInfo(mi)
	}
}

func (x *ConfidentialPayloadContents) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*ConfidentialPayloadContents) ProtoMessage() {}

func (x *ConfidentialPayloadContents) ProtoReflect() protoreflect.Message {
	mi := &file_common_interop_payload_proto_msgTypes[2]
	if protoimpl.UnsafeEnabled && x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use ConfidentialPayloadContents.ProtoReflect.Descriptor instead.
func (*ConfidentialPayloadContents) Descriptor() ([]byte, []int) {
	return file_common_interop_payload_proto_rawDescGZIP(), []int{2}
}

func (x *ConfidentialPayloadContents) GetPayload() []byte {
	if x != nil {
		return x.Payload
	}
	return nil
}

func (x *ConfidentialPayloadContents) GetRandom() []byte {
	if x != nil {
		return x.Random
	}
	return nil
}

var File_common_interop_payload_proto protoreflect.FileDescriptor

var file_common_interop_payload_proto_rawDesc = []byte{
	0x0a, 0x1c, 0x63, 0x6f, 0x6d, 0x6d, 0x6f, 0x6e, 0x2f, 0x69, 0x6e, 0x74, 0x65, 0x72, 0x6f, 0x70,
	0x5f, 0x70, 0x61, 0x79, 0x6c, 0x6f, 0x61, 0x64, 0x2e, 0x70, 0x72, 0x6f, 0x74, 0x6f, 0x12, 0x16,
	0x63, 0x6f, 0x6d, 0x6d, 0x6f, 0x6e, 0x2e, 0x69, 0x6e, 0x74, 0x65, 0x72, 0x6f, 0x70, 0x5f, 0x70,
	0x61, 0x79, 0x6c, 0x6f, 0x61, 0x64, 0x22, 0xb3, 0x01, 0x0a, 0x0e, 0x49, 0x6e, 0x74, 0x65, 0x72,
	0x6f, 0x70, 0x50, 0x61, 0x79, 0x6c, 0x6f, 0x61, 0x64, 0x12, 0x18, 0x0a, 0x07, 0x70, 0x61, 0x79,
	0x6c, 0x6f, 0x61, 0x64, 0x18, 0x01, 0x20, 0x01, 0x28, 0x0c, 0x52, 0x07, 0x70, 0x61, 0x79, 0x6c,
	0x6f, 0x61, 0x64, 0x12, 0x18, 0x0a, 0x07, 0x61, 0x64, 0x64, 0x72, 0x65, 0x73, 0x73, 0x18, 0x02,
	0x20, 0x01, 0x28, 0x09, 0x52, 0x07, 0x61, 0x64, 0x64, 0x72, 0x65, 0x73, 0x73, 0x12, 0x22, 0x0a,
	0x0c, 0x63, 0x6f, 0x6e, 0x66, 0x69, 0x64, 0x65, 0x6e, 0x74, 0x69, 0x61, 0x6c, 0x18, 0x03, 0x20,
	0x01, 0x28, 0x08, 0x52, 0x0c, 0x63, 0x6f, 0x6e, 0x66, 0x69, 0x64, 0x65, 0x6e, 0x74, 0x69, 0x61,
	0x6c, 0x12, 0x33, 0x0a, 0x15, 0x72, 0x65, 0x71, 0x75, 0x65, 0x73, 0x74, 0x6f, 0x72, 0x5f, 0x63,
	0x65, 0x72, 0x74, 0x69, 0x66, 0x69, 0x63, 0x61, 0x74, 0x65, 0x18, 0x04, 0x20, 0x01, 0x28, 0x09,
	0x52, 0x14, 0x72, 0x65, 0x71, 0x75, 0x65, 0x73, 0x74, 0x6f, 0x72, 0x43, 0x65, 0x72, 0x74, 0x69,
	0x66, 0x69, 0x63, 0x61, 0x74, 0x65, 0x12, 0x14, 0x0a, 0x05, 0x6e, 0x6f, 0x6e, 0x63, 0x65, 0x18,
	0x05, 0x20, 0x01, 0x28, 0x09, 0x52, 0x05, 0x6e, 0x6f, 0x6e, 0x63, 0x65, 0x22, 0xbf, 0x01, 0x0a,
	0x13, 0x43, 0x6f, 0x6e, 0x66, 0x69, 0x64, 0x65, 0x6e, 0x74, 0x69, 0x61, 0x6c, 0x50, 0x61, 0x79,
	0x6c, 0x6f, 0x61, 0x64, 0x12, 0x2b, 0x0a, 0x11, 0x65, 0x6e, 0x63, 0x72, 0x79, 0x70, 0x74, 0x65,
	0x64, 0x5f, 0x70, 0x61, 0x79, 0x6c, 0x6f, 0x61, 0x64, 0x18, 0x01, 0x20, 0x01, 0x28, 0x0c, 0x52,
	0x10, 0x65, 0x6e, 0x63, 0x72, 0x79, 0x70, 0x74, 0x65, 0x64, 0x50, 0x61, 0x79, 0x6c, 0x6f, 0x61,
	0x64, 0x12, 0x51, 0x0a, 0x09, 0x68, 0x61, 0x73, 0x68, 0x5f, 0x74, 0x79, 0x70, 0x65, 0x18, 0x02,
	0x20, 0x01, 0x28, 0x0e, 0x32, 0x34, 0x2e, 0x63, 0x6f, 0x6d, 0x6d, 0x6f, 0x6e, 0x2e, 0x69, 0x6e,
	0x74, 0x65, 0x72, 0x6f, 0x70, 0x5f, 0x70, 0x61, 0x79, 0x6c, 0x6f, 0x61, 0x64, 0x2e, 0x43, 0x6f,
	0x6e, 0x66, 0x69, 0x64, 0x65, 0x6e, 0x74, 0x69, 0x61, 0x6c, 0x50, 0x61, 0x79, 0x6c, 0x6f, 0x61,
	0x64, 0x2e, 0x48, 0x61, 0x73, 0x68, 0x54, 0x79, 0x70, 0x65, 0x52, 0x08, 0x68, 0x61, 0x73, 0x68,
	0x54, 0x79, 0x70, 0x65, 0x12, 0x12, 0x0a, 0x04, 0x68, 0x61, 0x73, 0x68, 0x18, 0x03, 0x20, 0x01,
	0x28, 0x0c, 0x52, 0x04, 0x68, 0x61, 0x73, 0x68, 0x22, 0x14, 0x0a, 0x08, 0x48, 0x61, 0x73, 0x68,
	0x54, 0x79, 0x70, 0x65, 0x12, 0x08, 0x0a, 0x04, 0x48, 0x4d, 0x41, 0x43, 0x10, 0x00, 0x22, 0x4f,
	0x0a, 0x1b, 0x43, 0x6f, 0x6e, 0x66, 0x69, 0x64, 0x65, 0x6e, 0x74, 0x69, 0x61, 0x6c, 0x50, 0x61,
	0x79, 0x6c, 0x6f, 0x61, 0x64, 0x43, 0x6f, 0x6e, 0x74, 0x65, 0x6e, 0x74, 0x73, 0x12, 0x18, 0x0a,
	0x07, 0x70, 0x61, 0x79, 0x6c, 0x6f, 0x61, 0x64, 0x18, 0x01, 0x20, 0x01, 0x28, 0x0c, 0x52, 0x07,
	0x70, 0x61, 0x79, 0x6c, 0x6f, 0x61, 0x64, 0x12, 0x16, 0x0a, 0x06, 0x72, 0x61, 0x6e, 0x64, 0x6f,
	0x6d, 0x18, 0x02, 0x20, 0x01, 0x28, 0x0c, 0x52, 0x06, 0x72, 0x61, 0x6e, 0x64, 0x6f, 0x6d, 0x42,
	0x7b, 0x0a, 0x28, 0x63, 0x6f, 0x6d, 0x2e, 0x77, 0x65, 0x61, 0x76, 0x65, 0x72, 0x2e, 0x70, 0x72,
	0x6f, 0x74, 0x6f, 0x73, 0x2e, 0x63, 0x6f, 0x6d, 0x6d, 0x6f, 0x6e, 0x2e, 0x69, 0x6e, 0x74, 0x65,
	0x72, 0x6f, 0x70, 0x5f, 0x70, 0x61, 0x79, 0x6c, 0x6f, 0x61, 0x64, 0x5a, 0x4f, 0x67, 0x69, 0x74,
	0x68, 0x75, 0x62, 0x2e, 0x63, 0x6f, 0x6d, 0x2f, 0x68, 0x79, 0x70, 0x65, 0x72, 0x6c, 0x65, 0x64,
	0x67, 0x65, 0x72, 0x2d, 0x6c, 0x61, 0x62, 0x73, 0x2f, 0x77, 0x65, 0x61, 0x76, 0x65, 0x72, 0x2d,
	0x64, 0x6c, 0x74, 0x2d, 0x69, 0x6e, 0x74, 0x65, 0x72, 0x6f, 0x70, 0x65, 0x72, 0x61, 0x62, 0x69,
	0x6c, 0x69, 0x74, 0x79, 0x2f, 0x63, 0x6f, 0x6d, 0x6d, 0x6f, 0x6e, 0x2f, 0x70, 0x72, 0x6f, 0x74,
	0x6f, 0x73, 0x2d, 0x67, 0x6f, 0x2f, 0x63, 0x6f, 0x6d, 0x6d, 0x6f, 0x6e, 0x62, 0x06, 0x70, 0x72,
	0x6f, 0x74, 0x6f, 0x33,
}

var (
	file_common_interop_payload_proto_rawDescOnce sync.Once
	file_common_interop_payload_proto_rawDescData = file_common_interop_payload_proto_rawDesc
)

func file_common_interop_payload_proto_rawDescGZIP() []byte {
	file_common_interop_payload_proto_rawDescOnce.Do(func() {
		file_common_interop_payload_proto_rawDescData = protoimpl.X.CompressGZIP(file_common_interop_payload_proto_rawDescData)
	})
	return file_common_interop_payload_proto_rawDescData
}

var file_common_interop_payload_proto_enumTypes = make([]protoimpl.EnumInfo, 1)
var file_common_interop_payload_proto_msgTypes = make([]protoimpl.MessageInfo, 3)
var file_common_interop_payload_proto_goTypes = []interface{}{
	(ConfidentialPayload_HashType)(0),   // 0: common.interop_payload.ConfidentialPayload.HashType
	(*InteropPayload)(nil),              // 1: common.interop_payload.InteropPayload
	(*ConfidentialPayload)(nil),         // 2: common.interop_payload.ConfidentialPayload
	(*ConfidentialPayloadContents)(nil), // 3: common.interop_payload.ConfidentialPayloadContents
}
var file_common_interop_payload_proto_depIdxs = []int32{
	0, // 0: common.interop_payload.ConfidentialPayload.hash_type:type_name -> common.interop_payload.ConfidentialPayload.HashType
	1, // [1:1] is the sub-list for method output_type
	1, // [1:1] is the sub-list for method input_type
	1, // [1:1] is the sub-list for extension type_name
	1, // [1:1] is the sub-list for extension extendee
	0, // [0:1] is the sub-list for field type_name
}

func init() { file_common_interop_payload_proto_init() }
func file_common_interop_payload_proto_init() {
	if File_common_interop_payload_proto != nil {
		return
	}
	if !protoimpl.UnsafeEnabled {
		file_common_interop_payload_proto_msgTypes[0].Exporter = func(v interface{}, i int) interface{} {
			switch v := v.(*InteropPayload); i {
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
		file_common_interop_payload_proto_msgTypes[1].Exporter = func(v interface{}, i int) interface{} {
			switch v := v.(*ConfidentialPayload); i {
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
		file_common_interop_payload_proto_msgTypes[2].Exporter = func(v interface{}, i int) interface{} {
			switch v := v.(*ConfidentialPayloadContents); i {
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
	type x struct{}
	out := protoimpl.TypeBuilder{
		File: protoimpl.DescBuilder{
			GoPackagePath: reflect.TypeOf(x{}).PkgPath(),
			RawDescriptor: file_common_interop_payload_proto_rawDesc,
			NumEnums:      1,
			NumMessages:   3,
			NumExtensions: 0,
			NumServices:   0,
		},
		GoTypes:           file_common_interop_payload_proto_goTypes,
		DependencyIndexes: file_common_interop_payload_proto_depIdxs,
		EnumInfos:         file_common_interop_payload_proto_enumTypes,
		MessageInfos:      file_common_interop_payload_proto_msgTypes,
	}.Build()
	File_common_interop_payload_proto = out.File
	file_common_interop_payload_proto_rawDesc = nil
	file_common_interop_payload_proto_goTypes = nil
	file_common_interop_payload_proto_depIdxs = nil
}
