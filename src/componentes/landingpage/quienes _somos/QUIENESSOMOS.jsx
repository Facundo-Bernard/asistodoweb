import React, { useState, useEffect } from "react";
import "./QuienesSomos.css";
import img1 from '../../../assets/imagenlanding1.png'
import img2 from '../../../assets/imagenlanding2.png'
import img3 from '../../../assets/imagenlanding3.png'

/*
 Ajustá las rutas de las imágenes según tu estructura de assets.
 Por ejemplo: src/assets/team1.jpg, team2.jpg, team3.jpg
*/


const images = [
  { src: img1, alt: "Equipo 1" },
  { src: img2, alt: "Equipo 2" },
  { src: img3, alt: "Equipo 3" },
];

const QuienesSomos = () => {
  const [lightboxIndex, setLightboxIndex] = useState(null);

  // cierre con Escape
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setLightboxIndex(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <section className="container py-5" id="quienes-somos">
      <div className="row align-items-center">
        {/* Imagen a la izquierda */}
        <div className="col-md-6 mb-4 mb-md-0">
          <div className="image-cluster" aria-hidden={false}>
            {images.map((it, i) => (
              <button
                key={i}
                className={`cluster-item item-${i}`}
                onClick={() => setLightboxIndex(i)}
                aria-label={`Abrir imagen ${i + 1}: ${it.alt}`}
                type="button"
              >
                <img src={it.src} alt={it.alt} loading="lazy" />
              </button>
            ))}
          </div>
        </div>

        {/* Texto a la derecha */}
        <div className="col-md-6">
          <h2 className="fw-bold">Sobre nosotros</h2>
          <h5 className="text-muted">Asistodo</h5>
          <p className="mt-3 text-secondary">
            Somos una empresa dedicada a brindar servicios de calidad, desde asistencia medica, asistencia en el hogar, video consultas medicas hasta subsidios por casamiento, los invitamos a ver nuestro apartado de servicios para conocer aun mas sobre todo lo que tenemos para ofrecer

          </p>
          <p className="mt-3 text-secondary">      
            
            Contamos con mas de 10 años de experiencia brindando servicio de multiasistencia en todo el pais. Nos caracterizamos por responder en tiempo y forma con servicios flexibles y ajustados a las necesidades de  nuestros clientes, representando la mejor relacion costo-beneficio.
          </p>
        </div>
      </div>

      {/* Lightbox / modal simple */}
      {lightboxIndex !== null && (
        <div
          className="cluster-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`Imagen ${lightboxIndex + 1}`}
          onClick={() => setLightboxIndex(null)}
        >
          <div
            className="cluster-lightbox-inner"
            onClick={(e) => e.stopPropagation()}
            role="document"
          >
            <button
              className="cluster-lightbox-close"
              aria-label="Cerrar"
              onClick={() => setLightboxIndex(null)}
            >
              ×
            </button>
            <img
              src={images[lightboxIndex].src}
              alt={images[lightboxIndex].alt}
            />
            <div className="cluster-lightbox-caption">
              {images[lightboxIndex].alt}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default QuienesSomos;
