import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabase';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar sessão salva no localStorage
    const savedSession = localStorage.getItem('condo_session');
    if (savedSession) {
      setCurrentUser(JSON.parse(savedSession));
    }
    setLoading(false);
  }, []);

  const login = async (email, senha) => {
    try {
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .eq('email', email)
        .eq('senha', senha)
        .single();

      if (error || !data) {
        throw new Error('E-mail ou senha incorretos.');
      }

      // Salvar na sessão
      const user = {
        id: data.id,
        nome: data.nome,
        email: data.email,
        role: data.role // 'dev' ou 'admin'
      };

      setCurrentUser(user);
      localStorage.setItem('condo_session', JSON.stringify(user));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('condo_session');
  };

  const value = {
    currentUser,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
