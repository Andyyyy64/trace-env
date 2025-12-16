import { glob } from 'glob';
import * as fs from 'fs';
import chalk from 'chalk';
import * as ts from 'typescript';

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

            // Use TypeScript Compiler API to parse the file
            const sourceFile = ts.createSourceFile(
                file,
                content,
                ts.ScriptTarget.Latest,
                true // setParentNodes
            );

            visit(sourceFile);

            function visit(node: ts.Node) {
                // 1. Check for Property Access: process.env.VAR
                if (ts.isPropertyAccessExpression(node)) {
                    if (
                        ts.isPropertyAccessExpression(node.expression) &&
                        node.expression.expression.getText() === 'process' &&
                        node.expression.name.getText() === 'env'
                    ) {
                        const envVarName = node.name.getText();
                        vars.add(envVarName);
                    }
                }

                // 2. Check for Element Access: process.env['VAR']
                if (ts.isElementAccessExpression(node)) {
                    if (
                        ts.isPropertyAccessExpression(node.expression) &&
                        node.expression.expression.getText() === 'process' &&
                        node.expression.name.getText() === 'env'
                    ) {
                        if (ts.isStringLiteral(node.argumentExpression)) {
                            const envVarName = node.argumentExpression.text;
                            vars.add(envVarName);
                        }
                    }
                }

                // 3. Check for Destructuring: const { VAR } = process.env
                if (ts.isVariableDeclaration(node)) {
                    if (
                        node.initializer &&
                        ts.isPropertyAccessExpression(node.initializer) &&
                        node.initializer.expression.getText() === 'process' &&
                        node.initializer.name.getText() === 'env'
                    ) {
                        if (ts.isObjectBindingPattern(node.name)) {
                            node.name.elements.forEach((element) => {
                                if (ts.isBindingElement(element)) {
                                    // Handle renamed vars: const { OLD: NEW } = process.env
                                    let envVarName: string | undefined;

                                    // element.propertyName is the property on the object (process.env key)
                                    // element.name is the variable name

                                    if (element.propertyName && ts.isIdentifier(element.propertyName)) {
                                        envVarName = element.propertyName.text;
                                    } else if (ts.isIdentifier(element.name)) {
                                        envVarName = element.name.text;
                                    }

                                    // Note: If using default values like { VAR = 'default' }, element.name is still the identifier

                                    if (envVarName) {
                                        vars.add(envVarName);
                                    }
                                }
                            });
                        }
                    }
                }

                ts.forEachChild(node, visit);
            }

        } catch (err) {
            if (options.debug) {
                console.warn(chalk.yellow(`Could not process file ${file}: ${err}`));
            }
        }
    }

    return vars;
}
