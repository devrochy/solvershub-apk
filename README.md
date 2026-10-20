# solvershub-apk

> **The offline-first field app for loan collections — Expo + React Native, SQLite sync, biometrics and role-based access.**

[![CI](https://github.com/devrochy/solvershub-apk/actions/workflows/ci.yml/badge.svg)](https://github.com/devrochy/solvershub-apk/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**TL;DR** — solvershub-apk is the mobile companion of the [solvershub-panel](https://github.com/devrochy/solvershub-panel):
field collectors manage clients, payments, promises and routes in places with
poor connectivity — every write lands in a local SQLite database first and syncs
to the platform API when the network allows.

| | |
|---|---|
| **Problem** | Collectors work in the field, often offline; losing a payment record or a promise because of connectivity is not acceptable. |
| **What I built** | An offline-first architecture: local SQLite with a sync engine, a write queue, an audit log of sync events and biometric lock — plus role-based screens for admins, owners and collectors. |
| **Proof** | 260 commits · module and component tests across the app · design tokens generated from the web panel's single source of truth. |

## What it does

- **Offline-first data layer:** every write goes to local SQLite through a
  repository layer with a sync cursor and a queue — the app works with zero
  connectivity and reconciles later.
- **Role-based experience:** collectors see their route and tasks; owners get
  the business dashboard, portfolios and liquidations; admins manage both.
- **Biometrics and sessions:** biometric lock screen, secure storage of tokens
  and JWT sessions.
- **Collections workflows:** client cards, payments and advances, promise-to-pay,
  negotiation, navigation with Google Maps / Waze deep links.
- **Design system:** Montserrat/Inter typography, dark theme by default and a
  token pipeline synced from `solvershub-panel/brand/tokens/tokens.json`.

## Stack

Expo 57 · React Native 0.86 · TypeScript · expo-sqlite · expo-secure-store ·
expo-local-authentication · expo-notifications · expo-location · expo-updates (OTA) ·
Jest + Testing Library.

## Quickstart

```bash
npm install
npm run start        # Expo dev server (Android / iOS / web)
npm test             # unit and component tests
```

## Commands

| Command | What it does |
|---|---|
| `npm run start` / `android` / `ios` | Development server |
| `npm run lint` / `npm run typecheck` | Expo lint / TypeScript |
| `npm test` | Jest unit and component tests |
| `npm run api:types` | Regenerate API types from the backend OpenAPI schema |
| `npm run tokens:sync` | Sync design tokens from the panel brand repository |
| `npm run check` | lint + typecheck + tests (CI gate) |

## Related repositories

| Repo | What it is |
|---|---|
| [solvershub-panel](https://github.com/devrochy/solvershub-panel) | The admin panel and the design tokens this app consumes |
| [agent-core](https://github.com/devrochy/agent-core) | The platform API |
| [spec-driven-development](https://github.com/devrochy/spec-driven-development) | The public planning system behind the platform |

## License

MIT. See [LICENSE](LICENSE).

## Contact

[LinkedIn](https://linkedin.com/in/robinson-aguilar-ramirez-8970a1129) · [Email](mailto:devrochy@gmail.com)
