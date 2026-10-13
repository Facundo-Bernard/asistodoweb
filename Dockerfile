# Etapa 1: Compilación de la aplicación React con Node.js
FROM node:22-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias limpias
RUN npm ci

# Copiar el resto del código
COPY . .

# Variables de entorno para el build de Vite
# Dejar VITE_API_BASE_URL vacío permite que las llamadas a la API sean relativas
# y pasen por el proxy de Caddy, evitando problemas de CORS en la red de la oficina.
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Compilar para producción
RUN npm run build

# Etapa 2: Servidor web con Caddy
FROM caddy:2-alpine

# Copiar la aplicación compilada
COPY --from=builder /app/dist /usr/share/caddy

# Copiar la configuración de Caddy
COPY Caddyfile /etc/caddy/Caddyfile

# Exponer el puerto configurado
EXPOSE 8083

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
