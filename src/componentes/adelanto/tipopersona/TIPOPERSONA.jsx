import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { clearAdvanceOffer, setAdvanceScreen, updateAdvanceDetails } from "../../../REDUX/adelantoSlice";
import { getDetailsErrors, minimumAgeFor, onlyDigits } from "./validaciones";

export default function TipoPersona() {
  const dispatch = useDispatch();
  const details = useSelector((state) => state.adelanto.details);
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const errors = getDetailsErrors(details);
  const canContinue = Object.values(errors).every((error) => !error);
  const minimumAge = minimumAgeFor(details.employment);

  const showError = (field) => (submitted || touched[field]) && errors[field];
  const markTouched = (field) => setTouched((current) => ({ ...current, [field]: true }));
  const updateDetails = (change) => {
    dispatch(updateAdvanceDetails(change));
    dispatch(clearAdvanceOffer());
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmitted(true);
    if (canContinue) dispatch(setAdvanceScreen(details.employment === "working" ? "evaluando-trabajo" : "eleccioncuotas"));
  };

  const updateAge = (value) => {
    const age = onlyDigits(value);
    if (!age || Number(age) <= 100) updateDetails({ age });
  };

  const updateIncome = (value) => {
    const income = onlyDigits(value);
    if (!income || Number(income) <= 3000000) updateDetails({ income });
  };

  return (
    <>
      <span className="advance-eyebrow">Tipo de persona</span>
      <h1>Contanos un poco sobre vos</h1>
      <p className="advance-description">Completá tus datos para conocer las opciones disponibles.</p>

      <form className="details-form" onSubmit={handleSubmit} noValidate>
        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="advance-full-name">Nombre y apellido</label>
            <input
              id="advance-full-name"
              type="text"
              autoComplete="name"
              value={details.fullName}
              onBlur={() => markTouched("fullName")}
              onChange={(event) => updateDetails({ fullName: event.target.value })}
              aria-invalid={Boolean(showError("fullName"))}
            />
            {showError("fullName") && <span className="field-error">{errors.fullName}</span>}
          </div>

          <div className="form-field">
            <label htmlFor="advance-dni">DNI</label>
            <input
              id="advance-dni"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength="8"
              value={details.dni}
              onBlur={() => markTouched("dni")}
              onChange={(event) => updateDetails({ dni: onlyDigits(event.target.value) })}
              aria-invalid={Boolean(showError("dni"))}
            />
            {showError("dni") && <span className="field-error">{errors.dni}</span>}
          </div>

          <div className="form-field">
            <label htmlFor="advance-email">Mail</label>
            <input
              id="advance-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={details.email}
              onBlur={() => markTouched("email")}
              onChange={(event) => updateDetails({ email: event.target.value.trimStart() })}
              aria-invalid={Boolean(showError("email"))}
            />
            {showError("email") && <span className="field-error">{errors.email}</span>}
          </div>

          <div className="form-field">
            <label htmlFor="advance-phone">Teléfono</label>
            <input
              id="advance-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength="20"
              value={details.phone}
              onBlur={() => markTouched("phone")}
              onChange={(event) => updateDetails({ phone: event.target.value.replace(/[^\d+\s()-]/g, "") })}
              aria-invalid={Boolean(showError("phone"))}
            />
            {showError("phone") && <span className="field-error">{errors.phone}</span>}
          </div>

          <div className="form-field form-field-wide">
            <label htmlFor="advance-address">Dirección</label>
            <input
              id="advance-address"
              type="text"
              autoComplete="street-address"
              placeholder="Ej.: Av. Corrientes 1234"
              value={details.address}
              onBlur={() => markTouched("address")}
              onChange={(event) => updateDetails({ address: event.target.value })}
              aria-invalid={Boolean(showError("address"))}
            />
            {showError("address") && <span className="field-error">{errors.address}</span>}
          </div>

          <fieldset className="form-field form-field-wide choice-fieldset">
            <legend>Género</legend>
            <div className="gender-options">
              <label className={details.gender === "male" ? "selected" : ""}>
                <input
                  type="radio"
                  name="gender"
                  value="male"
                  checked={details.gender === "male"}
                  onChange={(event) => {
                    markTouched("gender");
                    updateDetails({ gender: event.target.value });
                  }}
                />
                Hombre
              </label>
              <label className={details.gender === "female" ? "selected" : ""}>
                <input
                  type="radio"
                  name="gender"
                  value="female"
                  checked={details.gender === "female"}
                  onChange={(event) => {
                    markTouched("gender");
                    updateDetails({ gender: event.target.value });
                  }}
                />
                Mujer
              </label>
            </div>
            {showError("gender") && <span className="field-error">{errors.gender}</span>}
          </fieldset>

          <div className="form-field">
            <label htmlFor="advance-age">¿Qué edad tenés?</label>
            <input
              id="advance-age"
              type="text"
              inputMode="numeric"
              maxLength="3"
              value={details.age}
              onBlur={() => markTouched("age")}
              onChange={(event) => updateAge(event.target.value)}
              aria-invalid={Boolean(showError("age"))}
            />
            <span className="field-help">Edad permitida: entre {minimumAge} y 100 años.</span>
            {showError("age") && <span className="field-error">{errors.age}</span>}
          </div>

          <div className="form-field">
            <label htmlFor="advance-income">¿Cuánto ganás por mes?</label>
            <div className="income-input">
              <span>$</span>
              <input
                id="advance-income"
                type="text"
                inputMode="numeric"
                maxLength="7"
                value={details.income}
                onBlur={() => markTouched("income")}
                onChange={(event) => updateIncome(event.target.value)}
                aria-invalid={Boolean(showError("income"))}
              />
            </div>
            <span className="field-help">Entre $100.000 y $3.000.000.</span>
            {showError("income") && <span className="field-error">{errors.income}</span>}
          </div>
        </div>

        <fieldset className="choice-fieldset">
          <legend>Situación laboral</legend>
          <div className="employment-options">
            <label className={details.employment === "working" ? "selected" : ""}>
              <input
                type="radio"
                name="employment"
                value="working"
                checked={details.employment === "working"}
                onChange={(event) => {
                  markTouched("employment");
                  updateDetails({ employment: event.target.value });
                }}
              />
              Trabajo
            </label>
            <label className={details.employment === "retired" ? "selected" : ""}>
              <input
                type="radio"
                name="employment"
                value="retired"
                checked={details.employment === "retired"}
                onChange={(event) => {
                  markTouched("employment");
                  updateDetails({ employment: event.target.value });
                }}
              />
              Soy jubilado/a
            </label>
            <label className={details.employment === "graciable" ? "selected" : ""}>
              <input
                type="radio"
                name="employment"
                value="graciable"
                checked={details.employment === "graciable"}
                onChange={(event) => {
                  markTouched("employment");
                  updateDetails({ employment: event.target.value });
                }}
              />
              Pensión graciable
            </label>
          </div>
          <span className="field-help">La pensión graciable no incluye productos ANSES.</span>
          {showError("employment") && <span className="field-error">{errors.employment}</span>}
        </fieldset>

        <button className="advance-button" type="submit" disabled={!canContinue}>
          Siguiente
        </button>
      </form>
    </>
  );
}
