FROM node:14-alpine3.14
LABEL org.opencontainers.image.source=https://github.com/jotajoti/jid-server

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json ./
COPY yarn.lock ./

RUN yarn install --frozen-lockfile

# Bundle app source
COPY build build
COPY migrations migrations

ENV port=8080
EXPOSE 8080
CMD [ "node", "build/app.js" ]
