package org.acme.webshop.controller

import jakarta.ws.rs.Consumes
import jakarta.ws.rs.DELETE
import jakarta.ws.rs.GET
import jakarta.ws.rs.POST
import jakarta.ws.rs.Path
import jakarta.ws.rs.PathParam
import jakarta.ws.rs.Produces
import jakarta.ws.rs.core.MediaType
import jakarta.ws.rs.core.Response
import org.acme.webshop.domain.Order
import org.acme.webshop.dto.CreateOrderRequest
import org.acme.webshop.dto.ErrorResponse
import org.acme.webshop.repository.OrderRepository
import org.acme.webshop.repository.ProductRepository
import java.time.Instant
import java.util.UUID

@Path("/api/orders")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
class OrderController(
    private val orderRepository: OrderRepository,
    private val productRepository: ProductRepository
) {

    @POST
    fun createOrder(request: CreateOrderRequest): Response {
        if (request.productId.isNullOrBlank()) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(ErrorResponse("productId is required"))
                .build()
        }

        if (request.quantity == null || request.quantity < 1) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(ErrorResponse("quantity must be at least 1"))
                .build()
        }

        val product = productRepository.findById(request.productId)
            ?: return Response.status(Response.Status.NOT_FOUND)
                .entity(ErrorResponse("Product not found"))
                .build()

        val order = Order(
            id = UUID.randomUUID().toString(),
            productId = product.id,
            quantity = request.quantity,
            totalPrice = product.price.multiply(request.quantity.toBigDecimal()),
            createdAt = Instant.now()
        )

        val savedOrder = orderRepository.save(order)
        return Response.status(Response.Status.CREATED)
            .entity(savedOrder)
            .build()
    }

    @GET
    fun getAllOrders(): List<Order> = orderRepository.findAll()

    @DELETE
    @Path("/{id}")
    fun deleteOrder(@PathParam("id") id: String): Response {
        return if (orderRepository.deleteById(id)) {
            Response.noContent().build()
        } else {
            Response.status(Response.Status.NOT_FOUND)
                .entity(ErrorResponse("Order not found"))
                .build()
        }
    }
}
