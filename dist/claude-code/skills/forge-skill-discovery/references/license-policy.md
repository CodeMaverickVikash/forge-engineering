# License policy

Read this in Step 4. The rule: **only free and open-source skills, with a verified SPDX license and public source, and no mandatory paid service.** `license-check.mjs` assigns the category; this file says what each category means for the proposal.

## Categories

| Category | Examples (SPDX) | Recommendable | Installable |
|---|---|---|---|
| `oss-permissive` | MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, 0BSD, Unlicense, Zlib | Yes | Yes, after approval |
| `oss-copyleft` | GPL-2.0, GPL-3.0, LGPL-2.1, LGPL-3.0, AGPL-3.0, MPL-2.0, EPL-2.0 | Yes, with obligations noted | Yes, after approval |
| `source-available` | BUSL-1.1, SSPL-1.0, Elastic-2.0, Commons Clause, PolyForm licenses, "proprietary but source visible" | No | **No** |
| `proprietary` | "All rights reserved", custom terms of service, closed source | No | **No** |
| `unverified` | No license found, `NOASSERTION`, conflicting signals, network failure or rate limit | No | **No** |

List rejected candidates under **Duplicates not installed** or **Unavailable capabilities** with the category as the reason. Do not hide them.

## Per-skill license override

- A LICENSE file inside the skill folder beats the repo-level license. Always run the check with the skill's path (`/tree/<ref>/<path>` or `--path <subdir>`).
- Example: a repo can be Apache-2.0 at the root while individual skill folders carry a source-available LICENSE. Those folders are not installable, even though the repo badge says Apache-2.0.
- If the SKILL.md frontmatter `license:` field disagrees with the LICENSE file, treat the result as `unverified` until resolved and say why.
- Record the level (`skill` or `repo`) in the License column.

## What "unverified" means

`unverified` means FORGE could not prove the license, not that the skill is bad. Causes: no LICENSE file, an unrecognized license text, `NOASSERTION` from GitHub, or the check could not reach the network. It is never installable. In the proposal, show it under **Unavailable capabilities** with the cause and what would fix it (for example, "maintainer adds a LICENSE" or "re-run with network access").

## Copyleft obligations

Copyleft skills are recommendable, but the proposal must state the obligations in the License column so the user decides with full information:

- **GPL / AGPL:** modified copies that are distributed (AGPL: also offered over a network) must be released under the same license with source. Using the skill locally as an agent instruction does not by itself distribute anything; copying its scripts or text into the user's product could.
- **LGPL:** obligations apply to the library itself, not to code that only uses it.
- **MPL-2.0 / EPL-2.0:** file-level copyleft; modified files keep the license.
- Add a note: "Do not copy this skill's code into the project's source without checking license compatibility."
- This is engineering guidance, not legal advice. Flag uncertain cases for the user.

## Paid services

- A mandatory paid API, subscription, account or license key disqualifies a skill, whatever its code license.
- An **optional** paid service is acceptable when the skill works fully without it. Put "Free; optional paid <service>" in the Cost column.
- If a paid need is discovered during install, stop and ask separately (SKILL.md Step 7).

## Wording rules

- Never call free-tier proprietary software, freemium SaaS or source-available code "open source". Use "free to use (proprietary)" or "source-available" and keep it out of the recommendations.
- Never state a license from memory. Quote the SPDX id and the evidence (`license-check.mjs` output or the LICENSE file path).
- "Free" in this policy means free of charge **and** open source. Say both in the Cost column only when both are verified.
