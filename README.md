# trace-env

> **The larger your .env, the deeper your technical debt.**

A CLI tool to trace environment variables used in your project, identify unused ones, and generate `.env.example`.

## Installation

```bash
npm install -g trace-env
# or run directly with npx
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

### Generate .env.example

You can automatically generate a `.env.example` file based on the declarations found in your code:

```bash
trace-env . --generate
```

This will create `.env.example` in the scanned directory if it doesn't exist.

## Features

- **AST-based Scanning**: Accurate detection using TypeScript parser to avoid false positives (comments, strings, etc).
- **Unused Variable Detection**: Compares your code usage against `.env` file to find dead configuration.
- **Pattern Support**:
  - `process.env.VAR`
  - `process.env['VAR']`
  - `const { VAR } = process.env`
- **File Support**: Scans `.js`, `.ts`, `.jsx`, `.tsx`, `.mjs`, `.cjs`.
- **Ignore**: Automatically ignores `node_modules` and other build artifacts.
