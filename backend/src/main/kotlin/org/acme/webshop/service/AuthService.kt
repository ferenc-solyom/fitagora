package org.acme.webshop.service

import jakarta.enterprise.context.ApplicationScoped
import jakarta.inject.Inject
import org.acme.webshop.domain.User
import org.acme.webshop.repository.UserRepository
import java.time.Instant
import java.util.UUID

sealed class AuthResult {
    data class Success(val user: User, val token: String) : AuthResult()
    data class EmailAlreadyExists(val email: String) : AuthResult()
    object InvalidCredentials : AuthResult()
    object UserNotFound : AuthResult()
}

sealed class DeleteUserResult {
    object Success : DeleteUserResult()
    object NotFound : DeleteUserResult()
}

@ApplicationScoped
class AuthService(
    private val userRepository: UserRepository,
    private val passwordService: PasswordService,
    private val jwtService: JwtService
) {
    @Inject
    lateinit var productService: ProductService

    @Inject
    lateinit var favoriteService: FavoriteService

    fun register(
        email: String,
        password: String,
        firstName: String,
        lastName: String,
        phoneNumber: String?
    ): AuthResult {
        val normalizedEmail = email.lowercase()

        if (userRepository.existsByEmail(normalizedEmail)) {
            return AuthResult.EmailAlreadyExists(normalizedEmail)
        }

        val user = User(
            id = UUID.randomUUID().toString(),
            email = normalizedEmail,
            passwordHash = passwordService.hash(password),
            firstName = firstName.trim(),
            lastName = lastName.trim(),
            phoneNumber = phoneNumber?.trim()?.takeIf { it.isNotBlank() },
            createdAt = Instant.now()
        )

        val savedUser = userRepository.save(user)
        val token = jwtService.generateToken(savedUser)

        return AuthResult.Success(savedUser, token)
    }

    fun login(email: String, password: String): AuthResult {
        val user = userRepository.findByEmail(email.lowercase())
            ?: return AuthResult.InvalidCredentials

        if (!passwordService.verify(password, user.passwordHash)) {
            return AuthResult.InvalidCredentials
        }

        val token = jwtService.generateToken(user)
        return AuthResult.Success(user, token)
    }

    fun findUserById(userId: String): User? {
        return userRepository.findById(userId)
    }

    fun deleteUser(userId: String): DeleteUserResult {
        userRepository.findById(userId)
            ?: return DeleteUserResult.NotFound

        val products = productService.findByOwnerId(userId)
        products.forEach { product ->
            favoriteService.deleteByProductId(product.id)
        }

        productService.deleteByOwnerId(userId)

        userRepository.deleteById(userId)
        return DeleteUserResult.Success
    }
}
