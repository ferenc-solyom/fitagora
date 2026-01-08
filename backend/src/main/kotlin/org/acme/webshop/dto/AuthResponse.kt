package org.acme.webshop.dto

data class AuthResponse(
    val token: String,
    val user: UserResponse
)

data class UserResponse(
    val id: String,
    val email: String,
    val firstName: String,
    val lastName: String,
    val phoneNumber: String?
)
