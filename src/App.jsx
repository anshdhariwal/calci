import './App.css'
import Scan from './pages/Scan.jsx'

function App() {
  return (
    <>
      <header className="app-header">
        <span className="logo">CALCI</span>
        <span className="logo-sub">// grade table ocr engine v2.0</span>
      </header>
      <main className="app-main">
        <Scan />
      </main>
    </>
  )
}

export default App
