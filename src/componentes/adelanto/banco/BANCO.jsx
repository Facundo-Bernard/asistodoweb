import { BANKS } from "../datos/productos";

export default function Banco({ selectedBanks, selectionLimit, onToggleBank, onNext }) {
  return (
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
                onChange={() => onToggleBank(bank.id)}
              />
              <span className="bank-check" aria-hidden="true">{isSelected && "✓"}</span>
              <span>{bank.name}</span>
            </label>
          );
        })}
      </fieldset>

      <p className={`selection-note ${selectionLimit ? "has-error" : ""}`}>
        {selectionLimit ? "Solo podés elegir hasta dos bancos." : `${selectedBanks.length} de 2 bancos seleccionados`}
      </p>

      <button className="advance-button" type="button" disabled={selectedBanks.length === 0} onClick={onNext}>
        Siguiente
      </button>
    </>
  );
}
