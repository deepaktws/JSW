FROM node:20-alpine

WORKDIR /app

# bcrypt native bindings + Prisma/OpenSSL on Alpine
RUN apk add --no-cache openssl libc6-compat python3 make g++

COPY package.json package-lock.json* ./
COPY prisma ./prisma/

RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY . .

RUN npx prisma generate

RUN chmod +x docker-entrypoint.sh

EXPOSE 5050

ENV NODE_ENV=production

ENTRYPOINT ["./docker-entrypoint.sh"]
