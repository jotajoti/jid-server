FROM node:14-alpine3.14 as build

# Create app directory
WORKDIR /build

# Install app dependencies
COPY package.json ./
COPY yarn.lock ./

RUN yarn install --frozen-lockfile

COPY app app
COPY jsconfig.json jsconfig.json
COPY .babelrc .babelrc
RUN yarn build

# Bundle app source
FROM node:14-alpine3.14 as production
LABEL org.opencontainers.image.source=https://github.com/jotajoti/jid-server

WORKDIR /usr/src/app

COPY --from=build /build/node_modules node_modules
COPY --from=build /build/build build
COPY migrations migrations

ENV port=8080
EXPOSE 8080
CMD [ "node", "build/app.js" ]
