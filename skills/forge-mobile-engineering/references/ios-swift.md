# Native iOS (Swift)

## Identification

- `*.xcodeproj` / `*.xcworkspace`, `Info.plist`, `*.entitlements`, `*.swift` sources.
- Dependency manager: Swift Package Manager (`Package.swift`, or packages listed in the Xcode project), CocoaPods (`Podfile`, `Podfile.lock`; open the `.xcworkspace`), or Carthage (`Cartfile`).
- UI framework: **SwiftUI** (`View` structs, `@State`, `@Observable` / `ObservableObject`) or **UIKit** (`UIViewController`, storyboards / XIBs). Match the feature you are changing.
- Project generators (`project.yml` for XcodeGen, `Project.swift` for Tuist) mean the `.xcodeproj` is generated: edit the spec, not the project file.
- Targets, schemes and build configurations define app, extensions and environments.

## Architecture practices

- Follow the existing pattern (MVVM, MVC, TCA, VIPER, Coordinators). View models or stores own state and side effects; views render state.
- Concurrency: Swift `async`/`await` and actors, or Combine, as the project uses. UI updates on the main actor (`@MainActor`). Cancel tasks when views disappear (`.task` modifier cancels automatically).
- Networking via the existing `URLSession` wrapper or client; decoding with `Codable`; map errors to user-facing states.
- Persistence: SwiftData, Core Data, files or `UserDefaults` (non-sensitive only), following existing code.
- Secrets and tokens in the **Keychain**, through the project's wrapper.
- Deep links: URL schemes in `Info.plist` and Universal Links via the Associated Domains entitlement plus `apple-app-site-association` on the server.
- Push: `UNUserNotificationCenter` plus APNs registration; requires the Push Notifications capability and entitlement.
- Every privacy-sensitive API needs a usage description key (`NS...UsageDescription`) in `Info.plist`, and newer SDKs expect a privacy manifest (`PrivacyInfo.xcprivacy`) for certain APIs; flag changes to either.

## Coding standards

- Avoid force unwraps (`!`) and `try!` on external data. Use `guard let` and typed errors.
- Avoid retain cycles: `[weak self]` in escaping closures that capture `self` in long-lived contexts.
- SwiftUI: keep `body` cheap; use `List` / `LazyVStack` for long collections with stable `id`s; use `@State` for local state and the project's observation pattern for shared state.
- UIKit: reuse cells (`dequeueReusableCell`), diffable data sources when the project uses them; no work on the main thread that blocks scrolling.
- Accessibility: `accessibilityLabel`, traits, Dynamic Type fonts (`.font(.body)` / `UIFont.preferredFont`), 44x44 pt targets.
- Localized strings via `String(localized:)`, `NSLocalizedString` or String Catalogs, as the project does.

## Common security issues

- Tokens in `UserDefaults` or plist files instead of the Keychain.
- `NSAllowsArbitraryLoads` or broad ATS exceptions in `Info.plist`.
- API keys hardcoded in source or plists shipped in the bundle.
- `WKWebView` loading untrusted content with script message handlers that trust any origin.
- Logging tokens or PII with `print` / `os_log` without privacy redaction.
- Custom URL scheme handlers performing actions without validation or authentication.

## Testing tools

- Unit: XCTest, or Swift Testing (`import Testing`, `@Test`) when the project uses it.
- UI: XCUITest targets. Snapshot tests when the project already has them.
- All iOS builds and simulators require **macOS with Xcode**. On Linux or Windows, iOS build and test gates are UNAVAILABLE; `swift build` / `swift test` may still work for pure Swift packages with a Swift toolchain.

## Lint and format

- SwiftLint (`.swiftlint.yml`) and SwiftFormat or `swift-format` when configured.

## Build and validation commands (if configured)

Discover schemes and commands from `.forge/context.json`, Fastlane files, Makefile or CI first. Typical ones (macOS only):
- `xcodebuild -list` to see schemes and targets.
- `xcodebuild build -scheme <Scheme> -destination 'platform=iOS Simulator,name=<device>'`.
- `xcodebuild test -scheme <Scheme> -destination 'platform=iOS Simulator,name=<device>'`; `xcrun simctl list devices` shows available simulators.
- `pod install` only when the project uses CocoaPods and the lockfile requires it.
- Never run archive, signing, TestFlight or App Store upload steps.

## Official docs

- Apple developer documentation: https://developer.apple.com/documentation
- Swift: https://www.swift.org/documentation/
- App Store Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
