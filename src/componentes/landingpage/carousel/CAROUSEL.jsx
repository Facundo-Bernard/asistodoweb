import React, { useEffect, useState, useRef } from "react";
import carousel1 from "../../../assets/LAVIDAEUNCAROUSEL.jpg";
import carousel2 from "../../../assets/asistodocover.jpg";

export default function HeroOneFile() {
  const [pageLoaded, setPageLoaded] = useState(false);
  const [index, setIndex] = useState(0);
  const images = [carousel1, carousel2];
  const timer = useRef(null);

  useEffect(() => {
    // Animación SOLO al entrar en la página
    const t = setTimeout(() => setPageLoaded(true), 80);

    // Opcional autoplay (apagado por ahora)
    // timer.current = setInterval(() => setIndex(i => (i + 1) % images.length), 7000);

    return () => {
      clearTimeout(t);
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  const prev = () => setIndex(i => (i - 1 + images.length) % images.length);
  const next = () => setIndex(i => (i + 1) % images.length);

  return (
    <section className={`hero-root ${pageLoaded ? "hero-loaded" : ""}`}>
      {/* Background */}
      <div className="hero-slides">
        {images.map((src, i) => (
          <div
            key={i}
            className={`hero-slide ${i === index ? "visible" : ""}`}
            style={{ backgroundImage: `url(${src})` }}
          />
        ))}
      </div>

      {/* Overlay azul opaco a la izquierda → suave a la derecha */}
      <div className="hero-overlay"></div>

      {/* Contenido */}
      <div className="hero-content">
        <h1 className="hero-title">Asistodo</h1>
        <p className="hero-sub">
          Multiasistencia nacional con corazón. Estamos donde nos necesitas, 24/7.
        </p>

        <button
          className="hero-cta"
          onClick={() => (window.location.href = "/servicios")}
        >
          Ver nuestros servicios
        </button>
      </div>

      {/* Controles */}
      <button className="hero-control prev" onClick={prev}>‹</button>
      <button className="hero-control next" onClick={next}>›</button>

      {/* ESTILOS COMPLETOS */}
      <style>{`
        :root {
          --accent: #3a4bff;
          --accent-dark: #2d37c8;
        }

        .hero-root {
          position: relative;
          width: 100%;
          min-height: 420px;
          height: 75vh;
          overflow: hidden;
          display: flex;
          align-items: center;
          color: white;
          font-family: -apple-system, BlinkMacSystemFont, Inter, "Helvetica Neue", Arial;
        }

        .hero-slides {
          position: absolute; inset: 0;
        }

        .hero-slide {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center right;
          filter: brightness(0.9) blur(6px);
          opacity: 0;
          transform: scale(1.04);
          transition: opacity .9s ease, transform .9s ease;
        }

        .hero-slide.visible {
          opacity: 1;
          transform: scale(1.02);
        }

        /* Overlay degradado azul fuerte → suave */
        .hero-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            90deg,
            rgba(30, 52, 150, 0.85) 0%,
            rgba(30, 52, 150, 0.70) 25%,
            rgba(30, 52, 150, 0.45) 50%,
            rgba(30, 52, 150, 0.20) 75%,
            rgba(30, 52, 150, 0.03) 100%
          );
          backdrop-filter: blur(3px);
          pointer-events: none;
        }

        .hero-content {
          position: relative;
          z-index: 2;
          padding-left: 6vw;
          max-width: 60ch;
        }

        .hero-title {
          font-size: clamp(2.3rem, 4vw, 3.1rem);
          font-weight: 300;
          margin: 0 0 .4rem 0;
          opacity: 0;
          transform: translateY(20px);
        }

        .hero-sub {
          font-size: clamp(1.1rem, 2vw, 1.5rem);
          font-weight: 300;
          opacity: 0;
          transform: translateY(16px);
          max-width: 52ch;
          margin-bottom: 1.8rem;
        }

        /* Botón minimal, suave, aesthetic */
        .hero-cta {
          padding: .65rem 1.7rem;
          border-radius: 999px;
          border: none;
          font-size: 1rem;
          font-weight: 500;
          background: var(--accent);
          color: white;
          cursor: pointer;
          transition: transform .25s ease, background .25s ease, box-shadow .25s ease;
          box-shadow: 0 8px 24px rgba(40,40,140,0.35);
        }

        .hero-cta:hover {
          transform: translateY(-3px);
          background: var(--accent-dark);
          box-shadow: 0 12px 36px rgba(35,35,120,0.48);
        }

        .hero-cta:active {
          transform: translateY(1px);
        }

        /* Controles */
        .hero-control {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: rgba(255,255,255,0.07);
          border: none;
          color: white;
          font-size: 26px;
          cursor: pointer;
          transition: background .2s ease, transform .2s ease;
        }
        .prev { left: 25px; }
        .next { right: 25px; }
        .hero-control:hover {
          background: rgba(255,255,255,0.12);
          transform: translateY(-50%) scale(1.05);
        }

        /* Animaciones solo al entrar */
        .hero-loaded .hero-title {
          animation: fadeUp .8s cubic-bezier(.2,.9,.2,1) forwards .05s;
        }
        .hero-loaded .hero-sub {
          animation: fadeUp .85s cubic-bezier(.2,.9,.2,1) forwards .15s;
        }
        .hero-loaded .hero-cta {
          animation: fadeUp .9s cubic-bezier(.2,.9,.2,1) forwards .30s;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 576px) {
          .hero-content {
            padding-left: 5vw;
            text-align: center;
          }
          .hero-title, .hero-sub { text-align: center; }
          .hero-control { display: none; }
        }
      `}</style>
    </section>
  );
}
