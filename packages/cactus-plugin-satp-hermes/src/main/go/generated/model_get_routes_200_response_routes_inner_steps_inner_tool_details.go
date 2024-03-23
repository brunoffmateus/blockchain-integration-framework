/*
SATP Gateway Client (Business Logic Orchestrator)

SATP is a protocol operating between two gateways that conducts the transfer of a digital asset from one gateway to another. The protocol establishes a secure channel between the endpoints and implements a 2-phase commit to ensure the properties of transfer atomicity, consistency, isolation and durability.  This API defines the gateway client facing API (business logic orchestrator, or BLO), which is named API-Type 1 in the SATP-Core specification.  **Additional Resources**: - [Proposed SATP Charter](https://datatracker.ietf.org/doc/charter-ietf-satp/) - [SATP Core draft](https://datatracker.ietf.org/doc/draft-ietf-satp-core) - [SATP Crash Recovery draft](https://datatracker.ietf.org/doc/draft-belchior-satp-gateway-recovery/) - [SATP Architecture draft](https://datatracker.ietf.org/doc/draft-ietf-satp-architecture/) - [SATP Use-Cases draft](https://datatracker.ietf.org/doc/draft-ramakrishna-sat-use-cases/) - [SATP Data sharing draft](https://datatracker.ietf.org/doc/draft-ramakrishna-satp-data-sharing) - [SATP View Addresses draft](https://datatracker.ietf.org/doc/draft-ramakrishna-satp-views-addresses)

API version: 0.0.2
*/

// Code generated by OpenAPI Generator (https://openapi-generator.tech); DO NOT EDIT.

package generated

import (
	"encoding/json"
)

// checks if the GetRoutes200ResponseRoutesInnerStepsInnerToolDetails type satisfies the MappedNullable interface at compile time
var _ MappedNullable = &GetRoutes200ResponseRoutesInnerStepsInnerToolDetails{}

// GetRoutes200ResponseRoutesInnerStepsInnerToolDetails Describes integration or tool details such as bridges or exchanges involved in the transaction.
type GetRoutes200ResponseRoutesInnerStepsInnerToolDetails struct {
	// A unique identifier for the integration or tool.
	Key string `json:"key"`
	// The name of the integration or tool.
	Name string `json:"name"`
	// URL to the logo of the integration or tool.
	LogoURI string `json:"logoURI"`
}

// NewGetRoutes200ResponseRoutesInnerStepsInnerToolDetails instantiates a new GetRoutes200ResponseRoutesInnerStepsInnerToolDetails object
// This constructor will assign default values to properties that have it defined,
// and makes sure properties required by API are set, but the set of arguments
// will change when the set of required properties is changed
func NewGetRoutes200ResponseRoutesInnerStepsInnerToolDetails(key string, name string, logoURI string) *GetRoutes200ResponseRoutesInnerStepsInnerToolDetails {
	this := GetRoutes200ResponseRoutesInnerStepsInnerToolDetails{}
	this.Key = key
	this.Name = name
	this.LogoURI = logoURI
	return &this
}

// NewGetRoutes200ResponseRoutesInnerStepsInnerToolDetailsWithDefaults instantiates a new GetRoutes200ResponseRoutesInnerStepsInnerToolDetails object
// This constructor will only assign default values to properties that have it defined,
// but it doesn't guarantee that properties required by API are set
func NewGetRoutes200ResponseRoutesInnerStepsInnerToolDetailsWithDefaults() *GetRoutes200ResponseRoutesInnerStepsInnerToolDetails {
	this := GetRoutes200ResponseRoutesInnerStepsInnerToolDetails{}
	return &this
}

// GetKey returns the Key field value
func (o *GetRoutes200ResponseRoutesInnerStepsInnerToolDetails) GetKey() string {
	if o == nil {
		var ret string
		return ret
	}

	return o.Key
}

// GetKeyOk returns a tuple with the Key field value
// and a boolean to check if the value has been set.
func (o *GetRoutes200ResponseRoutesInnerStepsInnerToolDetails) GetKeyOk() (*string, bool) {
	if o == nil {
		return nil, false
	}
	return &o.Key, true
}

