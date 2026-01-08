package org.acme.webshop.domain

import java.time.Instant

data class User(
    val id: String,
    val email: String,
    val passwordHash: String,
    val firstName: String,
    val lastName: String,
    val phoneNumber: String?,
    val createdAt: Instant
)
