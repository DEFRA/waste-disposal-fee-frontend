#!/bin/sh
# Lets this app call the Calculator API running locally on https://localhost:7265,
# which uses the self-signed .NET HTTPS development certificate.
#
# Adds the certificate to .env as TRUSTSTORE_DOTNET_DEV_CERT. @defra/hapi-secure-context
# trusts certificates in TRUSTSTORE_* variables, the same way custom CAs are added on CDP.
# Only the public certificate is exported, no private key.
set -eu

thumbprint=$(dotnet dev-certs https --check --trust | sed -n 's/^A trusted certificate was found: \([0-9A-F]*\).*/\1/p' | head -n 1)

if [ -z "$thumbprint" ]; then
  echo "No trusted .NET development certificate found, run: dotnet dev-certs https --trust" >&2
  exit 1
fi

cert=$(security find-certificate -a -c localhost -Z -p ~/Library/Keychains/login.keychain-db |
  awk -v t="$thumbprint" '$0 ~ "SHA-1 hash: " t {f=1} f && /BEGIN CERT/ {p=1} p {print} p && /END CERT/ {exit}' |
  base64 | tr -d '\n')

touch .env
grep -v '^TRUSTSTORE_DOTNET_DEV_CERT=' .env > .env.tmp || true
echo "TRUSTSTORE_DOTNET_DEV_CERT=$cert" >> .env.tmp
mv .env.tmp .env

echo "Added .NET development certificate $thumbprint to .env as TRUSTSTORE_DOTNET_DEV_CERT"
