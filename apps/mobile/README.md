# mobile

A new Flutter project.

## Getting Started

This project is a starting point for a Flutter application.

A few resources to get you started if this is your first Flutter project:

- [Lab: Write your first Flutter app](https://docs.flutter.dev/get-started/codelab)
- [Cookbook: Useful Flutter samples](https://docs.flutter.dev/cookbook)

For help getting started with Flutter development, view the
[online documentation](https://docs.flutter.dev/), which offers tutorials,
samples, guidance on mobile development, and a full API reference.

## Build configuration (MB-2)

Configuration is compiled in with `--dart-define`. It is **not** read from a
bundled `.env`: a Flutter asset ships inside the APK in cleartext and is
readable by unzipping the package (F-42).

```bash
# Local development — no flags needed; debug falls back to the emulator alias
flutter run

# Explicit backend
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000/api

# Release
flutter build apk --release \
  --dart-define=API_BASE_URL=https://api.example.com/api \
  --dart-define=API_VERSION=v1
```

A **release build refuses to start without `API_BASE_URL`** and requires
`https://`. There is deliberately no fallback — a silent default is how a
production build ends up talking plaintext to a laptop address. The release
manifest denies cleartext traffic (`usesCleartextTraffic="false"`); the
debug-only manifest re-enables it for local HTTP work (F-24).

CI builds must pass the define.

Never put a secret in a `--dart-define` either: compiled-in values are still
recoverable from the binary. Secrets belong on the server.
