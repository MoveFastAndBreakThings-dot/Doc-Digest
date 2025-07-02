# Use official Node.js image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies first (for better caching)
COPY ../backend-api/package.json ../backend-api/package-lock.json ./
RUN npm install --production

# Copy the rest of the backend code
COPY ../backend-api .

# Expose the backend port
EXPOSE 3001

# Set environment variables (can be overridden at runtime)
ENV NODE_ENV=production

# Start the server
CMD ["npx", "nodemon", "server.js"]
