# Base image
FROM alpine:3.14.2 AS base
MAINTAINER Frank Bille-Stauner <jotajoti@frankbille.dk>

RUN apk add --no-cache nodejs-current npm

WORKDIR /jid-server

COPY package*.json ./


# ##############
# Builder image
# ##############
FROM base AS builder

RUN apk add --no-cache python2 build-base

# install node packages
RUN npm set progress=false && npm config set depth 0
RUN npm ci --only=production
# copy production node_modules aside
RUN cp -R node_modules prod_node_modules
# install ALL node_modules, including 'devDependencies'
RUN npm install

# Build app
COPY app app
COPY .babelrc .
RUN npm run build
RUN ls -l build
RUN cat build/app.js


# ##############
# Release image
# ##############

FROM base AS release

RUN apk add --no-cache bash

COPY --from=builder /jid-server/prod_node_modules node_modules
COPY --from=builder /jid-server/build build
COPY migrations /jid-server/migrations

EXPOSE 4000

CMD ["npm", "run", "start:dist"]
