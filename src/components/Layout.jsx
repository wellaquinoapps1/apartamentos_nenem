import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Users,
  Wallet,
  AlertTriangle,
  Bell,
  Menu
} from 'lucide-react';
import './Layout.css';

const Layout = ({ children }) => {
  const location = useLocation();

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
            <span>CondoAdmin Pro</span>
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
      </aside>

      {/* Mobile Header */}
      <header className="mobile-header">
        <button className="menu-btn">
          <Menu size={24} />
        </button>
        <span className="brand-name">CondoAdmin Pro</span>
        <div className="header-actions">
          <button className="icon-btn">
            <Bell size={24} />
          </button>
          <div className="profile-avatar">
            <img src="https://ui-avatars.com/api/?name=Admin&background=0D8ABC&color=fff" alt="Profile" />
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
