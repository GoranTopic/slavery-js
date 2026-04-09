FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --ignore-scripts
COPY src/ ./src/
COPY tsconfig.json ./
COPY test/e2e/entrypoint.ts ./test/e2e/entrypoint.ts
CMD ["npx", "tsx", "test/e2e/entrypoint.ts"]
