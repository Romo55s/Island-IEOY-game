# Project Skills Bundle

This directory vendors the skills selected for planning and building the IEOY browser game. The files are intentionally kept inside the repository so their contents and provenance can be reviewed before activation.

## Activation

The reviewed bundle was activated on 2026-10-15 under `.agents/skills`, with shared references under `.agents/references` and preserved licenses under `.agents/licenses`.

If `.agents` ever needs to be reconstructed from the reviewed vendor copy, run:

```sh
mkdir -p .agents/skills .agents/references .agents/licenses
cp -R vendor/codex-skills/skills/. .agents/skills/
cp -R vendor/codex-skills/references/. .agents/references/
cp -R vendor/codex-skills/licenses/. .agents/licenses/
```

Codex discovers newly activated skills on the next turn or after a restart, depending on the client session.

## Included Skills

### OpenAI Game Studio

- `game-studio`
- `web-game-foundations`
- `react-three-fiber-game`
- `web-3d-asset-pipeline`
- `game-ui-frontend`
- `game-playtest`

The shared Game Studio references are stored in `references/`, preserving the relative paths used by these skills. The umbrella `game-studio` skill also mentions optional Phaser, vanilla Three.js, and sprite-pipeline skills; those were deliberately not included because this project has selected React Three Fiber and user-supplied 3D assets.

### OpenAI Superpowers

- `writing-plans`

This is included for creating and reviewing an executable implementation plan. Its optional execution workflow is not being activated or used at this stage.

### Cloudflare

- `cf-cli` (primary CLI for this new project)
- `durable-objects`
- `workers-best-practices`
- `wrangler` (retained only for existing Wrangler projects or commands not yet supported by `cf`)

### Anthropic

- `frontend-design`

## Audit Summary

- Reviewed every included `SKILL.md` before copying.
- Reviewed the writing-plan reviewer prompt and the directly referenced Cloudflare guidance.
- Searched included Markdown and license files for common high-risk shell patterns.
- No executable files or scripts are included in this bundle.
- No dependency installation, deployment, authentication, or remote mutation was performed.
- Cloudflare and OpenAI Superpowers license files are preserved under `licenses/`.
- Anthropic's license is preserved alongside `frontend-design`.
- The OpenAI Game Studio plugin archive did not contain a Game Studio-specific license file; provenance is recorded below rather than inferring license terms.

## Provenance

| Source | Repository | Downloaded archive SHA-256 |
| --- | --- | --- |
| OpenAI plugins | <https://github.com/openai/plugins> | `ad943bea84960532727bc72bd653d6d54a610df47965d258ea4eaada3c1b2e08` |
| Cloudflare skills | <https://github.com/cloudflare/skills> | `932e2991252f7a349259f3d3f7f30b9107760d328b968218f5ee8e0a697eb965` |
| Anthropic skills | <https://github.com/anthropics/skills> | `149d804241449c2a382079de32e37032ba6a18eb7621ec20217ce4974e1fbc21` |

The archives were downloaded and reviewed on 2026-10-15. Archive hashes make this exact reviewed snapshot identifiable even though Git metadata is not present in GitHub-generated ZIP archives.
