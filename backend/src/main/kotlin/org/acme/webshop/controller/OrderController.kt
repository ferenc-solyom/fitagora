package org.acme.webshop.controller

import jakarta.annotation.security.PermitAll
import jakarta.annotation.security.RolesAllowed
import jakarta.ws.rs.Consumes
import jakarta.ws.rs.DELETE
import jakarta.ws.rs.GET
import jakarta.ws.rs.POST
import jakarta.ws.rs.Path
import jakarta.ws.rs.PathParam
import jakarta.ws.rs.Produces
import jakarta.ws.rs.core.Context
import jakarta.ws.rs.core.MediaType
import jakarta.ws.rs.core.Response
import jakarta.ws.rs.core.SecurityContext
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
    @PermitAll
    fun createOrder(
        request: CreateOrderRequest,
        @Context securityContext: SecurityContext
    ): Response {
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

        val userId = securityContext.userPrincipal?.name

        val order = Order(
            id = UUID.randomUUID().toString(),
            productId = product.id,
            quantity = request.quantity,
            totalPrice = product.price.multiply(request.quantity.toBigDecimal()),
            userId = userId,
            createdAt = Instant.now()
        )

        val savedOrder = orderRepository.save(order)
        return Response.status(Response.Status.CREATED)
            .entity(savedOrder)
            .build()
    }

    @GET
    @RolesAllowed("user")
    fun getMyOrders(@Context securityContext: SecurityContext): Response {
        val userId = securityContext.userPrincipal?.name
            ?: return Response.status(Response.Status.UNAUTHORIZED)
                .entity(ErrorResponse("authentication required"))
                .build()

        val orders = orderRepository.findByUserId(userId)
        return Response.ok(orders).build()
    }

    @DELETE
    @Path("/{id}")
    @RolesAllowed("user")
    fun deleteOrder(
        @PathParam("id") id: String,
        @Context securityContext: SecurityContext
    ): Response {
        val userId = securityContext.userPrincipal?.name
            ?: return Response.status(Response.Status.UNAUTHORIZED)
                .entity(ErrorResponse("authentication required"))
                .build()

        val order = orderRepository.findById(id)
            ?: return Response.status(Response.Status.NOT_FOUND)
                .entity(ErrorResponse("Order not found"))
                .build()

        if (order.userId != userId) {
            return Response.status(Response.Status.FORBIDDEN)
                .entity(ErrorResponse("you can only delete your own orders"))
                .build()
        }

        orderRepository.deleteById(id)
        return Response.noContent().build()
    }
}
