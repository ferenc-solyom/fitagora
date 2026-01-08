import { useRef } from 'react'
import { Products } from './components/Products'
import { Orders, OrdersHandle } from './components/Orders'
import { AuthForms } from './components/AuthForms'
import { AuthProvider, useAuth } from './context/AuthContext'

function AppContent() {
  const ordersRef = useRef<OrdersHandle>(null)
  const { user, loading, logout } = useAuth()

  const handleOrderCreated = () => {
    ordersRef.current?.refresh()
  }

  if (loading) {
    return (
      <div className="app">
        <div className="loading">Loading...</div>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="header">
        <div className="hero">
          <img
            src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&h=400&fit=crop&crop=center"
            alt="Fitness equipment"
            className="hero-image"
          />
          <div className="hero-overlay" />
          <div className="header-content">
            <h1 className="logo">Fit<span className="logo-accent">Agora</span></h1>
            <p className="tagline">Second Hand Fitness Equipment</p>
            {user && (
              <div className="user-info">
                <span>Welcome, {user.firstName}!</span>
                <button onClick={logout} className="logout-btn">Logout</button>
              </div>
            )}
          </div>
        </div>
      </header>
      <main className="main">
        {!user ? (
          <>
            <Products onOrderCreated={handleOrderCreated} />
            <div className="section">
              <h2>Account</h2>
              <p className="auth-prompt">Login or register to list products and track your orders.</p>
              <AuthForms />
            </div>
          </>
        ) : (
          <>
            <Products onOrderCreated={handleOrderCreated} />
            <Orders ref={ordersRef} />
          </>
        )}
      </main>
      <footer className="footer">
        Powered by <a href="https://www.linkedin.com/in/ferenc-solyom/" target="_blank" rel="noopener noreferrer">Ferenc Solyom</a>
      </footer>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
