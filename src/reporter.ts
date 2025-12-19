import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';

/**
 * スキャン結果をコンソールに出力します
 */
export function reportResults(usedVars: Set<string>, definedVars: Set<string>): void {
    if (usedVars.size === 0) {
        console.log(chalk.yellow('No environment variables found used in the code.'));
        return;
    }

    console.log(chalk.bold('Used env vars:'));
    const sortedVars = Array.from(usedVars).sort();
    sortedVars.forEach(v => {
        const isDefined = definedVars.has(v);
        const mark = isDefined ? chalk.green('✓') : chalk.red('✗');
        console.log(`${mark} ${v}`);
    });

    // 未使用の環境変数をチェック (.envにあるがコードにない)
    const unusedVars = Array.from(definedVars).filter(v => !usedVars.has(v)).sort();
    if (unusedVars.length > 0) {
        console.log(chalk.bold('\nUnused env vars (in .env but not in code):'));
        unusedVars.forEach(v => {
            console.log(chalk.yellow(`- ${v}`));
        });
    }
}

/**
 * .env.example ファイルを生成します
 */
export function generateExampleFile(targetDir: string, usedVars: Set<string>): void {
    const examplePath = path.join(targetDir, '.env.example');

    if (fs.existsSync(examplePath)) {
        console.log(chalk.yellow('\n.env.example already exists. Skipped generation.'));
        return;
    }

    const exampleContent = Array.from(usedVars).sort().map(v => `${v}=`).join('\n');
    fs.writeFileSync(examplePath, exampleContent);
    console.log(chalk.green(`\nGenerated .env.example at ${examplePath}`));
}

/**
 * CI環境向けのバリデーションを実行
 */
export function validateForCI(usedVars: Set<string>, exampleVars: Set<string>): boolean {
    let hasError = false;

    // 1. コードで使われているが .env.example にない変数をチェック
    const missingInExample = Array.from(usedVars).filter(v => !exampleVars.has(v)).sort();
    if (missingInExample.length > 0) {
        console.error(chalk.red('\nError: The following environment variables are used in code but missing in .env.example:'));
        missingInExample.forEach(v => console.error(chalk.red(`  - ${v}`)));
        hasError = true;
    }

    // 2. .env.example にあるがコードで使われていない変数をチェック（負債）
    const unusedInExample = Array.from(exampleVars).filter(v => !usedVars.has(v)).sort();
    if (unusedInExample.length > 0) {
        console.error(chalk.red('\nError: The following environment variables are defined in .env.example but not used in code:'));
        unusedInExample.forEach(v => console.error(chalk.red(`  - ${v}`)));
        hasError = true;
    }

    return hasError;
}
