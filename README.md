# StablecoinWatch v2
https://www.StablecoinWatch.com

StablecoinWatch v2 is a lightweight web app that lists and explores stablecoins using Messari’s Stablecoins Metrics API. The v2 backend is a clean rewrite around `@messari/sdk` and Express, focusing on reliability and simplicity.

What’s in v2
- Backend rewritten to use Messari’s official SDK (`@messari/sdk`).
- Canonical stablecoin list from `GET /metrics/v2/stablecoins`.
- Batched hydration of asset details via Messari Asset endpoints.
- Server-rendered UI using EJS templates.
- Scheduled refresh every 15 minutes.

Stack
- Node.js + Express
- EJS (server-side templates)
- `@messari/sdk` (Messari API client)

Data Source
- Messari Stablecoins Metrics API and Asset APIs
  - Docs: see `docs/messari/stablecoin_api_reference.md`

Environment
- `MESSARI_API_KEY` (required)
  - Place it in a `.env` file (see `.env.example`) or set as an environment variable. The app loads `.env` via `dotenv`.

Quick Start
- Install dependencies: `npm install`
- Set env var:
  - PowerShell: `$env:MESSARI_API_KEY = 'YOUR_KEY'`
  - CMD: `set MESSARI_API_KEY=YOUR_KEY`
- Run: `npm start`
- Default port: `3000` (override with `PORT`)

Project Structure
- `app/app.js` – Express app bootstrap, cron scheduling, and route wiring
- `app/hybrid-stablecoin-service.js` – Hybrid data service combining CoinMarketCap and Messari APIs
- `routes/routes.js` – Page routes
- `models/` – Simple view models (`stablecoin`, `platform`)
- `views/` – EJS views and partials
- `res/` – Static assets (css/js/images)
- `docs/messari/` – Stablecoins API reference

How It Works
- On boot and every 15 minutes:
  - Fetch stablecoin slugs from Messari `/metrics/v2/stablecoins`.
  - Batch-hydrate asset details via `client.asset.getAssetDetails({ slugs })`.
  - Shape each stablecoin for the UI (`coin.main`, `coin.msri`, `coin.scw`).
  - Compute aggregate totals and platform rollups.

Routes
- `/` – Home, table of stablecoins (price, market cap, volume)
- `/coins/:symbol` – Coin details page
- `/platforms` – Platform summary list
- `/platforms/:name` – Platform detail page (basic view)

Config & Tuning
- `PORT` – Web server port (default: 3000)
- `MESSARI_API_KEY` – Required for all data
- Update refresh cadence in `app/app.js` via `MINS_BETWEEN_UPDATE`

Notes & Limitations
- v2 uses Messari as the single source of truth for listing and market metrics.
- Some per-chain contract links/supply breakdowns may be missing if not available in Messari profiles; the UI will gracefully fall back when data is absent.

Troubleshooting
- Empty list or startup error: ensure `MESSARI_API_KEY` is set and valid.
- Rate limits or 4xx responses: check Messari plan and usage.
- Local network issues: verify outbound HTTPS access.

Contributing
- PRs welcome. Keep changes focused and consistent with the current style.


