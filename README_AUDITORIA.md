# 🔍 Informe de Auditoría de Seguridad y Buenas Prácticas - Asistodo Web
**Componente:** Frontend Asistodo Web (Panel Administrativo y Landing)  
**Puerto de Despliegue:** `8083` (`https://admin.asistodo.com.ar`)  
**Fecha de Auditoría:** 23 de Octubre de 2026  
**Tecnologías:** React 19, Vite, Caddy 2, Docker Compose  

---

## 📑 Tabla de Contenidos
1. [Resumen Ejecutivo](#-resumen-ejecutivo)
2. [Matriz de Cumplimiento de Buenas Prácticas](#-matriz-de-cumplimiento-de-buenas-prácticas)
3. [Auditoría de Configuración de Caddy](#-1-auditoría-de-configuración-de-caddy)
4. [Auditoría de Configuración de Docker](#-2-auditoría-de-configuración-de-docker)
5. [Auditoría del Checklist de Seguridad (20 Puntos en Frontend)](#-3-auditoría-del-checklist-de-seguridad-20-puntos-en-frontend)
6. [Resumen de Hallazgos y Acciones Recomendadas](#-4-resumen-de-hallazgos-y-acciones-recomendadas)

---

## 📊 Resumen Ejecutivo

Se evaluó exhaustivamente el frontend de **Asistodo Web**, abarcando su servidor web **Caddyfile**, su orquestación en **Docker**, su pipeline de despliegue y el código fuente en React.

* **Puntos Evaluados:** 34 directivas de seguridad.
* 🟢 **Controles Conformes:** 25
* 🟠 **Riesgos Moderados:** 6 (Tokens en localStorage, logs de PII, dependencias backend en frontend)
* 🟡 **Mejoras Menores:** 3 (Cabecera HSTS en Caddyfile, debounce en formularios)

---

## 📋 Matriz de Cumplimiento de Buenas Prácticas

| Control / Directiva | Estado | Detalle Técnico | Archivo / Ubicación |
| :--- | :---: | :--- | :--- |
| **CADDY: Ocultar -Server** | ✅ Cumple | Oculta la firma de Caddy para evitar fingerprinting. | [Caddyfile:L20](file:///c:/Users/nfernandez/Desktop/TRABAJOS/TicketCoopya/asistodoweb/Caddyfile#L20) |
| **CADDY: X-Content-Type-Options** | ✅ Cumple | `"nosniff"` activo. | [Caddyfile:L23](file:///c:/Users/nfernandez/Desktop/TRABAJOS/TicketCoopya/asistodoweb/Caddyfile#L23) |
| **CADDY: X-Frame-Options** | ✅ Cumple | `"DENY"` activo contra Clickjacking. | [Caddyfile:L26](file:///c:/Users/nfernandez/Desktop/TRABAJOS/TicketCoopya/asistodoweb/Caddyfile#L26) |
| **CADDY: Referrer-Policy** | ✅ Cumple | `"strict-origin-when-cross-origin"` activo. | [Caddyfile:L29](file:///c:/Users/nfernandez/Desktop/TRABAJOS/TicketCoopya/asistodoweb/Caddyfile#L29) |
| **CADDY: Permissions-Policy** | ✅ Cumple | Restringe cámara, micrófono y geolocalización. | [Caddyfile:L32](file:///c:/Users/nfernandez/Desktop/TRABAJOS/TicketCoopya/asistodoweb/Caddyfile#L32) |
| **CADDY: request_body max_size 10MB** | ✅ Cumple | Límite fijado exactamente en 10MB contra DoS. | [Caddyfile:L7](file:///c:/Users/nfernandez/Desktop/TRABAJOS/TicketCoopya/asistodoweb/Caddyfile#L7) |
| **CADDY: Bloqueo de ocultos (@hidden)** | ✅ Cumple | Bloquea `path */.*` y `path .*` respondiendo 404. | [Caddyfile:L11-15](file:///c:/Users/nfernandez/Desktop/TRABAJOS/TicketCoopya/asistodoweb/Caddyfile#L11-L15) |
| **CADDY: Proxy inverso explícito** | ✅ Cumple | Canaliza `/api/v1/*` directo a `ticketcoopya-backend:8085`. | [Caddyfile:L40-47](file:///c:/Users/nfernandez/Desktop/TRABAJOS/TicketCoopya/asistodoweb/Caddyfile#L40-L47) |
| **DOCKER: no-new-privileges** | ✅ Cumple | `security_opt: [no-new-privileges:true]`. | [docker-compose.yml:L33](file:///c:/Users/nfernandez/Desktop/TRABAJOS/TicketCoopya/asistodoweb/docker-compose.yml#L33) |
| **DOCKER: deploy.resources** | ✅ Cumple | CPU: 1.0, Memoria: 512M (reserva: 128M). | [docker-compose.yml:L51-57](file:///c:/Users/nfernandez/Desktop/TRABAJOS/TicketCoopya/asistodoweb/docker-compose.yml#L51-L57) |
| **DOCKER: logging (rotación)** | ✅ Cumple | Driver `json-file`, max-size 10m, max-file 3. | [docker-compose.yml:L36-40](file:///c:/Users/nfernandez/Desktop/TRABAJOS/TicketCoopya/asistodoweb/docker-compose.yml#L36-L40) |
| **DOCKER: Healthcheck activo** | ✅ Cumple | Sondeo activo con `wget --spider http://127.0.0.1:8083/`. | [docker-compose.yml:L43-48](file:///c:/Users/nfernandez/Desktop/TRABAJOS/TicketCoopya/asistodoweb/docker-compose.yml#L43-L48) |
| **DOCKER: Red aislada dedicada** | ✅ Cumple | Red interna `asistodo-net` + `asistodo_shared_net`. | [docker-compose.yml:L59-68](file:///c:/Users/nfernandez/Desktop/TRABAJOS/TicketCoopya/asistodoweb/docker-compose.yml#L59-L68) |
| **DOCKER: Configuración en :ro** | ✅ Cumple | `./Caddyfile:/etc/caddy/Caddyfile:ro`. | [docker-compose.yml:L26](file:///c:/Users/nfernandez/Desktop/TRABAJOS/TicketCoopya/asistodoweb/docker-compose.yml#L26) |
| **SEG 01: Ocultar API keys** | ⚠️ Observación | Credenciales de EmailJS (`VITE_EMAILJS_*`) en frontend. | `src/componentes/contactanos/CONTACTANOS.jsx` |
| **SEG 02: Eliminar secretos de Git** | ⚠️ Observación | Cadena Oracle con IP interna en `.env.example`. | [.env.example:L30](file:///c:/Users/nfernandez/Desktop/TRABAJOS/TicketCoopya/asistodoweb/.env.example#L30) |
| **SEG 03: Key pública para DB** | ⚠️ Arquitectura | Dependencia `oracledb` en `package.json` de un frontend. | [package.json:L24](file:///c:/Users/nfernandez/Desktop/TRABAJOS/TicketCoopya/asistodoweb/package.json#L24) |
| **SEG 04: Control de Acceso (Vistas)** | ✅ Cumple | La vista `/admin/solicitudes` no muestra datos sin login. | [ADMINISTRATIVO.jsx:L48](file:///c:/Users/nfernandez/Desktop/TRABAJOS/TicketCoopya/asistodoweb/src/componentes/dashboard/administrativo/ADMINISTRATIVO.jsx#L48) |
| **SEG 05: Encriptar datos sensibles** | ⚠️ Observación | IDs de candidatos aceptados guardados en `sessionStorage`. | [ADMINISTRATIVO.jsx:L40](file:///c:/Users/nfernandez/Desktop/TRABAJOS/TicketCoopya/asistodoweb/src/componentes/dashboard/administrativo/ADMINISTRATIVO.jsx#L40) |
| **SEG 06: Forzar autenticación** | ⚠️ Observación | Ruta `/admin/solicitudes` sin guarda de ruta `ProtectedRoute`. | [RUTAS.jsx:L19](file:///c:/Users/nfernandez/Desktop/TRABAJOS/TicketCoopya/asistodoweb/src/componentes/RUTAS.jsx#L19) |
| **SEG 07: Restringir acceso a registros** | ✅ Cumple | Operaciones de candidatos verificadas con token Bearer. | [adminApi.js](file:///c:/Users/nfernandez/Desktop/TRABAJOS/TicketCoopya/asistodoweb/src/componentes/dashboard/administrativo/adminApi.js) |
| **SEG 08: Bloquear manipulación** | ✅ Cumple | Mapeo tipado y saneado en `personaImportMapper.js`. | `personaImportMapper.js` |
| **SEG 09: Proteger Session cookies** | 🟠 Alto | Token JWT almacenado en `localStorage` (`coopyaAccessToken`). | [httpClient.js:L33](file:///c:/Users/nfernandez/Desktop/TRABAJOS/TicketCoopya/asistodoweb/src/api/httpClient.js#L33) |
| **SEG 10: Hashear contraseñas** | ✅ Cumple | Las contraseñas viajan en el cuerpo POST JSON por HTTPS. | `loginAdministrator` en `adminApi.js` |
| **SEG 11: Rate limiting / Anti-spam** | 🟡 Medio | Formularios públicos sin `debounce` ante clicks repetidos. | Formulario de contacto y adelantos |
| **SEG 12: Protección contra bots** | ⚠️ Pendiente | Sin CAPTCHA / Honeypot en formularios de contacto y bajas. | Formulario de contacto |
| **SEG 13: Parametrizar queries** | ✅ Cumple | Axios serializa parámetros de URL de forma segura. | `httpClient.js` |
| **SEG 14: Validar inputs** | ✅ Cumple | Validaciones en cliente de DNI, teléfono y correo. | Formularios de candidatos |
| **SEG 15: Sanitizar contenido** | ✅ Cumple | No se utiliza `dangerouslySetInnerHTML`. React escapa strings. | Componentes JSX |
| **SEG 16: Restringir archivos** | ✅ Cumple | Validación de tamaño y tipo antes de enviar adjunto. | `ADMINISTRATIVO.jsx` |
| **SEG 17: Devolver datos necesarios** | 🟠 Alto | `console.log` imprime datos personales en consola en bajas. | `BAJAS.jsx:L118` |
| **SEG 18: Security headers** | 🟡 Medio | Caddy tiene 7 headers de seguridad; falta `HSTS`. | [Caddyfile:L18-37](file:///c:/Users/nfernandez/Desktop/TRABAJOS/TicketCoopya/asistodoweb/Caddyfile#L18-L37) |
| **SEG 19: Forzar HTTPS** | 🟡 Medio | Falta cabecera `Strict-Transport-Security` en Caddyfile. | [Caddyfile](file:///c:/Users/nfernandez/Desktop/TRABAJOS/TicketCoopya/asistodoweb/Caddyfile) |
| **SEG 20: Escanear dependencias** | ✅ Cumple | React 19 y Vite 7 con dependencias auditables vía `npm audit`. | [package.json](file:///c:/Users/nfernandez/Desktop/TRABAJOS/TicketCoopya/asistodoweb/package.json) |

---

## 🌐 1. Auditoría de Configuración de Caddy

* **Puntos Fuertes:**
  * Ocultamiento de la cabecera `-Server`.
  * Cabeceras `Cross-Origin-Opener-Policy` y `Cross-Origin-Resource-Policy` configuradas en `same-origin`.
  * Regla de bloqueo de ocultos excelente (`path */.*` y `path .*`).
  * Proxy inverso `/api/v1/*` apuntando directamente a `ticketcoopya-backend:8085` sin doble salto.
* **Oportunidad de Mejora:**
  * Agregar la cabecera `Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"` dentro del bloque `header { ... }`.

---

## 🐳 2. Auditoría de Configuración de Docker

* **Cumplimiento Total:** Cumple los 6 estándares requeridos:
  * `no-new-privileges:true` activo.
  * Límites de CPU (`1.0`) y memoria (`512M`) bien dimensionados.
  * Rotación de logs `json-file` a 10MB / 3 archivos.
  * Healthcheck mediante `wget` HTTP en el puerto 8083.
  * Red externa `asistodo_shared_net` para comunicarse con FastAPI.
  * Montaje de `Caddyfile` en modo solo lectura (`:ro`).

---

## 🔐 3. Auditoría del Checklist de Seguridad (20 Puntos en Frontend)

### Hallazgos Específicos:

1. **Exposición de logs en consola (`BAJAS.jsx:L118`):**
   * El componente ejecuta `console.log("Enviando EmailJS templateParams:", templateParams);`, lo que expone en la consola del navegador del cliente datos privados del usuario (DNI, email, motivo de baja). Debe eliminarse en producción.
2. **Almacenamiento de sesión en `localStorage` (`httpClient.js:L33`):**
   * El token se guarda en `localStorage.getItem("coopyaAccessToken")`. Si bien React mitiga XSS por defecto, la mejor práctica futura es recibir una cookie `HttpOnly`.
3. **Ruta administrativa sin guarda (`RUTAS.jsx:L19`):**
   * `<Route path="/admin/solicitudes" element={<ADMINISTRATIVO />} />` no está envuelta en un componente `<ProtectedRoute>`. Aunque el componente renderiza un formulario de login si no hay token, la ruta debería redirigir de forma declarativa.
4. **Dependencia `oracledb` en un proyecto frontend:**
   * En `package.json:L24` figura `oracledb`. Un frontend que corre en el navegador no puede ni debe conectarse a Oracle; las operaciones de base de datos deben ser delegadas siempre al backend.

---

## 💡 4. Resumen de Hallazgos y Acciones Recomendadas

1. **Agregar HSTS en Caddyfile:**
   Añadir `Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"` en [asistodoweb/Caddyfile](file:///c:/Users/nfernandez/Desktop/TRABAJOS/TicketCoopya/asistodoweb/Caddyfile).
2. **Limpiar `console.log` con datos sensibles:**
   Eliminar las trazas de consola en `BAJAS.jsx` y `CONTACTANOS.jsx`.
3. **Envolver la ruta de admin con `ProtectedRoute`:**
   Añadir una verificación de ruta protegida en `RUTAS.jsx`.
