import { useEffect, useMemo, useRef, useState } from "react";
import { clearAccessToken, getAccessToken, saveAccessToken } from "../../../api/httpClient";
import {
  getCandidate,
  getCandidatePaperwork,
  getCandidates,
  getCurrentUser,
  importAcceptedPerson,
  loginAdministrator,
  removeCandidate,
} from "./adminApi";
import { buildExternalPerson } from "./personaImportMapper";
import "./ADMINISTRATIVO.css";

const EMPTY_PAPERWORK = { status: "idle", error: "", url: "", type: "", filename: "" };
const ACCEPTED_CANDIDATES_KEY = "coopyaAcceptedCandidates";

const formatCurrency = (amount) => new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
}).format(amount || 0);

const formatDate = (value) => {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Sin fecha" : date.toLocaleString("es-AR");
};

const getErrorMessage = (error, fallback) => error.response?.data?.detail || error.message || fallback;
const employmentLabels = { working: "Trabaja", retired: "Jubilado/a", graciable: "Pensión graciable" };
const genderLabels = { male: "Hombre", female: "Mujer" };

const getStoredAcceptedCandidateIds = () => {
  try {
    const storedIds = JSON.parse(localStorage.getItem(ACCEPTED_CANDIDATES_KEY) || "[]");
    return Array.isArray(storedIds) ? storedIds : [];
  } catch {
    return [];
  }
};

