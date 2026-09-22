import { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

const BANKS = [
  { id: "nacion", name: "Banco Nación" },
  { id: "provincia", name: "Banco Provincia (BAPRO)" },
  { id: "galicia", name: "Banco Galicia" },
  { id: "santander", name: "Banco Santander" },
  { id: "macro", name: "Banco Macro" },
];

const ELIGIBLE_BANKS = new Set(["nacion", "provincia"]);

export default function Adelanto() {
  const [step, setStep] = useState("banks");
  const [selectedBanks, setSelectedBanks] = useState([]);
  const [selectionLimit, setSelectionLimit] = useState(false);
  const [details, setDetails] = useState({ age: "", employment: "", income: "" });

  useEffect(() => {
    if (step !== "loading") return undefined;

    const timer = window.setTimeout(() => {
      const canContinue = selectedBanks.some((bank) => ELIGIBLE_BANKS.has(bank));
      setStep(canContinue ? "details" : "not-eligible");
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [step, selectedBanks]);

  const toggleBank = (bankId) => {
    setSelectionLimit(false);
    setSelectedBanks((current) => {
      if (current.includes(bankId)) return current.filter((id) => id !== bankId);
      if (current.length === 2) {
        setSelectionLimit(true);
        return current;
      }
      return [...current, bankId];
    });
  };

  const goToValidation = () => {
    if (selectedBanks.length > 0) setStep("loading");
  };

  const returnToBanks = () => {
    setSelectionLimit(false);
    setStep("banks");
  };

  return (
    <main className="advance-page">
      <style>{styles}</style>

      <section className="advance-card" aria-live="polite">
        {step === "banks" && (
          <>
            <span className="advance-eyebrow">Solicitud de adelanto</span>
            <h1>¿A qué banco pertenecés?</h1>
            <p className="advance-description">
              Elegí hasta dos bancos para conocer las opciones disponibles.
            </p>

            <fieldset className="bank-list">
              <legend className="visually-hidden">Bancos disponibles</legend>
              {BANKS.map((bank) => {
                const isSelected = selectedBanks.includes(bank.id);
                return (
                  <label className={`bank-option ${isSelected ? "selected" : ""}`} key={bank.id}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleBank(bank.id)}
                    />
                    <span className="bank-check" aria-hidden="true">{isSelected && "✓"}</span>
                    <span>{bank.name}</span>
                  </label>
                );
              })}
            </fieldset>

            <p className={`selection-note ${selectionLimit ? "has-error" : ""}`}>
              {selectionLimit
                ? "Solo podés elegir hasta dos bancos."
                : `${selectedBanks.length} de 2 bancos seleccionados`}
            </p>

            <button
              className="advance-button"
              type="button"
              disabled={selectedBanks.length === 0}
              onClick={goToValidation}
            >
              Siguiente
            </button>
          </>
        )}

        {step === "loading" && (
          <div className="advance-loading">
            <span className="loading-spinner" aria-hidden="true" />
            <h1>Estamos revisando tus opciones</h1>
            <p>Un momento, por favor.</p>
          </div>
        )}

        {step === "not-eligible" && (
          <div className="advance-result">
            <span className="result-icon" aria-hidden="true">!</span>
            <h1>Por el momento no podemos continuar</h1>
            <p>
              Para solicitar un adelanto, seleccioná Banco Nación o Banco Provincia (BAPRO).
            </p>
            <button className="advance-button" type="button" onClick={returnToBanks}>
              Volver a elegir bancos
            </button>
          </div>
        )}

        {step === "details" && (
          <>
            <span className="advance-eyebrow">Solicitud de adelanto</span>
            <h1>Contanos un poco sobre vos</h1>
            <p className="advance-description">
              Completá estos datos para continuar con tu solicitud.
            </p>

            <form className="details-form">
              <div>
                <label htmlFor="advance-age">¿Qué edad tenés?</label>
                <input
                  id="advance-age"
                  type="number"
                  min="18"
                  max="120"
                  inputMode="numeric"
                  placeholder="Ej.: 35"
                  value={details.age}
                  onChange={(event) => setDetails((current) => ({ ...current, age: event.target.value }))}
                />
              </div>

              <fieldset>
                <legend>Situación laboral</legend>
                <div className="employment-options">
                  <label className={details.employment === "working" ? "selected" : ""}>
                    <input
                      type="radio"
                      name="employment"
                      value="working"
                      checked={details.employment === "working"}
                      onChange={(event) => setDetails((current) => ({ ...current, employment: event.target.value }))}
                    />
                    Trabajo
                  </label>
                  <label className={details.employment === "retired" ? "selected" : ""}>
                    <input
                      type="radio"
                      name="employment"
                      value="retired"
                      checked={details.employment === "retired"}
                      onChange={(event) => setDetails((current) => ({ ...current, employment: event.target.value }))}
                    />
                    Soy jubilado/a
                  </label>
                </div>
              </fieldset>

              <div>
                <label htmlFor="advance-income">¿Cuánto ganás por mes?</label>
                <div className="income-input">
                  <span>$</span>
                  <input
                    id="advance-income"
                    type="number"
                    min="0"
                    inputMode="numeric"
                    placeholder="Ingresá el monto"
                    value={details.income}
                    onChange={(event) => setDetails((current) => ({ ...current, income: event.target.value }))}
                  />
                </div>
              </div>
            </form>
          </>
        )}
      </section>
    </main>
  );
}

const styles = `
  .advance-page {
    min-height: calc(100vh - 88px);
    display: grid;
    place-items: center;
    padding: 3rem 1.25rem;
    background: linear-gradient(135deg, #f6f5ff 0%, #f8f9fa 55%, #f0effa 100%);
  }
  .advance-card {
    width: min(100%, 650px);
    padding: clamp(1.75rem, 5vw, 3.25rem);
    border: 1px solid rgba(52, 38, 131, .12);
    border-radius: 24px;
    background: white;
    box-shadow: 0 18px 42px rgba(52, 38, 131, .13);
  }
  .advance-eyebrow {
    display: inline-block;
    margin-bottom: .75rem;
    color: #342683;
    font-size: .82rem;
    font-weight: 700;
    letter-spacing: .07em;
    text-transform: uppercase;
  }
  .advance-card h1 {
    margin: 0;
    color: #282144;
    font-size: clamp(1.75rem, 4vw, 2.4rem);
    font-weight: 700;
  }
  .advance-description, .advance-result p, .advance-loading p {
    margin: .7rem 0 1.75rem;
    color: #666176;
    font-size: 1.05rem;
  }
  .bank-list {
    display: grid;
    gap: .7rem;
    padding: 0;
    margin: 0;
    border: 0;
  }
  .bank-option {
    display: flex;
    align-items: center;
    gap: .85rem;
    min-height: 58px;
    padding: .85rem 1rem;
    border: 1px solid #e0deea;
    border-radius: 14px;
    color: #34303e;
    cursor: pointer;
    font-weight: 600;
    transition: border-color .2s ease, background .2s ease, transform .2s ease;
  }
  .bank-option:hover { transform: translateY(-1px); border-color: #342683; }
  .bank-option.selected { border-color: #342683; background: #f4f2ff; }
  .bank-option input { position: absolute; opacity: 0; }
  .bank-check {
    display: grid;
    place-items: center;
    width: 22px;
    height: 22px;
    flex: 0 0 22px;
    border: 2px solid #9893aa;
    border-radius: 6px;
    color: white;
    font-size: .85rem;
  }
  .bank-option.selected .bank-check { border-color: #342683; background: #342683; }
  .selection-note { min-height: 1.4rem; margin: .9rem 0 1.35rem; color: #777183; font-size: .9rem; }
  .selection-note.has-error { color: #b42318; font-weight: 600; }
  .advance-button {
    width: 100%;
    padding: .8rem 1.3rem;
    border: 1px solid #342683;
    border-radius: 999px;
    background: #342683;
    color: white;
    font-size: 1rem;
    font-weight: 700;
    box-shadow: 0 8px 18px rgba(52, 38, 131, .22);
    transition: transform .2s ease, filter .2s ease;
  }
  .advance-button:hover:not(:disabled) { filter: brightness(1.13); transform: translateY(-2px); }
  .advance-button:disabled { cursor: not-allowed; opacity: .48; box-shadow: none; }
  .advance-loading, .advance-result { min-height: 265px; display: grid; place-content: center; text-align: center; }
  .advance-loading h1, .advance-result h1 { font-size: clamp(1.55rem, 4vw, 2rem); }
  .loading-spinner {
    width: 52px;
    height: 52px;
    margin: 0 auto 1.25rem;
    border: 5px solid #e5e2f7;
    border-top-color: #342683;
    border-radius: 50%;
    animation: advance-spin .8s linear infinite;
  }
  .result-icon {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    margin: 0 auto 1.1rem;
    border-radius: 50%;
    background: #fff3cd;
    color: #886400;
    font-size: 1.45rem;
    font-weight: 800;
  }
  .details-form { display: grid; gap: 1.35rem; }
  .details-form label, .details-form legend { display: block; margin-bottom: .55rem; color: #342f3d; font-weight: 700; }
  .details-form input[type="number"] {
    width: 100%;
    padding: .8rem .9rem;
    border: 1px solid #d8d4e2;
    border-radius: 12px;
    color: #2f293a;
    outline: 0;
  }
  .details-form input[type="number"]:focus { border-color: #342683; box-shadow: 0 0 0 .2rem rgba(52, 38, 131, .13); }
  .details-form fieldset { padding: 0; margin: 0; border: 0; }
  .employment-options { display: grid; grid-template-columns: repeat(2, 1fr); gap: .7rem; }
  .employment-options label {
    margin: 0;
    padding: .8rem;
    border: 1px solid #dedbe7;
    border-radius: 12px;
    cursor: pointer;
    text-align: center;
    font-size: .93rem;
  }
  .employment-options label.selected { border-color: #342683; background: #f4f2ff; color: #342683; }
  .employment-options input { position: absolute; opacity: 0; }
  .income-input { display: flex; align-items: center; border: 1px solid #d8d4e2; border-radius: 12px; overflow: hidden; }
  .income-input:focus-within { border-color: #342683; box-shadow: 0 0 0 .2rem rgba(52, 38, 131, .13); }
  .income-input span { padding-left: .9rem; color: #655f73; font-weight: 700; }
  .income-input input[type="number"] { border: 0; box-shadow: none !important; }
  @keyframes advance-spin { to { transform: rotate(360deg); } }
  @media (max-width: 450px) {
    .advance-page { padding: 1.4rem .8rem; }
    .advance-card { border-radius: 18px; }
    .employment-options { grid-template-columns: 1fr; }
  }
`;
