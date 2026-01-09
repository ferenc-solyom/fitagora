package org.acme.webshop.service

import jakarta.enterprise.context.ApplicationScoped
import org.acme.webshop.domain.Order
import org.acme.webshop.repository.OrderRepository
import org.acme.webshop.repository.ProductRepository
import java.time.Instant
import java.util.UUID

sealed class CreateOrderResult {
    data class Success(val order: Order) : CreateOrderResult()
    object ProductIdRequired : CreateOrderResult()
    object InvalidQuantity : CreateOrderResult()
    object ProductNotFound : CreateOrderResult()
}

sealed class DeleteOrderResult {
    object Success : DeleteOrderResult()
    object NotFound : DeleteOrderResult()
    object NotOwner : DeleteOrderResult()
}

@ApplicationScoped
class OrderService(
    private val orderRepository: OrderRepository,
    private val productRepository: ProductRepository
) {

    fun createOrder(productId: String?, quantity: Int?, userId: String?): CreateOrderResult {
        if (productId.isNullOrBlank()) {
            return CreateOrderResult.ProductIdRequired
        }

        if (quantity == null || quantity < 1) {
            return CreateOrderResult.InvalidQuantity
        }

        val product = productRepository.findById(productId)
            ?: return CreateOrderResult.ProductNotFound

        val order = Order(
            id = UUID.randomUUID().toString(),
            productId = product.id,
            quantity = quantity,
            totalPrice = product.price.multiply(quantity.toBigDecimal()),
            userId = userId,
            createdAt = Instant.now()
        )

        val savedOrder = orderRepository.save(order)
        return CreateOrderResult.Success(savedOrder)
    }

    fun findByUserId(userId: String): List<Order> = orderRepository.findByUserId(userId)

    fun findById(id: String): Order? = orderRepository.findById(id)

    fun deleteOrder(id: String, requestingUserId: String): DeleteOrderResult {
        val order = orderRepository.findById(id)
            ?: return DeleteOrderResult.NotFound

        if (order.userId != requestingUserId) {
            return DeleteOrderResult.NotOwner
        }

        orderRepository.deleteById(id)
        return DeleteOrderResult.Success
    }
}
