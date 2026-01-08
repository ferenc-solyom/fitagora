package org.acme.webshop.repository.inmemory

import io.quarkus.arc.profile.UnlessBuildProfile
import jakarta.enterprise.context.ApplicationScoped
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

    override fun deleteById(id: String): Boolean = products.remove(id) != null
}
