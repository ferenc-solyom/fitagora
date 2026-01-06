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
    fun createProduct(request: CreateProductRequest): Response {
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
            createdAt = Instant.now()
        )

        val savedProduct = productRepository.save(product)
        return Response.status(Response.Status.CREATED)
            .entity(savedProduct)
            .build()
    }

    @GET
    fun getAllProducts(): List<Product> = productRepository.findAll()

    @DELETE
    @Path("/{id}")
    fun deleteProduct(@PathParam("id") id: String): Response {
        return if (productRepository.deleteById(id)) {
            Response.noContent().build()
        } else {
            Response.status(Response.Status.NOT_FOUND)
                .entity(ErrorResponse("Product not found"))
                .build()
        }
    }
}
