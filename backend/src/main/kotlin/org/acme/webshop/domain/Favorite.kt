package org.acme.webshop.domain

import java.time.Instant

data class Favorite(
    val id: String,
    val userId: String,
    val productId: String,
    val createdAt: Instant
)
