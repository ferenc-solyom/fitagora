package org.acme.webshop.domain

import java.math.BigDecimal
import java.time.Instant

data class Product(
    val id: String,
    val name: String,
    val price: BigDecimal,
    val createdAt: Instant
)
