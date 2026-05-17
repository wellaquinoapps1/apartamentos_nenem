import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Apartments from './pages/Apartments';
import Residents from './pages/Residents';
import Finance from './pages/Finance';
import ResidentForm from './pages/ResidentForm';
import Layout from './components/Layout';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/apartamentos" element={<Apartments />} />
          <Route path="/moradores" element={<Residents />} />
          <Route path="/moradores/novo" element={<ResidentForm />} />
          <Route path="/moradores/editar/:id" element={<ResidentForm />} />
          <Route path="/financeiro" element={<Finance />} />
          <Route path="/ocorrencias" element={<div>Ocorrências</div>} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
