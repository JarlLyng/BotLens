# Contributing to BotLens

Thanks for considering a contribution — bug reports, feature ideas, and pull requests are all appreciated.

## Reporting bugs

Use the **Bug report** template in [GitHub Issues](https://github.com/JarlLyng/BotLens/issues/new/choose). Include:

- Steps to reproduce (which URL, which button, what you saw)
- Browser and version (`chrome://version/`)
- OS
- What you expected vs. what happened

For security vulnerabilities, **do not** open a public issue — see [SECURITY.md](SECURITY.md).

## Suggesting features

Use the **Feature request** template. Explain the problem you're trying to solve, not just the solution you have in mind — often there's a better shape once we discuss it.

## Development setup

```bash
git clone https://github.com/JarlLyng/BotLens.git
cd BotLens
npm install
```

### Running locally

BotLens has no build step for development. Load it unpacked:

1. Open `chrome://extensions/`
2. Enable **Developer Mode**
3. Click **Load unpacked** → select this folder

Reload the extension from `chrome://extensions/` after any code change.

### Scripts

```bash
npm run lint         # ESLint — must pass before pushing (also runs in CI)
npm run build        # produce a store-ready zip in dist/
```

## Pull requests

1. Fork the repo and create a branch from `main`: `git checkout -b your-branch`
2. Make your changes. Keep commits focused and messages descriptive.
3. Run `npm run lint` locally — CI will reject on lint errors.
4. Push and open a PR against `main` using the PR template.
5. Link the issue you're fixing (`Fixes #123`).

## Code style

- **Vanilla JS only** — no frameworks, no bundlers.
- **No remote code** — Manifest V3 forbids it and Chrome Web Store rejects it. All scripts and icons must be bundled.
- **Inline SVG for icons** — do not add font-icon or CDN dependencies.
- **UI tokens** — reference [`tokens.css`](tokens.css) for spacing, colors, radius, typography. Adding hardcoded values is a smell.
- **Comment sparingly** — only where the *why* is non-obvious.
- **No new permissions without discussion** — adding to the manifest's `permissions` array requires a PR conversation about the trade-off vs. review time.

## Design system

BotLens uses [IAMJARL Design Tokens](https://github.com/JarlLyng/iamjarl-design). The mode-aware light/dark theme is driven entirely by tokens — do not hardcode colors.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
