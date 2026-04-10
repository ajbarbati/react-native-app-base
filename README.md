# react-native-app-base

Barebones [Expo](https://expo.dev) app (**web**, **iOS**, **Android**) with a **NestJS BFF** in [`server/`](server/) that forwards chat to an **OpenAI-compatible** LLM API (defaults target **local Ollama** at `http://127.0.0.1:11434`).

## Architecture

```
Expo app  --POST /chat-->  Nest (server/)  --OpenAI-compatible-->  Ollama (or any /v1/chat/completions provider)
```

- LLM URL and optional API key live only in `server/.env` — never in the Expo bundle.
- The app uses `EXPO_PUBLIC_API_BASE_URL` (see root [`.env.example`](.env.example)).

## Prerequisites

| Target | What you need |
|--------|----------------|
| **Web** | Node.js |
| **Android** | [Android Studio](https://developer.android.com/studio) (SDK + emulator or USB device) |
| **iOS (simulator)** | **macOS** + Xcode |
| **Physical device** | [Expo Go](https://expo.dev/go) on the same network as your dev machine |

On **Windows**, you cannot run the iOS Simulator locally; use a Mac, a cloud Mac, or Expo Go on a real iPhone.

## Scripts (Expo — repo root)

| Command | Description |
|---------|-------------|
| `npm start` | Start the dev server (Metro). Press **w** for web, **a** for Android, **i** for iOS. |
| `npm run web` | Open the app in the browser |
| `npm run android` | Open on Android emulator or device |
| `npm run ios` | Open on iOS Simulator (macOS only) |

## Scripts (Nest — `server/`)

| Command | Description |
|---------|-------------|
| `cd server && npm run start:dev` | API on `PORT` (default **3000**), listening on **0.0.0.0** for LAN devices |

## Environment variables

### Expo (repo root)

Copy [`.env.example`](.env.example) to `.env` and set:

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_API_BASE_URL` | Nest base URL (e.g. `http://localhost:3000` for web/simulator; `http://<your-LAN-IP>:3000` for a physical phone) |

### Nest (`server/`)

Copy [`server/.env.example`](server/.env.example) to `server/.env` and set:

| Variable | Purpose |
|----------|---------|
| `PORT` | API port (default `3000`) |
| `CHAT_API_BASE_URL` | Base URL of the OpenAI-compatible API (default `http://127.0.0.1:11434` for Ollama) |
| `CHAT_MODEL` | Model id for `POST /v1/chat/completions` (e.g. a name you `ollama pull`’d) |
| `CHAT_API_KEY` | Optional `Authorization: Bearer` value if your provider requires it |

## Local run order (Ollama)

1. **Ollama** — install/start Ollama, then `ollama pull <model>` (match `CHAT_MODEL`).
2. **Nest** — `cd server && npm run start:dev` with `server/.env` (or rely on defaults for local Ollama).
3. **Expo** — `npm start` (or `npm run web`) with root `.env` pointing at the API.

**Physical device:** use your PC’s LAN IP in `EXPO_PUBLIC_API_BASE_URL` and allow inbound **Windows Firewall** on `PORT` if needed.

**API surface:** Nest exposes `POST /chat` with body `{ "message": string, "model"?: string }` and returns `{ "reply": string }`. Upstream is `POST {CHAT_API_BASE_URL}/v1/chat/completions`.

## Project layout

- **[`App.tsx`](App.tsx)** — Chat UI (Gluestack `Input`, `Button`, calls [`api/chat.ts`](api/chat.ts))
- **[`api/chat.ts`](api/chat.ts)** — `fetch` to Nest `POST /chat`
- **[`server/`](server/)** — Nest app: `ChatModule`, `ChatCompletionService`, global `ValidationPipe`, CORS
- **`app.json`** — Expo config (name, icons, splash, web/iOS/Android)
- **`index.js`** — Registers the app entry with Expo

## Mental model

The same **React Native** components render in the browser via Expo’s web support and on devices via the native runtime. The Nest server is a separate Node process used as a BFF for the LLM API.
