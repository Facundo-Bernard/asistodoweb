import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Link } from 'react-router-dom';
import carousel2 from '../../../assets/asistodocover.jpg';
import carousel1 from '../../../assets/LAVIDAEUNCAROUSEL.jpg';



const HeroCarousel = () => {
  const images = [
    carousel1,
    carousel2,

  ];

  return (
    <div id="heroCarousel" className="carousel slide carousel-fade" data-bs-ride="carousel">
      <div className="carousel-inner">
        {images.map((src, idx) => (
          <div className={`carousel-item ${idx === 0 ? 'active' : ''}`} key={idx}>
            <div
              className="hero-slide position-relative d-flex align-items-center justify-content-center"
              style={{
                height: '500px',
                overflow: 'hidden',
                backgroundColor: '#f8f9fa'
              }}
            >
              {/* Capa difuminada */}
              <div
                className="blur-layer"
                style={{
                  backgroundImage: `url(${src})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  position: 'absolute',
                  inset: 0,
                  filter: 'blur(10px) brightness(1.1)',
                  opacity: 0.5,
                  transform: 'scale(1.02)',
                  zIndex: 0,
                  animation: 'gentleFade 2s ease-out forwards'
                }}
              />

              {/* Recuadro blanco con contenido */}
              <div className="content-box text-center p-4 rounded shadow" style={{ zIndex: 1 }}>
                <h1 className="fw-bold text-dark mb-2">Asistodo</h1>
                <p className="text-dark mb-3">
                  Ofrecimiento de servicios multiasistencia por todo el país. Listos para asistirte 24/7
                </p>
                <Link to="/servicios" className="btn btn btn-outline-primary">
                  Ver nuestros servicios
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Controles */}
      <button
        className="carousel-control-prev"
        type="button"
        data-bs-target="#heroCarousel"
        data-bs-slide="prev"
      >
        <span className="carousel-control-prev-icon" aria-hidden="true" />
      </button>
      <button
        className="carousel-control-next"
        type="button"
        data-bs-target="#heroCarousel"
        data-bs-slide="next"
      >
        <span className="carousel-control-next-icon" aria-hidden="true" />
      </button>

      {/* Estilos internos */}
      <style>{`
        @keyframes gentleFade {
          from {
            opacity: 0.3;
            transform: scale(1.03);
          }
          to {
            opacity: 0.5;
            transform: scale(1.02);
          }
        }

        .content-box {
          background: rgba(255, 255, 255, 0.85);
          max-width: 600px;
          animation: fadeInText 1.5s ease-out forwards;
        }

        @keyframes fadeInText {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default HeroCarousel;