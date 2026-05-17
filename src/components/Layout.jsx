import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Users,
  Wallet,
  AlertTriangle,
  Bell,
  Menu
} from 'lucide-react';
import { getSettings } from '../lib/settings';
import './Layout.css';

const Layout = ({ children }) => {
  const location = useLocation();
  const [settings, setSettings] = useState(getSettings());

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
            <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(settings.nomeAdmin)}&background=${settings.corAvatar}&color=fff`} alt="Profile" />
            <div className="profile-info">
              <span className="profile-name">{settings.nomeAdmin}</span>
              <span className="profile-role">Desenvolvedor</span>
            </div>
          </Link>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="mobile-header">
        <button className="menu-btn">
          <Menu size={24} />
        </button>
        <span className="brand-name">{settings.nomeResidencial}</span>
        <div className="header-actions">
          <button className="icon-btn">
            <Bell size={24} />
          </button>
          <Link to="/dev" className="profile-avatar" title="Área do Desenvolvedor">
            <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(settings.nomeAdmin)}&background=${settings.corAvatar}&color=fff`} alt="Profile" />
          </Link>
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
