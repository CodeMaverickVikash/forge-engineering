# Java / Kotlin on the JVM (Spring Boot)

## Identification

- `pom.xml` (Maven) or `build.gradle` / `build.gradle.kts` (Gradle). Spring Boot via the `spring-boot-starter-parent` parent or the `org.springframework.boot` plugin.
- Wrappers: `mvnw` / `mvnw.cmd` or `gradlew` / `gradlew.bat`. Always prefer the wrapper over a global install.
- Java version: `maven.compiler.release` / `java.version` property, Gradle `toolchain`, or the CI setup step.
- Kotlin if `src/main/kotlin` or the Kotlin plugin is present; follow Kotlin idioms there.

## Architecture practices

- Layering: `@RestController` → `@Service` → `@Repository` (Spring Data). Controllers map DTOs; entities never leave the service layer as API responses.
- Constructor injection (final fields), no field `@Autowired` in new code unless the project uses it consistently.
- Validation with Jakarta Bean Validation (`@Valid`, `@NotNull`, `@Size`) on request DTOs; custom validators for business rules.
- Centralized errors via `@RestControllerAdvice` with `@ExceptionHandler`; reuse the existing error body (often `ProblemDetail` / RFC 9457).
- `@Transactional` on service methods, not controllers. Remember it only applies through the proxy: self-invocation and private methods are not transactional. Use `readOnly = true` for queries.
- Configuration via `application.yml`/`.properties` and profiles; bind with `@ConfigurationProperties`. Secrets from environment variables or a secrets manager.
- Security with Spring Security filter chain; method security (`@PreAuthorize`) for resource-level checks if the project uses it.

## Coding standards

- Immutable DTOs (records where the Java version allows). Avoid exposing JPA entities in JSON (lazy-loading and over-posting issues).
- `Optional` for absent return values from repositories, not for fields or parameters.
- SLF4J logging with placeholders: `log.info("order {} created", id)`. MDC for correlation IDs.
- Avoid N+1 with fetch joins, `@EntityGraph`, or projections; watch `FetchType.EAGER`.

## Common security issues

- JPQL or native queries built by string concatenation; use parameters or Criteria API.
- Mass assignment by binding request bodies directly into entities.
- Actuator endpoints exposed without auth (`management.endpoints.web.exposure.include=*`).
- CSRF disabled for cookie-authenticated browser apps; overly permissive CORS.
- Insecure deserialization (Jackson default typing, Java serialization of untrusted input).
- Missing object-level authorization in services; `permitAll()` matchers broader than intended.

## Testing tools

- JUnit 5 (Jupiter), AssertJ, Mockito.
- Slices: `@WebMvcTest` (controllers with `MockMvc`), `@DataJpaTest` (repositories), `@SpringBootTest` for full integration.
- Testcontainers for real databases and brokers when the project already depends on it; otherwise the configured embedded or test DB.
- Spring Security test support (`@WithMockUser`) for authorization cases.

## Lint / format

- Spotless, Checkstyle, PMD, SpotBugs, Error Prone, or ktlint/detekt for Kotlin. Run only what the build declares.

## Build / validation commands (if configured)

```bash
./mvnw test                  # unit + integration bound to the test phase
./mvnw verify                # full build incl. integration tests and checks
./gradlew test
./gradlew build              # compiles, tests, and runs configured checks
./gradlew spotlessCheck      # only if Spotless is configured
```
On Windows use `mvnw.cmd` / `gradlew.bat`. Use `-pl <module>` (Maven) or `:<module>:test` (Gradle) to scope to the affected module.

## Official docs

- Spring Boot: https://docs.spring.io/spring-boot/
- Spring Framework: https://docs.spring.io/spring-framework/reference/
- Spring Security: https://docs.spring.io/spring-security/reference/
- JUnit 5: https://junit.org/junit5/docs/current/user-guide/
- Testcontainers: https://java.testcontainers.org/
