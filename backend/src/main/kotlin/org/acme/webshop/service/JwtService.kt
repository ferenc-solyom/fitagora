package org.acme.webshop.service

import io.smallrye.jwt.build.Jwt
import jakarta.enterprise.context.ApplicationScoped
import org.acme.webshop.domain.User
import org.eclipse.microprofile.config.inject.ConfigProperty
import java.time.Duration

@ApplicationScoped
class JwtService(
    @ConfigProperty(name = "mp.jwt.verify.issuer")
    private val issuer: String
) {
    companion object {
        private val TOKEN_VALIDITY = Duration.ofHours(24)
    }

    fun generateToken(user: User): String {
        return Jwt.issuer(issuer)
            .subject(user.id)
            .groups(setOf("user"))
            .claim("email", user.email)
            .claim("firstName", user.firstName)
            .claim("lastName", user.lastName)
            .expiresIn(TOKEN_VALIDITY)
            .sign()
    }
}
