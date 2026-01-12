package org.acme.webshop.service

import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import org.acme.webshop.domain.Favorite
import org.acme.webshop.domain.Product
import org.acme.webshop.repository.FavoriteRepository
import org.acme.webshop.repository.ProductRepository
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.Instant

class FavoriteServiceTest {

    private lateinit var favoriteRepository: FavoriteRepository
    private lateinit var productRepository: ProductRepository
    private lateinit var favoriteService: FavoriteService

    @BeforeEach
    fun setUp() {
        favoriteRepository = mockk()
        productRepository = mockk()
        favoriteService = FavoriteService(favoriteRepository, productRepository)
    }

    @Test
    fun `addFavorite succeeds for valid product`() {
        val product = Product(
            id = "prod-123",
            name = "Test Product",
            description = null,
            price = BigDecimal("10.00"),
            ownerId = "seller-123",
            images = emptyList(),
            createdAt = Instant.now()
        )

        every { productRepository.findById("prod-123") } returns product
        every { favoriteRepository.findByUserIdAndProductId("user-123", "prod-123") } returns null
        val favoriteSlot = slot<Favorite>()
        every { favoriteRepository.save(capture(favoriteSlot)) } answers { favoriteSlot.captured }

        val result = favoriteService.addFavorite("user-123", "prod-123")

        assertTrue(result is AddFavoriteResult.Success)
        val favorite = (result as AddFavoriteResult.Success).favorite
        assertEquals("user-123", favorite.userId)
        assertEquals("prod-123", favorite.productId)
        assertNotNull(favorite.id)
        assertNotNull(favorite.createdAt)
    }

    @Test
    fun `addFavorite fails when product not found`() {
        every { productRepository.findById("nonexistent") } returns null

        val result = favoriteService.addFavorite("user-123", "nonexistent")

        assertTrue(result is AddFavoriteResult.ProductNotFound)
    }

    @Test
    fun `addFavorite fails when already favorited`() {
        val product = Product(
            id = "prod-123",
            name = "Test Product",
            description = null,
            price = BigDecimal("10.00"),
            ownerId = "seller-123",
            images = emptyList(),
            createdAt = Instant.now()
        )
        val existingFavorite = Favorite(
            id = "fav-123",
            userId = "user-123",
            productId = "prod-123",
            createdAt = Instant.now()
        )

        every { productRepository.findById("prod-123") } returns product
        every { favoriteRepository.findByUserIdAndProductId("user-123", "prod-123") } returns existingFavorite

        val result = favoriteService.addFavorite("user-123", "prod-123")

        assertTrue(result is AddFavoriteResult.AlreadyFavorited)
    }

    @Test
    fun `removeFavorite succeeds when favorite exists`() {
        every { favoriteRepository.deleteByUserIdAndProductId("user-123", "prod-123") } returns true

        val result = favoriteService.removeFavorite("user-123", "prod-123")

        assertTrue(result is RemoveFavoriteResult.Success)
        verify { favoriteRepository.deleteByUserIdAndProductId("user-123", "prod-123") }
    }

    @Test
    fun `removeFavorite fails when favorite not found`() {
        every { favoriteRepository.deleteByUserIdAndProductId("user-123", "prod-123") } returns false

        val result = favoriteService.removeFavorite("user-123", "prod-123")

        assertTrue(result is RemoveFavoriteResult.NotFound)
    }

    @Test
    fun `findByUserId returns user favorites`() {
        val favorites = listOf(
            Favorite("fav-1", "user-123", "prod-1", Instant.now()),
            Favorite("fav-2", "user-123", "prod-2", Instant.now())
        )
        every { favoriteRepository.findByUserId("user-123") } returns favorites

        val result = favoriteService.findByUserId("user-123")

        assertEquals(2, result.size)
        assertTrue(result.all { it.userId == "user-123" })
    }

    @Test
    fun `isFavorited returns true when favorite exists`() {
        val favorite = Favorite("fav-123", "user-123", "prod-123", Instant.now())
        every { favoriteRepository.findByUserIdAndProductId("user-123", "prod-123") } returns favorite

        val result = favoriteService.isFavorited("user-123", "prod-123")

        assertTrue(result)
    }

    @Test
    fun `isFavorited returns false when favorite does not exist`() {
        every { favoriteRepository.findByUserIdAndProductId("user-123", "prod-123") } returns null

        val result = favoriteService.isFavorited("user-123", "prod-123")

        assertFalse(result)
    }

    @Test
    fun `deleteByProductId removes all favorites for product`() {
        every { favoriteRepository.deleteByProductId("prod-123") } returns 3

        val result = favoriteService.deleteByProductId("prod-123")

        assertEquals(3, result)
        verify { favoriteRepository.deleteByProductId("prod-123") }
    }
}
