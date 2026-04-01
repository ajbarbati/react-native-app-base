# react-native-app-base

Barebones [Expo](https://expo.dev) app: one codebase for **web**, **iOS**, and **Android**. The main screen shows “Hello World”.

## Prerequisites

| Target | What you need |
|--------|----------------|
| **Web** | Node.js |
| **Android** | [Android Studio](https://developer.android.com/studio) (SDK + emulator or USB device) |
| **iOS (simulator)** | **macOS** + Xcode |
| **Physical device** | [Expo Go](https://expo.dev/go) on the same network as your dev machine |

On **Windows**, you cannot run the iOS Simulator locally; use a Mac, a cloud Mac, or Expo Go on a real iPhone.

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start the dev server (Metro). Press **w** for web, **a** for Android, **i** for iOS. |
| `npm run web` | Open the app in the browser |
| `npm run android` | Open on Android emulator or device |
| `npm run ios` | Open on iOS Simulator (macOS only) |

## Project layout

- **`App.js`** — Root UI (`View`, `Text`, `StatusBar`)
- **`app.json`** — Expo config (name, icons, splash, web/iOS/Android)
- **`index.js`** — Registers the app entry with Expo

## Mental model

The same **React Native** components (`View`, `Text`, etc.) render in the browser via Expo’s web support and on devices via the native runtime.
