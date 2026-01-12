package org.acme.webshop.service

import jakarta.enterprise.context.ApplicationScoped
import org.acme.webshop.domain.Favorite
import org.acme.webshop.repository.FavoriteRepository
import org.acme.webshop.repository.ProductRepository
import java.time.Instant
import java.util.UUID

sealed class AddFavoriteResult {
    data class Success(val favorite: Favorite) : AddFavoriteResult()
    object ProductNotFound : AddFavoriteResult()
    object AlreadyFavorited : AddFavoriteResult()
}

sealed class RemoveFavoriteResult {
    object Success : RemoveFavoriteResult()
    object NotFound : RemoveFavoriteResult()
}

@ApplicationScoped
class FavoriteService(
    private val favoriteRepository: FavoriteRepository,
    private val productRepository: ProductRepository
) {

    fun addFavorite(userId: String, productId: String): AddFavoriteResult {
        productRepository.findById(productId) ?: return AddFavoriteResult.ProductNotFound

        val existing = favoriteRepository.findByUserIdAndProductId(userId, productId)
        if (existing != null) {
            return AddFavoriteResult.AlreadyFavorited
        }

        val favorite = Favorite(
            id = UUID.randomUUID().toString(),
            userId = userId,
            productId = productId,
            createdAt = Instant.now()
        )

        val saved = favoriteRepository.save(favorite)
        return AddFavoriteResult.Success(saved)
    }

    fun removeFavorite(userId: String, productId: String): RemoveFavoriteResult {
        val deleted = favoriteRepository.deleteByUserIdAndProductId(userId, productId)
        return if (deleted) RemoveFavoriteResult.Success else RemoveFavoriteResult.NotFound
    }

    fun findByUserId(userId: String): List<Favorite> = favoriteRepository.findByUserId(userId)

    fun isFavorited(userId: String, productId: String): Boolean =
        favoriteRepository.findByUserIdAndProductId(userId, productId) != null

    fun deleteByProductId(productId: String): Int = favoriteRepository.deleteByProductId(productId)
}
