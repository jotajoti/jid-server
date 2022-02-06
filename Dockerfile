FROM node:lts as build

# Create app directory
WORKDIR /build

# Install app dependencies
COPY package.json ./
COPY yarn.lock ./
COPY .yarn ./
COPY .yarnrc.yml ./

RUN yarn install --immutable

COPY app app
COPY jsconfig.json jsconfig.json
COPY .babelrc .babelrc
RUN yarn build

# Bundle app source
FROM node:lts as production
LABEL org.opencontainers.image.source=https://github.com/jotajoti/jid-server

WORKDIR /usr/src/app

COPY --from=build /build/node_modules node_modules
COPY --from=build /build/build build
COPY migrations migrations

ENV port=8080
EXPOSE 8080
CMD [ "node", "build/app.js" ]
