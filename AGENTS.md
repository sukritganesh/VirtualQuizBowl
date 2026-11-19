# Game development workflow

Read the project's game overview before changing gameplay. Keep the premise, player actions, and rules in [GAME_OVERVIEW.md](GAME_OVERVIEW.md). Update it when a change affects how the game is played.

## Designing and building

- Before choosing a library or writing a component, identify the player action or development task it supports. Sketch what the component owns, what data it needs, and how the rest of the game will use it.
- Keep design work proportional to the change. A short sketch is enough for a small component. When a decision affects several parts of the stack, keep the rationale alongside the maintained code or docs so the next contributor can find it.
- Use names that make the game flow easy to follow. Comment on timing, assumptions, or tradeoffs that the code alone cannot explain. Update affected documentation in the same change.

## Branches, commits, and pull requests

- Check the current branch, working tree, and diff before editing. Start each piece of work on a focused branch from current `main`, or continue its existing branch. Preserve unrelated work.
- Make focused commits with plain-language subjects that say what changed. Use the body when the reason is worth preserving.
- Bring completed work back to `main` through a pull request. Explain why the change is needed, what it does, and how it was checked. For gameplay changes, test the affected interaction as a player would encounter it.

## Change history, releases, and scratch work

- Keep a separate, tracked `CHANGELOG.md` at the repository root. Add a short entry under `Unreleased` in the same PR as each meaningful change. Describe its effect on players or contributors. Use the branch or PR description for work still in progress.
- Group completed changes into periodic releases. When cutting a release from `main`, move the corresponding entries under the release version and date, tag the released commit, and leave an `Unreleased` section for the next changes.
- Use the root `scratch/` folder for temporary plans, experiments, and generated files. Add `/scratch/` to the root `.gitignore` before first use. Anything needed to build, run, or understand the game belongs in a tracked location.
