FROM node:22-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build && npm prune --omit=dev

ENV NODE_ENV=production
ENV PORT=3001
ENV MEDIHOME_HOST=0.0.0.0
EXPOSE 3001

CMD ["node", "server/index.mjs"]
