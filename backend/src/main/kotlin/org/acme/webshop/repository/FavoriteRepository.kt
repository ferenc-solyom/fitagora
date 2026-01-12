package org.acme.webshop.repository

import org.acme.webshop.domain.Favorite

interface FavoriteRepository {
    fun save(favorite: Favorite): Favorite
    fun findById(id: String): Favorite?
    fun findByUserId(userId: String): List<Favorite>
    fun findByUserIdAndProductId(userId: String, productId: String): Favorite?
    fun deleteById(id: String): Boolean
    fun deleteByUserIdAndProductId(userId: String, productId: String): Boolean
    fun deleteByProductId(productId: String): Int
}
