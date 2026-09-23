import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setAdvanceScreen } from "../../../REDUX/adelantoSlice";
import { formatCurrency } from "../datos/productos";

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ALLOWED_FILE_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/bmp",
]);
const ALLOWED_EXTENSIONS = /\.(pdf|png|jpe?g|webp|bmp)$/i;

const getFileError = (file) => {
  if (!file) return "Seleccioná un recibo de sueldo para continuar.";
  if (!ALLOWED_FILE_TYPES.has(file.type) && !ALLOWED_EXTENSIONS.test(file.name)) {
    return "El archivo debe ser PDF o una imagen PNG, JPG, WebP o BMP.";
  }
  if (file.size > MAX_FILE_SIZE) return "El archivo no puede superar los 25 MB.";
  return "";
};

export default function Documentacion({ onSubmitApplication }) {
  const dispatch = useDispatch();
  const { selectedOffer, submission } = useSelector((state) => state.adelanto);
  const [payslip, setPayslip] = useState(null);
  const [fileError, setFileError] = useState("");
  const isSending = submission.status === "sending";

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    const error = getFileError(file);
    setFileError(error);
    setPayslip(error ? null : file);
  };

  const handleFileSubmit = (event) => {
    event.preventDefault();
    const error = getFileError(payslip);
    setFileError(error);
    if (!error) onSubmitApplication({ payslip, channel: "papeleria" });
  };

  const handleWhatsApp = () => {
    const whatsappWindow = window.open("", "_blank");
    if (whatsappWindow) whatsappWindow.opener = null;
    onSubmitApplication({ channel: "whatsapp", whatsappWindow });
  };

  return (
    <>
      <span className="advance-eyebrow">Último paso</span>
      <h1>Ya casi estás</h1>
      <p className="advance-description">
        Para solicitar una pre-aprobación, cargá tu recibo de sueldo. Si preferís, podés continuar por WhatsApp con uno de nuestros asesores.
      </p>

      <div className="application-summary">
        <span>Adelanto elegido</span>
        <strong>{formatCurrency(selectedOffer?.monto)}</strong>
        <small>Contrato de {selectedOffer?.plazoMeses} meses.</small>
      </div>

      <div className="completion-options">
        <form className="completion-option upload-option" onSubmit={handleFileSubmit} noValidate>
          <div className="completion-option-heading">
            <span className="completion-icon" aria-hidden="true">⌑</span>
            <div>
              <h2>Cargá tu recibo</h2>
              <p>PDF o imagen, hasta 25 MB.</p>
            </div>
          </div>

          <label className="file-picker" htmlFor="advance-payslip">
            <span>{payslip ? payslip.name : "Seleccionar archivo"}</span>
            <strong>Examinar</strong>
          </label>
          <input
            id="advance-payslip"
            className="visually-hidden"
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.bmp,application/pdf,image/png,image/jpeg,image/webp,image/bmp"
            onChange={handleFileChange}
          />
          {fileError && <p className="application-error file-error" role="alert">{fileError}</p>}
          {submission.status === "error" && <p className="application-error" role="alert">{submission.error}</p>}

          <button className="advance-button" type="submit" disabled={!payslip || isSending}>
            {isSending && submission.channel === "papeleria" ? "Enviando solicitud..." : "Enviar recibo y continuar"}
          </button>
        </form>

        <div className="completion-divider"><span>o</span></div>

        <section className="completion-option whatsapp-option" aria-labelledby="whatsapp-title">
          <div className="completion-option-heading">
            <span className="completion-icon whatsapp-icon" aria-hidden="true">◔</span>
            <div>
              <h2 id="whatsapp-title">Hablá con un asesor</h2>
              <p>Continuá tu solicitud por WhatsApp cuando quieras.</p>
            </div>
          </div>
          <button
            className="advance-button whatsapp-button"
            type="button"
            disabled={isSending}
            onClick={handleWhatsApp}
          >
            {isSending && submission.channel === "whatsapp" ? "Conectando..." : "Continuar por WhatsApp"}
          </button>
          {submission.status === "error" && submission.channel === "whatsapp" && (
            <p className="application-error" role="alert">{submission.error}</p>
          )}
        </section>
      </div>

      <button className="advance-secondary-button" type="button" onClick={() => dispatch(setAdvanceScreen("eleccioncuotas"))}>
        Elegir otro adelanto
      </button>
    </>
  );
}
