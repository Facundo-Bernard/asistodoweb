import PropCard from "../ofrecimientoprestamo/PROPCARD";
import { formatCurrency, getAvailableProductGroups } from "../datos/productos";

export default function EleccionCuotas({
  details,
  selectedOffer,
  onSelectOffer,
  onSubmitApplication,
  submissionStatus,
  submissionError,
  submissionId,
  onBack,
}) {
  const income = Number(details.income) || 0;
  const productGroups = getAvailableProductGroups({ employment: details.employment, income });

  return (
    <>
      <span className="advance-eyebrow">Elección de cuotas</span>
      <h1>Elegí el adelanto que te conviene</h1>
      <p className="advance-description">El monto máximo disponible coincide con tu ingreso mensual.</p>

      <div className="advance-limit">
        <span>Tu tope de adelanto</span>
        <strong>{formatCurrency(income)}</strong>
        <small>Disponible para cobrar por Banco Nación o Banco Provincia (BAPRO).</small>
      </div>

      {productGroups.length > 0 ? (
        <div className="offer-groups">
          {productGroups.map((group) => (
            <section className="offer-group" key={group.title}>
              <div className="offer-group-heading">
                <h2>{group.title}</h2>
                <p>{group.description}</p>
              </div>

              <div className="product-grid">
                {group.products.map((product) => (
                  <PropCard
                    groupTitle={group.title}
                    key={product.id}
                    product={product}
                    selectedOffer={selectedOffer}
                    onSelectOffer={onSelectOffer}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="no-products">
          <h2>No encontramos productos disponibles</h2>
          <p>El ingreso informado no alcanza el monto mínimo de las opciones vigentes.</p>
        </div>
      )}

      {submissionStatus === "success" ? (
        <div className="application-success" role="status">
          <strong>¡Solicitud registrada!</strong>
          <span>Tu número de solicitud es {submissionId}.</span>
        </div>
      ) : (
        <>
          {submissionStatus === "error" && (
            <p className="application-error" role="alert">{submissionError}</p>
          )}
          <button
            className="advance-button submit-application-button"
            type="button"
            disabled={!selectedOffer || submissionStatus === "sending"}
            onClick={onSubmitApplication}
          >
            {submissionStatus === "sending" ? "Enviando solicitud..." : "Enviar solicitud"}
          </button>
        </>
      )}

      <button className="advance-secondary-button" type="button" onClick={onBack}>
        Modificar mis datos
      </button>
    </>
  );
}
