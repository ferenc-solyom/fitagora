package org.acme.webshop.repository.dynamodb

import io.quarkus.arc.profile.IfBuildProfile
import jakarta.enterprise.context.ApplicationScoped
import org.acme.webshop.domain.Favorite
import org.acme.webshop.repository.FavoriteRepository
import software.amazon.awssdk.services.dynamodb.DynamoDbClient
import software.amazon.awssdk.services.dynamodb.model.*
import java.time.Instant

@ApplicationScoped
@IfBuildProfile(anyOf = ["lambda", "ecs"])
class DynamoDbFavoriteRepository(
    private val dynamoDb: DynamoDbClient
) : FavoriteRepository {

    companion object {
        const val TABLE_NAME = "webshop-favorites"
        const val USER_INDEX = "user-index"
        const val PRODUCT_INDEX = "product-index"
    }

    override fun save(favorite: Favorite): Favorite {
        val item = mapOf(
            "id" to AttributeValue.builder().s(favorite.id).build(),
            "userId" to AttributeValue.builder().s(favorite.userId).build(),
            "productId" to AttributeValue.builder().s(favorite.productId).build(),
            "createdAt" to AttributeValue.builder().s(favorite.createdAt.toString()).build()
        )

        dynamoDb.putItem(
            PutItemRequest.builder()
                .tableName(TABLE_NAME)
                .item(item)
                .build()
        )

        return favorite
    }

    override fun findById(id: String): Favorite? {
        val response = dynamoDb.getItem(
            GetItemRequest.builder()
                .tableName(TABLE_NAME)
                .key(mapOf("id" to AttributeValue.builder().s(id).build()))
                .build()
        )

        if (!response.hasItem() || response.item().isEmpty()) {
            return null
        }

        return response.item().toFavorite()
    }

    override fun findByUserId(userId: String): List<Favorite> {
        val response = dynamoDb.query(
            QueryRequest.builder()
                .tableName(TABLE_NAME)
                .indexName(USER_INDEX)
                .keyConditionExpression("userId = :userId")
                .expressionAttributeValues(
                    mapOf(":userId" to AttributeValue.builder().s(userId).build())
                )
                .build()
        )

        return response.items().map { it.toFavorite() }
    }

    override fun findByUserIdAndProductId(userId: String, productId: String): Favorite? {
        val response = dynamoDb.query(
            QueryRequest.builder()
                .tableName(TABLE_NAME)
                .indexName(USER_INDEX)
                .keyConditionExpression("userId = :userId")
                .filterExpression("productId = :productId")
                .expressionAttributeValues(
                    mapOf(
                        ":userId" to AttributeValue.builder().s(userId).build(),
                        ":productId" to AttributeValue.builder().s(productId).build()
                    )
                )
                .build()
        )

        return response.items().firstOrNull()?.toFavorite()
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

    override fun deleteByUserIdAndProductId(userId: String, productId: String): Boolean {
        val favorite = findByUserIdAndProductId(userId, productId) ?: return false
        return deleteById(favorite.id)
    }

    override fun deleteByProductId(productId: String): Int {
        val response = dynamoDb.query(
            QueryRequest.builder()
                .tableName(TABLE_NAME)
                .indexName(PRODUCT_INDEX)
                .keyConditionExpression("productId = :productId")
                .expressionAttributeValues(
                    mapOf(":productId" to AttributeValue.builder().s(productId).build())
                )
                .build()
        )

        val favorites = response.items().map { it.toFavorite() }
        favorites.forEach { deleteById(it.id) }
        return favorites.size
    }

    private fun Map<String, AttributeValue>.toFavorite(): Favorite {
        return Favorite(
            id = this["id"]?.s() ?: error("Missing id"),
            userId = this["userId"]?.s() ?: error("Missing userId"),
            productId = this["productId"]?.s() ?: error("Missing productId"),
            createdAt = Instant.parse(this["createdAt"]?.s() ?: error("Missing createdAt"))
        )
    }
}
