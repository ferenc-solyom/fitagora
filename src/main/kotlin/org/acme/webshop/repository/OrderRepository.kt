package org.acme.webshop.repository

import org.acme.webshop.domain.Order

interface OrderRepository {
    fun save(order: Order): Order
    fun findById(id: String): Order?
    fun findAll(): List<Order>
    fun deleteById(id: String): Boolean
}
