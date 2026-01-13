package org.acme.webshop.service

import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import org.acme.webshop.domain.Category
import org.acme.webshop.domain.Product
import org.acme.webshop.repository.ProductRepository
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.Instant

class ProductServiceTest {

    private lateinit var productRepository: ProductRepository
    private lateinit var productService: ProductService

    @BeforeEach
    fun setUp() {
        productRepository = mockk()
        productService = ProductService(productRepository)
    }

    @Test
    fun `createProduct succeeds with valid input`() {
        val productSlot = slot<Product>()
        every { productRepository.save(capture(productSlot)) } answers { productSlot.captured }

        val result = productService.createProduct(
            name = "Dumbbell Set",
            description = "Heavy duty dumbbells",
            price = BigDecimal("99.99"),
            category = Category.STRENGTH,
            ownerId = "user-123",
            images = listOf("data:image/jpeg;base64,abc123")
        )

        assertTrue(result is CreateProductResult.Success)
        val product = (result as CreateProductResult.Success).product
        assertEquals("Dumbbell Set", product.name)
        assertEquals("Heavy duty dumbbells", product.description)
        assertEquals(BigDecimal("99.99"), product.price)
        assertEquals(Category.STRENGTH, product.category)
        assertEquals("user-123", product.ownerId)
        assertEquals(1, product.images.size)
        assertNotNull(product.id)
        assertNotNull(product.createdAt)
    }

    @Test
    fun `createProduct fails when name is blank`() {
        val result = productService.createProduct(
            name = "  ",
            description = null,
            price = BigDecimal("10.00"),
            category = Category.STRENGTH,
            ownerId = "user-123"
        )

        assertTrue(result is CreateProductResult.NameRequired)
    }

    @Test
    fun `createProduct fails when name is null`() {
        val result = productService.createProduct(
            name = null,
            description = null,
            price = BigDecimal("10.00"),
            category = Category.STRENGTH,
            ownerId = "user-123"
        )

        assertTrue(result is CreateProductResult.NameRequired)
    }

    @Test
    fun `createProduct fails when price is null`() {
        val result = productService.createProduct(
            name = "Test Product",
            description = null,
            price = null,
            category = Category.STRENGTH,
            ownerId = "user-123"
        )

        assertTrue(result is CreateProductResult.PriceRequired)
    }

    @Test
    fun `createProduct fails when price is zero`() {
        val result = productService.createProduct(
            name = "Test Product",
            description = null,
            price = BigDecimal.ZERO,
            category = Category.STRENGTH,
            ownerId = "user-123"
        )

        assertTrue(result is CreateProductResult.PriceMustBePositive)
    }

    @Test
    fun `createProduct fails when price is negative`() {
        val result = productService.createProduct(
            name = "Test Product",
            description = null,
            price = BigDecimal("-10.00"),
            category = Category.STRENGTH,
            ownerId = "user-123"
        )

        assertTrue(result is CreateProductResult.PriceMustBePositive)
    }

    @Test
    fun `createProduct fails when category is null`() {
        val result = productService.createProduct(
            name = "Test Product",
            description = null,
            price = BigDecimal("10.00"),
            category = null,
            ownerId = "user-123"
        )

        assertTrue(result is CreateProductResult.CategoryRequired)
    }

    @Test
    fun `createProduct fails when too many images`() {
        val result = productService.createProduct(
            name = "Test Product",
            description = null,
            price = BigDecimal("10.00"),
            category = Category.STRENGTH,
            ownerId = "user-123",
            images = listOf("img1", "img2", "img3", "img4")
        )

        assertTrue(result is CreateProductResult.TooManyImages)
    }

    @Test
    fun `createProduct fails when image too large`() {
        val largeImage = "x".repeat(ProductService.MAX_IMAGE_SIZE_BYTES + 1)
        val result = productService.createProduct(
            name = "Test Product",
            description = null,
            price = BigDecimal("10.00"),
            category = Category.STRENGTH,
            ownerId = "user-123",
            images = listOf(largeImage)
        )

        assertTrue(result is CreateProductResult.ImageTooLarge)
    }

