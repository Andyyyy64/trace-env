# trace-env

A CLI tool to trace environment variables used in your project and generate `.env.example`.

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
- DATABASE_URL
- NODE_ENV
- API_KEY
```

### Generate .env.example

You can automatically generate a `.env.example` file based on the found variables:

```bash
trace-env . --generate
```

This will create `.env.example` in the scanned directory if it doesn't exist.

## features

- Scans `.js`, `.ts`, `.jsx`, `.tsx`, `.mjs`, `.cjs` files.
- Detects `process.env.VAR`
- Detects `process.env['VAR']`
- Detects `const { VAR } = process.env`
- Ignores `node_modules` and other build artifacts.
