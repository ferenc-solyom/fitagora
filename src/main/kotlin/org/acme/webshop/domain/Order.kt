package org.acme.webshop.domain

import java.math.BigDecimal
import java.time.Instant

data class Order(
    val id: String,
    val productId: String,
    val quantity: Int,
    val totalPrice: BigDecimal,
    val createdAt: Instant
)
