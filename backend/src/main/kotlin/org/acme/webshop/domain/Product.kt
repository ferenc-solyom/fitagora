package org.acme.webshop.domain

import java.math.BigDecimal
import java.time.Instant

data class Product(
    val id: String,
    val name: String,
    val description: String? = null,
    val price: BigDecimal,
    val category: Category,
    val ownerId: String,
    val images: List<String> = emptyList(),
    val createdAt: Instant
)
