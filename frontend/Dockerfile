FROM node:22-alpine AS build
WORKDIR /app

ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL

COPY package.json package-lock.json tsconfig.base.json ./
COPY contracts/package.json contracts/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci

COPY contracts contracts
COPY frontend frontend
RUN npm run build -w @trading-dashboard/contracts
RUN npm run build -w @trading-dashboard/frontend

FROM nginx:alpine AS runtime
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html
EXPOSE 8080
