#!/usr/bin/env node
import { Command } from 'commander';
import { scanDirectory } from './scan';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

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

            if (envVars.size === 0) {
                console.log(chalk.yellow('No environment variables found used in the code.'));
            } else {
                console.log(chalk.bold('Used env vars:'));
                const sortedVars = Array.from(envVars).sort();
                sortedVars.forEach(v => {
                    console.log(`- ${v}`);
                });

                if (options.generate) {
                    const exampleContent = sortedVars.map(v => `${v}=`).join('\n');
                    const examplePath = path.join(targetDir, '.env.example');

                    if (fs.existsSync(examplePath)) {
                        console.log(chalk.yellow('\n.env.example already exists. Skipped generation.'));
                        // Optionally, we could append or merge, but keeping it simple for now as per instructions "can generate"
                    } else {
                        fs.writeFileSync(examplePath, exampleContent);
                        console.log(chalk.green(`\nGenerated .env.example at ${examplePath}`));
                    }
                }
            }

        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(chalk.red('Error:'), message);
            process.exit(1);
        }
    });

program.parse();
