package org.acme.webshop.repository.dynamodb

import io.quarkus.arc.profile.IfBuildProfile
import jakarta.enterprise.context.ApplicationScoped
import org.acme.webshop.domain.User
import org.acme.webshop.repository.UserRepository
import software.amazon.awssdk.services.dynamodb.DynamoDbClient
import software.amazon.awssdk.services.dynamodb.model.AttributeValue
import software.amazon.awssdk.services.dynamodb.model.GetItemRequest
import software.amazon.awssdk.services.dynamodb.model.PutItemRequest
import software.amazon.awssdk.services.dynamodb.model.QueryRequest
import java.time.Instant

@ApplicationScoped
@IfBuildProfile("lambda")
class DynamoDbUserRepository(
    private val dynamoDb: DynamoDbClient
) : UserRepository {

    companion object {
        const val TABLE_NAME = "webshop-users"
        const val EMAIL_INDEX = "email-index"
    }

    override fun save(user: User): User {
        val item = mutableMapOf(
            "id" to AttributeValue.builder().s(user.id).build(),
            "email" to AttributeValue.builder().s(user.email.lowercase()).build(),
            "passwordHash" to AttributeValue.builder().s(user.passwordHash).build(),
            "firstName" to AttributeValue.builder().s(user.firstName).build(),
            "lastName" to AttributeValue.builder().s(user.lastName).build(),
            "createdAt" to AttributeValue.builder().s(user.createdAt.toString()).build()
        )

        user.phoneNumber?.let {
            item["phoneNumber"] = AttributeValue.builder().s(it).build()
        }

        dynamoDb.putItem(
            PutItemRequest.builder()
                .tableName(TABLE_NAME)
                .item(item)
                .build()
        )

        return user
    }

    override fun findById(id: String): User? {
        val response = dynamoDb.getItem(
            GetItemRequest.builder()
                .tableName(TABLE_NAME)
                .key(mapOf("id" to AttributeValue.builder().s(id).build()))
                .build()
        )

        if (!response.hasItem() || response.item().isEmpty()) {
            return null
        }

        return response.item().toUser()
    }

    override fun findByEmail(email: String): User? {
        val response = dynamoDb.query(
            QueryRequest.builder()
                .tableName(TABLE_NAME)
                .indexName(EMAIL_INDEX)
                .keyConditionExpression("email = :email")
                .expressionAttributeValues(
                    mapOf(":email" to AttributeValue.builder().s(email.lowercase()).build())
                )
                .build()
        )

        if (response.items().isEmpty()) {
            return null
        }

        return response.items().first().toUser()
    }

    override fun existsByEmail(email: String): Boolean = findByEmail(email) != null

    private fun Map<String, AttributeValue>.toUser(): User {
        return User(
            id = this["id"]?.s() ?: error("Missing id"),
            email = this["email"]?.s() ?: error("Missing email"),
            passwordHash = this["passwordHash"]?.s() ?: error("Missing passwordHash"),
            firstName = this["firstName"]?.s() ?: error("Missing firstName"),
            lastName = this["lastName"]?.s() ?: error("Missing lastName"),
            phoneNumber = this["phoneNumber"]?.s(),
            createdAt = Instant.parse(this["createdAt"]?.s() ?: error("Missing createdAt"))
        )
    }
}
