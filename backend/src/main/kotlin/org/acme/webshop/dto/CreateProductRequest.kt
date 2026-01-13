package org.acme.webshop.dto

import java.math.BigDecimal

data class CreateProductRequest(
    val name: String?,
    val description: String? = null,
    val price: BigDecimal?,
    val category: String?,
    val images: List<String>? = null
)
