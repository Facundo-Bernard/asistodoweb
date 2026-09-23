import { formatCurrency } from "../datos/productos";

export default function PropCard({ groupTitle, product, selectedOffer, onSelectOffer }) {
  return (
    <article className="product-card">
      <span className="product-plan">{groupTitle === "ANSES Signature" ? "ANSES" : product.plan}</span>
      <strong className="product-amount">{formatCurrency(product.amount)}</strong>
      <span className="product-caption">Monto a recibir</span>

      <div className="installment-list" aria-label={`Opciones para ${formatCurrency(product.amount)}`}>
        {product.installments.map((installment) => {
          const offerId = `${product.id}-${installment.months}`;
          const isSelected = selectedOffer?.id === offerId;
          return (
            <button
              className={`installment-option ${isSelected ? "selected" : ""}`}
              key={offerId}
              type="button"
              onClick={() => onSelectOffer({
                id: offerId,
                familia: groupTitle,
                plan: groupTitle === "ANSES Signature" ? "Signature Coop Ya" : product.plan,
                monto: product.amount,
                plazoMeses: installment.months,
              })}
            >
              <span>Contrato de {installment.months} meses con cuota de</span>
              <strong>{formatCurrency(installment.payment)}</strong>
              {isSelected && <span className="installment-check" aria-hidden="true">✓</span>}
            </button>
          );
        })}
      </div>
    </article>
  );
}
