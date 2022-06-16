/**
 *
 * Please note:
 * This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * Do not edit this file manually.
 *
 */

@file:Suppress(
    "ArrayInDataClass",
    "EnumEntryName",
    "RemoveRedundantQualifierName",
    "UnusedImport"
)

package org.openapitools.client.models


import com.squareup.moshi.Json

/**
 * A Cactus node can be a single server, or a set of servers behind a load balancer acting as one.
 *
 * @param nodeApiHost 
 * @param publicKeyPem The PEM encoded public key that was used to generate the JWS included in the response (the jws property)
 * @param id 
 * @param consortiumId 
 * @param memberId 
 * @param ledgerIds Stores an array of Ledger entity IDs that are reachable (routable) via this Cactus Node. This information is used by the client side SDK API client to figure out at runtime where to send API requests that are specific to a certain ledger such as requests to execute transactions.
 * @param pluginInstanceIds 
 */


data class CactusNode (

    @Json(name = "nodeApiHost")
    val nodeApiHost: kotlin.String,

    /* The PEM encoded public key that was used to generate the JWS included in the response (the jws property) */
    @Json(name = "publicKeyPem")
    val publicKeyPem: kotlin.String,

    @Json(name = "id")
    val id: kotlin.String,

    @Json(name = "consortiumId")
    val consortiumId: kotlin.String,

    @Json(name = "memberId")
    val memberId: kotlin.String,

    /* Stores an array of Ledger entity IDs that are reachable (routable) via this Cactus Node. This information is used by the client side SDK API client to figure out at runtime where to send API requests that are specific to a certain ledger such as requests to execute transactions. */
    @Json(name = "ledgerIds")
    val ledgerIds: kotlin.collections.List<kotlin.String> = arrayListOf(),

    @Json(name = "pluginInstanceIds")
    val pluginInstanceIds: kotlin.collections.List<kotlin.String> = arrayListOf()

)
