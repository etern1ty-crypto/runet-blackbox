FROM node:24-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund
COPY --chown=node:node cli ./cli
COPY --chown=node:node src ./src
COPY --chown=node:node packs ./packs
COPY --chown=node:node schemas ./schemas
COPY --chown=node:node config.example.json LICENSE ./
USER node
ENTRYPOINT ["node", "cli/bin/runet-blackbox.js"]
CMD ["preflight", "--config", "config.example.json", "--json"]
