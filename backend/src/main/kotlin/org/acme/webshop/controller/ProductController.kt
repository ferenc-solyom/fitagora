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
import org.acme.webshop.domain.Product
import org.acme.webshop.dto.CreateProductRequest
import org.acme.webshop.service.CreateProductResult
import org.acme.webshop.service.DeleteProductResult
import org.acme.webshop.service.ProductService

@Path("/api/products")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
class ProductController(
    private val productService: ProductService
) {

    @POST
    @RolesAllowed("user")
    fun createProduct(
        request: CreateProductRequest,
        @Context securityContext: SecurityContext
    ): Response {
        val userId = securityContext.userPrincipal?.name
            ?: return unauthorized("authentication required")

        return when (val result = productService.createProduct(request.name, request.price, userId)) {
            is CreateProductResult.Success -> Response.status(Response.Status.CREATED)
                .entity(result.product)
                .build()
            is CreateProductResult.NameRequired -> badRequest("name is required")
            is CreateProductResult.PriceRequired -> badRequest("price is required")
            is CreateProductResult.PriceMustBePositive -> badRequest("price must be greater than zero")
        }
    }

    @GET
    @PermitAll
    fun getAllProducts(): List<Product> = productService.findAll()

    @GET
    @Path("/mine")
    @RolesAllowed("user")
    fun getMyProducts(@Context securityContext: SecurityContext): Response {
        val userId = securityContext.userPrincipal?.name
            ?: return unauthorized("authentication required")

        return Response.ok(productService.findByOwnerId(userId)).build()
    }

    @DELETE
    @Path("/{id}")
    @RolesAllowed("user")
    fun deleteProduct(
        @PathParam("id") id: String,
        @Context securityContext: SecurityContext
    ): Response {
        val userId = securityContext.userPrincipal?.name
            ?: return unauthorized("authentication required")

        return when (productService.deleteProduct(id, userId)) {
            is DeleteProductResult.Success -> Response.noContent().build()
            is DeleteProductResult.NotFound -> notFound("Product not found")
            is DeleteProductResult.NotOwner -> forbidden("you can only delete your own products")
        }
    }
}
