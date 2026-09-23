import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { resetAdvance } from "../../../REDUX/adelantoSlice";
import { createWhatsAppUrl } from "../datos/whatsapp";

export default function SolicitudExito() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id, channel } = useSelector((state) => state.adelanto.submission);
  const continuedByWhatsApp = channel === "whatsapp";

  const returnHome = () => {
    dispatch(resetAdvance());
    navigate("/");
  };

  return (
    <div className="advance-success-screen">
      <span className="success-icon" aria-hidden="true">✓</span>
      <span className="advance-eyebrow">Solicitud enviada</span>
      <h1>¡Listo! Recibimos tu solicitud</h1>
      <p>
        {continuedByWhatsApp
          ? "Abrimos WhatsApp para que puedas continuar con un asesor."
          : "Vamos a revisar tu documentación y te vamos a contactar a la brevedad."}
      </p>
      {id && <span className="application-id">Número de solicitud: {id}</span>}
      {continuedByWhatsApp && (
        <a className="advance-whatsapp-link" href={createWhatsAppUrl(id)} target="_blank" rel="noreferrer">
          Abrir WhatsApp
        </a>
      )}
      <button className="advance-button" type="button" onClick={returnHome}>
        Volver al inicio
      </button>
    </div>
  );
}
