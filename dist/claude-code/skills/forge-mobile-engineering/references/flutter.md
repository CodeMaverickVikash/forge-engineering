# Flutter

## Identification

- `pubspec.yaml` with a `flutter:` SDK dependency; `lib/main.dart`; `android/`, `ios/` (and optionally `web/`, `macos/`, `windows/`, `linux/`) platform folders.
- `analysis_options.yaml` for lint rules; `pubspec.lock` for resolved versions.
- State management: look for `provider`, `flutter_riverpod` / `hooks_riverpod`, `flutter_bloc`, `get`, `mobx` in `pubspec.yaml`. Use the one the feature already uses.
- Navigation: `go_router`, `auto_route`, or `Navigator` / named routes.
- Code generation: `build_runner` with `freezed`, `json_serializable`, `riverpod_generator` (files ending in `.g.dart` / `.freezed.dart`).

## Architecture practices

- Follow the project's layering (often presentation / domain / data). Widgets stay small and composable; business logic lives in the state management layer, not in `build`.
- Data access through the existing repository and HTTP client (`dio`, `http`), with interceptors for auth and errors.
- Offline cache via the installed local store (`shared_preferences` for small non-sensitive values, `hive`, `isar`, `sqflite`, `drift` for data).
- Secure storage: `flutter_secure_storage` when installed. Never tokens in `shared_preferences`.
- Deep links via `go_router` or platform config (intent filters, associated domains). Push via `firebase_messaging` or the installed provider.
- Platform-specific code via platform channels or federated plugins; keep Dart-side APIs platform-neutral.
- After changing annotated models, regenerate code with the project's `build_runner` command instead of hand-editing generated files.

## Coding standards

- Use `const` constructors where possible; avoid rebuilding large subtrees (split widgets, use selectors).
- Long lists: `ListView.builder` / `SliverList` with item builders, never `Column` with a mapped list.
- Dispose controllers, streams and subscriptions in `dispose()`.
- Check `mounted` (or `context.mounted`) before using `BuildContext` after an `await`.
- Respect `MediaQuery` text scaling and `SafeArea`. Provide `Semantics` labels for custom widgets and icon-only buttons.
- Keep heavy work off the UI isolate (`compute` / `Isolate.run`).

## Common security issues

- Secrets in Dart source or `--dart-define` values are compiled into the app and extractable.
- Tokens in `shared_preferences`.
- `WebView` (`webview_flutter`) with unrestricted JavaScript and JavaScript channels exposed to untrusted pages.
- Disabling certificate validation (`badCertificateCallback` returning `true`) outside local debugging.
- Deep link parameters used without validation or auth checks.

## Testing tools

- Unit and widget tests: `flutter_test` (`testWidgets`, `WidgetTester`, `find.bySemanticsLabel` / `find.text`). Mocking with `mocktail` or `mockito` when present.
- Integration/E2E: `integration_test` package, Patrol, or Maestro, when configured.
- Golden tests when the project already uses them; do not regenerate goldens to make a test pass without reviewing the diff.

## Lint and format

- `flutter analyze` (rules from `analysis_options.yaml`, often `flutter_lints` or `very_good_analysis`).
- `dart format .` (check mode: `dart format --output=none --set-exit-if-changed .`).

## Build and validation commands (if configured)

Discover the real commands in `.forge/context.json`, README, Makefile or CI first. Typical ones:
- `flutter pub get`, `flutter analyze`, `flutter test`, `dart run build_runner build --delete-conflicting-outputs` (when code generation is used).
- `flutter devices` lists what is actually available; `flutter test integration_test` needs a device or emulator.
- `flutter build apk --debug` (Android toolchain required), `flutter build ios --no-codesign` (macOS with Xcode only).
- `flutter doctor` diagnoses missing toolchains; report its relevant lines when a build is UNAVAILABLE.

## Official docs

- Flutter: https://docs.flutter.dev
- Dart: https://dart.dev/guides
- Testing: https://docs.flutter.dev/testing/overview
