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
import org.acme.webshop.controller.ResponseUtils.badRequest
import org.acme.webshop.controller.ResponseUtils.forbidden
import org.acme.webshop.controller.ResponseUtils.notFound
import org.acme.webshop.controller.ResponseUtils.unauthorized
import org.acme.webshop.dto.CreateOrderRequest
import org.acme.webshop.service.CreateOrderResult
import org.acme.webshop.service.DeleteOrderResult
import org.acme.webshop.service.OrderService

@Path("/api/orders")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
class OrderController(
    private val orderService: OrderService
) {

    @POST
    @PermitAll
    fun createOrder(
        request: CreateOrderRequest,
        @Context securityContext: SecurityContext
    ): Response {
        val userId = securityContext.userPrincipal?.name

        return when (val result = orderService.createOrder(request.productId, request.quantity, userId)) {
            is CreateOrderResult.Success -> Response.status(Response.Status.CREATED)
                .entity(result.order)
                .build()
            is CreateOrderResult.ProductIdRequired -> badRequest("productId is required")
            is CreateOrderResult.InvalidQuantity -> badRequest("quantity must be at least 1")
            is CreateOrderResult.ProductNotFound -> notFound("Product not found")
        }
    }

    @GET
    @RolesAllowed("user")
    fun getMyOrders(@Context securityContext: SecurityContext): Response {
        val userId = securityContext.userPrincipal?.name
            ?: return unauthorized("authentication required")

        return Response.ok(orderService.findByUserId(userId)).build()
    }

    @DELETE
    @Path("/{id}")
    @RolesAllowed("user")
    fun deleteOrder(
        @PathParam("id") id: String,
        @Context securityContext: SecurityContext
    ): Response {
        val userId = securityContext.userPrincipal?.name
            ?: return unauthorized("authentication required")

        return when (orderService.deleteOrder(id, userId)) {
            is DeleteOrderResult.Success -> Response.noContent().build()
            is DeleteOrderResult.NotFound -> notFound("Order not found")
            is DeleteOrderResult.NotOwner -> forbidden("you can only delete your own orders")
        }
    }
}
