FROM node:18-alpine

WORKDIR /app

COPY ../frontend/cs/package.json ../frontend/cs/package-lock.json ./
RUN npm install

COPY ../frontend/cs .

EXPOSE 5173
CMD ["npm", "run", "dev"]
