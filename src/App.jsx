import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './lib/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Apartments from './pages/Apartments';
import Residents from './pages/Residents';
import Finance from './pages/Finance';
import ResidentForm from './pages/ResidentForm';
import DevArea from './pages/DevArea';
import Login from './pages/Login';
import Layout from './components/Layout';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/*" element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/apartamentos" element={<Apartments />} />
                  <Route path="/moradores" element={<Residents />} />
                  <Route path="/moradores/novo" element={<ResidentForm />} />
                  <Route path="/moradores/editar/:id" element={<ResidentForm />} />
                  <Route path="/financeiro" element={<Finance />} />
                  <Route path="/ocorrencias" element={<div>Ocorrências</div>} />
                  <Route path="/dev" element={
                    <ProtectedRoute requireDev={true}>
                      <DevArea />
                    </ProtectedRoute>
                  } />
                </Routes>
              </Layout>
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
