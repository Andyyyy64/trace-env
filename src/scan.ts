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

            /**
             * ノードが環境変数オブジェクト (process.env または import.meta.env) かどうかを判定します
             */
            function isEnvObject(node: ts.Node): boolean {
                if (!ts.isPropertyAccessExpression(node)) return false;

                // process.env のチェック
                if (node.expression.getText() === 'process' && node.name.text === 'env') {
                    return true;
                }

                // import.meta.env のチェック (Viteなど)
                if (
                    ts.isMetaProperty(node.expression) &&
                    node.expression.keywordToken === ts.SyntaxKind.ImportKeyword &&
                    node.expression.name.text === 'meta' &&
                    node.name.text === 'env'
                ) {
                    return true;
                }

                return false;
            }

            function visit(node: ts.Node) {
                // 1. プロパティアクセスをチェック: process.env.VAR or import.meta.env.VAR
                if (ts.isPropertyAccessExpression(node)) {
                    if (isEnvObject(node.expression)) {
                        const envVarName = node.name.getText();
                        vars.add(envVarName);
                    }
                }

                // 2. 要素アクセスをチェック: process.env['VAR'] or import.meta.env['VAR']
                if (ts.isElementAccessExpression(node)) {
                    if (isEnvObject(node.expression)) {
                        if (ts.isStringLiteral(node.argumentExpression)) {
                            const envVarName = node.argumentExpression.text;
                            vars.add(envVarName);
                        }
                    }
                }

                // 3. 分割代入をチェック: const { VAR } = process.env or import.meta.env
                if (ts.isVariableDeclaration(node)) {
                    if (node.initializer && isEnvObject(node.initializer)) {
                        if (ts.isObjectBindingPattern(node.name)) {
                            node.name.elements.forEach((element) => {
                                if (ts.isBindingElement(element)) {
                                    // 名前変更を伴う分割代入に対応: const { OLD: NEW } = process.env
                                    let envVarName: string | undefined;

                                    // element.propertyName はオブジェクト側のプロパティ名 (process.env のキー)
                                    // element.name はコード内での変数名

                                    if (element.propertyName && ts.isIdentifier(element.propertyName)) {
                                        envVarName = element.propertyName.text;
                                    } else if (ts.isIdentifier(element.name)) {
                                        envVarName = element.name.text;
                                    }

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
