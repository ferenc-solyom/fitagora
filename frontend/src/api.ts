import type {
  Product,
  ProductDetail,
  Favorite,
  CreateProductRequest,
  UpdateProductRequest,
  ErrorResponse,
  RegisterRequest,
  LoginRequest,
  AuthResponse,
  User,
  Category,
  PaginatedResponse
} from './types'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').replace(/\/+$/, '')
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
export interface SearchParams {
  q?: string
  category?: string
  limit?: number
  offset?: number
}

export async function getCategories(): Promise<Category[]> {
  const response = await fetch(`${API_BASE_URL}/api/products/categories`)
  return handleResponse<Category[]>(response)
}

export async function getProducts(params?: SearchParams): Promise<PaginatedResponse<Product>> {
  const url = new URL(`${API_BASE_URL}/api/products`)
  if (params?.q) url.searchParams.set('q', params.q)
  if (params?.category) url.searchParams.set('category', params.category)
  if (params?.limit) url.searchParams.set('limit', params.limit.toString())
  if (params?.offset) url.searchParams.set('offset', params.offset.toString())
  const response = await fetch(url.toString())
  return handleResponse<PaginatedResponse<Product>>(response)
}

export async function getProduct(id: string): Promise<ProductDetail> {
  const response = await fetch(`${API_BASE_URL}/api/products/${id}`)
  return handleResponse<ProductDetail>(response)
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

export async function updateProduct(id: string, request: UpdateProductRequest): Promise<Product> {
  const response = await fetch(`${API_BASE_URL}/api/products/${id}`, {
    method: 'PUT',
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

// Favorites API
export async function getFavorites(): Promise<Favorite[]> {
  const response = await fetch(`${API_BASE_URL}/api/favorites`, {
    headers: getAuthHeaders()
  })
  return handleResponse<Favorite[]>(response)
}

export async function addFavorite(productId: string): Promise<Favorite> {
  const response = await fetch(`${API_BASE_URL}/api/favorites/${productId}`, {
    method: 'POST',
    headers: getAuthHeaders()
  })
  return handleResponse<Favorite>(response)
}

export async function removeFavorite(productId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/favorites/${productId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  })
  return handleResponse<void>(response)
}

export async function isFavorited(productId: string): Promise<boolean> {
  const response = await fetch(`${API_BASE_URL}/api/favorites/${productId}/status`, {
    headers: getAuthHeaders()
  })
  const data = await handleResponse<{ favorited: boolean }>(response)
  return data.favorited
}

export { ApiError }