export default function Administrativo() {
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [user, setUser] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [query, setQuery] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [listError, setListError] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [detailCandidate, setDetailCandidate] = useState(null);
  const [detailStatus, setDetailStatus] = useState("idle");
  const [detailError, setDetailError] = useState("");
  const [paperwork, setPaperwork] = useState(EMPTY_PAPERWORK);
  const [acceptingId, setAcceptingId] = useState("");
  const [acceptedCandidateIds, setAcceptedCandidateIds] = useState(getStoredAcceptedCandidateIds);
  const [acceptanceError, setAcceptanceError] = useState({ id: "", message: "" });
  const [acceptanceMessage, setAcceptanceMessage] = useState({ id: "", message: "" });
  const detailRequestId = useRef(0);

  useEffect(() => () => {
    if (paperwork.url) URL.revokeObjectURL(paperwork.url);
  }, [paperwork.url]);

  const loadCandidates = async () => {
    setLoadingCandidates(true);
    setListError("");

    try {
      setCandidates(await getCandidates());
    } catch (error) {
      setListError(getErrorMessage(error, "No pudimos cargar las solicitudes."));
    } finally {
      setLoadingCandidates(false);
    }
  };

  useEffect(() => {
    const restoreSession = async () => {
      if (!getAccessToken()) {
        setCheckingSession(false);
        return;
      }

      try {
        const currentUser = await getCurrentUser();
        if (currentUser.rol !== "admin") throw new Error("Sin permisos de administración.");
        setUser(currentUser);
        await loadCandidates();
      } catch {
        clearAccessToken();
      } finally {
        setCheckingSession(false);
      }
    };

    restoreSession();
  }, []);

  const filteredCandidates = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return candidates;

    return candidates.filter((candidate) => [candidate.nombreCompleto, candidate.dni, candidate.email]
      .some((value) => String(value || "").toLowerCase().includes(normalizedQuery)));
  }, [candidates, query]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoginError("");

    try {
      const session = await loginAdministrator(credentials);
      if (session.user?.rol !== "admin") {
        setLoginError("Tu usuario no tiene permisos de administración.");
        return;
      }

      saveAccessToken(session.access_token);
      setUser(session.user);
      await loadCandidates();
    } catch (error) {
      clearAccessToken();
      setLoginError(getErrorMessage(error, "No pudimos iniciar sesión. Revisá tus datos."));
    }
  };

  const handleLogout = () => {
    clearAccessToken();
    setUser(null);
    setCandidates([]);
    setQuery("");
  };

  const closeDetail = () => {
    detailRequestId.current += 1;
    setDetailCandidate(null);
    setDetailStatus("idle");
    setDetailError("");
    setPaperwork(EMPTY_PAPERWORK);
  };

  const handleViewDetail = async (candidate) => {
    const requestId = detailRequestId.current + 1;
    detailRequestId.current = requestId;
    setDetailCandidate(candidate);
    setDetailStatus("loading");
    setDetailError("");
    setPaperwork(EMPTY_PAPERWORK);

    try {
      const fullCandidate = await getCandidate(candidate.id);
      if (detailRequestId.current !== requestId) return;

      setDetailCandidate(fullCandidate);
      setDetailStatus("ready");

      if (!fullCandidate.papeleria) return;

      setPaperwork({ ...EMPTY_PAPERWORK, status: "loading" });
      try {
        const { blob, filename } = await getCandidatePaperwork(fullCandidate.papeleria);
        if (detailRequestId.current !== requestId) return;
        setPaperwork({ status: "ready", error: "", url: URL.createObjectURL(blob), type: blob.type, filename });
      } catch (error) {
        if (detailRequestId.current !== requestId) return;
        setPaperwork({ ...EMPTY_PAPERWORK, status: "error", error: getErrorMessage(error, "No pudimos cargar la documentación.") });
      }
    } catch (error) {
      if (detailRequestId.current !== requestId) return;
      setDetailStatus("error");
      setDetailError(getErrorMessage(error, "No pudimos cargar el detalle de la solicitud."));
    }
  };

  const handleDelete = async (candidate) => {
    const confirmed = window.confirm(`¿Eliminar la solicitud de ${candidate.nombreCompleto}? Esta acción no se puede deshacer.`);
    if (!confirmed) return;

    setDeletingId(candidate.id);
    setListError("");

    try {
      await removeCandidate(candidate.id);
      setCandidates((current) => current.filter((item) => item.id !== candidate.id));
      if (detailCandidate?.id === candidate.id) closeDetail();
    } catch (error) {
      setListError(getErrorMessage(error, "No pudimos eliminar la solicitud."));
    } finally {
      setDeletingId("");
    }
  };

  const markCandidateAsAccepted = (candidateId) => {
    setAcceptedCandidateIds((current) => {
      const next = current.includes(candidateId) ? current : [...current, candidateId];
      localStorage.setItem(ACCEPTED_CANDIDATES_KEY, JSON.stringify(next));
      return next;
    });
  };

  const handleAccept = async (candidate) => {
    if (acceptedCandidateIds.includes(candidate.id)) return;

    const confirmed = window.confirm(`¿Aceptar a ${candidate.nombreCompleto} e importar sus datos en Coopya?`);
    if (!confirmed) return;

    setAcceptingId(candidate.id);
    setAcceptanceError({ id: "", message: "" });
    setAcceptanceMessage({ id: "", message: "" });

    try {
      const fullCandidate = await getCandidate(candidate.id);
      const result = await importAcceptedPerson(buildExternalPerson(fullCandidate));
      const importedPerson = result.resultados?.[0];
      const operation = importedPerson?.operacion?.toLowerCase() || "importación";
      const oracleOperation = result.oracle?.operacion?.toLowerCase();

      if (!result.oracle) {
        throw new Error("El endpoint de aceptación no devolvió la confirmación de Oracle. Verificá que Vercel haya publicado la función más reciente.");
      }

      if (!result.oracle.confirmed || !result.oracle.idPersona || !oracleOperation) {
        throw new Error(result.oracle.detail || "Oracle no confirmó la creación de la persona. La solicitud sigue pendiente.");
      }

      markCandidateAsAccepted(candidate.id);
      setAcceptanceMessage({
        id: candidate.id,
        message: `Persona aceptada: ${operation}${oracleOperation ? ` · Oracle: ${oracleOperation}.` : "."}`,
      });
    } catch (error) {
      setAcceptanceError({ id: candidate.id, message: getErrorMessage(error, "No pudimos aceptar la solicitud.") });
    } finally {
      setAcceptingId("");
    }
  };

  if (checkingSession) {
    return <main className="admin-page"><p className="admin-loading">Cargando panel administrativo...</p></main>;
  }

  if (!user) {
    return (
      <main className="admin-page">
        <section className="admin-login-card">
          <span className="admin-eyebrow">Administración</span>
          <h1>Solicitudes de adelanto</h1>
          <p>Ingresá con tu usuario administrador para consultar las postulaciones.</p>

          <form onSubmit={handleLogin} className="admin-login-form">
            <label htmlFor="admin-email">Mail</label>
            <input
              id="admin-email"
              type="email"
              autoComplete="username"
              value={credentials.email}
              onChange={(event) => setCredentials((current) => ({ ...current, email: event.target.value }))}
              required
            />

            <label htmlFor="admin-password">Contraseña</label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={credentials.password}
              onChange={(event) => setCredentials((current) => ({ ...current, password: event.target.value }))}
              required
            />

            {loginError && <p className="admin-error" role="alert">{loginError}</p>}
            <button type="submit">Ingresar</button>
          </form>
        </section>
      </main>
    );
  }

  const detailProduct = detailCandidate?.productoSeleccionado || {};
  const isPdf = paperwork.type === "application/pdf" || /\.pdf$/i.test(paperwork.filename);

  return (
    <main className="admin-page">
      <section className="admin-dashboard">
        <header className="admin-header">
          <div>
            <span className="admin-eyebrow">Panel administrativo</span>
            <h1>Solicitudes de adelanto</h1>
            <p>{user.nombre} · {candidates.length} solicitudes registradas</p>
          </div>
          <div className="admin-header-actions">
            <button type="button" className="admin-secondary-button" onClick={loadCandidates} disabled={loadingCandidates}>
              {loadingCandidates ? "Actualizando..." : "Actualizar"}
            </button>
            <button type="button" className="admin-logout-button" onClick={handleLogout}>Salir</button>
          </div>
        </header>

        <div className="admin-toolbar">
          <input
            type="search"
            placeholder="Buscar por nombre, DNI o mail"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <span>{filteredCandidates.length} resultados</span>
        </div>

        {listError && <p className="admin-error admin-list-error" role="alert">{listError}</p>}

        <div className="admin-table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Persona</th>
                <th>Contacto</th>
                <th>Situación</th>
                <th>Ingreso</th>
                <th>Producto</th>
                <th>Fecha</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {loadingCandidates ? (
                <tr><td colSpan="7" className="admin-empty">Cargando solicitudes...</td></tr>
              ) : filteredCandidates.length === 0 ? (
                <tr><td colSpan="7" className="admin-empty">No hay solicitudes para mostrar.</td></tr>
              ) : filteredCandidates.map((candidate) => {
                const product = candidate.productoSeleccionado || {};
                const wasAccepted = acceptedCandidateIds.includes(candidate.id);
                return (
                  <tr key={candidate.id}>
                    <td>
                      <strong>{candidate.nombreCompleto}</strong>
                      <span>DNI {candidate.dni}</span>
                    </td>
                    <td>
                      <span>{candidate.email}</span>
                      <span>{candidate.telefono}</span>
                    </td>
                    <td>
                      <span>{employmentLabels[candidate.situacionLaboral] || candidate.situacionLaboral}</span>
                      <span>{candidate.edad} años</span>
                    </td>
                    <td>{formatCurrency(candidate.ingresoMensual)}</td>
                    <td>
                      <strong>{product.familia || "Sin producto"}</strong>
                      <span>{formatCurrency(product.monto)} · {product.plazoMeses} meses</span>
                    </td>
                    <td>{formatDate(candidate.fechaCreacion)}</td>
                    <td>
                      <div className="admin-row-actions">
                        <button type="button" className="admin-detail-button" onClick={() => handleViewDetail(candidate)}>
                          Ver detalle
                        </button>
                        {wasAccepted ? (
                          <span className="admin-accepted-status">Persona aceptada</span>
                        ) : (
                          <button
                            type="button"
                            className="admin-accept-button"
                            onClick={() => handleAccept(candidate)}
                            disabled={acceptingId === candidate.id}
                          >
                            {acceptingId === candidate.id ? "Aceptando..." : "Aceptar persona"}
                          </button>
                        )}
                        <button
                          type="button"
                          className="admin-delete-button"
                          onClick={() => handleDelete(candidate)}
                          disabled={deletingId === candidate.id}
                        >
                          {deletingId === candidate.id ? "Eliminando..." : "Eliminar"}
                        </button>
                        {acceptanceMessage.id === candidate.id && <span className="admin-action-success">{acceptanceMessage.message}</span>}
                        {acceptanceError.id === candidate.id && <span className="admin-action-error">{acceptanceError.message}</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {detailCandidate && (
        <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeDetail()}>
          <section className="admin-detail-modal" role="dialog" aria-modal="true" aria-labelledby="detail-title">
            <header className="admin-detail-header">
              <div>
                <span className="admin-eyebrow">Detalle de solicitud</span>
                <h2 id="detail-title">{detailCandidate.nombreCompleto}</h2>
              </div>
              <button className="admin-modal-close" type="button" onClick={closeDetail} aria-label="Cerrar detalle">×</button>
            </header>

            {detailStatus === "loading" ? (
              <p className="admin-detail-loading">Cargando información de la solicitud...</p>
            ) : detailStatus === "error" ? (
              <p className="admin-error" role="alert">{detailError}</p>
            ) : (
              <>
                <dl className="admin-detail-grid">
                  <div><dt>DNI</dt><dd>{detailCandidate.dni}</dd></div>
                  <div><dt>Fecha</dt><dd>{formatDate(detailCandidate.fechaCreacion)}</dd></div>
                  <div><dt>Mail</dt><dd>{detailCandidate.email}</dd></div>
                  <div><dt>Teléfono</dt><dd>{detailCandidate.telefono}</dd></div>
                  <div className="admin-detail-wide"><dt>Dirección</dt><dd>{detailCandidate.direccion}</dd></div>
                  <div><dt>Género</dt><dd>{genderLabels[detailCandidate.genero] || detailCandidate.genero}</dd></div>
                  <div><dt>Edad</dt><dd>{detailCandidate.edad} años</dd></div>
                  <div><dt>Situación laboral</dt><dd>{employmentLabels[detailCandidate.situacionLaboral] || detailCandidate.situacionLaboral}</dd></div>
                  <div><dt>Ingreso mensual</dt><dd>{formatCurrency(detailCandidate.ingresoMensual)}</dd></div>
                  <div className="admin-detail-wide"><dt>Bancos seleccionados</dt><dd>{detailCandidate.bancosSeleccionados?.join(", ") || "No informado"}</dd></div>
                </dl>

                <section className="admin-detail-product">
                  <span>Producto seleccionado</span>
                  <strong>{detailProduct.familia || "Sin producto"} · {detailProduct.plan || "Sin plan"}</strong>
                  <p>{formatCurrency(detailProduct.monto)} · {detailProduct.plazoMeses} meses</p>
                </section>

                <section className="admin-paperwork" aria-labelledby="paperwork-title">
                  <div className="admin-paperwork-heading">
                    <div>
                      <span className="admin-eyebrow">Documentación</span>
                      <h3 id="paperwork-title">Recibo de sueldo</h3>
                    </div>
                    {paperwork.status === "ready" && (
                      <a className="admin-download-button" href={paperwork.url} download={paperwork.filename}>
                        Descargar
                      </a>
                    )}
                  </div>

                  {!detailCandidate.papeleria && <p className="admin-paperwork-empty">Esta solicitud se continuó por WhatsApp o no tiene documentación adjunta.</p>}
                  {paperwork.status === "loading" && <p className="admin-detail-loading">Cargando documentación...</p>}
                  {paperwork.status === "error" && <p className="admin-error" role="alert">{paperwork.error}</p>}
                  {paperwork.status === "ready" && (
                    <div className="admin-paperwork-preview">
                      {isPdf ? (
                        <iframe src={paperwork.url} title={`Vista previa de ${paperwork.filename}`} />
                      ) : (
                        <img src={paperwork.url} alt={`Recibo de sueldo: ${paperwork.filename}`} />
                      )}
                    </div>
                  )}
                </section>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
