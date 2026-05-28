import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Watermark from './components/common/Watermark.jsx';

function App() {
  return (
    <Router>
      <main style={{ minHeight: '80vh', padding: '0.5rem 1rem' }}>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </main>
      <Watermark />
    </Router>
  );
}

export default App;
