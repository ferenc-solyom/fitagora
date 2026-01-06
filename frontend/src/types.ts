export interface Product {
  id: string
  name: string
  price: number
  createdAt: string
}

export interface Order {
  id: string
  productId: string
  quantity: number
  totalPrice: number
  createdAt: string
}

export interface CreateProductRequest {
  name: string
  price: number
}

export interface CreateOrderRequest {
  productId: string
  quantity: number
}

export interface ErrorResponse {
  error: string
}
