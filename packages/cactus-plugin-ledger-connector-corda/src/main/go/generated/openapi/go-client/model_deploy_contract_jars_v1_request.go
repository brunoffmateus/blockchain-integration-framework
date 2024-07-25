/*
Hyperledger Cacti Plugin - Connector Corda

Can perform basic tasks on a Corda ledger

API version: 2.0.0-rc.3
*/

// Code generated by OpenAPI Generator (https://openapi-generator.tech); DO NOT EDIT.

package cactus-plugin-ledger-connector-corda

import (
	"encoding/json"
)

// checks if the DeployContractJarsV1Request type satisfies the MappedNullable interface at compile time
var _ MappedNullable = &DeployContractJarsV1Request{}

// DeployContractJarsV1Request struct for DeployContractJarsV1Request
type DeployContractJarsV1Request struct {
	// The list of deployment configurations pointing to the nodes where the provided cordapp jar files are to be deployed .
	CordappDeploymentConfigs []CordappDeploymentConfig `json:"cordappDeploymentConfigs"`
	JarFiles []JarFile `json:"jarFiles"`
}

// NewDeployContractJarsV1Request instantiates a new DeployContractJarsV1Request object
// This constructor will assign default values to properties that have it defined,
// and makes sure properties required by API are set, but the set of arguments
// will change when the set of required properties is changed
func NewDeployContractJarsV1Request(cordappDeploymentConfigs []CordappDeploymentConfig, jarFiles []JarFile) *DeployContractJarsV1Request {
	this := DeployContractJarsV1Request{}
	this.CordappDeploymentConfigs = cordappDeploymentConfigs
	this.JarFiles = jarFiles
	return &this
}

// NewDeployContractJarsV1RequestWithDefaults instantiates a new DeployContractJarsV1Request object
// This constructor will only assign default values to properties that have it defined,
// but it doesn't guarantee that properties required by API are set
func NewDeployContractJarsV1RequestWithDefaults() *DeployContractJarsV1Request {
	this := DeployContractJarsV1Request{}
	return &this
}

// GetCordappDeploymentConfigs returns the CordappDeploymentConfigs field value
func (o *DeployContractJarsV1Request) GetCordappDeploymentConfigs() []CordappDeploymentConfig {
	if o == nil {
		var ret []CordappDeploymentConfig
		return ret
	}

	return o.CordappDeploymentConfigs
}

// GetCordappDeploymentConfigsOk returns a tuple with the CordappDeploymentConfigs field value
// and a boolean to check if the value has been set.
func (o *DeployContractJarsV1Request) GetCordappDeploymentConfigsOk() ([]CordappDeploymentConfig, bool) {
	if o == nil {
		return nil, false
	}
	return o.CordappDeploymentConfigs, true
}

// SetCordappDeploymentConfigs sets field value
func (o *DeployContractJarsV1Request) SetCordappDeploymentConfigs(v []CordappDeploymentConfig) {
	o.CordappDeploymentConfigs = v
}

// GetJarFiles returns the JarFiles field value
func (o *DeployContractJarsV1Request) GetJarFiles() []JarFile {
	if o == nil {
		var ret []JarFile
		return ret
	}

	return o.JarFiles
}

// GetJarFilesOk returns a tuple with the JarFiles field value
// and a boolean to check if the value has been set.
func (o *DeployContractJarsV1Request) GetJarFilesOk() ([]JarFile, bool) {
	if o == nil {
		return nil, false
	}
	return o.JarFiles, true
}

// SetJarFiles sets field value
func (o *DeployContractJarsV1Request) SetJarFiles(v []JarFile) {
	o.JarFiles = v
}

func (o DeployContractJarsV1Request) MarshalJSON() ([]byte, error) {
	toSerialize,err := o.ToMap()
	if err != nil {
		return []byte{}, err
	}
	return json.Marshal(toSerialize)
}

func (o DeployContractJarsV1Request) ToMap() (map[string]interface{}, error) {
	toSerialize := map[string]interface{}{}
	toSerialize["cordappDeploymentConfigs"] = o.CordappDeploymentConfigs
	toSerialize["jarFiles"] = o.JarFiles
	return toSerialize, nil
}

type NullableDeployContractJarsV1Request struct {
	value *DeployContractJarsV1Request
	isSet bool
}

func (v NullableDeployContractJarsV1Request) Get() *DeployContractJarsV1Request {
	return v.value
}

func (v *NullableDeployContractJarsV1Request) Set(val *DeployContractJarsV1Request) {
	v.value = val
	v.isSet = true
}

func (v NullableDeployContractJarsV1Request) IsSet() bool {
	return v.isSet
}

func (v *NullableDeployContractJarsV1Request) Unset() {
	v.value = nil
	v.isSet = false
}

func NewNullableDeployContractJarsV1Request(val *DeployContractJarsV1Request) *NullableDeployContractJarsV1Request {
	return &NullableDeployContractJarsV1Request{value: val, isSet: true}
}

func (v NullableDeployContractJarsV1Request) MarshalJSON() ([]byte, error) {
	return json.Marshal(v.value)
}

func (v *NullableDeployContractJarsV1Request) UnmarshalJSON(src []byte) error {
	v.isSet = true
	return json.Unmarshal(src, &v.value)
}

