import { useState, useEffect } from 'react'
import type { Product } from '../types'
import { getProducts, createProduct, deleteProduct, createOrder, ApiError } from '../api'
import { useAuth } from '../context/AuthContext'

interface ProductsProps {
  onOrderCreated: () => void
}

export function Products({ onOrderCreated }: ProductsProps) {
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [actionError, setActionError] = useState<string | null>(null)

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

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setActionError(null)
    try {
      const priceNum = parseFloat(price)
      if (isNaN(priceNum) || priceNum <= 0) {
        setActionError('Price must be a positive number')
        return
      }
      await createProduct({ name, price: priceNum })
      setName('')
      setPrice('')
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
    const quantityStr = quantities[productId] || '1'
    const quantity = parseInt(quantityStr, 10)
    if (isNaN(quantity) || quantity < 1) {
      setActionError('Quantity must be at least 1')
      return
    }
    try {
      await createOrder({ productId, quantity })
      setQuantities((prev) => ({ ...prev, [productId]: '' }))
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
        <form onSubmit={handleAddProduct} className="form">
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
          <button type="submit">List Equipment</button>
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
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Equipment</th>
              <th>Price</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td className="id-cell">{product.id}</td>
                <td className="name-cell">
                  {product.name}
                  {isOwner(product) && <span className="owner-badge">Yours</span>}
                </td>
                <td className="price-cell">{product.price.toFixed(2)}</td>
                <td className="actions-cell">
                  {isOwner(product) ? (
                    <button onClick={() => handleDeleteProduct(product.id)} className="delete-btn">
                      Remove
                    </button>
                  ) : (
                    <>
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={quantities[product.id] || ''}
                        onChange={(e) =>
                          setQuantities((prev) => ({
                            ...prev,
                            [product.id]: e.target.value
                          }))
                        }
                        className="quantity-input"
                      />
                      <button onClick={() => handleOrderProduct(product.id)} className="order-btn">Buy</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
