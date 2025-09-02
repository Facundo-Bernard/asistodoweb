import { useState, useEffect, useMemo, useRef } from "react";
import emailjs from "@emailjs/browser";
import { motion } from "framer-motion";
import "bootstrap/dist/css/bootstrap.min.css";
import UBICACIONCOOP from "./ubicacioncoop/UBICACIONCOOP";

const fadeIn = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};

const STORAGE_DRAFT_KEY = "contactoFormDraft_v1";
const STORAGE_LIMIT_KEY = "enviosRestantes";

const initialForm = {
    documento: "",
    nombre: "",
    telefono: "",
    email: "",
    sucursal: "",
    mensaje: "",
    sitio: "",
};

const validators = {
    documento: (v) => /^\d{6,12}$/.test(v.trim()),
    nombre: (v) => v.trim().length >= 3,
    telefono: (v) => /^[+\d][\d\s().\-]{6,}$/.test(v.trim()),
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()),
    sucursal: (v) => v.trim().length >= 2,
    mensaje: (v) => v.trim().length >= 10 && v.trim().length <= 1200,
    sitio: (v) => v.trim().length === 0,
};

export default function ContactoForm() {
    const [formData, setFormData] = useState(initialForm);
    const [touched, setTouched] = useState({});
    const [status, setStatus] = useState(null);
    const [sending, setSending] = useState(false);
    const [enviosRestantes, setEnviosRestantes] = useState(3);
    const [charCount, setCharCount] = useState(0);
    const statusRef = useRef(null);

    useEffect(() => {
        const storedLimit = localStorage.getItem(STORAGE_LIMIT_KEY);
        if (storedLimit !== null) setEnviosRestantes(parseInt(storedLimit, 10));

        const draftRaw = localStorage.getItem(STORAGE_DRAFT_KEY);
        if (draftRaw) {
            try {
                const draft = JSON.parse(draftRaw);
                setFormData({ ...initialForm, ...draft, sitio: "" });
                setCharCount((draft.mensaje || "").length);
            } catch { }
        }
    }, []);

    useEffect(() => {
        const { sitio, ...draft } = formData;
        localStorage.setItem(STORAGE_DRAFT_KEY, JSON.stringify(draft));
    }, [formData]);

    const errors = useMemo(() => {
        const e = {};
        for (const k of Object.keys(validators)) {
            if (!validators[k](formData[k] || "")) e[k] = true;
        }
        return e;
    }, [formData]);

    const isValid = useMemo(() => {
        return Object.keys(validators).every((k) => validators[k](formData[k] || ""));
    }, [formData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (name === "mensaje") setCharCount(value.length);
    };

    const handleBlur = (e) => {
        const { name } = e.target;
        setTouched((prev) => ({ ...prev, [name]: true }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus(null);

        if (enviosRestantes <= 0) {
            setStatus("limit");
            scrollToStatus();
            return;
        }
        if (!isValid) {
            const allTouched = Object.keys(initialForm).reduce((acc, k) => ((acc[k] = true), acc), {});
            setTouched(allTouched);
            return;
        }
        if (formData.sitio && formData.sitio.trim().length > 0) {
            setStatus("error");
            scrollToStatus();
            return;
        }

        try {
            setSending(true);
            const payload = {
                ...formData,
                submittedAt: new Date().toISOString(),
                userAgent: navigator.userAgent,
            };

            await emailjs.send(
                import.meta.env.VITE_EMAILJS_SERVICE_ID,
                import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
                payload,
                import.meta.env.VITE_EMAILJS_PUBLIC_KEY
            );

            setStatus("success");
            setFormData(initialForm);
            setCharCount(0);
            localStorage.removeItem(STORAGE_DRAFT_KEY);

            const nuevo = enviosRestantes - 1;
            setEnviosRestantes(nuevo);
            localStorage.setItem(STORAGE_LIMIT_KEY, String(nuevo));
        } catch (err) {
            console.error("EmailJS error:", err);
            setStatus("error");
        } finally {
            setSending(false);
            scrollToStatus();
        }
    };

    const scrollToStatus = () => {
        requestAnimationFrame(() => {
            if (statusRef.current) {
                statusRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
            }
        });
    };

    return (
        <div style={{ backgroundColor: "#f8f9fa", minHeight: "100vh", paddingTop: 48 }}>
            <style>{styles}</style>

            <div className="container mb-2">
                <motion.div
                    variants={fadeIn}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    className="mb-4 text-center"
                >
                    <h1 className="fw-bold mb-1">Contactanos</h1>
                    <p className="text-muted mb-0">Estamos para ayudarte. Respondemos a la brevedad de 9hs a 17hs.</p>
                </motion.div>

                <div className="row g-4 align-items-start">
                    <motion.div
                        variants={fadeIn}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        className="col-12 col-lg-6"
                    >
                        <div className="card shadow-soft rounded-4 border-0">
                            <div className="card-body p-4 p-md-4">
                                <div
                                    ref={statusRef}
                                    aria-live="polite"
                                    aria-atomic="true"
                                    className="mb-2"
                                >
                                    {status === "success" && (
                                        <div className="alert alert-success rounded-3 mb-3">
                                            Mensaje enviado con éxito. ¡Gracias por escribirnos!
                                        </div>
                                    )}
                                    {status === "error" && (
                                        <div className="alert alert-danger rounded-3 mb-3">
                                            Ocurrió un error al enviar. Intentá nuevamente.
                                        </div>
                                    )}
                                    {status === "limit" && (
                                        <div className="alert alert-warning rounded-3 mb-3">
                                            Alcanzaste el límite de envíos por sesión.
                                        </div>
                                    )}
                                </div>

                                <h2 className="h4 mb-3 fw-bold text-danger">Enviar mensaje</h2>

                                <form onSubmit={handleSubmit} noValidate>
                                    <div className="row g-3">
                                        {/* formulario... (idéntico al tuyo) */}
                                        <div className="col-md-6">
                                            <label className="form-label">Nro Documento *</label>
                                            <input
                                                type="text"
                                                name="documento"
                                                inputMode="numeric"
                                                autoComplete="off"
                                                className={`form-control rounded-3 ${touched.documento && errors.documento ? "is-invalid" : ""
                                                    }`}
                                                value={formData.documento}
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                                required
                                            />
                                            {touched.documento && errors.documento && (
                                                <div className="invalid-feedback">
                                                    Ingresá entre 6 y 12 dígitos.
                                                </div>
                                            )}
                                        </div>

                                        <div className="col-md-6">
                                            <label className="form-label">Nombre y Apellido *</label>
                                            <input
                                                type="text"
                                                name="nombre"
                                                autoComplete="name"
                                                className={`form-control rounded-3 ${touched.nombre && errors.nombre ? "is-invalid" : ""
                                                    }`}
                                                value={formData.nombre}
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                                required
                                            />
                                            {touched.nombre && errors.nombre && (
                                                <div className="invalid-feedback">
                                                    Ingresá al menos 3 caracteres.
                                                </div>
                                            )}
                                        </div>

                                        <div className="col-md-6">
                                            <label className="form-label">Teléfono *</label>
                                            <input
                                                type="tel"
                                                name="telefono"
                                                autoComplete="tel"
                                                placeholder="+54 11 1234-5678"
                                                className={`form-control rounded-3 ${touched.telefono && errors.telefono ? "is-invalid" : ""
                                                    }`}
                                                value={formData.telefono}
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                                required
                                            />
                                            {touched.telefono && errors.telefono && (
                                                <div className="invalid-feedback">
                                                    Ingresá un teléfono válido.
                                                </div>
                                            )}
                                        </div>

                                        <div className="col-md-6">
                                            <label className="form-label">Email *</label>
                                            <input
                                                type="email"
                                                name="email"
                                                autoComplete="email"
                                                className={`form-control rounded-3 ${touched.email && errors.email ? "is-invalid" : ""
                                                    }`}
                                                value={formData.email}
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                                required
                                            />
                                            {touched.email && errors.email && (
                                                <div className="invalid-feedback">
                                                    Ingresá un email válido.
                                                </div>
                                            )}
                                        </div>

                                        <div className="col-12">
                                            <label className="form-label">Localidad *</label>
                                            <input
                                                type="text"
                                                name="sucursal"
                                                autoComplete="address-level2"
                                                className={`form-control rounded-3 ${touched.sucursal && errors.sucursal ? "is-invalid" : ""
                                                    }`}
                                                value={formData.sucursal}
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                                required
                                                list="dl-localidades"
                                                placeholder="Ej: San Miguel de Tucumán"
                                            />
                                            <datalist id="dl-localidades">
                                                <option value="Ciudad Autónoma de Buenos Aires" />
                                                <option value="San Miguel de Tucumán" />
                                                <option value="Mar del Plata" />
                                                <option value="Rosario" />
                                                <option value="Córdoba" />
                                            </datalist>
                                            {touched.sucursal && errors.sucursal && (
                                                <div className="invalid-feedback">
                                                    Indicanos tu localidad.
                                                </div>
                                            )}
                                        </div>

                                        <div className="col-12">
                                            <label className="form-label d-flex justify-content-between">
                                                <span>Mensaje *</span>
                                                <span className={`small ${charCount > 1000 ? "text-danger" : "text-muted"}`}>
                                                    {charCount}/1200
                                                </span>
                                            </label>
                                            <textarea
                                                name="mensaje"
                                                rows={6}
                                                className={`form-control rounded-3 ${touched.mensaje && errors.mensaje ? "is-invalid" : ""
                                                    }`}
                                                value={formData.mensaje}
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                                required
                                                placeholder="Contanos tu consulta..."
                                            />
                                            {touched.mensaje && errors.mensaje && (
                                                <div className="invalid-feedback">
                                                    Escribí entre 10 y 1200 caracteres.
                                                </div>
                                            )}
                                        </div>

                                        <div className="visually-hidden" aria-hidden="true">
                                            <label>Tu sitio web</label>
                                            <input
                                                type="text"
                                                name="sitio"
                                                tabIndex={-1}
                                                autoComplete="off"
                                                value={formData.sitio}
                                                onChange={handleChange}
                                            />
                                        </div>

                                        <div className="col-12 text-center mt-2">
                                            <button
                                                type="submit"
                                                className="btn btn-danger px-5 py-2 rounded-pill fw-bold shadow-sm position-relative"
                                                disabled={enviosRestantes <= 0 || sending || !isValid}
                                                style={{ minWidth: 220 }}
                                            >
                                                {sending ? (
                                                    <>
                                                        <span
                                                            className="spinner-border spinner-border-sm me-2"
                                                            role="status"
                                                            aria-hidden="true"
                                                        />
                                                        Enviando...
                                                    </>
                                                ) : (
                                                    "ENVIAR MENSAJE"
                                                )}
                                            </button>
                                            <p className="mt-2 text-muted small">
                                                {enviosRestantes > 0
                                                    ? `Podés enviar ${enviosRestantes} mensaje${enviosRestantes === 1 ? "" : "s"
                                                    } más.`
                                                    : "Límite de envíos alcanzado."}
                                            </p>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        variants={fadeIn}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        className="col-12 col-lg-6"
                    >
                        {/* card que contiene la imagen/ubicación */}
                        <div className="card shadow-soft rounded-4 border-0 mb-4 ubication-card">
                            <div className="card-body p-3 p-md-4">
                                <div className="d-flex align-items-center justify-content-between mb-2">
                                </div>

                                {/* Contenedor con estilos específicos para evitar recortes */}
                                    <UBICACIONCOOP />

                                <br />
                                <h3 className="h5 fw-bold mb-3">Contacto</h3>
                                <div className="d-flex flex-column gap-2">
                                    <div>
                                        <i className="bi bi-envelope me-2" aria-hidden="true" />
                                        <a href="mailto:coopya@coopya.com.ar">Asistodo@asistodo.com.ar</a>
                                    </div>
                                    <div>
                                        <i className="bi bi-telephone me-2" aria-hidden="true" />
                                        <a href="tel:+54115597-2976">+54 11 5597-2976</a>
                                    </div>
                                    <div>
                                        <i className="bi bi-telephone me-2" aria-hidden="true" />
                                        <a href="tel:+08103450576">0810-345-0576</a>
                                    </div>
                                    <div>
                                        <i className="bi bi-geo-alt me-2" aria-hidden="true" />
                                        Bartolomé Mitre 797, Buenos Aires
                                    </div>
                                </div>
                            </div>
                        </div>
                        <br />
                    </motion.div>
                </div>
            </div>
        </div>
    );
}

/* ---------- estilos locales: sombras, tarjetas suaves, etc. ---------- */
const styles = `
  .shadow-soft { box-shadow: 0 10px 30px rgba(0,0,0,0.08); }

  /* foco input */
  .form-control:focus {
    border-color: rgba(220,53,69,0.5) !important;
    box-shadow: 0 0 0 0.2rem rgba(220,53,69,0.15) !important;
  }

  .btn-danger {
    background: linear-gradient(180deg, #e84b5f 0%, #dc3545 100%);
    border: none;
  }
  .btn-danger:disabled { filter: grayscale(0.4); opacity: 0.8; }
  .card { border: 1px solid #e9ecef; }

  /* ----------- FIX imagen UBICACIONCOOP (evitar recortes y mantener proporcional) ----------- */

  /* evita que la card que contiene la imagen recorte (solo esta card) */
  .ubication-card { overflow: visible; }

  /* contenedor específico que rodea UBICACIONCOOP */
  .ubicacioncoop-container {
    overflow: visible;        /* permitimos que la imagen sobresalga si hace falta */
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    min-height: 80px;         /* fuerza un mínimo razonable si la imagen es background */
  }

  /* Si UBICACIONCOOP renderiza un <img> o <svg> directo */
  .ubicacioncoop-container img,
  .ubicacioncoop-container svg {
    max-width: 100%;
    height: auto;
    display: block;
    object-fit: contain;      /* importante para que no se distorsione */
    pointer-events: none;     /* si la imagen es meramente decorativa */
  }

  /* Si UBICACIONCOOP usa background-image en un div con clase .ubicacion (comodín) */
  .ubicacioncoop-container .ubicacion,
  .ubicacioncoop-container .map-bg {
    background-size: contain !important;
    background-position: left bottom !important;
    background-repeat: no-repeat !important;
    width: 100%;
    min-height: 80px;
  }

  /* regla de seguridad: si algún elemento tiene border-radius y overflow hidden en otra parte,
     forzamos que el logo no quede recortado dentro de esta sección */
  .ubication-card * {
    overflow: visible !important;
  }

  /* Si tienes un logo fijo en footer que se recorta, puedes ajustar así (ejemplo) */
  footer .logo, .site-footer .logo {
    max-width: 220px;
    height: auto;
    display: block;
  }
`;

