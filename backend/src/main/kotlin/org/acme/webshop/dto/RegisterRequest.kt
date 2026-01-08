package org.acme.webshop.dto

data class RegisterRequest(
    val email: String?,
    val password: String?,
    val firstName: String?,
    val lastName: String?,
    val phoneNumber: String?
)
