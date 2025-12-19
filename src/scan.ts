import { glob } from 'glob';
import * as fs from 'fs';
import chalk from 'chalk';
import * as ts from 'typescript';

import { ScanOptions } from './types';
import { extractEnvVars } from './parser';

/**
 * 指定されたディレクトリ内のソースファイルをスキャンし、使用されている環境変数を抽出します
 */
export async function scanDirectory(dir: string, options: ScanOptions = {}): Promise<Set<string>> {
    const vars = new Set<string>();

    // スキャン対象のファイルパターン（ビルド成果物などは除外）
    const pattern = '**/*.{js,jsx,ts,tsx,mjs,cjs}';
    const defaultIgnore = ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**'];
    const ignore = options.ignore ? [...defaultIgnore, ...options.ignore] : defaultIgnore;

    const files = await glob(pattern, { cwd: dir, ignore, absolute: true });

    if (options.debug) {
        console.log(chalk.gray(`Found ${files.length} files to scan.`));
    }

    for (const file of files) {
        try {
            const content = fs.readFileSync(file, 'utf-8');

            // TypeScript Compiler API を使用してファイルをパース
            const sourceFile = ts.createSourceFile(
                file,
                content,
                ts.ScriptTarget.Latest,
                true // setParentNodes
            );

            const fileVars = extractEnvVars(sourceFile);
            fileVars.forEach(v => vars.add(v));

        } catch (err) {
            if (options.debug) {
                console.warn(chalk.yellow(`Could not process file ${file}: ${err}`));
            }
        }
    }

    return vars;
}
