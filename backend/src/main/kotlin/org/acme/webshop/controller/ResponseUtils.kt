package org.acme.webshop.controller

import jakarta.ws.rs.core.Response
import org.acme.webshop.dto.ErrorResponse

object ResponseUtils {
    fun badRequest(message: String): Response =
        Response.status(Response.Status.BAD_REQUEST).entity(ErrorResponse(message)).build()

    fun unauthorized(message: String): Response =
        Response.status(Response.Status.UNAUTHORIZED).entity(ErrorResponse(message)).build()

    fun notFound(message: String): Response =
        Response.status(Response.Status.NOT_FOUND).entity(ErrorResponse(message)).build()

    fun forbidden(message: String): Response =
        Response.status(Response.Status.FORBIDDEN).entity(ErrorResponse(message)).build()

    fun conflict(message: String): Response =
        Response.status(Response.Status.CONFLICT).entity(ErrorResponse(message)).build()
}
