---
name: forge-mobile-engineering
description: Mobile engineering for React Native/Expo, Flutter, Android and iOS covering navigation, offline, permissions, secure storage, push and deep links. Use for any mobile app change.
disable-slash-command: true
---


# Mobile Engineering

Goal: ship mobile changes that follow each platform's conventions, survive bad networks and app lifecycle events, protect user data, and are verified on whatever devices are actually available. Never claim device testing that did not happen.

## 1. Discover the stack before writing code

Read `.forge/context.json` first, then confirm in code. Record each answer with a file path:

- [ ] **Framework:** React Native (bare or Expo, managed or with prebuild), Flutter, native Android (Kotlin/Java, Compose or Views), native iOS (Swift, SwiftUI or UIKit). Shared code across platforms vs. per-platform folders (`android/`, `ios/`).
- [ ] **Navigation:** library and where the route/screen registry lives; how deep links map to screens.
- [ ] **State and data:** state management, API client, offline cache or local DB.
- [ ] **UI kit and theme:** component library, design tokens, dark mode support.
- [ ] **Native config:** `AndroidManifest.xml`, `Info.plist`, entitlements, `app.json` / `app.config.*`, Gradle files, build flavors / schemes.
- [ ] **Release path:** store builds (EAS, Fastlane, Gradle, Xcode), OTA update service if any.
- [ ] **Commands and test tooling:** unit, widget/component, E2E (Detox, Maestro, Espresso, XCUITest, `integration_test`). Never assume one exists.
- [ ] **Devices available here:** is an Android emulator, iOS simulator (macOS only) or physical device actually reachable from this environment? Check, do not assume.

Then open the matching reference:

| Stack | Read |
|---|---|
| React Native, Expo | [references/react-native-expo.md](references/react-native-expo.md) when the stack is React Native or Expo |
| Flutter | [references/flutter.md](references/flutter.md) when the stack is Flutter |
| Native Android | [references/android-kotlin.md](references/android-kotlin.md) when the stack is Kotlin/Java Android |
| Native iOS | [references/ios-swift.md](references/ios-swift.md) when the stack is Swift/iOS |

## 2. Platform conventions

- Reuse existing screens and components; match their navigation pattern, spacing and typography.
- Respect platform norms: Android back button/gesture, iOS swipe-back, safe areas and notches, system font scaling, dark mode.
- Touch targets at least 44x44 pt (iOS) / 48x48 dp (Android). Provide accessibility labels and roles; support screen readers (TalkBack, VoiceOver) and dynamic type.
- Keep platform branches (`Platform.OS`, `Platform.isIOS`, per-platform files) minimal and explicit.

## 3. Navigation and lifecycle

- Register new screens the way existing screens are registered. Deep-linkable screens must handle missing or invalid params.
- Handle app lifecycle: backgrounding, process death, restore. Do not assume in-memory state survives; persist what the user would lose.
- Cancel requests and subscriptions when a screen goes away.

## 4. Offline and network resilience

- Assume slow, flaky or absent networks. Show loading, empty, error and offline states; offer retry.
- Set timeouts on requests. Retry idempotent requests with backoff; never blindly retry non-idempotent writes.
- If the app queues writes offline, make them idempotent and resolve conflicts explicitly.
- Never block app startup on a network call when cached data can be shown.

## 5. Permissions

- Request a permission only at the moment the feature needs it, with context for the user. Declare it in the manifest / `Info.plist` with a truthful usage description.
- Handle denied, "don't ask again" and limited (e.g. partial photo access) states gracefully, with a path to settings.
- Do not add permissions the feature does not need; each one can trigger store review questions.

## 6. Secure storage and data

- Tokens and secrets go in the platform keystore (Android Keystore / EncryptedSharedPreferences-style wrappers, iOS Keychain) via the project's existing library. Never in AsyncStorage, SharedPreferences, UserDefaults or plain files.
- Never ship API secrets in the app binary: anything in the bundle or `.env` compiled into the app is extractable. Use a backend.
- HTTPS only; do not weaken ATS (iOS) or cleartext traffic settings (Android) beyond localhost development.
- Do not log tokens or PII. Strip debug logging from release builds as the project does.

## 7. Push notifications and deep links

- Register for push only after permission; send the device token to the backend over an authenticated call and handle token refresh.
- Handle notifications in foreground, background and cold-start (app killed) states.
- Treat deep-link and notification payloads as untrusted input: validate params, require authentication for protected screens, and never perform state-changing actions from a link without user confirmation.
- Universal Links / App Links need server-side association files (`apple-app-site-association`, `assetlinks.json`); note when backend or hosting changes are required.

## 8. Performance

- **Lists:** use the platform's virtualized list (FlatList/FlashList, `ListView.builder`, `LazyColumn`/RecyclerView, `List`/`UITableView`), with stable keys and no heavy work in item render.
- **Images:** request appropriately sized images, cache them, and avoid decoding full-resolution images for thumbnails.
- **Startup:** defer non-critical initialization; avoid synchronous storage or network work on launch.
- Keep the UI thread free: move heavy computation off it. Do not claim improvements without a measurement (see `forge-performance-engineering`).

## 9. App store and release constraints

- Changes to permissions, background modes, tracking, payments for digital goods, or account creation may need store review compliance (e.g. in-app account deletion, privacy disclosures). Flag them in the report.
- Bump version / build numbers only if the work order asks; follow the project's scheme.
- **OTA updates** (e.g. Expo Updates, CodePush-style services): only JavaScript/asset changes can ship over the air, and only to binaries with a compatible runtime/native version. Native code, new native modules or permission changes require a store build. Never publish an OTA update; that is a release action requiring user authorization.

## 10. Testing and device verification

- Unit-test logic; component/widget-test UI states; use the project's E2E tool for affected flows when it exists.
- Run on an emulator or simulator only if one is actually available in this environment. iOS simulators require macOS with Xcode.
- Report device coverage exactly: which platform, emulator/simulator/physical, OS version, or `NOT RUN` / `UNAVAILABLE` with the reason. Never write "tested on device" for checks that were not executed.
- When native config changed, at minimum compile the affected platform build if the toolchain is available.

## Anti-patterns

- Secrets or tokens in AsyncStorage/SharedPreferences/UserDefaults or the app bundle.
- Requesting all permissions at launch.
- Using `ScrollView`/`Column` with `map` for long or unbounded lists.
- Assuming the network is available, or that the app is never killed in the background.
- Shipping a native change through an OTA channel.
- Editing generated native folders (e.g. Expo prebuild output) when the project regenerates them from config.

## Output

Return, in your report: stack facts confirmed (with paths), screens and native config touched, permissions or store-review-relevant changes, whether the change is OTA-eligible or requires a store build, commands run with results, and a device verification line: platform, target (emulator/simulator/physical/none), OS version, result.
