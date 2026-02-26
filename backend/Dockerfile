FROM node:20

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

# Generate Prisma Client
RUN npx prisma generate

RUN npm run build

EXPOSE 3000

CMD sh -c "npx prisma db push && node dist/src/main"
