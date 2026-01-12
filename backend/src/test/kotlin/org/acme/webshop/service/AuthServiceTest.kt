package org.acme.webshop.service

import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import org.acme.webshop.domain.User
import org.acme.webshop.repository.UserRepository
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import java.time.Instant

class AuthServiceTest {

    private lateinit var userRepository: UserRepository
    private lateinit var passwordService: PasswordService
    private lateinit var jwtService: JwtService
    private lateinit var authService: AuthService

    @BeforeEach
    fun setUp() {
        userRepository = mockk()
        passwordService = mockk()
        jwtService = mockk()
        authService = AuthService(userRepository, passwordService, jwtService)
    }

    @Test
    fun `register succeeds with valid input`() {
        every { userRepository.existsByEmail("test@example.com") } returns false
        every { passwordService.hash("password123") } returns "hashed_password"
        val userSlot = slot<User>()
        every { userRepository.save(capture(userSlot)) } answers { userSlot.captured }
        every { jwtService.generateToken(any()) } returns "test.jwt.token"

        val result = authService.register(
            email = "Test@Example.com",
            password = "password123",
            firstName = "John",
            lastName = "Doe",
            phoneNumber = "+1234567890"
        )

        assertTrue(result is AuthResult.Success)
        val success = result as AuthResult.Success
        assertEquals("test@example.com", success.user.email)
        assertEquals("John", success.user.firstName)
        assertEquals("Doe", success.user.lastName)
        assertEquals("+1234567890", success.user.phoneNumber)
        assertEquals("test.jwt.token", success.token)
    }

    @Test
    fun `register normalizes email to lowercase`() {
        every { userRepository.existsByEmail("test@example.com") } returns false
        every { passwordService.hash(any()) } returns "hashed"
        val userSlot = slot<User>()
        every { userRepository.save(capture(userSlot)) } answers { userSlot.captured }
        every { jwtService.generateToken(any()) } returns "token"

        authService.register(
            email = "TEST@EXAMPLE.COM",
            password = "password123",
            firstName = "John",
            lastName = "Doe",
            phoneNumber = null
        )

        assertEquals("test@example.com", userSlot.captured.email)
    }

    @Test
    fun `register trims whitespace from names`() {
        every { userRepository.existsByEmail("test@example.com") } returns false
        every { passwordService.hash(any()) } returns "hashed"
        val userSlot = slot<User>()
        every { userRepository.save(capture(userSlot)) } answers { userSlot.captured }
        every { jwtService.generateToken(any()) } returns "token"

        authService.register(
            email = "test@example.com",
            password = "password123",
            firstName = "  John  ",
            lastName = "  Doe  ",
            phoneNumber = null
        )

        assertEquals("John", userSlot.captured.firstName)
        assertEquals("Doe", userSlot.captured.lastName)
    }

    @Test
    fun `register fails when email already exists`() {
        every { userRepository.existsByEmail("existing@example.com") } returns true

        val result = authService.register(
            email = "existing@example.com",
            password = "password123",
            firstName = "John",
            lastName = "Doe",
            phoneNumber = null
        )

        assertTrue(result is AuthResult.EmailAlreadyExists)
        assertEquals("existing@example.com", (result as AuthResult.EmailAlreadyExists).email)
    }

    @Test
    fun `register handles blank phone number as null`() {
        every { userRepository.existsByEmail("test@example.com") } returns false
        every { passwordService.hash(any()) } returns "hashed"
        val userSlot = slot<User>()
        every { userRepository.save(capture(userSlot)) } answers { userSlot.captured }
        every { jwtService.generateToken(any()) } returns "token"

        authService.register(
            email = "test@example.com",
            password = "password123",
            firstName = "John",
            lastName = "Doe",
            phoneNumber = "   "
        )

        assertNull(userSlot.captured.phoneNumber)
    }

    @Test
    fun `login succeeds with valid credentials`() {
        val user = User(
            id = "user-123",
            email = "test@example.com",
            passwordHash = "hashed_password",
            firstName = "John",
            lastName = "Doe",
            phoneNumber = null,
            createdAt = Instant.now()
        )

        every { userRepository.findByEmail("test@example.com") } returns user
        every { passwordService.verify("password123", "hashed_password") } returns true
        every { jwtService.generateToken(user) } returns "test.jwt.token"

        val result = authService.login("test@example.com", "password123")

        assertTrue(result is AuthResult.Success)
        val success = result as AuthResult.Success
        assertEquals(user, success.user)
        assertEquals("test.jwt.token", success.token)
    }

    @Test
    fun `login normalizes email to lowercase`() {
        val user = User(
            id = "user-123",
            email = "test@example.com",
            passwordHash = "hashed",
            firstName = "John",
            lastName = "Doe",
            phoneNumber = null,
            createdAt = Instant.now()
        )

        every { userRepository.findByEmail("test@example.com") } returns user
        every { passwordService.verify(any(), any()) } returns true
        every { jwtService.generateToken(any()) } returns "token"

        authService.login("TEST@EXAMPLE.COM", "password")

        verify { userRepository.findByEmail("test@example.com") }
    }

    @Test
    fun `login fails when user not found`() {
        every { userRepository.findByEmail("unknown@example.com") } returns null

        val result = authService.login("unknown@example.com", "password123")

        assertTrue(result is AuthResult.InvalidCredentials)
    }

    @Test
    fun `login fails with wrong password`() {
        val user = User(
            id = "user-123",
            email = "test@example.com",
            passwordHash = "hashed_password",
            firstName = "John",
            lastName = "Doe",
            phoneNumber = null,
            createdAt = Instant.now()
        )

        every { userRepository.findByEmail("test@example.com") } returns user
        every { passwordService.verify("wrong_password", "hashed_password") } returns false

        val result = authService.login("test@example.com", "wrong_password")

        assertTrue(result is AuthResult.InvalidCredentials)
    }

    @Test
    fun `findUserById returns user when exists`() {
        val user = User(
            id = "user-123",
            email = "test@example.com",
            passwordHash = "hashed",
            firstName = "John",
            lastName = "Doe",
            phoneNumber = null,
            createdAt = Instant.now()
        )

        every { userRepository.findById("user-123") } returns user

        val result = authService.findUserById("user-123")

        assertNotNull(result)
        assertEquals("user-123", result?.id)
    }

    @Test
    fun `findUserById returns null when user not found`() {
        every { userRepository.findById("nonexistent") } returns null

        val result = authService.findUserById("nonexistent")

        assertNull(result)
    }
}
