package org.acme.webshop.repository.dynamodb

import io.quarkus.arc.profile.IfBuildProfile
import jakarta.enterprise.context.ApplicationScoped
import org.acme.webshop.domain.Category
import org.acme.webshop.domain.Product
import org.acme.webshop.repository.ProductRepository
import software.amazon.awssdk.services.dynamodb.DynamoDbClient
import software.amazon.awssdk.services.dynamodb.model.AttributeValue
import software.amazon.awssdk.services.dynamodb.model.DeleteItemRequest
import software.amazon.awssdk.services.dynamodb.model.GetItemRequest
import software.amazon.awssdk.services.dynamodb.model.PutItemRequest
import software.amazon.awssdk.services.dynamodb.model.QueryRequest
import software.amazon.awssdk.services.dynamodb.model.ScanRequest
import java.math.BigDecimal
import java.time.Instant

@ApplicationScoped
@IfBuildProfile("lambda")
class DynamoDbProductRepository(
    private val dynamoDb: DynamoDbClient
) : ProductRepository {

    companion object {
        const val TABLE_NAME = "webshop-products"
        const val OWNER_INDEX = "owner-index"
    }

    override fun save(product: Product): Product {
        val item = mutableMapOf(
            "id" to AttributeValue.builder().s(product.id).build(),
            "name" to AttributeValue.builder().s(product.name).build(),
            "price" to AttributeValue.builder().n(product.price.toPlainString()).build(),
            "category" to AttributeValue.builder().s(product.category.name).build(),
            "ownerId" to AttributeValue.builder().s(product.ownerId).build(),
            "createdAt" to AttributeValue.builder().s(product.createdAt.toString()).build()
        )

        if (product.description != null) {
            item["description"] = AttributeValue.builder().s(product.description).build()
        }

        if (product.images.isNotEmpty()) {
            item["images"] = AttributeValue.builder().l(
                product.images.map { AttributeValue.builder().s(it).build() }
            ).build()
        }

        dynamoDb.putItem(
            PutItemRequest.builder()
                .tableName(TABLE_NAME)
                .item(item)
                .build()
        )

        return product
    }

    override fun findById(id: String): Product? {
        val response = dynamoDb.getItem(
            GetItemRequest.builder()
                .tableName(TABLE_NAME)
                .key(mapOf("id" to AttributeValue.builder().s(id).build()))
                .build()
        )

        if (!response.hasItem() || response.item().isEmpty()) {
            return null
        }

        return response.item().toProduct()
    }

    override fun findAll(): List<Product> {
        val response = dynamoDb.scan(
            ScanRequest.builder()
                .tableName(TABLE_NAME)
                .build()
        )

        return response.items().map { it.toProduct() }
    }

    override fun findByOwnerId(ownerId: String): List<Product> {
        val response = dynamoDb.query(
            QueryRequest.builder()
                .tableName(TABLE_NAME)
                .indexName(OWNER_INDEX)
                .keyConditionExpression("ownerId = :ownerId")
                .expressionAttributeValues(
                    mapOf(":ownerId" to AttributeValue.builder().s(ownerId).build())
                )
                .build()
        )

        return response.items().map { it.toProduct() }
    }

    override fun search(query: String?, category: Category?, limit: Int, offset: Int): List<Product> {
        return filterProducts(query, category)
            .sortedByDescending { it.createdAt }
            .drop(offset)
            .take(limit)
    }

    override fun count(query: String?, category: Category?): Int {
        return filterProducts(query, category).size
    }

    private fun filterProducts(query: String?, category: Category?): List<Product> {
        val lowerQuery = query?.lowercase()
        val response = dynamoDb.scan(
            ScanRequest.builder()
                .tableName(TABLE_NAME)
                .build()
        )

        return response.items()
            .map { it.toProduct() }
            .filter { product ->
                val matchesQuery = lowerQuery == null ||
                    product.name.lowercase().contains(lowerQuery) ||
                    product.description?.lowercase()?.contains(lowerQuery) == true
                val matchesCategory = category == null || product.category == category
                matchesQuery && matchesCategory
            }
    }

    override fun deleteById(id: String): Boolean {
        findById(id) ?: return false

        dynamoDb.deleteItem(
            DeleteItemRequest.builder()
                .tableName(TABLE_NAME)
                .key(mapOf("id" to AttributeValue.builder().s(id).build()))
                .build()
        )

        return true
    }

    override fun deleteByOwnerId(ownerId: String): Int {
        val products = findByOwnerId(ownerId)
        products.forEach { deleteById(it.id) }
        return products.size
    }

    private fun Map<String, AttributeValue>.toProduct(): Product {
        val categoryStr = this["category"]?.s() ?: "OTHER"
        val images = parseImages(this["images"])
        return Product(
            id = this["id"]?.s() ?: error("Missing id"),
            name = this["name"]?.s() ?: error("Missing name"),
            description = this["description"]?.s(),
            price = BigDecimal(this["price"]?.n() ?: error("Missing price")),
            category = Category.fromString(categoryStr) ?: Category.OTHER,
            ownerId = this["ownerId"]?.s() ?: error("Missing ownerId"),
            images = images,
            createdAt = Instant.parse(this["createdAt"]?.s() ?: error("Missing createdAt"))
        )
    }

    private fun parseImages(attr: AttributeValue?): List<String> {
        if (attr == null) return emptyList()

        // Handle List type (L)
        if (attr.hasL()) {
            return attr.l().mapNotNull { it.s() }
        }

        // Handle single String type (S) - for backwards compatibility
        val singleImage = attr.s()
        if (!singleImage.isNullOrBlank()) {
            return listOf(singleImage)
        }

        return emptyList()
    }
}
