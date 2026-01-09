import { useState, useEffect, useRef } from 'react'
import type { Product } from '../types'
import { getProducts, createProduct, deleteProduct, createOrder, ApiError } from '../api'
import { useAuth } from '../context/AuthContext'

interface ProductsProps {
  onOrderCreated: () => void
}

const MAX_IMAGE_SIZE = 350 * 1024
const MAX_IMAGE_DIMENSION = 800

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let { width, height } = img

        if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
          if (width > height) {
            height = (height / width) * MAX_IMAGE_DIMENSION
            width = MAX_IMAGE_DIMENSION
          } else {
            width = (width / height) * MAX_IMAGE_DIMENSION
            height = MAX_IMAGE_DIMENSION
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Could not get canvas context'))
          return
        }
        ctx.drawImage(img, 0, 0, width, height)

        let quality = 0.8
        let dataUrl = canvas.toDataURL('image/jpeg', quality)

        while (dataUrl.length > MAX_IMAGE_SIZE && quality > 0.1) {
          quality -= 0.1
          dataUrl = canvas.toDataURL('image/jpeg', quality)
        }

        if (dataUrl.length > MAX_IMAGE_SIZE) {
          reject(new Error('Image too large even after compression'))
          return
        }

        resolve(dataUrl)
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = e.target?.result as string
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

export function Products({ onOrderCreated }: ProductsProps) {
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [imageData, setImageData] = useState<string | null>(null)
  const [imageLoading, setImageLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [modalImage, setModalImage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchProducts = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getProducts()
      setProducts(data)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setActionError('Please select an image file')
      return
    }

    try {
      setImageLoading(true)
      setActionError(null)
      const compressed = await compressImage(file)
      setImageData(compressed)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to process image')
    } finally {
      setImageLoading(false)
    }
  }

  const handleRemoveImage = () => {
    setImageData(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setActionError(null)
    try {
      const priceNum = parseFloat(price)
      if (isNaN(priceNum) || priceNum <= 0) {
        setActionError('Price must be a positive number')
        return
      }
      await createProduct({
        name,
        price: priceNum,
        imageData: imageData || undefined
      })
      setName('')
      setPrice('')
      setImageData(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      await fetchProducts()
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Failed to add product')
    }
  }

  const handleDeleteProduct = async (id: string) => {
    setActionError(null)
    try {
      await deleteProduct(id)
      await fetchProducts()
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Failed to delete product')
    }
  }

  const handleOrderProduct = async (productId: string) => {
    setActionError(null)
    try {
      await createOrder({ productId, quantity: 1 })
      onOrderCreated()
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Failed to create order')
    }
  }

  const isOwner = (product: Product): boolean => {
    return user !== null && product.ownerId === user.id
  }

  if (loading) return <div className="loading">Loading equipment...</div>
  if (error) return <div className="error">{error}</div>

  return (
    <div className="section">
      <h2>Equipment Listings</h2>

      {user ? (
        <form onSubmit={handleAddProduct} className="form product-form">
          <div className="form-main-inputs">
            <input
              type="text"
              placeholder="Equipment name (e.g., Dumbbell Set)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <input
              type="number"
              placeholder="Price (Lei)"
              step="0.01"
              min="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>
          <div className="form-image-row">
            <label className="image-upload-btn">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                style={{ display: 'none' }}
              />
              {imageLoading ? 'Processing...' : 'Add Photo'}
            </label>
            {imageData && (
              <div className="image-preview-container">
                <img src={imageData} alt="Preview" className="image-preview" />
                <button type="button" onClick={handleRemoveImage} className="remove-image-btn">×</button>
              </div>
            )}
          </div>
          <button type="submit" disabled={imageLoading}>List Equipment</button>
        </form>
      ) : (
        <p className="auth-prompt" style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid var(--color-border)' }}>
          Login to list your fitness equipment for sale.
        </p>
      )}

      {actionError && <div className="error">{actionError}</div>}

      {products.length === 0 ? (
        <p className="empty-state">No equipment listed yet. Be the first to sell!</p>
      ) : (
        <div className="products-grid">
          {products.map((product) => (
            <div key={product.id} className="product-card">
              <div
                className="product-image-container"
                onClick={() => product.imageData && setModalImage(product.imageData)}
              >
                {product.imageData ? (
                  <img src={product.imageData} alt={product.name} className="product-image" />
                ) : (
                  <div className="product-image-placeholder">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="M21 15l-5-5L5 21" />
                    </svg>
                  </div>
                )}
                {isOwner(product) && <span className="owner-badge">Yours</span>}
              </div>
              <div className="product-info">
                <h3 className="product-name">{product.name}</h3>
                <p className="product-price">{product.price.toFixed(2)} Lei</p>
              </div>
              <div className="product-actions">
                {isOwner(product) ? (
                  <button onClick={() => handleDeleteProduct(product.id)} className="delete-btn">
                    Remove
                  </button>
                ) : (
                  <button onClick={() => handleOrderProduct(product.id)} className="order-btn">Buy</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalImage && (
        <div className="image-modal" onClick={() => setModalImage(null)}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <img src={modalImage} alt="Full size" />
            <button className="image-modal-close" onClick={() => setModalImage(null)}>×</button>
          </div>
        </div>
      )}
    </div>
  )
}
