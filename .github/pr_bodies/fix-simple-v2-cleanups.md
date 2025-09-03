This PR addresses several simple v2 issues:

- #7 Header metrics show undefined values
  - Adds formatted header totals in DataService (`totalMCap_s`, `totalVolume_s`).
- #8 Header ETH totals are legacy placeholders
  - Computes ETH totals from `platform_data` and passes to templates.
- #9 Header ‘Chains’ button uses non-existent `/chains` path when active
  - Uses `/platforms` consistently and renames button to "Platforms".
- #10 Donate page: broken QR images due to relative paths
  - Fixes image src paths to be rooted (`/ethqr.png`, `/bchqr.png`, `/xmrqr.png`).
- #11 Coin page: missing default logo fallback
  - Adds default-logo fallback on coin page like home page.

Notes:
- Leaves per-chain supply and stable platform URIs for follow-up PRs (#2, #3, #5).
- No API surface change; only templates/routes/formatting.

