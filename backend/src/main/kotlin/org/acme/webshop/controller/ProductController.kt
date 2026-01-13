package org.acme.webshop.controller

import jakarta.annotation.security.PermitAll
import jakarta.annotation.security.RolesAllowed
import jakarta.ws.rs.Consumes
import jakarta.ws.rs.DELETE
import jakarta.ws.rs.GET
import jakarta.ws.rs.POST
import jakarta.ws.rs.PUT
import jakarta.ws.rs.Path
import jakarta.ws.rs.PathParam
import jakarta.ws.rs.Produces
import jakarta.ws.rs.QueryParam
import jakarta.ws.rs.core.Context
import jakarta.ws.rs.core.MediaType
import jakarta.ws.rs.core.Response
import jakarta.ws.rs.core.SecurityContext
import org.acme.webshop.controller.ResponseUtils.badRequest
import org.acme.webshop.controller.ResponseUtils.forbidden
import org.acme.webshop.controller.ResponseUtils.notFound
import org.acme.webshop.controller.ResponseUtils.unauthorized
import org.acme.webshop.domain.Category
import org.acme.webshop.domain.Product
import org.acme.webshop.dto.CreateProductRequest
import org.acme.webshop.dto.SellerInfo
import org.acme.webshop.dto.UpdateProductRequest
import org.acme.webshop.dto.toDetailResponse
import org.acme.webshop.service.AuthService
import org.acme.webshop.service.CreateProductResult
import org.acme.webshop.service.DeleteProductResult
import org.acme.webshop.service.ProductService
import org.acme.webshop.service.UpdateProductResult

@Path("/api/products")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
class ProductController(
    private val productService: ProductService,
    private val authService: AuthService
) {

    @POST
    @RolesAllowed("user")
    fun createProduct(
        request: CreateProductRequest,
        @Context securityContext: SecurityContext
    ): Response {
        val userId = securityContext.userPrincipal?.name
            ?: return unauthorized("authentication required")

        val category = request.category?.let { Category.fromString(it) }

        return when (val result = productService.createProduct(
            request.name,
            request.description,
            request.price,
            category,
            userId,
            request.images
        )) {
            is CreateProductResult.Success -> Response.status(Response.Status.CREATED)
                .entity(result.product)
                .build()
            is CreateProductResult.NameRequired -> badRequest("name is required")
            is CreateProductResult.PriceRequired -> badRequest("price is required")
            is CreateProductResult.PriceMustBePositive -> badRequest("price must be greater than zero")
            is CreateProductResult.CategoryRequired -> badRequest("category is required")
            is CreateProductResult.TooManyImages -> badRequest("maximum 3 images allowed")
            is CreateProductResult.ImageTooLarge -> badRequest("each image must be smaller than 100KB")
            is CreateProductResult.DescriptionTooLong -> badRequest("description must be at most 2000 characters")
        }
    }

    @PUT
    @Path("/{id}")
    @RolesAllowed("user")
    fun updateProduct(
        @PathParam("id") id: String,
        request: UpdateProductRequest,
        @Context securityContext: SecurityContext
    ): Response {
        val userId = securityContext.userPrincipal?.name
            ?: return unauthorized("authentication required")

        val category = request.category?.let { Category.fromString(it) }

        return when (val result = productService.updateProduct(
            id,
            userId,
            request.name,
            request.description,
            request.price,
            category,
            request.images
        )) {
            is UpdateProductResult.Success -> Response.ok(result.product).build()
            is UpdateProductResult.NotFound -> notFound("Product not found")
            is UpdateProductResult.NotOwner -> forbidden("you can only update your own products")
            is UpdateProductResult.NameRequired -> badRequest("name is required")
            is UpdateProductResult.PriceRequired -> badRequest("price is required")
            is UpdateProductResult.PriceMustBePositive -> badRequest("price must be greater than zero")
            is UpdateProductResult.CategoryRequired -> badRequest("category is required")
            is UpdateProductResult.TooManyImages -> badRequest("maximum 3 images allowed")
            is UpdateProductResult.ImageTooLarge -> badRequest("each image must be smaller than 100KB")
            is UpdateProductResult.DescriptionTooLong -> badRequest("description must be at most 2000 characters")
        }
    }

    @GET
    @PermitAll
    fun getAllProducts(
        @QueryParam("q") query: String?,
        @QueryParam("category") categoryParam: String?,
        @QueryParam("limit") limit: Int?,
        @QueryParam("offset") offset: Int?
    ): List<Product> {
        val category = categoryParam?.let { Category.fromString(it) }
        if (query.isNullOrBlank() && category == null) {
            return productService.findAll()
        }
        return productService.search(
            query = query?.takeIf { it.isNotBlank() },
            category = category,
            limit = limit ?: 20,
            offset = offset ?: 0
        )
    }

    @GET
    @Path("/{id}")
    @PermitAll
    fun getProductById(@PathParam("id") id: String): Response {
        val product = productService.findById(id)
            ?: return notFound("Product not found")

        val owner = authService.findUserById(product.ownerId)
        val sellerInfo = if (owner != null) {
            SellerInfo(
                id = owner.id,
                firstName = owner.firstName,
                lastName = owner.lastName,
                phoneNumber = owner.phoneNumber
            )
        } else {
            SellerInfo(
                id = product.ownerId,
                firstName = "Unknown",
                lastName = "Seller",
                phoneNumber = null
            )
        }

        return Response.ok(product.toDetailResponse(sellerInfo)).build()
    }

    @GET
    @Path("/categories")
    @PermitAll
    fun getCategories(): List<Map<String, String>> {
        return Category.entries.map { category ->
            mapOf(
                "value" to category.name,
                "label" to category.displayName
            )
        }
    }

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