    @Test
    fun `createProduct fails when description too long`() {
        val longDescription = "x".repeat(ProductService.MAX_DESCRIPTION_LENGTH + 1)
        val productSlot = slot<Product>()
        every { productRepository.save(capture(productSlot)) } answers { productSlot.captured }

        val result = productService.createProduct(
            name = "Test Product",
            description = longDescription,
            price = BigDecimal("10.00"),
            category = Category.STRENGTH,
            ownerId = "user-123"
        )

        assertTrue(result is CreateProductResult.DescriptionTooLong)
    }

    @Test
    fun `createProduct trims blank description to null`() {
        val productSlot = slot<Product>()
        every { productRepository.save(capture(productSlot)) } answers { productSlot.captured }

        val result = productService.createProduct(
            name = "Test Product",
            description = "   ",
            price = BigDecimal("10.00"),
            category = Category.STRENGTH,
            ownerId = "user-123"
        )

        assertTrue(result is CreateProductResult.Success)
        val product = (result as CreateProductResult.Success).product
        assertNull(product.description)
    }

    @Test
    fun `updateProduct succeeds for owner`() {
        val existingProduct = Product(
            id = "prod-123",
            name = "Old Name",
            description = "Old Description",
            price = BigDecimal("50.00"),
            category = Category.STRENGTH,
            ownerId = "user-123",
            images = emptyList(),
            createdAt = Instant.now()
        )

        every { productRepository.findById("prod-123") } returns existingProduct
        val productSlot = slot<Product>()
        every { productRepository.save(capture(productSlot)) } answers { productSlot.captured }

        val result = productService.updateProduct(
            id = "prod-123",
            requestingUserId = "user-123",
            name = "New Name",
            description = "New Description",
            price = BigDecimal("75.00"),
            category = Category.CARDIO,
            images = listOf("new-image")
        )

        assertTrue(result is UpdateProductResult.Success)
        val updated = (result as UpdateProductResult.Success).product
        assertEquals("New Name", updated.name)
        assertEquals("New Description", updated.description)
        assertEquals(BigDecimal("75.00"), updated.price)
        assertEquals(Category.CARDIO, updated.category)
        assertEquals(1, updated.images.size)
        assertEquals(existingProduct.createdAt, updated.createdAt)
    }

    @Test
    fun `updateProduct fails when not owner`() {
        val existingProduct = Product(
            id = "prod-123",
            name = "Old Name",
            description = null,
            price = BigDecimal("50.00"),
            category = Category.STRENGTH,
            ownerId = "user-123",
            images = emptyList(),
            createdAt = Instant.now()
        )

        every { productRepository.findById("prod-123") } returns existingProduct

        val result = productService.updateProduct(
            id = "prod-123",
            requestingUserId = "other-user",
            name = "New Name",
            description = null,
            price = BigDecimal("75.00"),
            category = Category.STRENGTH,
            images = null
        )

        assertTrue(result is UpdateProductResult.NotOwner)
    }

    @Test
    fun `updateProduct fails when product not found`() {
        every { productRepository.findById("nonexistent") } returns null

        val result = productService.updateProduct(
            id = "nonexistent",
            requestingUserId = "user-123",
            name = "New Name",
            description = null,
            price = BigDecimal("75.00"),
            category = Category.STRENGTH,
            images = null
        )

        assertTrue(result is UpdateProductResult.NotFound)
    }

    @Test
    fun `deleteProduct succeeds for owner`() {
        val existingProduct = Product(
            id = "prod-123",
            name = "Test",
            description = null,
            price = BigDecimal("10.00"),
            category = Category.STRENGTH,
            ownerId = "user-123",
            images = emptyList(),
            createdAt = Instant.now()
        )

        every { productRepository.findById("prod-123") } returns existingProduct
        every { productRepository.deleteById("prod-123") } returns true

        val result = productService.deleteProduct("prod-123", "user-123")

        assertTrue(result is DeleteProductResult.Success)
        verify { productRepository.deleteById("prod-123") }
    }

