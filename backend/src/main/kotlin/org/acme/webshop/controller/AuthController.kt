package org.acme.webshop.controller

import jakarta.annotation.security.PermitAll
import jakarta.annotation.security.RolesAllowed
import jakarta.ws.rs.Consumes
import jakarta.ws.rs.GET
import jakarta.ws.rs.POST
import jakarta.ws.rs.Path
import jakarta.ws.rs.Produces
import jakarta.ws.rs.core.Context
import jakarta.ws.rs.core.MediaType
import jakarta.ws.rs.core.Response
import jakarta.ws.rs.core.SecurityContext
import org.acme.webshop.controller.ResponseUtils.badRequest
import org.acme.webshop.controller.ResponseUtils.conflict
import org.acme.webshop.controller.ResponseUtils.notFound
import org.acme.webshop.controller.ResponseUtils.unauthorized
import org.acme.webshop.domain.User
import org.acme.webshop.dto.AuthResponse
import org.acme.webshop.dto.LoginRequest
import org.acme.webshop.dto.RegisterRequest
import org.acme.webshop.dto.UserResponse
import org.acme.webshop.service.AuthResult
import org.acme.webshop.service.AuthService

@Path("/api/auth")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
class AuthController(
    private val authService: AuthService
) {

    @POST
    @Path("/register")
    @PermitAll
    fun register(request: RegisterRequest): Response {
        val validationError = validateRegisterRequest(request)
        if (validationError != null) {
            return badRequest(validationError)
        }

        return when (val result = authService.register(
            email = request.email!!,
            password = request.password!!,
            firstName = request.firstName!!,
            lastName = request.lastName!!,
            phoneNumber = request.phoneNumber
        )) {
            is AuthResult.Success -> Response.status(Response.Status.CREATED)
                .entity(AuthResponse(result.token, result.user.toResponse()))
                .build()
            is AuthResult.EmailAlreadyExists -> conflict("email already registered")
            is AuthResult.InvalidCredentials -> unauthorized("invalid credentials")
            is AuthResult.UserNotFound -> notFound("user not found")
        }
    }

    @POST
    @Path("/login")
    @PermitAll
    fun login(request: LoginRequest): Response {
        if (request.email.isNullOrBlank()) {
            return badRequest("email is required")
        }

        if (request.password.isNullOrBlank()) {
            return badRequest("password is required")
        }

        return when (val result = authService.login(request.email, request.password)) {
            is AuthResult.Success -> Response.ok(AuthResponse(result.token, result.user.toResponse())).build()
            is AuthResult.InvalidCredentials -> unauthorized("invalid email or password")
            is AuthResult.EmailAlreadyExists -> conflict("email already exists")
            is AuthResult.UserNotFound -> notFound("user not found")
        }
    }

    @GET
    @Path("/me")
    @RolesAllowed("user")
    fun getCurrentUser(@Context securityContext: SecurityContext): Response {
        val userId = securityContext.userPrincipal?.name
            ?: return unauthorized("not authenticated")

        val user = authService.findUserById(userId)
            ?: return notFound("user not found")

        return Response.ok(user.toResponse()).build()
    }

    private fun validateRegisterRequest(request: RegisterRequest): String? {
        if (request.email.isNullOrBlank()) return "email is required"
        if (!isValidEmail(request.email)) return "invalid email format"
        if (request.password.isNullOrBlank()) return "password is required"
        if (request.password.length < 8) return "password must be at least 8 characters"
        if (request.firstName.isNullOrBlank()) return "firstName is required"
        if (request.lastName.isNullOrBlank()) return "lastName is required"
        return null
    }

    private fun isValidEmail(email: String): Boolean {
        val emailRegex = "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$".toRegex()
        return emailRegex.matches(email)
    }

    private fun User.toResponse(): UserResponse = UserResponse(
        id = id,
        email = email,
        firstName = firstName,
        lastName = lastName,
        phoneNumber = phoneNumber
    )
}
