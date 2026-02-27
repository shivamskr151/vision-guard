FROM node:18-alpine

WORKDIR /usr/src/app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy the rest of the application
COPY . .

CMD ["node", "index.js"]
