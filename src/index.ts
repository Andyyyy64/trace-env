#!/usr/bin/env node
import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import * as dotenv from 'dotenv';

import { scanDirectory } from './scan';
import { reportResults, generateExampleFile } from './reporter';

const program = new Command();

program
    .name('trace-env')
    .description('Trace environment variables used in your project')
    .version('1.0.0')
    .argument('[path]', 'path to scan', '.')
    .option('-g, --generate', 'Generate .env.example file')
    .option('-i, --ignore <patterns>', 'Glob patterns to ignore (can be comma-separated or specified multiple times)', (value, previous: string[] = []) => {
        return previous.concat(value.split(','));
    })
    .option('--ci', 'Run in CI mode (fails if unused or missing variables are found in .env.example)')
    .option('--debug', 'Enable debug output')
    .action(async (directory, options) => {
        try {
            const targetDir = path.resolve(process.cwd(), directory);
            if (!fs.existsSync(targetDir)) {
                console.error(chalk.red(`Error: Directory ${targetDir} does not exist.`));
                process.exit(1);
            }

            if (options.debug) {
                console.log(chalk.gray(`Scanning directory: ${targetDir}`));
            }

            const envVars = await scanDirectory(targetDir, { 
                debug: options.debug,
                ignore: options.ignore 
            });

            // .env ファイルの読み込み（ローカル実行用）
            const envPath = path.join(targetDir, '.env');
            let definedInEnv: Set<string> = new Set();

            if (fs.existsSync(envPath)) {
                const envConfig = dotenv.parse(fs.readFileSync(envPath));
                definedInEnv = new Set(Object.keys(envConfig));
            }

            // .env.example ファイルの読み込み（CI検証用）
            const examplePath = path.join(targetDir, '.env.example');
            let definedInExample: Set<string> = new Set();
            if (fs.existsSync(examplePath)) {
                const exampleConfig = dotenv.parse(fs.readFileSync(examplePath));
                definedInExample = new Set(Object.keys(exampleConfig));
            }

            // 通常の結果表示
            if (!options.ci) {
                reportResults(envVars, definedInEnv);
            }

            // .env.example の生成
            if (options.generate) {
                generateExampleFile(targetDir, envVars);
            }

            // CIモードの検証
            if (options.ci) {
                const { validateForCI } = await import('./reporter');
                const hasError = validateForCI(envVars, definedInExample);
                if (hasError) {
                    process.exit(1);
                }
                console.log(chalk.green('\nCI check passed! All environment variables are synchronized.'));
            }

        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(chalk.red('Error:'), message);
            process.exit(1);
        }
    });

program.parse();
