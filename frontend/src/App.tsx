import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Products } from './components/Products'
import { Favorites } from './components/Favorites'
import { useAuth } from './context/AuthContext'

type View = 'products' | 'favorites'

function App() {
  const { user, loading, logout } = useAuth()
  const [activeView, setActiveView] = useState<View>('products')

  if (loading) {
    return (
      <div className="app">
        <div className="loading">Loading...</div>
      </div>
    )
  }

  return (
    <div className="app">
      <nav className="navbar">
        <Link to="/" className="nav-brand">
          <img src="/logo.svg" alt="FitAgora" className="nav-logo" />
          <span className="nav-title">Fit<span className="nav-title-accent">Agora</span></span>
        </Link>
        <div className="nav-actions">
          {user ? (
            <>
              <span className="nav-user">Hi, {user.firstName}</span>
              <button onClick={logout} className="nav-btn nav-btn-outline">Logout</button>
            </>
          ) : (
            <Link to="/auth" className="nav-btn nav-btn-primary">Login / Register</Link>
          )}
        </div>
      </nav>
      <div className="view-tabs">
        <button
          className={`view-tab ${activeView === 'products' ? 'active' : ''}`}
          onClick={() => setActiveView('products')}
        >
          Products
        </button>
        {user && (
          <button
            className={`view-tab ${activeView === 'favorites' ? 'active' : ''}`}
            onClick={() => setActiveView('favorites')}
          >
            My Favorites
          </button>
        )}
      </div>

      <header className="header">
        <div className="hero">
          <img
            src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&h=400&fit=crop&crop=center"
            alt="Fitness equipment"
            className="hero-image"
          />
          <div className="hero-overlay" />
          <div className="header-content">
            <h1 className="hero-title">Second Hand Fitness Equipment</h1>
            <p className="hero-subtitle">Buy and sell quality fitness gear</p>
          </div>
        </div>
      </header>

      <main className="main main-full">
        {activeView === 'products' ? (
          <Products />
        ) : (
          user && <Favorites />
        )}
      </main>

      <footer className="footer">
        Powered by <a href="https://www.linkedin.com/in/ferenc-solyom/" target="_blank" rel="noopener noreferrer">Ferenc Solyom</a>
      </footer>
    </div>
  )
}

export default App
