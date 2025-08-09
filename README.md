<h1 align="center">Auto Release</h1>

<h3 align="center">A tool for automating package versioning and changelog generation</h3>

- Supports semantic versioning
- Automatically generates CHANGELOG.md
- Integrates with GitHub Actions for CI/CD
- Easy to use with simple commands

### Installation

```shell
npm install @jason-ari/auto-release
```

### Usage

#### 1. Update package version

```shell
npx update-version
```

#### 2. Update CHANGELOG.md

```shell
npx update-changelog
```

#### 3. Dry run

```shell
npx update-version --dry-run
```

```shell
npx update-changelog --dry-run
```

## License

Licensed as MIT.
