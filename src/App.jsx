import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home.jsx';
import UploadPage from './pages/Upload.jsx';
import ResultPage from './pages/Result.jsx';
import ManualPage from './pages/Manual.jsx';
import Navbar from './components/Navbar.jsx';
import Watermark from './components/Watermark.jsx';

function App() {
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
    </Router>
  );
}

export default App;
