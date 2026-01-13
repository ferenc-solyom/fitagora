import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import type { ProductDetail } from '../types'
import { getProduct, addFavorite, removeFavorite, isFavorited, deleteProduct, ApiError } from '../api'
import { useAuth } from '../context/AuthContext'

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [favorited, setFavorited] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return

      try {
        setLoading(true)
        setError(null)
        const data = await getProduct(id)
        setProduct(data)

        if (user) {
          const isFav = await isFavorited(id)
          setFavorited(isFav)
        }
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'Failed to load product')
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [id, user])

  const handleToggleFavorite = async () => {
    if (!user || !id) return

    setActionError(null)
    try {
      if (favorited) {
        await removeFavorite(id)
        setFavorited(false)
      } else {
        await addFavorite(id)
        setFavorited(true)
      }
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Failed to update favorite')
    }
  }

  const handleDelete = async () => {
    if (!id || !confirm('Are you sure you want to delete this product?')) return

    setActionError(null)
    try {
      await deleteProduct(id)
      navigate('/')
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Failed to delete product')
    }
  }

  const isOwner = user && product && user.id === product.seller.id

  if (loading) {
    return (
      <div className="product-detail-page">
        <div className="loading">Loading product...</div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="product-detail-page">
        <div className="error">{error || 'Product not found'}</div>
        <Link to="/" className="back-link">Back to Products</Link>
      </div>
    )
  }

  return (
    <div className="product-detail-page">
      <nav className="detail-nav">
        <Link to="/" className="back-link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Products
        </Link>
      </nav>

      {actionError && <div className="error">{actionError}</div>}

      <div className="product-detail-content">
        <div className="product-detail-gallery">
          {product.images.length > 0 ? (
            <>
              <div className="main-image">
                <img src={product.images[selectedImageIndex]} alt={product.name} />
              </div>
              {product.images.length > 1 && (
                <div className="thumbnail-row">
                  {product.images.map((img, idx) => (
                    <button
                      key={idx}
                      className={`thumbnail ${idx === selectedImageIndex ? 'active' : ''}`}
                      onClick={() => setSelectedImageIndex(idx)}
                    >
                      <img src={img} alt={`${product.name} ${idx + 1}`} />
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="main-image no-image">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
              <span>No photos available</span>
            </div>
          )}
        </div>

        <div className="product-detail-info">
          <div className="product-detail-header">
            <h1>{product.name}</h1>
            <span className="category-badge large">{product.categoryDisplayName}</span>
            <p className="product-detail-price">{product.price.toFixed(2)} Lei</p>
          </div>

          {product.description && (
            <div className="product-detail-description">
              <h3>Description</h3>
              <p>{product.description}</p>
            </div>
          )}

          <div className="product-detail-seller">
            <h3>Seller Information</h3>
            <div className="seller-info">
              <div className="seller-name">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                {product.seller.firstName} {product.seller.lastName}
              </div>
              {product.seller.phoneNumber && (
                <a href={`tel:${product.seller.phoneNumber}`} className="seller-phone">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  {product.seller.phoneNumber}
                </a>
              )}
            </div>
          </div>

          <div className="product-detail-actions">
            {isOwner ? (
              <button onClick={handleDelete} className="delete-btn full-width">
                Delete Product
              </button>
            ) : (
              <>
                {user && (
                  <button
                    onClick={handleToggleFavorite}
                    className={`favorite-btn large ${favorited ? 'favorited' : ''}`}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill={favorited ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    {favorited ? 'Remove from Favorites' : 'Add to Favorites'}
                  </button>
                )}
                {product.seller.phoneNumber && (
                  <a href={`tel:${product.seller.phoneNumber}`} className="contact-btn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    Contact Seller
                  </a>
                )}
              </>
            )}
          </div>

          <p className="product-detail-date">
            Listed on {new Date(product.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  )
}
