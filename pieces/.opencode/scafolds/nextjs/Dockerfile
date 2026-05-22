FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install && npm cache clean --force
COPY . .
RUN TURBOPACK=0 npm run build
ENV NODE_ENV=production
CMD ["sh", "-c", "npx next start -p $PORT"]
