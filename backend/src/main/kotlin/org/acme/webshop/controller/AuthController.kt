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
import org.acme.webshop.domain.User
import org.acme.webshop.dto.AuthResponse
import org.acme.webshop.dto.ErrorResponse
import org.acme.webshop.dto.LoginRequest
import org.acme.webshop.dto.RegisterRequest
import org.acme.webshop.dto.UserResponse
import org.acme.webshop.repository.UserRepository
import org.acme.webshop.service.JwtService
import org.acme.webshop.service.PasswordService
import java.time.Instant
import java.util.UUID

@Path("/api/auth")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
class AuthController(
    private val userRepository: UserRepository,
    private val passwordService: PasswordService,
    private val jwtService: JwtService
) {

    @POST
    @Path("/register")
    @PermitAll
    fun register(request: RegisterRequest): Response {
        if (request.email.isNullOrBlank()) {
            return badRequest("email is required")
        }

        if (!isValidEmail(request.email)) {
            return badRequest("invalid email format")
        }

        if (request.password.isNullOrBlank()) {
            return badRequest("password is required")
        }

        if (request.password.length < 8) {
            return badRequest("password must be at least 8 characters")
        }

        if (request.firstName.isNullOrBlank()) {
            return badRequest("firstName is required")
        }

        if (request.lastName.isNullOrBlank()) {
            return badRequest("lastName is required")
        }

        if (userRepository.existsByEmail(request.email)) {
            return Response.status(Response.Status.CONFLICT)
                .entity(ErrorResponse("email already registered"))
                .build()
        }

        val user = User(
            id = UUID.randomUUID().toString(),
            email = request.email.lowercase(),
            passwordHash = passwordService.hash(request.password),
            firstName = request.firstName.trim(),
            lastName = request.lastName.trim(),
            phoneNumber = request.phoneNumber?.trim()?.takeIf { it.isNotBlank() },
            createdAt = Instant.now()
        )

        val savedUser = userRepository.save(user)
        val token = jwtService.generateToken(savedUser)

        return Response.status(Response.Status.CREATED)
            .entity(AuthResponse(token, savedUser.toResponse()))
            .build()
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

        val user = userRepository.findByEmail(request.email)
        if (user == null || !passwordService.verify(request.password, user.passwordHash)) {
            return Response.status(Response.Status.UNAUTHORIZED)
                .entity(ErrorResponse("invalid email or password"))
                .build()
        }

        val token = jwtService.generateToken(user)

        return Response.ok(AuthResponse(token, user.toResponse())).build()
    }

    @GET
    @Path("/me")
    @RolesAllowed("user")
    fun getCurrentUser(@Context securityContext: SecurityContext): Response {
        val userId = securityContext.userPrincipal?.name
            ?: return Response.status(Response.Status.UNAUTHORIZED)
                .entity(ErrorResponse("not authenticated"))
                .build()

        val user = userRepository.findById(userId)
            ?: return Response.status(Response.Status.NOT_FOUND)
                .entity(ErrorResponse("user not found"))
                .build()

        return Response.ok(user.toResponse()).build()
    }

    private fun badRequest(message: String): Response {
        return Response.status(Response.Status.BAD_REQUEST)
            .entity(ErrorResponse(message))
            .build()
    }

    private fun isValidEmail(email: String): Boolean {
        val emailRegex = "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$".toRegex()
        return emailRegex.matches(email)
    }

    private fun User.toResponse(): UserResponse {
        return UserResponse(
            id = id,
            email = email,
            firstName = firstName,
            lastName = lastName,
            phoneNumber = phoneNumber
        )
    }
}
