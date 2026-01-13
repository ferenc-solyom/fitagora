package org.acme.webshop.repository.inmemory

import io.quarkus.arc.profile.UnlessBuildProfile
import jakarta.enterprise.context.ApplicationScoped
import org.acme.webshop.domain.Category
import org.acme.webshop.domain.Product
import org.acme.webshop.repository.ProductRepository
import java.util.concurrent.ConcurrentHashMap

@ApplicationScoped
@UnlessBuildProfile("lambda")
class InMemoryProductRepository : ProductRepository {

    private val products = ConcurrentHashMap<String, Product>()

    override fun save(product: Product): Product {
        products[product.id] = product
        return product
    }

    override fun findById(id: String): Product? = products[id]

    override fun findAll(): List<Product> = products.values.toList()

    override fun findByOwnerId(ownerId: String): List<Product> =
        products.values.filter { it.ownerId == ownerId }

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
        return products.values.filter { product ->
            val matchesQuery = lowerQuery == null ||
                product.name.lowercase().contains(lowerQuery) ||
                product.description?.lowercase()?.contains(lowerQuery) == true
            val matchesCategory = category == null || product.category == category
            matchesQuery && matchesCategory
        }
    }

    override fun deleteById(id: String): Boolean = products.remove(id) != null

    override fun deleteByOwnerId(ownerId: String): Int {
        val toDelete = products.values.filter { it.ownerId == ownerId }
        toDelete.forEach { products.remove(it.id) }
        return toDelete.size
    }
}
