import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Footer from "../landingpage/footer/FOOTER";
import Navbar from "../landingpage/navbar/NAVBAR";
import { Link } from "react-router-dom";

const SERVICIOS = () => {
  const [activeIndex, setActiveIndex] = useState(null);

  const servicios = [
    {
      icon: "🏠",
      title: "Pack Classic",
      desc: "Nuestro plan estándar, focalizado en la asistencia y ayuda",
      // Soportamos tanto un simple array `beneficios` (retrocompatibilidad)
      // como múltiples contenedores `beneficiosListas` con nombre y items.

      beneficiosListas: [
        {
          name: "Asistencia al HOGAR",
          items: [
            "Plomería, Gasista, Vidriería, Cerrajería, Electricista de emergencia",
            "Orientación legal Telefónica en casos de robo en el domicilio",
            "Referencia y Coordinación de técnicos en mantenimiento.",
          ],
        },
        {
          name: "Asistencia MÉDICA",
          items: [
            "traslado terrestre (ambulancia) en caso de accidente o enfermedad",
            "Segunda opinión médica",
            "Médico y enfermera a domicilio",
            "Phono Med: Línea de consultas 24hs",
            "Recordatorio de citas médicas e ingesta de medicamentos",
            "Referencias médicas de especialidades, hospitales y clínicas a nivel nacional"
          ],
        },
        {
          name: "Asistencia en VIA PÚBLICA",
          items: [
            "Traslado del beneficiario en Taxi o Remise",
            "Traslado médico terrestre en caso de lesiones",
            "Asistente telefónica para trámites administrativos",
            "Cerrajero en caso de robo de llaves al domicilio",
            "Envio de remolque en caso de robo de las llaves del auto",
            "Coordinación de denuncias de robo de tarjetas de crédito y celular",
            "Transmisión de mensajes urgentes y conferencias telefónicas",
            "Conexión con números de emergencias",
          ],
        },
        {
          name: "Subsidio por Fallecimiento",
          items: [
            "opcionalmente cobro anticipado",
            "colaborar con los gastos ante el requerimiento de un familiar directo",
            "Presentando certificado de fallecimiento y documentación que corrobore fehacientemente la relación parental más directa con el fallecido",

          ],
        },
      ],
      // Testimonios: también soportamos arrays simples y listas con nombre.

      contacto: "/contactanos",
    },

    {
      icon: "🤳",
      title: "Pack premium",
      desc: "Extendiendo tus beneficios estándar",
      beneficiosListas: [
       {
          name: "Asistencia al HOGAR",
          items: [
            "Plomería, Gasista, Vidriería, Cerrajería, Electricista de emergencia",
            "Orientación legal Telefónica en casos de robo en el domicilio",
            "Referencia y Coordinación de técnicos en mantenimiento.",
          ],
        },
        {
          name: "Asistencia MÉDICA",
          items: [
            "traslado terrestre (ambulancia) en caso de accidente o enfermedad",
            "Segunda opinión médica",
            "Médico y enfermera a domicilio",
            "Phono Med: Línea de consultas 24hs",
            "Recordatorio de citas médicas e ingesta de medicamentos",
            "Referencias médicas de especialidades, hospitales y clínicas a nivel nacional"
          ],
        },
        {
          name: "Asistencia en VIA PÚBLICA",
          items: [
            "Traslado del beneficiario en Taxi o Remise",
            "Traslado médico terrestre en caso de lesiones",
            "Asistente telefónica para trámites administrativos",
            "Cerrajero en caso de robo de llaves al domicilio",
            "Envio de remolque en caso de robo de las llaves del auto",
            "Coordinación de denuncias de robo de tarjetas de crédito y celular",
            "Transmisión de mensajes urgentes y conferencias telefónicas",
            "Conexión con números de emergencias",
          ],
        },
        {
          name: "Subsidio por Fallecimiento",
          items: [
            "opcionalmente cobro anticipado",
            "colaborar con los gastos ante el requerimiento de un familiar directo",
            "Presentando certificado de fallecimiento y documentación que corrobore fehacientemente la relación parental más directa con el fallecido",

          ],
        },
        {
          name: "VIP remove service",
          items: [
            "Traslado de fallecidos entre Provincias limítrofes del último domicilio informado en el DNI, abarcando toda la República Argentina",

          ],
        },


      ],


      contacto: "/contactanos"
    },
    {
      icon: "🏥",
      title: "Pack Gold",
      desc: "Sumamos videos consultas",
      beneficiosListas: [
               {
          name: "Asistencia al HOGAR",
          items: [
            "Plomería, Gasista, Vidriería, Cerrajería, Electricista de emergencia",
            "Orientación legal Telefónica en casos de robo en el domicilio",
            "Referencia y Coordinación de técnicos en mantenimiento.",
          ],
        },
        {
          name: "Asistencia MÉDICA",
          items: [
            "traslado terrestre (ambulancia) en caso de accidente o enfermedad",
            "Segunda opinión médica",
            "Médico y enfermera a domicilio",
            "Phono Med: Línea de consultas 24hs",
            "Recordatorio de citas médicas e ingesta de medicamentos",
            "Referencias médicas de especialidades, hospitales y clínicas a nivel nacional"
          ],
        },
        {
          name: "Asistencia en VIA PÚBLICA",
          items: [
            "Traslado del beneficiario en Taxi o Remise",
            "Traslado médico terrestre en caso de lesiones",
            "Asistente telefónica para trámites administrativos",
            "Cerrajero en caso de robo de llaves al domicilio",
            "Envio de remolque en caso de robo de las llaves del auto",
            "Coordinación de denuncias de robo de tarjetas de crédito y celular",
            "Transmisión de mensajes urgentes y conferencias telefónicas",
            "Conexión con números de emergencias",
          ],
        },
        {
          name: "Subsidio por Fallecimiento",
          items: [
            "opcionalmente cobro anticipado",
            "colaborar con los gastos ante el requerimiento de un familiar directo",
            "Presentando certificado de fallecimiento y documentación que corrobore fehacientemente la relación parental más directa con el fallecido",

          ],
        },
        {
          name: "VIP remove service",
          items: [
            "Traslado de fallecidos entre Provincias limítrofes del último domicilio informado en el DNI, abarcando toda la República Argentina",

          ],
        },
        {
          name: "Telemedic",
          items: [
            "video consulta médica"
          ],
        },


      ],

      contacto: "/contactanos"
    },
    {
      icon: "🧗‍♀️",
      title: "Pack platinum",
      desc: "Beneficios más allá de las fronteras",
      beneficiosListas: [
    {
          name: "Asistencia al HOGAR",
          items: [
            "Plomería, Gasista, Vidriería, Cerrajería, Electricista de emergencia",
            "Orientación legal Telefónica en casos de robo en el domicilio",
            "Referencia y Coordinación de técnicos en mantenimiento.",
          ],
        },
        {
          name: "Asistencia MÉDICA",
          items: [
            "traslado terrestre (ambulancia) en caso de accidente o enfermedad",
            "Segunda opinión médica",
            "Médico y enfermera a domicilio",
            "Phono Med: Línea de consultas 24hs",
            "Recordatorio de citas médicas e ingesta de medicamentos",
            "Referencias médicas de especialidades, hospitales y clínicas a nivel nacional"
          ],
        },
        {
          name: "Asistencia en VIA PÚBLICA",
          items: [
            "Traslado del beneficiario en Taxi o Remise",
            "Traslado médico terrestre en caso de lesiones",
            "Asistente telefónica para trámites administrativos",
            "Cerrajero en caso de robo de llaves al domicilio",
            "Envio de remolque en caso de robo de las llaves del auto",
            "Coordinación de denuncias de robo de tarjetas de crédito y celular",
            "Transmisión de mensajes urgentes y conferencias telefónicas",
            "Conexión con números de emergencias",
          ],
        },
        {
          name: "Subsidio por Fallecimiento",
          items: [
            "opcionalmente cobro anticipado",
            "colaborar con los gastos ante el requerimiento de un familiar directo",
            "Presentando certificado de fallecimiento y documentación que corrobore fehacientemente la relación parental más directa con el fallecido",

          ],
        },
        {
          name: "VIP remove service",
          items: [
            "Traslado de fallecidos entre Provincias limítrofes del último domicilio informado en el DNI, abarcando toda la República Argentina",

          ],
        },
        {
          name: "Telemedic",
          items: [
            "video consulta médica"
          ],
        },
        {
          name: "Asistencia al Viajero",
          items: [
            "Nacional y paises limítrofes",
            "Asistencia Médica por accidentes deportivos, preexistencias y embarazos",
            "Wallet asistance: Asistencia ante la perdida o robo de billetera o documentos"
          ],
        },


      ],

      contacto: "/contactanos"
    },
    // ...otros servicios
  ];

  const toggleCard = (index) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  const fadeIn = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };

  const expandAnim = {
    hidden: { opacity: 0, height: 0 },
    visible: { opacity: 1, height: "auto", transition: { duration: 0.5 } },
    exit: { opacity: 0, height: 0, transition: { duration: 0.3 } },
  };

  return (
    <>
      {/* Si utilizas Navbar/Footers en la página, puedes descomentarlos */}
      {/* <Navbar /> */}

      <div className="container-fluid py-5 px-4" style={{ backgroundColor: "#ffffffff" }}>
        <motion.div
          variants={fadeIn}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <div className="text-center mb-5">
            <h1 className="fw-bold  display-4">Nuestros Servicios</h1>
            <p className="lead text-secondary mx-auto" style={{ maxWidth: "700px" }}>
              Soluciones que empoderan, conectan y transforman vidas.
            </p>
            <p className="lead text-secondary mx-auto" style={{ maxWidth: "700px" }}>
              ofrecemos los siguientes packs, que incluyen una variedad de servicios
            </p>
          </div>

          <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
            {servicios.map((servicio, idx) => (
              <div className="col" key={idx}>
                <motion.div
                  layout
                  className="card h-100 border-0 shadow-sm rounded-4 text-center p-4"
                  style={{ backgroundColor: "#ffffff" }}
                >
                  <div className="fs-1">{servicio.icon}</div>
                  <h5 className="mt-3 text-danger">{servicio.title}</h5>
                  <p className="text-secondary">{servicio.desc}</p>
                  <button
                    className="btn btn-outline-primary mt-2"
                    onClick={() => toggleCard(idx)}
                    aria-expanded={activeIndex === idx}
                    aria-controls={`panel-${idx}`}
                  >
                    {activeIndex === idx ? "Cerrar detalles" : "Ver más"}
                  </button>

                  <AnimatePresence>
                    {activeIndex === idx && (
                      <motion.div
                        id={`panel-${idx}`}
                        variants={expandAnim}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="mt-4 text-start"
                      >
                        {/* Beneficios: soporta múltiples contenedores con nombre */}
                        {servicio.beneficiosListas && servicio.beneficiosListas.length > 0 ? (
                          servicio.beneficiosListas.map((grupo, gIdx) => (
                            <div key={`b-${gIdx}`} className="mb-3">
                              <h6 className="text-danger">{grupo.name}</h6>
                              <ul className="text-secondary">
                                {grupo.items.map((b, i) => (
                                  <li key={`b-${gIdx}-${i}`}>{b}</li>
                                ))}
                              </ul>
                            </div>
                          ))
                        ) : servicio.beneficios && servicio.beneficios.length > 0 ? (
                          <div>
                            <h6 className="text-danger">Beneficios</h6>
                            <ul className="text-secondary">
                              {servicio.beneficios.map((b, i) => (
                                <li key={i}>{b}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}

                        {/* Testimonios: soporta múltiples contenedores con nombre */}
                        {servicio.testimoniosListas && servicio.testimoniosListas.length > 0 ? (
                          servicio.testimoniosListas.map((grupo, gIdx) => (
                            <div key={`t-${gIdx}`} className="mb-3">
                              <h6 className="text-danger mt-3">{grupo.name}</h6>
                              <ul className="fst-italic text-secondary">
                                {grupo.items.map((t, i) => (
                                  <li key={`t-${gIdx}-${i}`}>{t}</li>
                                ))}
                              </ul>
                            </div>
                          ))
                        ) : servicio.testimonios && servicio.testimonios.length > 0 ? (
                          <div>
                            <h6 className="text-danger mt-3">Testimonios</h6>
                            <ul className="fst-italic text-secondary">
                              {servicio.testimonios.map((t, i) => (
                                <li key={i}>{t}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}

                        <Link
                          className={`btn me-2 ${("/contactanos") ? "btn-outline-danger danger" : "btn-light"}`}
                          to="/contactanos"
                        >
                          Contáctanos
                        </Link>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* <Footer /> */}
    </>
  );
};

export default SERVICIOS;
