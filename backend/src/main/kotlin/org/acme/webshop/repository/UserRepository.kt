package org.acme.webshop.repository

import org.acme.webshop.domain.User

interface UserRepository {
    fun save(user: User): User
    fun findById(id: String): User?
    fun findByEmail(email: String): User?
    fun existsByEmail(email: String): Boolean
    fun deleteById(id: String): Boolean
}
