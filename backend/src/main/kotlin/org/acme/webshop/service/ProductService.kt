package org.acme.webshop.service

import jakarta.enterprise.context.ApplicationScoped
import org.acme.webshop.domain.Category
import org.acme.webshop.domain.Product
import org.acme.webshop.repository.ProductRepository
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

sealed class CreateProductResult {
    data class Success(val product: Product) : CreateProductResult()
    object NameRequired : CreateProductResult()
    object PriceRequired : CreateProductResult()
    object PriceMustBePositive : CreateProductResult()
    object CategoryRequired : CreateProductResult()
    object TooManyImages : CreateProductResult()
    object ImageTooLarge : CreateProductResult()
    object DescriptionTooLong : CreateProductResult()
}

sealed class UpdateProductResult {
    data class Success(val product: Product) : UpdateProductResult()
    object NotFound : UpdateProductResult()
    object NotOwner : UpdateProductResult()
    object NameRequired : UpdateProductResult()
    object PriceRequired : UpdateProductResult()
    object PriceMustBePositive : UpdateProductResult()
    object CategoryRequired : UpdateProductResult()
    object TooManyImages : UpdateProductResult()
    object ImageTooLarge : UpdateProductResult()
    object DescriptionTooLong : UpdateProductResult()
}

sealed class DeleteProductResult {
    object Success : DeleteProductResult()
    object NotFound : DeleteProductResult()
    object NotOwner : DeleteProductResult()
}

@ApplicationScoped
class ProductService(
    private val productRepository: ProductRepository
) {
    companion object {
        const val MAX_IMAGE_SIZE_BYTES = 100_000
        const val MAX_IMAGES = 3
        const val MAX_DESCRIPTION_LENGTH = 2000
        const val DEFAULT_SEARCH_LIMIT = 20
    }

    fun createProduct(
        name: String?,
        description: String?,
        price: BigDecimal?,
        category: Category?,
        ownerId: String,
        images: List<String>? = null
    ): CreateProductResult {
        if (name.isNullOrBlank()) {
            return CreateProductResult.NameRequired
        }

        if (price == null) {
            return CreateProductResult.PriceRequired
        }

        if (price <= BigDecimal.ZERO) {
            return CreateProductResult.PriceMustBePositive
        }

        if (category == null) {
            return CreateProductResult.CategoryRequired
        }

        if (description != null && description.length > MAX_DESCRIPTION_LENGTH) {
            return CreateProductResult.DescriptionTooLong
        }

        val imageList = images ?: emptyList()
        if (imageList.size > MAX_IMAGES) {
            return CreateProductResult.TooManyImages
        }

        if (imageList.any { it.length > MAX_IMAGE_SIZE_BYTES }) {
            return CreateProductResult.ImageTooLarge
        }

        val product = Product(
            id = UUID.randomUUID().toString(),
            name = name,
            description = description?.takeIf { it.isNotBlank() },
            price = price,
            category = category,
            ownerId = ownerId,
            images = imageList,
            createdAt = Instant.now()
        )

        val savedProduct = productRepository.save(product)
        return CreateProductResult.Success(savedProduct)
    }

    fun updateProduct(
        id: String,
        requestingUserId: String,
        name: String?,
        description: String?,
        price: BigDecimal?,
        category: Category?,
        images: List<String>?
    ): UpdateProductResult {
        val existing = productRepository.findById(id)
            ?: return UpdateProductResult.NotFound

        if (existing.ownerId != requestingUserId) {
            return UpdateProductResult.NotOwner
        }

        if (name.isNullOrBlank()) {
            return UpdateProductResult.NameRequired
        }

        if (price == null) {
            return UpdateProductResult.PriceRequired
        }

        if (price <= BigDecimal.ZERO) {
            return UpdateProductResult.PriceMustBePositive
        }

        if (category == null) {
            return UpdateProductResult.CategoryRequired
        }

        if (description != null && description.length > MAX_DESCRIPTION_LENGTH) {
            return UpdateProductResult.DescriptionTooLong
        }

        val imageList = images ?: emptyList()
        if (imageList.size > MAX_IMAGES) {
            return UpdateProductResult.TooManyImages
        }

        if (imageList.any { it.length > MAX_IMAGE_SIZE_BYTES }) {
            return UpdateProductResult.ImageTooLarge
        }

        val updated = existing.copy(
            name = name,
            description = description?.takeIf { it.isNotBlank() },
            price = price,
            category = category,
            images = imageList
        )

        val savedProduct = productRepository.save(updated)
        return UpdateProductResult.Success(savedProduct)
    }

    fun findAll(): List<Product> = productRepository.findAll()

    fun findByOwnerId(ownerId: String): List<Product> = productRepository.findByOwnerId(ownerId)

    fun findById(id: String): Product? = productRepository.findById(id)

    fun search(
        query: String? = null,
        category: Category? = null,
        limit: Int = DEFAULT_SEARCH_LIMIT,
        offset: Int = 0
    ): List<Product> = productRepository.search(query, category, limit, offset)

    fun count(query: String? = null, category: Category? = null): Int =
        productRepository.count(query, category)

    fun deleteProduct(id: String, requestingUserId: String): DeleteProductResult {
        val product = productRepository.findById(id)
            ?: return DeleteProductResult.NotFound

        if (product.ownerId != requestingUserId) {
            return DeleteProductResult.NotOwner
        }

        productRepository.deleteById(id)
        return DeleteProductResult.Success
    }

    fun deleteByOwnerId(ownerId: String): Int = productRepository.deleteByOwnerId(ownerId)
}
