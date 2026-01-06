import type {
  Product,
  Order,
  CreateProductRequest,
  CreateOrderRequest,
  ErrorResponse
} from './types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData: ErrorResponse = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new ApiError(response.status, errorData.error)
  }
  if (response.status === 204) {
    return undefined as T
  }
  return response.json()
}

export async function getProducts(): Promise<Product[]> {
  const response = await fetch(`${API_BASE_URL}/api/products`)
  return handleResponse<Product[]>(response)
}

export async function createProduct(request: CreateProductRequest): Promise<Product> {
  const response = await fetch(`${API_BASE_URL}/api/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  })
  return handleResponse<Product>(response)
}

export async function deleteProduct(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/products/${id}`, {
    method: 'DELETE'
  })
  return handleResponse<void>(response)
}

export async function getOrders(): Promise<Order[]> {
  const response = await fetch(`${API_BASE_URL}/api/orders`)
  return handleResponse<Order[]>(response)
}

export async function createOrder(request: CreateOrderRequest): Promise<Order> {
  const response = await fetch(`${API_BASE_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  })
  return handleResponse<Order>(response)
}

export async function deleteOrder(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/orders/${id}`, {
    method: 'DELETE'
  })
  return handleResponse<void>(response)
}

export { ApiError }
