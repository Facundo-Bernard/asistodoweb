import { useEffect, useMemo, useState } from "react";
import { clearAccessToken, getAccessToken, saveAccessToken } from "../../../api/httpClient";
import { getCandidates, getCurrentUser, loginAdministrator, removeCandidate } from "./adminApi";
import "./ADMINISTRATIVO.css";

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

const getErrorMessage = (error, fallback) => error.response?.data?.detail || fallback;

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

  const handleDelete = async (candidate) => {
    const confirmed = window.confirm(`¿Eliminar la solicitud de ${candidate.nombreCompleto}? Esta acción no se puede deshacer.`);
    if (!confirmed) return;

    setDeletingId(candidate.id);
    setListError("");

    try {
      await removeCandidate(candidate.id);
      setCandidates((current) => current.filter((item) => item.id !== candidate.id));
    } catch (error) {
      setListError(getErrorMessage(error, "No pudimos eliminar la solicitud."));
    } finally {
      setDeletingId("");
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
                      <span>{candidate.situacionLaboral}</span>
                      <span>{candidate.edad} años</span>
                    </td>
                    <td>{formatCurrency(candidate.ingresoMensual)}</td>
                    <td>
                      <strong>{product.familia || "Sin producto"}</strong>
                      <span>{formatCurrency(product.monto)} · {product.plazoMeses} meses</span>
                    </td>
                    <td>{formatDate(candidate.fechaCreacion)}</td>
                    <td>
                      <button
                        type="button"
                        className="admin-delete-button"
                        onClick={() => handleDelete(candidate)}
                        disabled={deletingId === candidate.id}
                      >
                        {deletingId === candidate.id ? "Eliminando..." : "Eliminar"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
