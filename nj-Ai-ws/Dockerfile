# Worker de WhatsApp para Render. Chromium del sistema + Node 20.
FROM node:20-bookworm-slim

# Chromium y las librerías que necesita whatsapp-web.js (puppeteer) en Linux.
RUN apt-get update && apt-get install -y --no-install-recommends \
      chromium \
      ca-certificates \
      fonts-liberation \
      fonts-noto-color-emoji \
      libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 \
      libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2 \
      libpango-1.0-0 libcairo2 libatspi2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# No descargar el Chromium de puppeteer: usamos el del sistema.
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV CHROME_PATH=/usr/bin/chromium

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .

# Render inyecta PORT; el worker sirve ahí la página /qr para vincular.
EXPOSE 3000
CMD ["node", "whatsapp-worker.mjs"]
