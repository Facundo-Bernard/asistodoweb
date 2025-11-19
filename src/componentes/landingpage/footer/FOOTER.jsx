import { useState } from "react";
import logo from './../../../assets/logo.png';
import { Link } from "react-router-dom";

const Footer = () => {
  const [openSection, setOpenSection] = useState(null);

  const toggleSection = (section) => {
    setOpenSection(openSection === section ? null : section);
  };

  return (
    <footer style={{ backgroundColor: '#090629ff', color: '#ddd' }} className="pt-5 pb-4">
      <div className="container">
        <div className="row g-4 text-center text-md-start align-items-start">
          {/* Logo y redes */}
          <div className="col-12 col-md-4 d-flex flex-column align-items-center align-items-md-start">
            <img src={logo} alt="Logo" className="mb-3" style={{ width: '120px' }} />
            <div className="d-flex gap-3 justify-content-center justify-content-md-start mb-3">
              <a href="https://www.instagram.com/asistodo_ok/" target="_blank" rel="noopener noreferrer">
                <i className="bi bi-instagram fs-5 text-white"></i>
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer">
                <i className="bi bi-linkedin fs-5 text-white"></i>
              </a>
            </div>
          </div>

          {/* Contacto */}
          <div className="col-12 col-md-8">
            <h5 className="text-white mb-3 text-center text-md-start">Contacto</h5>
            <div className="row gy-3">
              <div className="col-12 col-sm-6 col-md-6 d-flex align-items-center">
                <i className="bi bi-envelope me-2"></i>
                <span>Asistodo@asistodo.com.ar</span>
              </div>
              <div className="col-12 col-sm-6 col-md-6 d-flex align-items-center">
                <i className="bi bi-telephone me-2"></i>
                <span>+54 11 5597-2976</span>
              </div>
              <div className="col-12 col-sm-6 col-md-6 d-flex align-items-center">
                <i className="bi bi-geo-alt me-2"></i>
                <span>Bartolomé Mitre 797 piso 3, Buenos Aires</span>
              </div>
              <div className="col-12 col-sm-6 col-md-6 d-flex align-items-center">
                <i className="bi bi-lock me-2"></i>
                <span>0810-345-0576</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;