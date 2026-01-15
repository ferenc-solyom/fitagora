package org.acme.webshop.repository.inmemory

import io.quarkus.arc.profile.UnlessBuildProfile
import jakarta.enterprise.context.ApplicationScoped
import org.acme.webshop.domain.Favorite
import org.acme.webshop.repository.FavoriteRepository
import java.util.concurrent.ConcurrentHashMap

@ApplicationScoped
@UnlessBuildProfile(anyOf = ["lambda", "ecs"])
class InMemoryFavoriteRepository : FavoriteRepository {

    private val favorites = ConcurrentHashMap<String, Favorite>()

    override fun save(favorite: Favorite): Favorite {
        favorites[favorite.id] = favorite
        return favorite
    }

    override fun findById(id: String): Favorite? = favorites[id]

    override fun findByUserId(userId: String): List<Favorite> =
        favorites.values.filter { it.userId == userId }

    override fun findByUserIdAndProductId(userId: String, productId: String): Favorite? =
        favorites.values.find { it.userId == userId && it.productId == productId }

    override fun deleteById(id: String): Boolean = favorites.remove(id) != null

    override fun deleteByUserIdAndProductId(userId: String, productId: String): Boolean {
        val favorite = findByUserIdAndProductId(userId, productId) ?: return false
        return favorites.remove(favorite.id) != null
    }

    override fun deleteByProductId(productId: String): Int {
        val toDelete = favorites.values.filter { it.productId == productId }
        toDelete.forEach { favorites.remove(it.id) }
        return toDelete.size
    }
}
