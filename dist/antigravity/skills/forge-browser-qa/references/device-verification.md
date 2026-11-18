# Native mobile: device verification (G10m)

Use this for React Native, Expo, Flutter, Android and iOS changes. It starts only after the pre-browser gate is OPEN (type check, lint, tests and the platform build already passed). Browser tools never verify a native screen. Report exactly which device ran what, or `UNAVAILABLE` / `BLOCKED` with the reason.

## 1. Discover what is really available (never assume)

| Platform | Check | Notes |
|---|---|---|
| Android | `adb devices` (a device listed as `device`); `emulator -list-avds` | Booting a listed AVD is fine (`emulator -avd <name>` in the background). Never create or delete AVDs without authorization |
| iOS | `xcrun simctl list devices booted` (macOS with Xcode only) | Any other OS: iOS is `UNAVAILABLE (needs macOS + Xcode)` |
| Flutter | `flutter devices` | `integration_test/` with `flutter test integration_test` when it exists |
| React Native / Expo | `.forge/context.json` commands; a dev client or an installed debug build | Local builds only (`npx --no-install expo run:android`, `npx react-native run-android`, Gradle, Xcode). **Never** `eas build`, `eas submit`, `eas update` or any OTA publish |
| Mobile E2E | `.maestro/` or Maestro flows plus the `maestro` CLI; `detox` config plus the CLI; Espresso or XCUITest targets | Prefer the project's own E2E tool for the affected flows. Never install a new one without authorization |

No device and no emulator means device verification is `UNAVAILABLE`. The change is then "implemented, not device-verified", and the completion status cannot be VERIFIED.

## 2. Run the affected flows

Install the debug build the project produces, launch it, and walk the affected flow end to end. Use the project's E2E flows when they exist; otherwise drive it step by step:
- **Android:** `adb shell am start -n <package>/<activity>`, `adb shell input tap <x> <y>`, `adb shell input text <text>`, `adb shell input keyevent KEYCODE_BACK`. Read the UI tree with `adb shell uiautomator dump /sdcard/ui.xml` then `adb pull`.
- **iOS simulator:** `xcrun simctl launch booted <bundle-id>`, `xcrun simctl openurl booted <deep-link>`. Interaction needs XCUITest, Maestro or Detox; without one, report the interaction steps as `NOT RUN`.

Check what the change touches:
- [ ] Navigation: forward, back (Android back button), deep links with valid and invalid params.
- [ ] Touch: taps, scrolling, gestures, disabled states. Targets at least 44 pt / 48 dp.
- [ ] Layout: a small and a large screen, safe areas and notches. Rotation, if the app supports it.
- [ ] Keyboard: focus moves, the keyboard does not cover the active input, submit and dismiss work.
- [ ] Permissions: the allow, deny and "don't ask again" paths, when the change requests one.
- [ ] States: loading, empty, error and offline. On Android, `adb shell svc wifi disable` and `adb shell svc data disable` to simulate offline; restore them afterwards.
- [ ] Appearance: dark mode (`adb shell cmd uimode night yes`, `xcrun simctl ui booted appearance dark`) and large text (`adb shell settings put system font_scale 1.3`, `xcrun simctl ui booted content_size extra-large`) for UI changes. **Restore every setting you changed.**
- [ ] Crashes and errors: `adb logcat -d -t 500` (filter by the app's package) or the simulator log. Redact tokens and personal data.

## 3. Evidence

- **Screenshots:** `adb exec-out screencap -p > .forge/tasks/<slug>/evidence/screenshots/device-android-<flow>-<state>.png` or `xcrun simctl io booted screenshot .forge/tasks/<slug>/evidence/screenshots/device-ios-<flow>-<state>.png`.
- **Logs:** relevant redacted crash or log excerpts go to `evidence/reports/device-<platform>.log`.
- Add each file to `evidence/index.md` with the platform, the device or emulator and its OS version, the flow, and what the file shows.

## 4. Report line

```
Device: <android|ios> — <emulator|simulator|physical> <model>, OS <version> — flows: <flow — PASSED/FAILED> — evidence: <links>
        | UNAVAILABLE (<what is missing, how to enable>) | NOT RUN (<reason>)
```

Stop the emulators and apps you started, and leave the user's devices as you found them.
