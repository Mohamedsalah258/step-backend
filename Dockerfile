# build stage — بيثبت كل الـ deps (بما فيها dev) ويعمل nest build
FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# run stage — إنتاج بس، مع مكتبات Chromium اللي puppeteer محتاجها (تصدير PDF)
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates fonts-liberation libasound2 libatk-bridge2.0-0 libatk1.0-0 \
    libatspi2.0-0 libcups2 libdbus-1-3 libdrm2 libgbm1 libgtk-3-0 libnspr4 \
    libnss3 libx11-xcb1 libxcomposite1 libxdamage1 libxfixes3 libxkbcommon0 \
    libxrandr2 xdg-utils wget \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist

# مجلد رفع الملفات المحلي — لازم يتربط بـ PersistentVolumeClaim وقت التشغيل
# (شوف k8s/deployment.yaml) عشان الملفات متضيعش لو الـ pod اتعمله إعادة تشغيل
RUN mkdir -p /app/uploads

EXPOSE 3000
CMD ["node", "dist/main.js"]
