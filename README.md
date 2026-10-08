# waste-disposal-fee-frontend

[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_waste-disposal-fee-frontend&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=DEFRA_waste-disposal-fee-frontend) [![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_waste-disposal-fee-frontend&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=DEFRA_waste-disposal-fee-frontend) [![Coverage](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_waste-disposal-fee-frontend&metric=coverage)](https://sonarcloud.io/summary/new_code?id=DEFRA_waste-disposal-fee-frontend)

The Node.js frontend for the EPR waste disposal fees, running on the Core Delivery Platform (CDP). It will replace the .NET [epr-calculator-frontend](https://github.com/DEFRA/epr-calculator-frontend).

Users sign in with Entra ID. The frontend calls the [Calculator API](https://github.com/DEFRA/epr-calculator-api) on Azure with the signed-in user's token. Today it shows the dashboard of calculation runs.

Built from the [CDP Node.js frontend template](https://github.com/DEFRA/cdp-node-frontend-template).

- [Requirements](#requirements)
  - [Node.js](#nodejs)
- [Server-side Caching](#server-side-caching)
- [Redis](#redis)
- [Local Development](#local-development)
  - [Setup](#setup)
  - [Development](#development)
  - [Production](#production)
  - [Npm scripts](#npm-scripts)
  - [Update dependencies](#update-dependencies)
  - [Formatting](#formatting)
    - [Windows prettier issue](#windows-prettier-issue)
- [Docker](#docker)
  - [Development image](#development-image)
  - [Production image](#production-image)
  - [Docker Compose](#docker-compose)
  - [Dependabot](#dependabot)
  - [SonarCloud](#sonarcloud)
- [Licence](#licence)
  - [About the licence](#about-the-licence)

## Requirements

### Node.js

Use the Node.js version in [.nvmrc](./.nvmrc), with a version manager such as [fnm](https://github.com/Schniz/fnm) or [nvm](https://github.com/creationix/nvm):

```bash
cd waste-disposal-fee-frontend
fnm use # or: nvm use
```

> [!IMPORTANT]
> Node.js 25.2 and other versions without support for `#/` import paths fail with `ERR_INVALID_MODULE_SPECIFIER`.

## Server-side Caching

We use Catbox for server-side caching. By default the service will use CatboxRedis when deployed and CatboxMemory for local development. You can override the default behaviour by setting the `SESSION_CACHE_ENGINE` environment variable to either `redis` or `memory`.

Please note: CatboxMemory (`memory`) is _not_ suitable for production use! The cache will not be shared between each instance of the service and it will not persist between restarts.

## Redis

Redis is an in-memory key-value store. Every instance of a service has access to the same Redis key-value store similar to how services might have a database (or MongoDB). All frontend services are given access to a namespaced prefixed that matches the service name. e.g. `my-service` will have access to everything in Redis that is prefixed with `my-service`.

The session, which holds the signed-in user's tokens, is always stored in the cache, never in the cookie.

## Proxy

We are using forward-proxy which is set up by default. Services are automatically configured with the proxy environment variables when deployed.

Node.js 24 uses these variables to route outbound HTTP(S) requests through the proxy:

NODE_USE_ENV_PROXY=1 HTTPS_PROXY=... NO_PROXY=...

No additional proxy configuration is required in the service. Each domain the service calls must be on its proxy allowlist.

## Local Development

### Setup

Install application dependencies:

```bash
npm install
```

Create your local settings, then fill in the Entra ID values as described in the file:

```bash
cp .env.example .env
```

Signing in locally needs HTTPS, and calling the Calculator API running locally needs this app to trust the API's .NET development certificate. To set both up, once:

```bash
brew install mkcert
npm run setup:certs
npm run setup:api-cert
```

See [local development](./docs/local-development.md) for details and troubleshooting.

### Git hooks

Install git hooks (optional)

```bash
npm run setup:husky
```

### Development

To run the application in `development` mode run:

```bash
npm run dev
```

Then open <https://localhost:7163>. To check the app can reach the Calculator API, without signing in, open
<https://localhost:7163/check-api-connection>.

### Production

To mimic the application running in `production` mode locally run:

```bash
npm start
```

### Npm scripts

All available Npm scripts can be seen in [package.json](./package.json) To view them in your command line run:

```bash
npm run
```

### Update dependencies

To update dependencies use [npm-check-updates](https://github.com/raineorshine/npm-check-updates):

> The following script is a good start. Check out all the options on the [npm-check-updates](https://github.com/raineorshine/npm-check-updates)

```bash
ncu --interactive --format group
```

### Formatting

#### Windows prettier issue

If you are having issues with formatting of line breaks on Windows update your global git config by running:

```bash
git config --global core.autocrlf false
```

## Docker

### Development image

> [!TIP]
> For Apple Silicon users, you may need to add `--platform linux/amd64` to the `docker run` command to ensure compatibility fEx: `docker build --platform=linux/arm64 --no-cache --tag waste-disposal-fee-frontend`

Build:

```bash
docker build --target development --no-cache --tag waste-disposal-fee-frontend:development .
```

Run:

```bash
docker run -p 3000:3000 waste-disposal-fee-frontend:development
```

### Production image

Build:

```bash
docker build --no-cache --tag waste-disposal-fee-frontend .
```

Load your environment config, then run:

```bash
docker run -p 3000:3000 waste-disposal-fee-frontend
```

The image doesn't include `.env`. In production, the app won't start without mandatory config. For example `SESSION_COOKIE_PASSWORD`.

### Docker Compose

A local environment with:

- Floci (replacing Localstack) for AWS services (S3, SQS)
- Redis
- MongoDB
- This service.
- A commented out backend example.

```bash
docker compose up --build -d
```

### Dependabot

Dependabot checks npm packages and GitHub Actions weekly, as configured in [.github/dependabot.yml](.github/dependabot.yml).

### SonarCloud

The GitHub workflows run a SonarCloud scan, using [sonar-project.properties](./sonar-project.properties). It needs the `SONAR_TOKEN` repository secret.

## Licence

THIS INFORMATION IS LICENSED UNDER THE CONDITIONS OF THE OPEN GOVERNMENT LICENCE found at:

<http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3>

The following attribution statement MUST be cited in your products and applications when using this information.

> Contains public sector information licensed under the Open Government license v3

### About the licence

The Open Government Licence (OGL) was developed by the Controller of Her Majesty's Stationery Office (HMSO) to enable information providers in the public sector to license the use and re-use of their information under a common open licence.

It is designed to encourage use and re-use of information freely and flexibly, with only a few conditions.
