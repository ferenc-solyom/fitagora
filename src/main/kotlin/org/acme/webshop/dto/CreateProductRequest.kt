package org.acme.webshop.dto

import java.math.BigDecimal

data class CreateProductRequest(
    val name: String?,
    val price: BigDecimal?
)
