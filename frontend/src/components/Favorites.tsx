import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import type { Favorite, Product } from '../types'
import { getFavorites, getProducts, removeFavorite, ApiError } from '../api'

export function Favorites() {
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [products, setProducts] = useState<Map<string, Product>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [favoritesData, productsData] = await Promise.all([
        getFavorites(),
        getProducts()
      ])
      setFavorites(favoritesData)
      const productMap = new Map(productsData.map(p => [p.id, p]))
      setProducts(productMap)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load favorites')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleRemoveFavorite = async (productId: string) => {
    setActionError(null)
    try {
      await removeFavorite(productId)
      setFavorites(prev => prev.filter(f => f.productId !== productId))
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Failed to remove favorite')
    }
  }

  if (loading) return <div className="loading">Loading favorites...</div>
  if (error) return <div className="error">{error}</div>

  return (
    <div className="section">
      <h2>My Favorites</h2>

      {actionError && <div className="error">{actionError}</div>}

      {favorites.length === 0 ? (
        <p className="empty-state">No favorites yet. Browse equipment and click the star to save items!</p>
      ) : (
        <div className="products-grid">
          {favorites.map((favorite) => {
            const product = products.get(favorite.productId)
            if (!product) return null

            return (
              <div key={favorite.id} className="product-card">
                <Link to={`/products/${product.id}`} className="product-link">
                  <div className="product-image-container">
                    {product.images.length > 0 ? (
                      <img src={product.images[0]} alt={product.name} className="product-image" />
                    ) : (
                      <div className="product-image-placeholder">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <path d="M21 15l-5-5L5 21" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="product-info">
                    <h3 className="product-name">{product.name}</h3>
                    <p className="product-price">{product.price.toFixed(2)} Lei</p>
                  </div>
                </Link>
                <div className="product-actions">
                  <button
                    onClick={() => handleRemoveFavorite(product.id)}
                    className="favorite-btn favorited"
                    title="Remove from favorites"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </button>
                  <Link to={`/products/${product.id}`} className="view-btn">View Details</Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
