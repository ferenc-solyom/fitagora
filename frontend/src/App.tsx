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
        <h1 className="logo">FitAgora</h1>
        <p className="tagline">Buy & Sell Second Hand Fitness Equipment</p>
      </header>
      <main className="main">
        <Products onOrderCreated={handleOrderCreated} />
        <Orders ref={ordersRef} />
      </main>
      <footer className="footer">
        Created by <a href="https://www.linkedin.com/in/ferenc-solyom/" target="_blank" rel="noopener noreferrer">Ferenc Solyom</a>
      </footer>
    </div>
  )
}

export default App
