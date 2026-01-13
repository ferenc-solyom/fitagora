package org.acme.webshop.dto

data class PaginatedResponse<T>(
    val items: List<T>,
    val total: Int,
    val limit: Int,
    val offset: Int
)
