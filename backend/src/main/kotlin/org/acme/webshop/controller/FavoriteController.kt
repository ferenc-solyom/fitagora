package org.acme.webshop.controller

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
import org.acme.webshop.controller.ResponseUtils.conflict
import org.acme.webshop.controller.ResponseUtils.notFound
import org.acme.webshop.controller.ResponseUtils.unauthorized
import org.acme.webshop.service.AddFavoriteResult
import org.acme.webshop.service.FavoriteService
import org.acme.webshop.service.RemoveFavoriteResult

@Path("/api/favorites")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
class FavoriteController(
    private val favoriteService: FavoriteService
) {

    @POST
    @Path("/{productId}")
    @RolesAllowed("user")
    fun addFavorite(
        @PathParam("productId") productId: String,
        @Context securityContext: SecurityContext
    ): Response {
        val userId = securityContext.userPrincipal?.name
            ?: return unauthorized("authentication required")

        return when (val result = favoriteService.addFavorite(userId, productId)) {
            is AddFavoriteResult.Success -> Response.status(Response.Status.CREATED)
                .entity(result.favorite)
                .build()
            is AddFavoriteResult.ProductNotFound -> notFound("Product not found")
            is AddFavoriteResult.AlreadyFavorited -> conflict("Product already favorited")
        }
    }

    @DELETE
    @Path("/{productId}")
    @RolesAllowed("user")
    fun removeFavorite(
        @PathParam("productId") productId: String,
        @Context securityContext: SecurityContext
    ): Response {
        val userId = securityContext.userPrincipal?.name
            ?: return unauthorized("authentication required")

        return when (favoriteService.removeFavorite(userId, productId)) {
            is RemoveFavoriteResult.Success -> Response.noContent().build()
            is RemoveFavoriteResult.NotFound -> notFound("Favorite not found")
        }
    }

    @GET
    @RolesAllowed("user")
    fun getMyFavorites(@Context securityContext: SecurityContext): Response {
        val userId = securityContext.userPrincipal?.name
            ?: return unauthorized("authentication required")

        return Response.ok(favoriteService.findByUserId(userId)).build()
    }

    @GET
    @Path("/{productId}/status")
    @RolesAllowed("user")
    fun isFavorited(
        @PathParam("productId") productId: String,
        @Context securityContext: SecurityContext
    ): Response {
        val userId = securityContext.userPrincipal?.name
            ?: return unauthorized("authentication required")

        val favorited = favoriteService.isFavorited(userId, productId)
        return Response.ok(mapOf("favorited" to favorited)).build()
    }
}
