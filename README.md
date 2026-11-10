# ARQ Thekedar

ARQ Thekedar is a multilingual attendance-to-accounts product for labour contractors. The working application is intentionally isolated in `ui/frontend`, while the product specification remains in `spec`.

## Run locally

```powershell
cd ui/frontend
corepack pnpm install
corepack pnpm dev
```

Open `http://localhost:3000`. No Docker, database, or AI key is required for the local MVP. Sample PINs are shown on the login screen for preview convenience.

## Checks

```powershell
corepack pnpm check
```
