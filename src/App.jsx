import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home.jsx';
import UploadPage from './pages/Upload.jsx';
import ResultPage from './pages/Result.jsx';
import ManualPage from './pages/Manual.jsx';
import Navbar from './components/Navbar.jsx';
import Watermark from './components/Watermark.jsx';
import InfoButton from './components/InfoButton.jsx';

function App() {
  useEffect(() => {
    const splash = document.getElementById('splash-screen');
    if (splash) {
      const isHome = window.location.pathname === '/calci/' || window.location.pathname === '/calci' || window.location.pathname === '/';
      if (isHome) {
        splash.classList.add('burn-out');
        const timer = setTimeout(() => splash.remove(), 850);
        return () => clearTimeout(timer);
      } else {
        splash.style.transition = 'opacity 0.25s ease';
        splash.style.opacity = '0';
        const timer = setTimeout(() => splash.remove(), 250);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  return (
    <Router basename="/calci">
      <Navbar />
      <main style={{ minHeight: '80vh' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/manual" element={<ManualPage />} />
          <Route path="/result" element={<ResultPage />} />
        </Routes>
      </main>
      <Watermark />
      <InfoButton />
    </Router>
  );
}

export default App;
