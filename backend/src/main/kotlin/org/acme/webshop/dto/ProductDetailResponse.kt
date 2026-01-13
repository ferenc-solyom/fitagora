package org.acme.webshop.dto

import org.acme.webshop.domain.Product
import java.math.BigDecimal
import java.time.Instant

data class ProductDetailResponse(
    val id: String,
    val name: String,
    val description: String?,
    val price: BigDecimal,
    val category: String,
    val categoryDisplayName: String,
    val images: List<String>,
    val createdAt: Instant,
    val seller: SellerInfo
)

data class SellerInfo(
    val id: String,
    val firstName: String,
    val lastName: String,
    val phoneNumber: String?
)

fun Product.toDetailResponse(sellerInfo: SellerInfo) = ProductDetailResponse(
    id = id,
    name = name,
    description = description,
    price = price,
    category = category.name,
    categoryDisplayName = category.displayName,
    images = images,
    createdAt = createdAt,
    seller = sellerInfo
)
