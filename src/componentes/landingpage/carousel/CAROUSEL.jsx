import React, { useEffect, useState, useRef, useCallback } from "react";
import carousel1 from "../../../assets/LAVIDAEUNCAROUSEL.jpg";
import carousel2 from "../../../assets/asistodocover.jpg";

const IMAGES = [carousel1, carousel2]; // no se recrea nunca

function HeroOneFile() {
  const [loaded, setLoaded] = useState(false);
  const [index, setIndex] = useState(0);
  const timerRef = useRef(null);

  // Animación inicial
  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 80);
    return () => clearTimeout(t);
  }, []);

  // Prev y next optimizados
  const prev = useCallback(
    () => setIndex((i) => (i - 1 + IMAGES.length) % IMAGES.length),
    []
  );

  const next = useCallback(
    () => setIndex((i) => (i + 1) % IMAGES.length),
    []
  );

  return (
    <section className={`hero-root ${loaded ? "hero-loaded" : ""}`}>
      <div className="hero-slides">
        {IMAGES.map((src, i) => (
          <div
            key={src}
            className={`hero-slide ${i === index ? "visible" : ""}`}
            style={{ backgroundImage: `url(${src})` }}
          />
        ))}
      </div>

      <div className="hero-overlay" />

      <div className="hero-content">
        <h1 className="hero-title">Asistodo</h1>
        <p className="hero-sub">
          Multiasistencia nacional con corazón. Estamos donde nos necesitas, 24/7.
        </p>

        <button className="hero-cta" onClick={() => (window.location.href = "/servicios")}>
          Ver nuestros servicios
        </button>
      </div>

      <button className="hero-control prev" onClick={prev}>‹</button>
      <button className="hero-control next" onClick={next}>›</button>

      {/* estilos compactados */}
      <style>{`
        :root {
          --accent: #3a4bff;
          --accent-dark: #2d37c8;
        }

        .hero-root{
          position:relative;
          width:100%;
          min-height:420px;
          height:75vh;
          overflow:hidden;
          display:flex;
          align-items:center;
          color:white;
          font-family:Inter, Arial;
        }
        .hero-slides, .hero-slide{
          position:absolute; inset:0;
        }
        .hero-slide{
          background-size:cover;
          background-position:center right;
          filter:brightness(.9) blur(6px);
          opacity:0;
          transform:scale(1.04);
          transition:.9s ease;
        }
        .hero-slide.visible{
          opacity:1;
          transform:scale(1.02);
        }

        .hero-overlay{
          position:absolute; inset:0;
          background:linear-gradient(
            90deg,
            rgba(30,52,150,.92) 0%,
            rgba(30,52,150,.81) 25%,
            rgba(30,52,150,.64) 50%,
            rgba(30,52,150,.20) 75%,
            rgba(30,52,150,.03) 100%
          );
          backdrop-filter:blur(3px);
          pointer-events:none;
        }

        .hero-content{
          position:relative; z-index:2;
          padding-left:6vw;
          max-width:60ch;
        }

        .hero-title{
          font-size:clamp(2.3rem,4vw,3.1rem);
          font-weight:300;
          margin:0 0 .4rem;
          opacity:0; transform:translateY(20px);
        }
        .hero-sub{
          font-size:clamp(1.1rem,2vw,1.5rem);
          font-weight:300;
          opacity:0;
          transform:translateY(16px);
          max-width:52ch;
          margin-bottom:1.8rem;
        }

        .hero-cta{
          padding:.65rem 1.7rem;
          border-radius:999px;
          border:none;
          font-size:1rem;
          font-weight:500;
          background:var(--accent);
          color:white;
          cursor:pointer;
          transition:.25s ease;
          box-shadow:0 8px 24px rgba(40,40,140,.35);
        }
        .hero-cta:hover{
          transform:translateY(-3px);
          background:var(--accent-dark);
          box-shadow:0 12px 36px rgba(35,35,120,.48);
        }
        .hero-cta:active{
          transform:translateY(1px);
        }

        .hero-control{
          position:absolute;
          top:50%; transform:translateY(-50%);
          width:48px; height:48px;
          border-radius:50%;
          background:rgba(255,255,255,.07);
          border:none; color:white;
          font-size:26px;
          cursor:pointer;
          transition:.2s ease;
        }
        .prev{ left:25px; }
        .next{ right:25px; }
        .hero-control:hover{
          background:rgba(255,255,255,.12);
          transform:translateY(-50%) scale(1.05);
        }

        /* Animaciones de entrada */
        .hero-loaded .hero-title{
          animation:fadeUp .8s ease forwards .05s;
        }
        .hero-loaded .hero-sub{
          animation:fadeUp .85s ease forwards .15s;
        }
        .hero-loaded .hero-cta{
          animation:fadeUp .9s ease forwards .30s;
        }

        @keyframes fadeUp{
          from{ opacity:0; transform:translateY(18px); }
          to{ opacity:1; transform:translateY(0); }
        }

        @media(max-width:576px){
          .hero-content{text-align:center; padding-left:5vw;}
          .hero-control{display:none;}
        }
      `}</style>
    </section>
  );
}

export default React.memo(HeroOneFile);
