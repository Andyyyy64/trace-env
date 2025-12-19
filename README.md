# trace-env

> **The larger your .env, the deeper your technical debt.**

A CLI tool to trace environment variables used in your project, identify unused ones, and generate `.env.example`.

## Installation

```bash
npm install -g trace-env
```
# or run directly with npx

```bash
npx trace-env .
```

## Usage

Scan the current directory for environment variable usage:

```bash
trace-env .
```

Output:
```
Used env vars:
✓ DATABASE_URL
✗ API_KEY

Unused env vars (in .env but not in code):
- OLD_FEATURE_FLAG
```

- `✓`: Variable is used in code AND defined in `.env`.
- `✗`: Variable is used in code BUT NOT defined in `.env`.
- **Unused env vars**: Variables defined in `.env` but not found in your code. **Delete them!**

### CI Integration

You can use the `--ci` flag to fail the build if there are unused variables in `.env.example` or if any variables used in code are missing from `.env.example`.

```bash
trace-env . --ci
```

Example GitHub Actions step:

```yaml
- name: Trace Env Check
  run: npx trace-env . --ci
```

### Ignore Patterns

Exclude specific files or directories from scanning using the `-i` or `--ignore` flag. You can specify multiple patterns or use a comma-separated list.

```bash
trace-env . -i "**/tests/**,**/legacy/**"
# or
trace-env . -i src/dispatcher.ts -i tests/
```

### Generate .env.example

You can automatically generate a `.env.example` file based on the declarations found in your code:

```bash
trace-env . --generate
```

This will create `.env.example` in the scanned directory if it doesn't exist.

## Features

- **AST-based Scanning**: Accurate detection using TypeScript parser to avoid false positives (comments, strings, etc).
- **Vite & Next.js Support**: Works with both `process.env` and `import.meta.env`.
- **Unused Variable Detection**: Compares your code usage against `.env` and `.env.example` files to find dead configuration.
- **CI Ready**: Integrated validation for automated environments.
- **Pattern Support**:
  - `process.env.VAR`
  - `process.env['VAR']`
  - `const { VAR } = process.env`
  - `import.meta.env.VITE_VAR`
  - `import.meta.env['VITE_VAR']`
  - `const { VITE_VAR } = import.meta.env`
- **File Support**: Scans `.js`, `.ts`, `.jsx`, `.tsx`, `.mjs`, `.cjs`.
- **Smart Ignore**: Automatically ignores `node_modules`, `dist`, `build`, and `.git`, plus custom patterns.
