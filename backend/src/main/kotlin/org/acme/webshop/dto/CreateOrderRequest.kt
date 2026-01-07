package org.acme.webshop.dto

data class CreateOrderRequest(
    val productId: String?,
    val quantity: Int?
)
