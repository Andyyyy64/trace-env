import * as ts from 'typescript';

/**
 * TypeScriptのソースコードから環境変数の使用箇所を抽出します
 */
export function extractEnvVars(sourceFile: ts.SourceFile): Set<string> {
    const vars = new Set<string>();

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

    visit(sourceFile);
    return vars;
}
