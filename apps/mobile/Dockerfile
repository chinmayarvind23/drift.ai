FROM node:22-bookworm

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps/mobile ./apps/mobile

RUN npm install

EXPOSE 8081

CMD ["npm", "run", "dev", "--workspace", "@drift/mobile", "--", "--tunnel"]
