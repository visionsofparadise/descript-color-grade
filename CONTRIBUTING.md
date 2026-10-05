# Contributing

## Prerequisites

- Node 24
- npm 12
- [ffmpeg](https://ffmpeg.org/) on the `PATH`, for the heavy integration tests

## Setup

Run `npm ci`. Its `prepare` script installs the git hooks and fetches the binaries the checks need.

## Pull requests

These checks and tests must pass before a pull request is opened:

```sh
npm run check
npm run unit
npm run integration
npm run integration:heavy
```

## Commits

Commits follow [Conventional Commits](https://www.conventionalcommits.org/), and the commit-msg hook enforces it.
