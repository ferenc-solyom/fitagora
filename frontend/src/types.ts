export interface Category {
  value: string
  label: string
}

export interface Product {
  id: string
  name: string
  description: string | null
  price: number
  category: string
  ownerId: string
  images: string[]
  createdAt: string
}

export interface SellerInfo {
  id: string
  firstName: string
  lastName: string
  phoneNumber: string | null
}

export interface ProductDetail {
  id: string
  name: string
  description: string | null
  price: number
  category: string
  categoryDisplayName: string
  images: string[]
  createdAt: string
  seller: SellerInfo
}

export interface Favorite {
  id: string
  userId: string
  productId: string
  createdAt: string
}

export interface CreateProductRequest {
  name: string
  description?: string
  price: number
  category: string
  images?: string[]
}

export interface UpdateProductRequest {
  name: string
  description?: string
  price: number
  category: string
  images?: string[]
}

export interface ErrorResponse {
  error: string
}

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  phoneNumber: string | null
}

export interface RegisterRequest {
  email: string
  password: string
  firstName: string
  lastName: string
  phoneNumber?: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface AuthResponse {
  token: string
  user: User
}
