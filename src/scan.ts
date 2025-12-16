import { glob } from 'glob';
import * as fs from 'fs';
import chalk from 'chalk';

interface ScanOptions {
    debug?: boolean;
}

export async function scanDirectory(dir: string, options: ScanOptions = {}): Promise<Set<string>> {
    const vars = new Set<string>();

    // Pattern to find common source files, ignoring node_modules
    const pattern = '**/*.{js,jsx,ts,tsx,mjs,cjs}';
    const ignore = ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**'];

    const files = await glob(pattern, { cwd: dir, ignore, absolute: true });

    if (options.debug) {
        console.log(chalk.gray(`Found ${files.length} files to scan.`));
    }

    for (const file of files) {
        try {
            const content = fs.readFileSync(file, 'utf-8');

            // 1. Direct access: process.env.VAR
            const directRegex = /process\.env\.([A-Z_0-9]+)/g;
            let match;
            while ((match = directRegex.exec(content)) !== null) {
                vars.add(match[1]);
            }

            // 2. Bracket notation: process.env['VAR'] or process.env["VAR"]
            const bracketRegex = /process\.env\[['"]([A-Z_0-9]+)['"]\]/g;
            while ((match = bracketRegex.exec(content)) !== null) {
                vars.add(match[1]);
            }

            // 3. Destructuring: const { VAR, VAR2 } = process.env
            // Note: This is a simple regex and might fail on nested or complex destructuring
            const destructureRegex = /(?:const|let|var)\s+\{([\s\S]*?)\}\s*=\s*process\.env/g;
            while ((match = destructureRegex.exec(content)) !== null) {
                const destructured = match[1];
                // Remove comments if any (simple approach) or just split
                const parts = destructured.split(',').map(s => s.trim());
                for (const part of parts) {
                    // Handle renaming: const { OLD: NEW } = ... -> We care about OLD (the key in env)
                    // part is like "VAR" or "VAR: localVal" or "VAR = 'default'"

                    // Clean up assignments or renaming
                    // 1. Remove default values: VAR = 'foo' -> VAR
                    let key = part.split('=')[0].trim();
                    // 2. Remove renaming: VAR: localVal -> VAR
                    key = key.split(':')[0].trim();

                    // Simple validation: strictly uppercase to avoid noise?
                    // User env vars are usually uppercase, but not strictly.
                    // However, destructuring usually matches the key.
                    if (/^[A-Z_0-9]+$/.test(key)) {
                        vars.add(key);
                    }
                }
            }

        } catch (err) {
            if (options.debug) {
                console.warn(chalk.yellow(`Could not read file ${file}: ${err}`));
            }
        }
    }

    return vars;
}
