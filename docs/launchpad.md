## Launch.Meme Terminal (Vibe Kit build)

### Features
- Adaptive one-page terminal inspired by `launch.meme`
- Spotlight carousel with curated pools + realtime price streaming
- Terminal board: chart, orderbook depth, live fills, pulse feed
- Participation form hooked up to Launch.Meme REST endpoint + Solana wallet state
- Wallet Adapter (Phantom/Solflare/Backpack) bridge with modal/auto-connect
- Zustand-powered cache with REST snapshots + Centrifuge websocket fan-out

### Environment
Duplicate `env.example` into `.env` (or `.env.local`) and set:

```
Browser auto-open opt-out (optional):
BROWSER=none
REACT_APP_LAUNCH_MEME_API=https://launch.meme/api
REACT_APP_LAUNCH_MEME_WS=wss://launch.meme/connection/websocket
REACT_APP_LAUNCH_MEME_WS_TOKEN=<centrifuge_token>
REACT_APP_LAUNCH_MEME_WS_PREFIX=pumpfun
```

### Running locally
```
npm install
npm start
```

### Production build
```
npm run build
```

Deploy the contents of `build/` to Netlify/Render. Remember to propagate the same env vars through the hosting provider’s dashboard.

### API/WS integration notes
- REST client lives in `src/services/launchMemeApi.ts` (fallback demo data for offline dev).
- Streaming client (`src/services/launchMemeStream.ts`) wraps Centrifuge and exposes ticker/orderbook/trade callbacks.
- State machine is located in `src/store/marketsStore.ts`; UI consumes hooks directly.
- Order form uses `submitLaunchOrder` which calls POST `/orders` (adjust payload fields per swagger if needed).
- Websocket prefix defaults to `pumpfun` but can be overridden via `REACT_APP_LAUNCH_MEME_WS_PREFIX`.

### Design tokens
- Custom neon glassmorphism palette lives in `src/theme/variables.css`.
- Terminal-specific styles live in `src/pages/Tab1.css` plus component-level CSS under `src/components/terminal`.

