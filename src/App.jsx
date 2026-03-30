import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/common/Layout';
import Home from './pages/Home';
import ManualEntry from './pages/ManualEntry';
import UploadFlow from './pages/UploadFlow';

function App() {
  const basename = import.meta.env.MODE === 'production' ? '/calci' : '/';
  
  return (
    <Router basename={basename}>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/manual" element={<ManualEntry />} />
          <Route path="/upload" element={<UploadFlow />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
