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
import org.acme.webshop.domain.Product
import org.acme.webshop.dto.CreateProductRequest
import org.acme.webshop.dto.ErrorResponse
import org.acme.webshop.repository.ProductRepository
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

@Path("/api/products")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
class ProductController(
    private val productRepository: ProductRepository
) {

    @POST
    @RolesAllowed("user")
    fun createProduct(
        request: CreateProductRequest,
        @Context securityContext: SecurityContext
    ): Response {
        val userId = securityContext.userPrincipal?.name
            ?: return Response.status(Response.Status.UNAUTHORIZED)
                .entity(ErrorResponse("authentication required"))
                .build()

        if (request.name.isNullOrBlank()) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(ErrorResponse("name is required"))
                .build()
        }

        if (request.price == null) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(ErrorResponse("price is required"))
                .build()
        }

        if (request.price <= BigDecimal.ZERO) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(ErrorResponse("price must be greater than zero"))
                .build()
        }

        val product = Product(
            id = UUID.randomUUID().toString(),
            name = request.name,
            price = request.price,
            ownerId = userId,
            createdAt = Instant.now()
        )

        val savedProduct = productRepository.save(product)
        return Response.status(Response.Status.CREATED)
            .entity(savedProduct)
            .build()
    }

    @GET
    @PermitAll
    fun getAllProducts(): List<Product> = productRepository.findAll()

    @GET
    @Path("/mine")
    @RolesAllowed("user")
    fun getMyProducts(@Context securityContext: SecurityContext): Response {
        val userId = securityContext.userPrincipal?.name
            ?: return Response.status(Response.Status.UNAUTHORIZED)
                .entity(ErrorResponse("authentication required"))
                .build()

        val products = productRepository.findByOwnerId(userId)
        return Response.ok(products).build()
    }

    @DELETE
    @Path("/{id}")
    @RolesAllowed("user")
    fun deleteProduct(
        @PathParam("id") id: String,
        @Context securityContext: SecurityContext
    ): Response {
        val userId = securityContext.userPrincipal?.name
            ?: return Response.status(Response.Status.UNAUTHORIZED)
                .entity(ErrorResponse("authentication required"))
                .build()

        val product = productRepository.findById(id)
            ?: return Response.status(Response.Status.NOT_FOUND)
                .entity(ErrorResponse("Product not found"))
                .build()

        if (product.ownerId != userId) {
            return Response.status(Response.Status.FORBIDDEN)
                .entity(ErrorResponse("you can only delete your own products"))
                .build()
        }

        productRepository.deleteById(id)
        return Response.noContent().build()
    }
}
