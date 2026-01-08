import type {
  Product,
  Order,
  CreateProductRequest,
  CreateOrderRequest,
  ErrorResponse,
  RegisterRequest,
  LoginRequest,
  AuthResponse,
  User
} from './types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
const TOKEN_KEY = 'auth_token'

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export function isAuthenticated(): boolean {
  return getToken() !== null
}

function getAuthHeaders(): HeadersInit {
  const token = getToken()
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
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

// Auth API
export async function register(request: RegisterRequest): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  })
  return handleResponse<AuthResponse>(response)
}

export async function login(request: LoginRequest): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  })
  return handleResponse<AuthResponse>(response)
}

export async function getMe(): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    headers: getAuthHeaders()
  })
  return handleResponse<User>(response)
}

// Products API
export async function getProducts(): Promise<Product[]> {
  const response = await fetch(`${API_BASE_URL}/api/products`)
  return handleResponse<Product[]>(response)
}

export async function getMyProducts(): Promise<Product[]> {
  const response = await fetch(`${API_BASE_URL}/api/products/mine`, {
    headers: getAuthHeaders()
  })
  return handleResponse<Product[]>(response)
}

export async function createProduct(request: CreateProductRequest): Promise<Product> {
  const response = await fetch(`${API_BASE_URL}/api/products`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(request)
  })
  return handleResponse<Product>(response)
}

export async function deleteProduct(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/products/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  })
  return handleResponse<void>(response)
}

// Orders API
export async function getOrders(): Promise<Order[]> {
  const response = await fetch(`${API_BASE_URL}/api/orders`, {
    headers: getAuthHeaders()
  })
  return handleResponse<Order[]>(response)
}

export async function createOrder(request: CreateOrderRequest): Promise<Order> {
  const response = await fetch(`${API_BASE_URL}/api/orders`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(request)
  })
  return handleResponse<Order>(response)
}

export async function deleteOrder(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/orders/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  })
  return handleResponse<void>(response)
}

export { ApiError }
