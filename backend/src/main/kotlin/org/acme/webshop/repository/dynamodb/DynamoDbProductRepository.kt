package org.acme.webshop.repository.dynamodb

import io.quarkus.arc.profile.IfBuildProfile
import jakarta.enterprise.context.ApplicationScoped
import org.acme.webshop.domain.Product
import org.acme.webshop.repository.ProductRepository
import software.amazon.awssdk.services.dynamodb.DynamoDbClient
import software.amazon.awssdk.services.dynamodb.model.AttributeValue
import software.amazon.awssdk.services.dynamodb.model.DeleteItemRequest
import software.amazon.awssdk.services.dynamodb.model.GetItemRequest
import software.amazon.awssdk.services.dynamodb.model.PutItemRequest
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
    }

    override fun save(product: Product): Product {
        val item = mapOf(
            "id" to AttributeValue.builder().s(product.id).build(),
            "name" to AttributeValue.builder().s(product.name).build(),
            "price" to AttributeValue.builder().n(product.price.toPlainString()).build(),
            "createdAt" to AttributeValue.builder().s(product.createdAt.toString()).build()
        )

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

    private fun Map<String, AttributeValue>.toProduct(): Product {
        return Product(
            id = this["id"]?.s() ?: error("Missing id"),
            name = this["name"]?.s() ?: error("Missing name"),
            price = BigDecimal(this["price"]?.n() ?: error("Missing price")),
            createdAt = Instant.parse(this["createdAt"]?.s() ?: error("Missing createdAt"))
        )
    }
}
