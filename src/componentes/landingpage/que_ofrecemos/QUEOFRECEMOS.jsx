import React from 'react';
import ServicioItem from './ServicioItem';

const QueOfrecemos = () => {
  const servicios = [
    {
      title: 'Asistencia en el hogar',
      description: "Servicios dedicados a la asistencia en el hogar, como plomero, gasista, cerrajeria o electricista de emergencia",
    },
    // Puedes duplicar o cambiar más ítems
    {
      title: 'Asistencia al viajero',
      description: "Asistencia al viajero nacional y paises limitros. Incluye desde asistencia medica por accidentes deportivos, atencion a embarazadas, asistencia frente a robo de billetera/documentos entre otros",
    },
    {
      title: 'Asistencia medica',
      description: "Servicios de asistencia y cuidado medico, desde traslado por ambulancia, consulta de segunda opinion, medico a domicilio, linea de consultas hasta recordatorios de citas e ingesta de medicamentos",
    },
       {
      title: 'Telemedicina',
      description: "Video consultas medicas. El servicio consiste en la posinilidad de realizar una consulta virtual con un profesional de medicina familiar, pediatria, clinica",
    },
    
    {
      title: 'Telepsicologia',
      description: "El servicio consiste en la posibilidad de que el asociado, asi como familiares directos realicen una consulta de caracter virtual con un profesional de la salud en la especialidad de psicologia",
    },
    {
      title: 'Premium transfers',
      description: "distintos tipos de subsidios con la oportunidad de tomar adelantadamente un subsidio de fallecimiento. Inlcuye traslado de fallecidos entre provincias limitrofes",
    },
 

  ];

  return (
    <section className="container py-5" id="servicios">
      <h4 className="fw-bold">¿Qué ofrecemos ?</h4>
      <p className="text-muted">nuestros servicios:</p>
      <div className="row">
        {servicios.map((servicio, index) => (
          <ServicioItem
            key={index}
            title={servicio.title}
            description={servicio.description}
          />
        ))}
      </div>
    </section>
  );
};

export default QueOfrecemos;
