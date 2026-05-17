import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Users,
  Wallet,
  AlertTriangle,
  Bell,
  Menu,
  LogOut
} from 'lucide-react';
import { getSettings } from '../lib/settings';
import { useAuth } from '../lib/AuthContext';
import './Layout.css';

const Layout = ({ children }) => {
  const location = useLocation();
  const [settings, setSettings] = useState(getSettings());
  const { currentUser, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const handleUpdate = () => setSettings(getSettings());
    window.addEventListener('settingsUpdated', handleUpdate);
    return () => window.removeEventListener('settingsUpdated', handleUpdate);
  }, []);

  const navItems = [
    { path: '/', label: 'Início', icon: <LayoutDashboard size={20} /> },
    { path: '/apartamentos', label: 'Aptos', icon: <Building2 size={20} /> },
    { path: '/moradores', label: 'Moradores', icon: <Users size={20} /> },
    { path: '/financeiro', label: 'Finanças', icon: <Wallet size={20} /> },
    { path: '/ocorrencias', label: 'Alertas', icon: <AlertTriangle size={20} /> },
  ];

  return (
    <div className="app-container">
      {/* Desktop Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <Building2 className="logo-icon" />
            <span>{settings.nomeResidencial}</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <Link to="/dev" className="sidebar-profile" title="Área do Desenvolvedor">
            <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.nome || 'User')}&background=${settings.corAvatar}&color=fff`} alt="Profile" />
            <div className="profile-info">
              <span className="profile-name">{currentUser?.nome}</span>
              <span className="profile-role">{currentUser?.role === 'dev' ? 'Desenvolvedor' : 'Administrador'}</span>
            </div>
          </Link>
          <button className="btn-logout" onClick={logout} title="Sair do sistema">
            <LogOut size={20} />
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="mobile-header" style={{ justifyContent: 'space-between' }}>
        <span className="brand-name">{settings.nomeResidencial}</span>
        <div className="header-actions">
          <div className="avatar-dropdown-container" style={{ position: 'relative' }}>
            <button 
              className="profile-avatar" 
              style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}
              onClick={() => setShowDropdown(!showDropdown)} 
              title="Menu do Usuário"
            >
              <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.nome || 'User')}&background=${settings.corAvatar}&color=fff`} alt="Profile" />
            </button>

            {showDropdown && (
              <div className="header-dropdown glass">
                <div className="dropdown-user-info">
                  <span className="dropdown-username">{currentUser?.nome}</span>
                  <span className="dropdown-userrole">{currentUser?.role === 'dev' ? 'Desenvolvedor' : 'Administrador'}</span>
                </div>
                <div className="dropdown-divider"></div>
                {currentUser?.role === 'dev' && (
                  <Link 
                    to="/dev" 
                    className="dropdown-item" 
                    onClick={() => setShowDropdown(false)}
                  >
                    Área Dev
                  </Link>
                )}
                <button 
                  onClick={() => {
                    setShowDropdown(false);
                    logout();
                  }} 
                  className="dropdown-item logout-item"
                >
                  Sair do Sistema
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="main-content">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="bottom-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default Layout;
