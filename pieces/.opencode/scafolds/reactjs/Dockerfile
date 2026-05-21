FROM node:20-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci && npm cache clean --force
COPY . .
RUN npm run build
ENV NODE_ENV=production
CMD ["sh", "-c", "npx serve -s build -l $PORT"]
