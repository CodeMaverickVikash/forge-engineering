# Native Android (Kotlin / Java)

## Identification

- `AndroidManifest.xml` (usually `app/src/main/`), `build.gradle(.kts)` applying `com.android.application` or `com.android.library`, `settings.gradle(.kts)`, `gradlew` wrapper.
- Version catalog in `gradle/libs.versions.toml` when present: add or reference libraries there, not inline.
- UI toolkit: **Jetpack Compose** (`@Composable` functions, `androidx.compose.*`) or **Views** (XML layouts in `res/layout/`, View Binding / Data Binding). Match the feature you are changing.
- Architecture signals: `ViewModel`, `Hilt` (`@HiltAndroidApp`, `@Inject`) or Koin, Room (`@Entity`, `@Dao`), Retrofit/OkHttp or Ktor, Navigation component or Compose Navigation.
- Build variants: `buildTypes` and `productFlavors` in `app/build.gradle(.kts)`.

## Architecture practices

- Follow the project's layering (commonly UI → ViewModel → repository → data sources). UI observes state (`StateFlow`, `LiveData`); ViewModels expose immutable state and handle events.
- Coroutines: launch in `viewModelScope` / `lifecycleScope`; collect flows with lifecycle awareness (`repeatOnLifecycle`, `collectAsStateWithLifecycle`). Do disk and network work on `Dispatchers.IO` (or the injected dispatcher).
- Survive configuration changes and process death: state in ViewModels plus `SavedStateHandle` for what must be restored.
- Background work that must complete uses WorkManager, with constraints, not raw threads or long-running services.
- Strings in `res/values/strings.xml` (localizable), dimensions and colors from the theme. No hardcoded user-facing text.
- Deep links: intent filters in the manifest or Navigation deep link declarations; App Links need `assetlinks.json` hosted on the domain.

## Coding standards

- Kotlin idioms the project uses: null safety without `!!` on external data, data classes, sealed classes for UI state.
- Compose: hoist state, keep composables side-effect free, use `remember` / `rememberSaveable` correctly, side effects only in `LaunchedEffect` / `DisposableEffect`. Use `LazyColumn` with `key` for lists.
- Views: RecyclerView with `ListAdapter` / `DiffUtil` for lists; avoid leaking `Activity` or `View` references into long-lived objects.
- Content descriptions for images and icon-only buttons; touch targets of 48dp.

## Common security issues

- Exported components (`android:exported="true"`) without permission checks; any exported activity, service or receiver accepts external intents.
- Tokens in plain `SharedPreferences` or files. Use the Android Keystore through the project's existing wrapper.
- `android:usesCleartextTraffic="true"` or a permissive network security config in release builds.
- WebView with `setJavaScriptEnabled(true)` plus `addJavascriptInterface` on untrusted content, or file access enabled.
- Logging tokens or PII with `Log.*` in release builds; `android:debuggable` or `allowBackup` settings exposing data.
- Implicit intents carrying sensitive data; unvalidated deep link parameters.

## Testing tools

- Local unit tests (`src/test/`): JUnit 4 or 5, MockK or Mockito, `kotlinx-coroutines-test`, Turbine for flows when present, Robolectric when configured.
- Instrumented tests (`src/androidTest/`): Espresso for Views, Compose UI testing (`createComposeRule`), UI Automator. These need an emulator or device.

## Lint and format

- Android Lint (`./gradlew lint`), ktlint or detekt when configured (Gradle plugins or Spotless).

## Build and validation commands (if configured)

Discover tasks via `.forge/context.json`, CI files or `./gradlew tasks` first. Use the wrapper (`./gradlew`, `gradlew.bat` on Windows), not a global Gradle. Typical ones:
- `./gradlew assembleDebug`, `./gradlew testDebugUnitTest` (or `./gradlew test`), `./gradlew lint`, `./gradlew connectedDebugAndroidTest` (requires a running emulator or device; check `adb devices` first).
- Building requires a JDK and the Android SDK (`ANDROID_HOME` or `local.properties`); report UNAVAILABLE if absent.
- Never run release signing or Play upload tasks.

## Official docs

- Android developers: https://developer.android.com/guide
- Kotlin: https://kotlinlang.org/docs/home.html
- App security best practices: https://developer.android.com/privacy-and-security/security-tips
