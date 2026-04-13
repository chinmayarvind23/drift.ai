# Drift Mobile

Expo starter for the offline-first Drift mobile app.

Windows cannot run Apple's iPhone Simulator. Use one of these paths:

- Windows + physical iPhone: run Expo with tunnel mode and open it in Expo Go.
- Windows + Android: run Expo against an Android emulator.
- macOS: run `npm run ios --workspace @drift/mobile` with Xcode installed.

## Local SLM Plan

- Lazy-load the behavior model only when Pattern Lab or report recovery text needs it.
- Use 4-bit quantization for older or low-memory phones and 8-bit for newer phones.
- Keep a sliding context window of short behavior notes and category summaries.
- Throttle non-critical inference while low-power mode is active and the phone is not charging.
- Store raw transaction rows locally in encrypted storage; cloud sync remains opt-in summaries only.

## Commands

```powershell
npm install
npm run test --workspace @drift/mobile
npm run dev --workspace @drift/mobile
```

Containerized Metro tunnel:

```powershell
docker build -f apps/mobile/Dockerfile -t drift-mobile .
docker run --rm -it -p 8081:8081 drift-mobile
```
