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
      desc: "Nuestro plan estandar, focalizado en la asistencia y ayuda",
      // Soportamos tanto un simple array `beneficios` (retrocompatibilidad)
      // como múltiples contenedores `beneficiosListas` con nombre y items.

      beneficiosListas: [
        {
          name: "Asistencia al HOGAR",
          items: [
            "Plomeria, Gasista, Vidrieria, Cerrajeria, Electricista de emergencia",
            "Orientacion legal Telefonica en casos de robo en el domiciio",
            "Rerencia y Coordinacion de tecnicos en mantenimiento",
          ],
        },
        {
          name: "Asistencia MEDICA",
          items: [
            "traslado terrestre (ambulancia) en caso de accidente o engermedad",
            "Segunda opinion medica",
            "Medico y enfermera a domicilio",
            "Phono Med: Linea de consultas 24hs",
            "Recordatorio de citas medicas e ingesta de medicamentos",
            "Referencias medicas de especialidades, hospitales y clinicas a nivel nacional"
          ],
        },
        {
          name: "Asistencia en VIA PUBLICA",
          items: [
            "Traslado del beneficiario en Taxi o Remise",
            "Traslado medico terrestre en caso de lesiones",
            "Asistente telefonica para tramites administrativos",
            "Cerrajero en caso de robo de llaves al domicilio",
            "Envio de remolque en caso de robo de las llaves del auto",
            "Coordinacion de denuncias de robo de tarjetas de credito y celular",
            "Transmision de mensajes urgentes y conferencias telefonicas",
            "Conexion con numeros de emrgencias",
          ],
        },
        {
          name: "Subsidio por Fallecimiento",
          items: [
            "OPCIONAL COBRO ANTICIPADO",
            "colaborar con los gastos ant el requerimiento de un familiar directo",
            "Presentando certificado de fallecimiento y documentacion que corrobore fehacientemente la relacion parental mas directa con el fallecido",

          ],
        },
      ],
      // Testimonios: también soportamos arrays simples y listas con nombre.

      contacto: "/contactanos",
    },

    {
      icon: "💳",
      title: "Pack premium",
      desc: "Financiamiento responsable para proyectos personales y comunitarios.",
      beneficiosListas: [
        {
          name: "Asistencia al HOGAR",
          items: [
            "Plomeria, Gasista, Vidrieria, Cerrajeria, Electricista de emergencia",
            "Orientacion legal Telefonica en casos de robo en el domiciio",
            "Rerencia y Coordinacion de tecnicos en mantenimiento",
          ],
        },
        {
          name: "Asistencia MEDICA",
          items: [
            "traslado terrestre (ambulancia) en caso de accidente o engermedad",
            "Segunda opinion medica",
            "Medico y enfermera a domicilio",
            "Phono Med: Linea de consultas 24hs",
            "Recordatorio de citas medicas e ingesta de medicamentos",
            "Referencias medicas de especialidades, hospitales y clinicas a nivel nacional"
          ],
        },
        {
          name: "Asistencia en VIA PUBLICA",
          items: [
            "Traslado del beneficiario en Taxi o Remise",
            "Traslado medico terrestre en caso de lesiones",
            "Asistente telefonica para tramites administrativos",
            "Cerrajero en caso de robo de llaves al domicilio",
            "Envio de remolque en caso de robo de las llaves del auto",
            "Coordinacion de denuncias de robo de tarjetas de credito y celular",
            "Transmision de mensajes urgentes y conferencias telefonicas",
            "Conexion con numeros de emrgencias",
          ],
        },
        {
          name: "Premium Transfers",
          items: [
            "Traslados medicos programados para una segunda opinion medica especializada para el titular y un acompañante en vuelos de linea o via terrestre",

          ],
        },
        {
          name: "Subsidio por Fallecimiento",
          items: [
            "OPCIONAL COBRO ANTICIPADO",
            "colaborar con los gastos ant el requerimiento de un familiar directo",
            "Presentando certificado de fallecimiento y documentacion que corrobore fehacientemente la relacion parental mas directa con el fallecido",

          ],
        },
        {
          name: "VIP remove service",
          items: [
            "Traslado de fallecidos entre Provincias limitrofes del ultimo domicilio informado en el DNI, abarcando toda la Republica Argentina",

          ],
        },


      ],


      contacto: "/contactanos"
    },
    {
      icon: "🏠",
      title: "Pack Gold",
      desc: "Soluciones habitacionales accesibles y solidarias para nuestros miembros.",
      beneficiosListas: [
        {
          name: "Asistencia al HOGAR",
          items: [
            "Plomeria, Gasista, Vidrieria, Cerrajeria, Electricista de emergencia",
            "Orientacion legal Telefonica en casos de robo en el domiciio",
            "Rerencia y Coordinacion de tecnicos en mantenimiento",
          ],
        },
        {
          name: "Asistencia MEDICA",
          items: [
            "traslado terrestre (ambulancia) en caso de accidente o engermedad",
            "Segunda opinion medica",
            "Medico y enfermera a domicilio",
            "Phono Med: Linea de consultas 24hs",
            "Recordatorio de citas medicas e ingesta de medicamentos",
            "Referencias medicas de especialidades, hospitales y clinicas a nivel nacional"
          ],
        },
        {
          name: "Asistencia en VIA PUBLICA",
          items: [
            "Traslado del beneficiario en Taxi o Remise",
            "Traslado medico terrestre en caso de lesiones",
            "Asistente telefonica para tramites administrativos",
            "Cerrajero en caso de robo de llaves al domicilio",
            "Envio de remolque en caso de robo de las llaves del auto",
            "Coordinacion de denuncias de robo de tarjetas de credito y celular",
            "Transmision de mensajes urgentes y conferencias telefonicas",
            "Conexion con numeros de emrgencias",
          ],
        },
        {
          name: "Premium Transfers",
          items: [
            "Traslados medicos programados para una segunda opinion medica especializada para el titular y un acompañante en vuelos de linea o via terrestre",

          ],
        },
        {
          name: "Subsidio por Fallecimiento",
          items: [
            "OPCIONAL COBRO ANTICIPADO",
            "colaborar con los gastos ant el requerimiento de un familiar directo",
            "Presentando certificado de fallecimiento y documentacion que corrobore fehacientemente la relacion parental mas directa con el fallecido",

          ],
        },
        {
          name: "VIP remove service",
          items: [
            "Traslado de fallecidos entre Provincias limitrofes del ultimo domicilio informado en el DNI, abarcando toda la Republica Argentina",

          ],
        },
        {
          name: "Telemedic",
          items: [
            "video consulta medica"
          ],
        },


      ],

      contacto: "/contactanos"
    },
    {
      icon: "💳",
      title: "Pack platinum",
      desc: "Financiamiento responsable para proyectos personales y comunitarios.",
      beneficiosListas: [
        {
          name: "Asistencia al HOGAR",
          items: [
            "Plomeria, Gasista, Vidrieria, Cerrajeria, Electricista de emergencia",
            "Orientacion legal Telefonica en casos de robo en el domiciio",
            "Rerencia y Coordinacion de tecnicos en mantenimiento",
          ],
        },
        {
          name: "Asistencia MEDICA",
          items: [
            "traslado terrestre (ambulancia) en caso de accidente o engermedad",
            "Segunda opinion medica",
            "Medico y enfermera a domicilio",
            "Phono Med: Linea de consultas 24hs",
            "Recordatorio de citas medicas e ingesta de medicamentos",
            "Referencias medicas de especialidades, hospitales y clinicas a nivel nacional"
          ],
        },
        {
          name: "Asistencia en VIA PUBLICA",
          items: [
            "Traslado del beneficiario en Taxi o Remise",
            "Traslado medico terrestre en caso de lesiones",
            "Asistente telefonica para tramites administrativos",
            "Cerrajero en caso de robo de llaves al domicilio",
            "Envio de remolque en caso de robo de las llaves del auto",
            "Coordinacion de denuncias de robo de tarjetas de credito y celular",
            "Transmision de mensajes urgentes y conferencias telefonicas",
            "Conexion con numeros de emrgencias",
          ],
        },
        {
          name: "Premium Transfers",
          items: [
            "Traslados medicos programados para una segunda opinion medica especializada para el titular y un acompañante en vuelos de linea o via terrestre",

          ],
        },
        {
          name: "Subsidio por Fallecimiento",
          items: [
            "OPCIONAL COBRO ANTICIPADO",
            "colaborar con los gastos ant el requerimiento de un familiar directo",
            "Presentando certificado de fallecimiento y documentacion que corrobore fehacientemente la relacion parental mas directa con el fallecido",

          ],
        },
        {
          name: "VIP remove service",
          items: [
            "Traslado de fallecidos entre Provincias limitrofes del ultimo domicilio informado en el DNI, abarcando toda la Republica Argentina",

          ],
        },
        {
          name: "Telemedic",
          items: [
            "video consulta medica"
          ],
        },
        {
          name: "Asistencia al Viajero",
          items: [
            "Nacional y paises limitrofes",
            "Asistencia Medica por accidentes deportivos, preexistencias y embarazos",
            "Wallet asistance: Asistencia ante la perdida orobo de billetera o documentos"
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
