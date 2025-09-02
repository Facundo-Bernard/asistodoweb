import { useState } from "react";
import logo from './../../../assets/logo.png'
import { Link } from "react-router-dom";
import { color } from "framer-motion";
const Footer = () => {
  const [openSection, setOpenSection] = useState(null);

  const toggleSection = (section) => {
    setOpenSection(openSection === section ? null : section);
  };

  return (
    <footer style={{ backgroundColor: '#090629ff', color: '#ddd' }}>
      <div className="container">
        <div className="row row-cols- row-cols-md-12 g-4 text-center text-md-start">
          {/* Logo y redes */}
          <div className="col d-flex flex-column align-items-center align-items-md-start row-cols-md-1">
            <img src={logo} alt="Logo" style={{ width: '13%', marginBottom: '15px' }} />
            <div className="d-flex gap-3 justify-content-center justify-content-md-start">
              <i className="bi bi-twitter-x fs-5"></i>
              <i className="bi bi-instagram fs-5"></i>
              <i className="bi bi-youtube fs-5"></i>
              <i className="bi bi-linkedin fs-5"></i>
              <div >
            <h5 className="text-white mb-3">Contacto</h5>
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
              <div>
                <i className="bi bi-envelope me-2"></i>
                Asistodo@asistodo.com.ar
              </div>
              <div>
                <i className="bi bi-telephone me-2"></i>
                +54 11 5597-2976
              </div>
              <div>
                <i className="bi bi-geo-alt me-2"></i>
                Bartolome mitre 797, Buenos Aires
              </div>
              <div>
                <i className="bi bi-lock me-2"></i>
                0810-345-0576
              </div>
            </div>
            <br></br>
          </div>
            </div>
            
            
          </div>
    

        </div> 

        {/* Contacto directo */}
        <div className="row mt-5 text-center text-md-start">
          
          
        </div>
      </div>
    </footer>
  );
};

export default Footer;