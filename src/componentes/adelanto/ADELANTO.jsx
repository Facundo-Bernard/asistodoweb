import { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "./ADELANTO.css";
import Banco from "./banco/BANCO";
import TipoPersona from "./tipopersona/TIPOPERSONA";
import EleccionCuotas from "./eleccioncuotas/ELECCIONCUOTAS";
import { ELIGIBLE_BANK_IDS } from "./datos/productos";
import { createCandidate } from "./api/candidatosApi";

export default function Adelanto() {
  const [screen, setScreen] = useState("banco");
  const [selectedBanks, setSelectedBanks] = useState([]);
  const [selectionLimit, setSelectionLimit] = useState(false);
  const [details, setDetails] = useState({
    fullName: "",
    dni: "",
    email: "",
    phone: "",
    address: "",
    gender: "",
    age: "",
    employment: "",
    income: "",
  });
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [submissionStatus, setSubmissionStatus] = useState("idle");
  const [submissionError, setSubmissionError] = useState("");
  const [submissionId, setSubmissionId] = useState("");

  useEffect(() => {
    if (screen !== "validando") return undefined;

    const timer = window.setTimeout(() => {
      const canContinue = selectedBanks.some((bankId) => ELIGIBLE_BANK_IDS.has(bankId));
      setScreen(canContinue ? "tipopersona" : "no-disponible");
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [screen, selectedBanks]);

  const toggleBank = (bankId) => {
    setSelectionLimit(false);

    if (!selectedBanks.includes(bankId) && selectedBanks.length === 2) {
      setSelectionLimit(true);
      return;
    }

    setSelectedBanks((current) => (
      current.includes(bankId)
        ? current.filter((id) => id !== bankId)
        : [...current, bankId]
    ));
  };

  const updateDetails = (change) => {
    setDetails((current) => ({ ...current, ...change }));
  };

  const goToOffers = () => {
    setSelectedOffer(null);
    setSubmissionStatus("idle");
    setSubmissionError("");
    setSubmissionId("");
    setScreen("eleccioncuotas");
  };

  const selectOffer = (offer) => {
    setSelectedOffer(offer);
    setSubmissionStatus("idle");
    setSubmissionError("");
  };

  const submitApplication = async () => {
    if (!selectedOffer || submissionStatus === "sending") return;

    const productoSeleccionado = {
      familia: selectedOffer.familia,
      plan: selectedOffer.plan,
      monto: selectedOffer.monto,
      plazoMeses: selectedOffer.plazoMeses,
    };
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
      productoSeleccionado,
      origen: "web",
    };

    try {
      setSubmissionStatus("sending");
      setSubmissionError("");
      const createdCandidate = await createCandidate(candidate);
      setSubmissionId(createdCandidate.id);
      setSubmissionStatus("success");
    } catch (error) {
      setSubmissionStatus("error");
      setSubmissionError(error.message);
    }
  };

  return (
    <main className="advance-page">
      <section className={`advance-card ${screen === "eleccioncuotas" ? "offers-card" : ""}`} aria-live="polite">
        {screen === "banco" && (
          <Banco
            selectedBanks={selectedBanks}
            selectionLimit={selectionLimit}
            onToggleBank={toggleBank}
            onNext={() => setScreen("validando")}
          />
        )}

        {screen === "validando" && (
          <div className="advance-loading">
            <span className="loading-spinner" aria-hidden="true" />
            <h1>Estamos revisando tus opciones</h1>
            <p>Un momento, por favor.</p>
          </div>
        )}

        {screen === "no-disponible" && (
          <div className="advance-result">
            <span className="result-icon" aria-hidden="true">!</span>
            <h1>Por el momento no podemos continuar</h1>
            <p>Para solicitar un adelanto, seleccioná Banco Nación o Banco Provincia (BAPRO).</p>
            <button className="advance-button" type="button" onClick={() => setScreen("banco")}>
              Volver a elegir bancos
            </button>
          </div>
        )}

        {screen === "tipopersona" && (
          <TipoPersona details={details} onDetailsChange={updateDetails} onNext={goToOffers} />
        )}

        {screen === "eleccioncuotas" && (
          <EleccionCuotas
            details={details}
            selectedOffer={selectedOffer}
            onSelectOffer={selectOffer}
            onSubmitApplication={submitApplication}
            submissionStatus={submissionStatus}
            submissionError={submissionError}
            submissionId={submissionId}
            onBack={() => setScreen("tipopersona")}
          />
        )}
      </section>
    </main>
  );
}
