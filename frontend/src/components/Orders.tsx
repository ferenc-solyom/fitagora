import { useState, useEffect, useImperativeHandle, forwardRef } from 'react'
import type { Order } from '../types'
import { getOrders, deleteOrder, ApiError } from '../api'

export interface OrdersHandle {
  refresh: () => void
}

export const Orders = forwardRef<OrdersHandle>(function Orders(_, ref) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const fetchOrders = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getOrders()
      setOrders(data)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  useImperativeHandle(ref, () => ({
    refresh: fetchOrders
  }))

  const handleDeleteOrder = async (id: string) => {
    setActionError(null)
    try {
      await deleteOrder(id)
      await fetchOrders()
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Failed to delete order')
    }
  }

  if (loading) return <div className="loading">Loading purchases...</div>
  if (error) return <div className="error">{error}</div>

  return (
    <div className="section">
      <h2>My Purchases</h2>

      {actionError && <div className="error">{actionError}</div>}

      {orders.length === 0 ? (
        <p className="empty-state">No purchases yet. Browse equipment to get started!</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Item ID</th>
              <th>Qty</th>
              <th>Total</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td className="id-cell">{order.id}</td>
                <td className="id-cell">{order.productId}</td>
                <td>{order.quantity}</td>
                <td className="price-cell">${order.totalPrice.toFixed(2)}</td>
                <td>
                  <button onClick={() => handleDeleteOrder(order.id)} className="delete-btn">
                    Cancel
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
})
