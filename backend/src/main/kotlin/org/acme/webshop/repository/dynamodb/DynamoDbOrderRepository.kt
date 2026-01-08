package org.acme.webshop.repository.dynamodb

import io.quarkus.arc.profile.IfBuildProfile
import jakarta.enterprise.context.ApplicationScoped
import org.acme.webshop.domain.Order
import org.acme.webshop.repository.OrderRepository
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
class DynamoDbOrderRepository(
    private val dynamoDb: DynamoDbClient
) : OrderRepository {

    companion object {
        const val TABLE_NAME = "webshop-orders"
    }

    override fun save(order: Order): Order {
        val item = mapOf(
            "id" to AttributeValue.builder().s(order.id).build(),
            "productId" to AttributeValue.builder().s(order.productId).build(),
            "quantity" to AttributeValue.builder().n(order.quantity.toString()).build(),
            "totalPrice" to AttributeValue.builder().n(order.totalPrice.toPlainString()).build(),
            "createdAt" to AttributeValue.builder().s(order.createdAt.toString()).build()
        )

        dynamoDb.putItem(
            PutItemRequest.builder()
                .tableName(TABLE_NAME)
                .item(item)
                .build()
        )

        return order
    }

    override fun findById(id: String): Order? {
        val response = dynamoDb.getItem(
            GetItemRequest.builder()
                .tableName(TABLE_NAME)
                .key(mapOf("id" to AttributeValue.builder().s(id).build()))
                .build()
        )

        if (!response.hasItem() || response.item().isEmpty()) {
            return null
        }

        return response.item().toOrder()
    }

    override fun findAll(): List<Order> {
        val response = dynamoDb.scan(
            ScanRequest.builder()
                .tableName(TABLE_NAME)
                .build()
        )

        return response.items().map { it.toOrder() }
    }

    override fun deleteById(id: String): Boolean {
        val existing = findById(id) ?: return false

        dynamoDb.deleteItem(
            DeleteItemRequest.builder()
                .tableName(TABLE_NAME)
                .key(mapOf("id" to AttributeValue.builder().s(id).build()))
                .build()
        )

        return true
    }

    private fun Map<String, AttributeValue>.toOrder(): Order {
        return Order(
            id = this["id"]?.s() ?: error("Missing id"),
            productId = this["productId"]?.s() ?: error("Missing productId"),
            quantity = this["quantity"]?.n()?.toInt() ?: error("Missing quantity"),
            totalPrice = BigDecimal(this["totalPrice"]?.n() ?: error("Missing totalPrice")),
            createdAt = Instant.parse(this["createdAt"]?.s() ?: error("Missing createdAt"))
        )
    }
}
