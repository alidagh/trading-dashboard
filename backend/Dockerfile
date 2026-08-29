FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY contracts/package.json contracts/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci

COPY contracts contracts
COPY backend backend
RUN npm run build -w @trading-dashboard/contracts
RUN npm run build -w @trading-dashboard/backend

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY contracts/package.json contracts/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci --omit=dev --workspace @trading-dashboard/backend --include-workspace-root

COPY --from=build /app/contracts/dist contracts/dist
COPY --from=build /app/backend/dist backend/dist

USER node
EXPOSE 3000
CMD ["node", "backend/dist/main.js"]
