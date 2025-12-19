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

            const envVars = await scanDirectory(targetDir, { debug: options.debug });

            // .env ファイルの読み込みと定義済み変数の抽出
            const envPath = path.join(targetDir, '.env');
            let definedEnvVars: Set<string> = new Set();

            if (fs.existsSync(envPath)) {
                const envConfig = dotenv.parse(fs.readFileSync(envPath));
                definedEnvVars = new Set(Object.keys(envConfig));
            } else if (options.debug) {
                console.log(chalk.gray(`No .env file found at ${envPath}`));
            }

            // 結果の表示
            reportResults(envVars, definedEnvVars);

            // .env.example の生成
            if (options.generate) {
                generateExampleFile(targetDir, envVars);
            }

        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(chalk.red('Error:'), message);
            process.exit(1);
        }
    });

program.parse();
