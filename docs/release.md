# Release Process

## Branch strategy
- Development goes to `dev`.
- Stable releases are merged from `dev` into `main`.
- `main` must stay green in CI before deploy.

## Versioning
- `patch`: fixes/security/perf without contract break.
- `minor`: backward-compatible features.
- `major`: breaking changes.

## Changelog policy
- Every PR adds one line to `CHANGELOG.md` under `Unreleased`.
- During release, move `Unreleased` items to a versioned section with date.

## Release checklist
```bash
npm run ci:local
npm run db:migrations:check
```

Then:
1. verify CI on `dev`,
2. merge `dev -> main`,
3. verify CI on `main`,
4. run deployment.

## Nightly discipline
- Full E2E runs in `.github/workflows/nightly.yml`.
- PR CI keeps only fast smoke/runtime checks.
