import { useDispatch, useSelector } from "react-redux";
import { selectAdvanceOffer, setAdvanceScreen } from "../../../REDUX/adelantoSlice";
import PropCard from "../ofrecimientoprestamo/PROPCARD";
import { formatCurrency, getAvailableProductGroups } from "../datos/productos";

export default function EleccionCuotas() {
  const dispatch = useDispatch();
  const { details, selectedOffer } = useSelector((state) => state.adelanto);
  const income = Number(details.income) || 0;
  const productGroups = getAvailableProductGroups({ employment: details.employment, income });

  return (
    <>
      <span className="advance-eyebrow">Elección de cuotas</span>
      <h1>Elegí el adelanto que te conviene</h1>
      <p className="advance-description">
        El monto máximo disponible coincide con tu ingreso mensual. Solo mostramos cuotas de hasta el 35% de tu ingreso.
      </p>

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
                    onSelectOffer={(offer) => dispatch(selectAdvanceOffer(offer))}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="no-products">
          <h2>No encontramos productos disponibles</h2>
          <p>Con los datos informados no hay una cuota que respete el máximo del 35% de tu ingreso.</p>
        </div>
      )}

      <button
        className="advance-button submit-application-button"
        type="button"
        disabled={!selectedOffer}
        onClick={() => dispatch(setAdvanceScreen("documentacion"))}
      >
        Continuar
      </button>

      <button className="advance-secondary-button" type="button" onClick={() => dispatch(setAdvanceScreen("tipopersona"))}>
        Modificar mis datos
      </button>
    </>
  );
}
