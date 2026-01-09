export interface Product {
  id: string
  name: string
  price: number
  ownerId: string
  imageData: string | null
  createdAt: string
}

export interface Order {
  id: string
  productId: string
  quantity: number
  totalPrice: number
  userId: string | null
  createdAt: string
}

export interface CreateProductRequest {
  name: string
  price: number
  imageData?: string
}

export interface CreateOrderRequest {
  productId: string
  quantity: number
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
