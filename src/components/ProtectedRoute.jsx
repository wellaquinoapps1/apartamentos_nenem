import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';

const ProtectedRoute = ({ children, requireDev = false }) => {
  const { currentUser } = useAuth();
  const location = useLocation();

  if (!currentUser) {
    // Redirecionar para o login, salvando a rota original
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireDev && currentUser.role !== 'dev') {
    // Se a rota exige dev e o usuário não é dev, redirecionar para o dashboard
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
