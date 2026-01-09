package org.acme.webshop.service

import jakarta.enterprise.context.ApplicationScoped
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

    fun createProduct(name: String?, price: BigDecimal?, ownerId: String): CreateProductResult {
        if (name.isNullOrBlank()) {
            return CreateProductResult.NameRequired
        }

        if (price == null) {
            return CreateProductResult.PriceRequired
        }

        if (price <= BigDecimal.ZERO) {
            return CreateProductResult.PriceMustBePositive
        }

        val product = Product(
            id = UUID.randomUUID().toString(),
            name = name,
            price = price,
            ownerId = ownerId,
            createdAt = Instant.now()
        )

        val savedProduct = productRepository.save(product)
        return CreateProductResult.Success(savedProduct)
    }

    fun findAll(): List<Product> = productRepository.findAll()

    fun findByOwnerId(ownerId: String): List<Product> = productRepository.findByOwnerId(ownerId)

    fun findById(id: String): Product? = productRepository.findById(id)

    fun deleteProduct(id: String, requestingUserId: String): DeleteProductResult {
        val product = productRepository.findById(id)
            ?: return DeleteProductResult.NotFound

        if (product.ownerId != requestingUserId) {
            return DeleteProductResult.NotOwner
        }

        productRepository.deleteById(id)
        return DeleteProductResult.Success
    }
}
