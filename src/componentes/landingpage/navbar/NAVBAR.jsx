import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import logo from './../../../assets/logo.png';

const NAV_COLOR = '#342683ff';

export default function Navbar() {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  const navStyle = {
    background: `linear-gradient(90deg, ${NAV_COLOR} 0%, rgba(52,38,131,0.92) 100%)`,
    padding: '0.45rem 0',
    boxShadow: '0 6px 22px rgba(0,0,0,0.22)',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    backdropFilter: 'blur(2px)',
    zIndex: 1000
  };

  const logoStyle = {
    height: 72,
    width: 'auto',
    borderRadius: 6,
    objectFit: 'cover',
    transition: 'transform .25s ease, filter .25s ease',
    boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
    cursor: 'pointer'
  };

  const pillBase = {
    borderRadius: 9999,
    padding: '0.5rem 1.05rem',
    fontWeight: 600,
    fontSize: '0.96rem',
    transition: 'all .25s ease',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transform: 'scale(1)',
    filter: 'brightness(1)',
    border: '1px solid white'
  };

  const renderLink = (to, text) => {
    const active = isActive(to);

    const baseStyle = {
      ...pillBase,
      background: active ? 'white' : NAV_COLOR,
      color: active ? NAV_COLOR : 'white',
      boxShadow: active
        ? '0 0 12px rgba(255,255,255,0.35)'
        : '0 6px 14px rgba(0,0,0,0.10)'
    };

    const hoverEffect = (e) => {
      e.currentTarget.style.transform = 'scale(1.06)';
      e.currentTarget.style.filter = 'brightness(1.15)';
    };

    const resetEffect = (e) => {
      e.currentTarget.style.transform = 'scale(1)';
      e.currentTarget.style.filter = 'brightness(1)';
    };

    return (
      <Link
        to={to}
        className="nav-link"
        aria-current={active ? 'page' : undefined}
        style={baseStyle}
        onMouseEnter={hoverEffect}
        onMouseLeave={resetEffect}
        onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
        onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1.06)')}
      >
        {text}
      </Link>
    );
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark" style={navStyle}>
      <div className="container-fluid">
        <Link className="navbar-brand d-flex align-items-center" to="/">
          <img
            src={logo}
            alt="Logo"
            style={logoStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.06)';
              e.currentTarget.style.filter = 'brightness(1.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.filter = 'brightness(1)';
            }}
          />
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto align-items-center gap-2">
            <li className="nav-item">{renderLink('/servicios', 'Servicios')}</li>
            <li className="nav-item">{renderLink('/contactanos', 'Contáctanos')}</li>
          </ul>
        </div>
      </div>
    </nav>
  );
}