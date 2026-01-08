package org.acme.webshop.repository.inmemory

import io.quarkus.arc.profile.UnlessBuildProfile
import jakarta.enterprise.context.ApplicationScoped
import org.acme.webshop.domain.Order
import org.acme.webshop.repository.OrderRepository
import java.util.concurrent.ConcurrentHashMap

@ApplicationScoped
@UnlessBuildProfile("lambda")
class InMemoryOrderRepository : OrderRepository {

    private val orders = ConcurrentHashMap<String, Order>()

    override fun save(order: Order): Order {
        orders[order.id] = order
        return order
    }

    override fun findById(id: String): Order? = orders[id]

    override fun findAll(): List<Order> = orders.values.toList()

    override fun deleteById(id: String): Boolean = orders.remove(id) != null
}