// SetKey sets field value
func (o *GetRoutes200ResponseRoutesInnerStepsInnerToolDetails) SetKey(v string) {
	o.Key = v
}

// GetName returns the Name field value
func (o *GetRoutes200ResponseRoutesInnerStepsInnerToolDetails) GetName() string {
	if o == nil {
		var ret string
		return ret
	}

	return o.Name
}

// GetNameOk returns a tuple with the Name field value
// and a boolean to check if the value has been set.
func (o *GetRoutes200ResponseRoutesInnerStepsInnerToolDetails) GetNameOk() (*string, bool) {
	if o == nil {
		return nil, false
	}
	return &o.Name, true
}

// SetName sets field value
func (o *GetRoutes200ResponseRoutesInnerStepsInnerToolDetails) SetName(v string) {
	o.Name = v
}

// GetLogoURI returns the LogoURI field value
func (o *GetRoutes200ResponseRoutesInnerStepsInnerToolDetails) GetLogoURI() string {
	if o == nil {
		var ret string
		return ret
	}

	return o.LogoURI
}

// GetLogoURIOk returns a tuple with the LogoURI field value
// and a boolean to check if the value has been set.
func (o *GetRoutes200ResponseRoutesInnerStepsInnerToolDetails) GetLogoURIOk() (*string, bool) {
	if o == nil {
		return nil, false
	}
	return &o.LogoURI, true
}

// SetLogoURI sets field value
func (o *GetRoutes200ResponseRoutesInnerStepsInnerToolDetails) SetLogoURI(v string) {
	o.LogoURI = v
}

func (o GetRoutes200ResponseRoutesInnerStepsInnerToolDetails) MarshalJSON() ([]byte, error) {
	toSerialize,err := o.ToMap()
	if err != nil {
		return []byte{}, err
	}
	return json.Marshal(toSerialize)
}

func (o GetRoutes200ResponseRoutesInnerStepsInnerToolDetails) ToMap() (map[string]interface{}, error) {
	toSerialize := map[string]interface{}{}
	toSerialize["key"] = o.Key
	toSerialize["name"] = o.Name
	toSerialize["logoURI"] = o.LogoURI
	return toSerialize, nil
}

type NullableGetRoutes200ResponseRoutesInnerStepsInnerToolDetails struct {
	value *GetRoutes200ResponseRoutesInnerStepsInnerToolDetails
	isSet bool
}

func (v NullableGetRoutes200ResponseRoutesInnerStepsInnerToolDetails) Get() *GetRoutes200ResponseRoutesInnerStepsInnerToolDetails {
	return v.value
}

func (v *NullableGetRoutes200ResponseRoutesInnerStepsInnerToolDetails) Set(val *GetRoutes200ResponseRoutesInnerStepsInnerToolDetails) {
	v.value = val
	v.isSet = true
}

func (v NullableGetRoutes200ResponseRoutesInnerStepsInnerToolDetails) IsSet() bool {
	return v.isSet
}

func (v *NullableGetRoutes200ResponseRoutesInnerStepsInnerToolDetails) Unset() {
	v.value = nil
	v.isSet = false
}

func NewNullableGetRoutes200ResponseRoutesInnerStepsInnerToolDetails(val *GetRoutes200ResponseRoutesInnerStepsInnerToolDetails) *NullableGetRoutes200ResponseRoutesInnerStepsInnerToolDetails {
	return &NullableGetRoutes200ResponseRoutesInnerStepsInnerToolDetails{value: val, isSet: true}
}

func (v NullableGetRoutes200ResponseRoutesInnerStepsInnerToolDetails) MarshalJSON() ([]byte, error) {
	return json.Marshal(v.value)
}

func (v *NullableGetRoutes200ResponseRoutesInnerStepsInnerToolDetails) UnmarshalJSON(src []byte) error {
	v.isSet = true
	return json.Unmarshal(src, &v.value)
}


