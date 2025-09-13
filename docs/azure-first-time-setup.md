# First-Time Setup: Azure Static Web Apps + GitHub Actions

This guide walks through creating an Azure Static Web App (SWA), wiring up GitHub Actions, and configuring secrets so the site builds and deploys hourly.

## Prerequisites

- Azure subscription and permission to create resources
- GitHub repository with this project
- API keys:
  - CoinMarketCap (`CMC_API_KEY`)a
  - Messari (`MESSARI_API_KEY`)
  - Optional CoinGecko (`COINGECKO_API_KEY`)

## 1) Create Azure Static Web App

1. In the Azure Portal, click Create a resource → search “Static Web Apps” → Create.
2. Select a subscription and resource group (create new if needed).
3. Choose an app name (e.g., `stablecoinwatch`), plan type (Free/Standard), and region near your users.
4. For deployment source, choose “Other” (we’ll use an existing GitHub Action).
5. Create the resource.

Example: Create resources from the CLI (one-time)

If you prefer to create the resource from the CLI, here are the commands used in this project. These create a resource group and a Static Web App resource (no GitHub integration). The Static Web App name is chosen to be unique in this subscription.

```powershell
# create resource group
az group create --name stablecoinwatch-rg --location eastus

# create the static web app in a supported region (eastus2 is commonly available)
az staticwebapp create -n stablecoinwatch-wrk3 -g stablecoinwatch-rg -l eastus2 --sku Free

# retrieve the deployment token (use this as the GitHub Actions secret value for AZURE_STATIC_WEB_APPS_API_TOKEN)
az staticwebapp secrets list --name stablecoinwatch-wrk3 --resource-group stablecoinwatch-rg
```

Notes:
- The CLI may require you to sign in with `az login --use-device-code` if MFA or conditional access is enforced.
- Some regions are not available for Static Web Apps; if you receive a LocationNotAvailableForResourceType error, choose one of the allowed regions (the CLI will show them in the error message).

## 2) Get Deployment Token

1. Open your SWA resource in Azure.
2. Go to Settings → Deployment token.
3. Copy the token. This is used by the GitHub Action to publish `dist/`.

CLI tip: you can retrieve the token with:

```powershell
az staticwebapp secrets list --name stablecoinwatch-wrk3 --resource-group stablecoinwatch-rg --output json
```

Redact the token if you paste logs; then add it to your repository secrets as `AZURE_STATIC_WEB_APPS_API_TOKEN` (see next section).

## 3) Add GitHub Secrets

In your GitHub repository: Settings → Secrets and variables → Actions → New repository secret. Add:

- `AZURE_STATIC_WEB_APPS_API_TOKEN` → paste the deployment token from Azure SWA
- `CMC_API_KEY` → your CoinMarketCap API key
- `MESSARI_API_KEY` → your Messari API key
- (Optional) `COINGECKO_API_KEY` → your CoinGecko key

These are read in the workflow to build the data and deploy.

## 4) Verify Workflow

The repo includes `.github/workflows/static-deploy.yml` which:

- Runs hourly (`cron: '5 * * * *'`).
- Installs dependencies and builds static output with `npm run build:static`.
- Deploys the `dist/` folder to your Azure SWA using the deployment token.

You can also trigger a manual run via the “Run workflow” button (Actions → Build and Deploy Static Site (Hourly)).

## 5) Test the Deployed Site

After a successful run, open your SWA default domain (shown in Azure portal). Verify:

- Home page loads and renders data.
- Platform and coin pages resolve (URLs like `/platforms`, `/platforms/ethereum`, `/coins/usdt`).
- Assets load from root paths: `/common.css`, `/chart.min.js`, and images.

## Optional: Custom Domain + SSL

1. In the SWA resource, go to Custom domains → Add.
2. Follow instructions to add your domain and validate DNS (CNAME to your SWA default hostname).
3. Azure SWA provisions and manages free SSL certificates.

## Optional: Routing/Headers

If you need custom routes, headers, or 404 behavior, add `staticwebapp.config.json` to the repo and update the workflow step with `config_file_location` if necessary.

## Local Build (for verification)

```bash
npm ci
# ensure env vars or .env.production with API keys
set CMC_API_KEY=... (or export ...)
set MESSARI_API_KEY=...
npm run build:static
npx serve dist
```

## Common Issues

- “Unauthorized” during deploy
  - Ensure `AZURE_STATIC_WEB_APPS_API_TOKEN` is correct and hasn’t rotated.

- Empty data or partial pages
  - Confirm `CMC_API_KEY` and `MESSARI_API_KEY` secrets exist and are referenced in the workflow env.
  - Check Action logs for API failures or rate limits.

- Asset 404s
  - Confirm `dist/common.css`, `dist/chart.min.js`, and images exist after build.
  - Absolute paths assume serving from site root; for sub-path hosting, adjust template URLs or routing.

## Cost and Limits

- SWA Free tier is often sufficient for static sites. Review Azure pricing for your expected traffic.
- GitHub Actions usage is subject to minutes/quota; hourly builds typically remain modest.

## Next Steps

- Tune the schedule (`cron`) to meet your freshness needs.
- Add monitoring on the workflow to alert on failed builds.
- Optionally pin Node version and dependencies for reproducible builds.

