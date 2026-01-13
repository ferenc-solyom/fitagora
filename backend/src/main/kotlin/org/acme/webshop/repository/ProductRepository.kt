package org.acme.webshop.repository

import org.acme.webshop.domain.Category
import org.acme.webshop.domain.Product

interface ProductRepository {
    fun save(product: Product): Product
    fun findById(id: String): Product?
    fun findAll(): List<Product>
    fun findByOwnerId(ownerId: String): List<Product>
    fun search(query: String?, category: Category?, limit: Int, offset: Int): List<Product>
    fun deleteById(id: String): Boolean
    fun deleteByOwnerId(ownerId: String): Int
}
