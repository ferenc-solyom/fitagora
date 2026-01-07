import { useRef } from 'react'
import { Products } from './components/Products'
import { Orders, OrdersHandle } from './components/Orders'

function App() {
  const ordersRef = useRef<OrdersHandle>(null)

  const handleOrderCreated = () => {
    ordersRef.current?.refresh()
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
          </div>
        </div>
      </header>
      <main className="main">
        <Products onOrderCreated={handleOrderCreated} />
        <Orders ref={ordersRef} />
      </main>
      <footer className="footer">
        Powered by <a href="https://www.linkedin.com/in/ferenc-solyom/" target="_blank" rel="noopener noreferrer">Ferenc Solyom</a>
      </footer>
    </div>
  )
}

export default App
