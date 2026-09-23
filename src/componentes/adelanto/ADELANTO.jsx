import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "./ADELANTO.css";
import Banco from "./banco/BANCO";
import TipoPersona from "./tipopersona/TIPOPERSONA";
import EleccionCuotas from "./eleccioncuotas/ELECCIONCUOTAS";
import Documentacion from "./documentacion/DOCUMENTACION";
import SolicitudExito from "./resultado/SOLICITUDEXITO";
import { ELIGIBLE_BANK_IDS } from "./datos/productos";
import { createWhatsAppUrl } from "./datos/whatsapp";
import { createCandidate } from "./api/candidatosApi";
import {
  advanceSubmissionFailed,
  advanceSubmissionSucceeded,
  resetAdvance,
  setAdvanceScreen,
  startAdvanceSubmission,
} from "../../REDUX/adelantoSlice";

export default function Adelanto() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isSubmitting = useRef(false);
  const { screen, selectedBanks, details, selectedOffer, submission } = useSelector((state) => state.adelanto);

  useEffect(() => {
    if (screen !== "validando" && screen !== "evaluando-trabajo") return undefined;

    const timer = window.setTimeout(() => {
      if (screen === "evaluando-trabajo") {
        dispatch(setAdvanceScreen("no-disponible-trabajo"));
        return;
      }

      const canContinue = selectedBanks.some((bankId) => ELIGIBLE_BANK_IDS.has(bankId));
      dispatch(setAdvanceScreen(canContinue ? "tipopersona" : "no-disponible"));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [dispatch, screen, selectedBanks]);

  const submitApplication = async ({ payslip, channel, whatsappWindow }) => {
    if (!selectedOffer || submission.status === "sending" || isSubmitting.current) return;

    const candidate = {
      nombreCompleto: details.fullName.trim(),
      dni: details.dni,
      email: details.email.trim(),
      telefono: details.phone.trim(),
      direccion: details.address.trim(),
      genero: details.gender,
      edad: Number(details.age),
      situacionLaboral: details.employment,
      ingresoMensual: Number(details.income),
      moneda: "ARS",
      bancosSeleccionados: selectedBanks,
      productoSeleccionado: {
        familia: selectedOffer.familia,
        plan: selectedOffer.plan,
        monto: selectedOffer.monto,
        plazoMeses: selectedOffer.plazoMeses,
      },
      origen: "web",
    };

    try {
      isSubmitting.current = true;
      dispatch(startAdvanceSubmission(channel));
      const createdCandidate = await createCandidate(candidate, payslip);
      dispatch(advanceSubmissionSucceeded(createdCandidate.id));

      if (channel === "whatsapp") {
        const whatsappUrl = createWhatsAppUrl(createdCandidate.id);
        if (whatsappWindow && !whatsappWindow.closed) whatsappWindow.location.replace(whatsappUrl);
        else window.open(whatsappUrl, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      if (whatsappWindow && !whatsappWindow.closed) whatsappWindow.close();
      isSubmitting.current = false;
      dispatch(advanceSubmissionFailed(error.message));
    }
  };

  return (
    <main className="advance-page">
      <section className={`advance-card ${screen === "eleccioncuotas" ? "offers-card" : ""}`} aria-live="polite">
        {screen === "banco" && <Banco />}

        {screen === "validando" && (
          <div className="advance-loading">
            <span className="loading-spinner" aria-hidden="true" />
            <h1>Estamos revisando tus opciones</h1>
            <p>Un momento, por favor.</p>
          </div>
        )}

        {screen === "evaluando-trabajo" && (
          <div className="advance-loading">
            <span className="loading-spinner" aria-hidden="true" />
            <h1>Estamos evaluando tu solicitud</h1>
            <p>Un momento, por favor.</p>
          </div>
        )}

        {screen === "no-disponible" && (
          <div className="advance-result">
            <span className="result-icon" aria-hidden="true">!</span>
            <h1>Por el momento no podemos continuar</h1>
            <p>Para solicitar un adelanto, seleccioná Banco Nación o Banco Provincia (BAPRO).</p>
            <button className="advance-button" type="button" onClick={() => dispatch(setAdvanceScreen("banco"))}>
              Volver a elegir bancos
            </button>
          </div>
        )}

        {screen === "no-disponible-trabajo" && (
          <div className="advance-result">
            <span className="result-icon" aria-hidden="true">!</span>
            <h1>Por el momento no podemos continuar</h1>
            <p>En este momento, los adelantos están disponibles para jubilados y pensiones graciables.</p>
            <button
              className="advance-button"
              type="button"
              onClick={() => {
                dispatch(resetAdvance());
                navigate("/");
              }}
            >
              Volver al inicio
            </button>
          </div>
        )}

        {screen === "tipopersona" && <TipoPersona />}

        {screen === "eleccioncuotas" && <EleccionCuotas />}

        {screen === "documentacion" && <Documentacion onSubmitApplication={submitApplication} />}

        {screen === "exito" && <SolicitudExito />}
      </section>
    </main>
  );
}
