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
        <div className="nav-links">
          <button
            className={`nav-link ${activeView === 'products' ? 'active' : ''}`}
            onClick={() => setActiveView('products')}
          >
            Products
          </button>
          {user && (
            <button
              className={`nav-link ${activeView === 'favorites' ? 'active' : ''}`}
              onClick={() => setActiveView('favorites')}
            >
              Favorites
            </button>
          )}
        </div>
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
