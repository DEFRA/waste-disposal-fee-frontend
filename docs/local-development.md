# Local development

## What you need

| Tool                                                                    | Why                                                               |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Node.js 24.14.1, with [fnm](https://github.com/Schniz/fnm) or nvm       | The version in [`.nvmrc`](../.nvmrc), the same as on CDP          |
| [mkcert](https://github.com/FiloSottile/mkcert) (`brew install mkcert`) | A trusted certificate, so the app can run on HTTPS                |
| The Calculator API, running locally                                     | Something to call. See [below](#calling-the-api-locally)          |
| Access to an Entra ID app registration                                  | To sign in. See [below](#entra-id)                                |
| .NET SDK                                                                | Only to run the API from source, and for `npm run setup:api-cert` |

### Node.js version

Use 24.14.1. Some other versions, including 25.2, fail on start-up:

```text
TypeError [ERR_INVALID_MODULE_SPECIFIER]: Invalid module "#/server/common/helpers/start-server.js" is not a valid internal imports specifier name
```

The `#/` import paths need a recent Node.js. To switch automatically when you `cd` into the repo, set up fnm with `--use-on-cd`:

```sh
# fish: ~/.config/fish/conf.d/fnm.fish
fnm env --use-on-cd --shell fish | source

# zsh: ~/.zshrc
eval "$(fnm env --use-on-cd --shell zsh)"
```

Then `fnm install` in the repo. Check with `node -v`.

## First-time setup

```sh
npm install
cp .env.example .env     # then fill it in, see below
npm run setup:certs      # local HTTPS certificate, asks for your password once
```

If you run the API from source on HTTPS, also run `npm run setup:api-cert`. See [calling the API locally](#calling-the-api-locally).

## Running it

```sh
npm run dev
```

Open <https://localhost:7163>. You'll be sent to Microsoft to sign in, then back to the dashboard.

`npm run dev` restarts when files in `src/server` or `src/config` change. Sessions are kept in memory locally, so a restart signs you out. It doesn't restart for `.env` changes or installed packages, so restart it yourself. Views (`.njk`) and client assets reload without a restart.

To debug, attach a debugger to port 9229. `npm run dev` starts Node with `--inspect`. In VS Code, use **Debug: Attach to Node Process**.

## Why HTTPS on port 7163

Entra ID only redirects back to URLs registered on the app registration. Locally we use the .NET frontend's registration, and its local redirect URI is `https://localhost:7163/signin-oidc`. So our app has to run there.

[`development-tls.js`](../src/server/common/helpers/development-tls.js), copied from waste-obligations, makes the server use HTTPS when `NODE_ENV=development` and `certs/localhost-key.pem` exists. `npm run setup:certs` creates the certificate with mkcert, and installs mkcert's certificate authority so your browser trusts it. `certs/` is gitignored.

Without the certificate, the app runs on plain HTTP, and Entra ID rejects the redirect URI.

The .NET frontend also uses port 7163. Stop it before starting this app, including the `epr-calculator-frontend` container if you use `epr-local-environment`.

## Entra ID

Fill in the `ENTRA_ID_*` settings in `.env` with the .NET frontend's app registration. Our own registration only has federated credentials for CDP, so it can't be used locally. The .NET frontend's values are in its user secrets:

```sh
cd ../epr-calculator-frontend
dotnet user-secrets list --project src/EPR.Calculator.Frontend
```

| .NET user secret       | `.env`                                                                      |
| ---------------------- | --------------------------------------------------------------------------- |
| `AzureAd:TenantId`     | `ENTRA_ID_AUTHORITY=https://login.microsoftonline.com/<tenant id>`          |
| `AzureAd:ClientId`     | `ENTRA_ID_CLIENT_ID`                                                        |
| `AzureAd:ClientSecret` | `ENTRA_ID_CLIENT_SECRET`                                                    |
| `DownstreamApi:Scopes` | `ENTRA_ID_API_SCOPE`: only the `api://…` scopes, space separated, in quotes |

Don't commit `.env`, or paste its values anywhere.

To use the API, you need the `SASuperUser` role. If you're signed in but the API returns `403 Forbidden`, ask a colleague which Entra ID group gives you the role.

## Calling the API locally

You can run the Calculator API in either of two ways.

### In Docker, with epr-local-environment

The [epr-local-environment](https://github.com/DEFRA/epr-local-environment) `paycal` profile runs the API, its database and the other services it needs:

```sh
cd ../epr-local-environment
docker compose --profile paycal up -d
docker compose stop epr-calculator-frontend   # it uses port 7163 too
```

The API is on plain HTTP, so there's no certificate to trust. In `.env`:

```sh
CALCULATOR_API_BASE_URL=http://localhost:5055
```

### From source

Follow the [epr-calculator-api README](https://github.com/DEFRA/epr-calculator-api#how-to-run-locally). It runs on `https://localhost:7265`, the default `CALCULATOR_API_BASE_URL`, with the .NET development certificate.

Node doesn't trust that certificate, so calls fail with `DEPTH_ZERO_SELF_SIGNED_CERT`. To trust it:

```sh
npm run setup:api-cert
```

[`export-dotnet-dev-cert.sh`](../scripts/export-dotnet-dev-cert.sh) finds the .NET development certificate that `dotnet dev-certs https --check --trust` reports, and adds its public certificate to `.env` as `TRUSTSTORE_DOTNET_DEV_CERT`. The template's `@defra/hapi-secure-context` plugin trusts certificates in `TRUSTSTORE_*` variables. The plugin replaces Node's TLS set-up, so `NODE_EXTRA_CA_CERTS` doesn't work in this app. No private key is exported.

If you regenerate the .NET certificate, run it again.

> [!WARNING]
> Don't use `dotnet dev-certs https --export-path` to export the certificate. On a Mac it can create a new, untrusted development certificate in your keychain instead, which the .NET apps may then start using.

### Check the connection

Open <https://localhost:7163/check-api-connection>. It calls the API's health check without signing in, and shows `OK` or the error.

## Running it like production

```sh
npm start
```

This builds the client assets and runs with `NODE_ENV=production`: Redis sessions, secure cookies, ECS logs and no local HTTPS. You'll need Redis, for example `docker compose up redis -d` with this repo's `compose.yml`, and `USE_SINGLE_INSTANCE_CACHE=true`, `REDIS_TLS=false`, and a `SESSION_COOKIE_PASSWORD` of at least 32 characters, which production requires. Sign-in won't work unless the app is on HTTPS at a registered redirect URI, so this is mainly useful for checking the build.

## Troubleshooting

| You see                                                                                               | Why, and what to do                                                                                                                                   |
| ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ERR_INVALID_MODULE_SPECIFIER` on start-up                                                            | The wrong Node.js version. `node -v` should say v24.14.1. See [Node.js version](#nodejs-version)                                                      |
| `sh: nodemon: command not found`                                                                      | You haven't run `npm install` in this repo. Check you're in the right repo                                                                            |
| "Sign-in is not set up"                                                                               | `.env` is missing `ENTRA_ID_*` settings, listed on the page. Fill them in and restart                                                                 |
| `AADSTS50011: The redirect URI … does not match`                                                      | `APP_BASE_URL` + `/signin-oidc` isn't registered on the app registration. Use `https://localhost:7163`, with a certificate from `npm run setup:certs` |
| The redirect URI in that error starts `http://`                                                       | There's no local certificate, so the app is on HTTP. Run `npm run setup:certs` and restart                                                            |
| Sign-in loops, or "Invalid setting - isSecure must be set to false for non-https server"              | `SESSION_COOKIE_SECURE=true` while running on HTTP. Leave it unset locally                                                                            |
| "Sorry, there is a problem with the service", logged with `fetch failed: ECONNREFUSED`                | The API isn't running at `CALCULATOR_API_BASE_URL`                                                                                                    |
| "Sorry, there is a problem with the service", logged with `fetch failed: DEPTH_ZERO_SELF_SIGNED_CERT` | The app doesn't trust the API's certificate. Run `npm run setup:api-cert` and restart, or use the Docker API on HTTP                                  |
| "Sorry, there is a problem with the service", logged with `401 Unauthorized`                          | The API rejected the token: usually `ENTRA_ID_API_SCOPE` is for a different API, or the API's `AzureAd` settings are for a different tenant           |
| "Sorry, there is a problem with the service", logged with `403 Forbidden`                             | You don't have the `SASuperUser` role                                                                                                                 |
| `EADDRINUSE: address already in use 0.0.0.0:7163`                                                     | Something else is on port 7163, probably the .NET frontend. Stop it                                                                                   |
| A test fails with `EADDRINUSE … 3000`                                                                 | One template test starts a real server on port 3000. Stop anything using that port                                                                    |
| `npm warn Unknown project config "min-release-age"`                                                   | The template's `.npmrc` uses a setting from a newer npm. Harmless                                                                                     |
| Changes to `.env` have no effect                                                                      | Restart `npm run dev`                                                                                                                                 |
