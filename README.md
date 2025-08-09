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

> 💡 This tool will be based on the commits from **the previous tag in the local git history to HEAD**.
> Before using this tool, ensure there is at least one tag in the git repository.

#### 1. Update package version

Automatically update the version field in package.json by comparing the commit types from the previous tag to HEAD in the git history.

```shell
npx update-version
```

#### 2. Update CHANGELOG.md

Identify the commits in the git repository that conform to the [Angular Commit Message Conventions](https://github.com/angular/angular/blob/main/contributing-docs/commit-message-guidelines.md) from the previous tag to HEAD, categorize them into Features and Bug Fixes, and update the changelog.

```shell
npx update-changelog
```

#### 3. Create a Git tag

> 💡 You should add a new tag in the git repository after running this command when changelog is updated.

```shell
npx create-tag
```

#### 4. Dry run

```shell
npx update-version --dry-run
```

```shell
npx update-changelog --dry-run
```
