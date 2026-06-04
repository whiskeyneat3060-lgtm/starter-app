import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <main className="app">
      <div className="card">
        <h1>starter-app</h1>
        <p className="subtitle">Vite + React is running. 🎉</p>

        <button
          type="button"
          className="counter"
          onClick={() => setCount((c) => c + 1)}
        >
          Tapped {count} {count === 1 ? 'time' : 'times'}
        </button>

        <button
          type="button"
          className="reset"
          onClick={() => setCount(0)}
          disabled={count === 0}
        >
          Reset
        </button>

        <p className="hint">Tap the button to confirm it works on your phone.</p>
      </div>
    </main>
  )
}

export default App
