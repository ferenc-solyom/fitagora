package org.acme.webshop.service

import at.favre.lib.crypto.bcrypt.BCrypt
import jakarta.enterprise.context.ApplicationScoped

@ApplicationScoped
class PasswordService {

    companion object {
        private const val BCRYPT_COST = 12
    }

    fun hash(password: String): String {
        return BCrypt.withDefaults().hashToString(BCRYPT_COST, password.toCharArray())
    }

    fun verify(password: String, hash: String): Boolean {
        return BCrypt.verifyer().verify(password.toCharArray(), hash).verified
    }
}
