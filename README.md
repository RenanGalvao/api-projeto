# projetoumportodostodosporum.org's API

## Dependencies

- [Node.js 18.x](https://nodejs.org/en/download/)
- [Docker with Docker Compose](https://docs.docker.com/get-docker/)

## Installation

```bash
$ npm install
```

## Running the app

```bash
# watch mode
$ npm run start:dev

# production mode (needs .env file in root folder)
$ npm run start:prod
```

## Documentation

```
Access /doc at API's url (localhost:3000/doc on dev)
```

## Test

```bash
# integration tests
$ npm run test:int

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:int:cov
$ npm run test:e2e:cov
```
