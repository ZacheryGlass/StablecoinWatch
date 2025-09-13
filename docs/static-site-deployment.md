# Static Site Deployment (Azure Static Web Apps)

This project can generate a fully static version of the site by rendering the EJS templates with the live data pipeline at build time. The output contains only HTML/CSS/JS + images and can be hosted on Azure Static Web Apps (SWA). A GitHub Actions workflow runs hourly to refresh data, so upstream APIs are called only once per hour.

## Overview

- Build step executes the same data pipeline used by the server (`StablecoinDataService`) to fetch and merge data.
- EJS templates are rendered to `dist/` as static HTML.
- Assets (`/common.css`, `/chart.min.js`, images) are copied to the root of `dist/` to match template references.
- Azure SWA hosts the `dist/` output; no runtime Node/Express is required.
- GitHub Actions workflow triggers hourly and deploys updated `dist/` to SWA.

## Commands

- Build static site locally:

```bash
npm ci
npm run build:static
# output: dist/
```

- Preview locally:

```bash
npx serve dist
# open http://localhost:3000 (port may vary)
```

## What Gets Rendered

- Home: `dist/index.html`
- Status: `dist/status/index.html`
- Platforms: `dist/platforms/index.html`
- Platform details: `dist/platforms/<slug>/index.html`
- Coin details: `dist/coins/<slug>/index.html`
- Assets copied to:
  - `dist/common.css`
  - `dist/chart.min.js`
  - `dist/<images>` (e.g. `default-logo.png`)

Notes:
- Templates use absolute paths like `/common.css`. Azure SWA serves at site root, so this works out of the box. If you host under a sub-path, adjust references in templates or provide path rewrites.

## Environment Variables

The build uses environment variables just like the server. Provide API keys when building (locally or in CI):

- `CMC_API_KEY` (required for CoinMarketCap)
- `MESSARI_API_KEY` (required for Messari)
- `COINGECKO_API_KEY` (optional)

Optional tuning:

- `ENABLED_SOURCES=cmc,messari,defillama,coingecko`
- `SOURCE_PRIORITY={"cmc":10,"messari":8,"coingecko":6,"defillama":4}`
- `UPDATE_INTERVAL_MINUTES=60` (informational; runtime scheduler is not used for static builds)

You can also use `.env.production` (or `.env.<NODE_ENV>`) locally. In CI, use GitHub Secrets.

## GitHub Actions (hourly)

A workflow is included at `.github/workflows/static-deploy.yml`:

- Triggers hourly via `cron: '5 * * * *'` (UTC)
- Installs dependencies, runs `npm run build:static`, uploads `dist/` to Azure SWA
- Expects these GitHub Secrets:
  - `AZURE_STATIC_WEB_APPS_API_TOKEN` (deployment token from your SWA resource)
  - `CMC_API_KEY`, `MESSARI_API_KEY` (and optionally `COINGECKO_API_KEY`)

To adjust the schedule, edit the `cron` expression.

## Azure Static Web Apps Configuration

The workflow uses `Azure/static-web-apps-deploy@v1` with `app_location: dist` and `skip_app_build: true`.

If you need custom routing (e.g., 404 page), add a `staticwebapp.config.json` to the repo and set `config_file_location` in the workflow step. By default, SWA serves the generated `index.html` files per folder.

## Troubleshooting

- Missing data or empty pages
  - Ensure API keys are set in GitHub Secrets and exposed as env vars in the workflow.
  - Check workflow logs for errors in `Build static site` step.

- Asset paths not loading
  - Confirm `common.css`, `chart.min.js`, and images exist in `dist/` root after build.
  - If hosting under a sub-path or CDN, adjust absolute paths in templates or set up path rewrites.

- Rate limits or upstream API errors
  - Builds run hourly, minimizing API calls. If a source continues to fail, the service will still try to merge from remaining sources.

## Why Static?

- Zero server overhead and no runtime API traffic from users.
- Deterministic hourly snapshots of data; stable and cache-friendly.
- Azure SWA provides global CDN, SSL, and easy GitHub-based deployments.