    @Test
    fun `deleteProduct fails when not owner`() {
        val existingProduct = Product(
            id = "prod-123",
            name = "Test",
            description = null,
            price = BigDecimal("10.00"),
            category = Category.STRENGTH,
            ownerId = "user-123",
            images = emptyList(),
            createdAt = Instant.now()
        )

        every { productRepository.findById("prod-123") } returns existingProduct

        val result = productService.deleteProduct("prod-123", "other-user")

        assertTrue(result is DeleteProductResult.NotOwner)
    }

    @Test
    fun `deleteProduct fails when product not found`() {
        every { productRepository.findById("nonexistent") } returns null

        val result = productService.deleteProduct("nonexistent", "user-123")

        assertTrue(result is DeleteProductResult.NotFound)
    }

    @Test
    fun `findAll returns all products`() {
        val products = listOf(
            Product("1", "Product 1", null, BigDecimal("10.00"), Category.STRENGTH, "user-1", emptyList(), Instant.now()),
            Product("2", "Product 2", null, BigDecimal("20.00"), Category.CARDIO, "user-2", emptyList(), Instant.now())
        )
        every { productRepository.findAll() } returns products

        val result = productService.findAll()

        assertEquals(2, result.size)
    }

    @Test
    fun `findByOwnerId returns owner products only`() {
        val products = listOf(
            Product("1", "Product 1", null, BigDecimal("10.00"), Category.STRENGTH, "user-123", emptyList(), Instant.now())
        )
        every { productRepository.findByOwnerId("user-123") } returns products

        val result = productService.findByOwnerId("user-123")

        assertEquals(1, result.size)
        assertEquals("user-123", result[0].ownerId)
    }

    @Test
    fun `findById returns product when exists`() {
        val product = Product("1", "Test", null, BigDecimal("10.00"), Category.STRENGTH, "user-123", emptyList(), Instant.now())
        every { productRepository.findById("1") } returns product

        val result = productService.findById("1")

        assertNotNull(result)
        assertEquals("1", result?.id)
    }

    @Test
    fun `findById returns null when not exists`() {
        every { productRepository.findById("nonexistent") } returns null

        val result = productService.findById("nonexistent")

        assertNull(result)
    }

    @Test
    fun `search delegates to repository with default limit`() {
        val products = listOf(
            Product("1", "Dumbbell Set", "Heavy duty", BigDecimal("99.00"), Category.STRENGTH, "user-1", emptyList(), Instant.now())
        )
        every { productRepository.search("dumbbell", null, 20, 0) } returns products

        val result = productService.search("dumbbell")

        assertEquals(1, result.size)
        assertEquals("Dumbbell Set", result[0].name)
        verify { productRepository.search("dumbbell", null, 20, 0) }
    }

    @Test
    fun `search delegates to repository with custom limit and offset`() {
        val products = listOf(
            Product("1", "Treadmill", null, BigDecimal("500.00"), Category.CARDIO, "user-1", emptyList(), Instant.now())
        )
        every { productRepository.search("treadmill", null, 10, 5) } returns products

        val result = productService.search("treadmill", limit = 10, offset = 5)

        assertEquals(1, result.size)
        verify { productRepository.search("treadmill", null, 10, 5) }
    }

    @Test
    fun `search with category filter`() {
        val products = listOf(
            Product("1", "Treadmill", null, BigDecimal("500.00"), Category.CARDIO, "user-1", emptyList(), Instant.now())
        )
        every { productRepository.search(null, Category.CARDIO, 20, 0) } returns products

        val result = productService.search(category = Category.CARDIO)

        assertEquals(1, result.size)
        assertEquals(Category.CARDIO, result[0].category)
        verify { productRepository.search(null, Category.CARDIO, 20, 0) }
    }
}
