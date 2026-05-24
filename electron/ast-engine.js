const fs = require('fs');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const recast = require('recast');
const t = require('@babel/types');

/**
 * Safely updates a JSX element in a file using AST manipulation.
 */
function updateJSXElement(filePath, line, updates) {
    try {
        console.log(`[AST] Attempting to update ${filePath} at line ${line}`);
        
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        const code = fs.readFileSync(filePath, 'utf-8');
        
        const ast = recast.parse(code, {
            parser: {
                parse(source) {
                    return parser.parse(source, {
                        sourceType: 'module',
                        plugins: ['jsx', 'typescript', 'decorators-legacy', 'classProperties'],
                        tokens: true,
                    });
                },
            },
        });

        let elementFound = false;

        traverse(ast, {
            JSXElement(path) {
                // Fiber debugSource line is 1-based
                // loc.start.line is also 1-based
                if (path.node.loc && path.node.loc.start.line === line) {
                    elementFound = true;
                    
                    // 1. Update Text content (children)
                    if (updates.text !== undefined) {
                        // We only update if the first child is a text node or if we want to replace all
                        // For a better experience, we replace all children with the new text if it's a simple edit
                        path.node.children = [t.jsxText(updates.text)];
                    }

                    // 2. Update Attributes (className, etc.)
                    if (updates.attributes) {
                        Object.entries(updates.attributes).forEach(([name, value]) => {
                            const openingElement = path.node.openingElement;
                            const existingAttr = openingElement.attributes.find(
                                attr => t.isJSXAttribute(attr) && attr.name.name === name
                            );

                            if (existingAttr) {
                                if (value === null) {
                                    // Remove attribute if value is null
                                    openingElement.attributes = openingElement.attributes.filter(a => a !== existingAttr);
                                } else {
                                    existingAttr.value = t.stringLiteral(value);
                                }
                            } else if (value !== null) {
                                openingElement.attributes.push(
                                    t.jsxAttribute(t.jsxIdentifier(name), t.stringLiteral(value))
                                );
                            }
                        });
                    }
                }
            }
        });

        if (!elementFound) {
            // Fallback: If line doesn't match exactly, maybe the file changed.
            // We could try to find by text or something else, but for now, let's just fail
            // to stay safe.
            throw new Error(`JSX element not found on line ${line}. Path: ${filePath}`);
        }

        const output = recast.print(ast).code;
        fs.writeFileSync(filePath, output, 'utf-8');
        
        return { success: true };
    } catch (error) {
        console.error('AST Engine Error:', error);
        return { success: false, error: error.message };
    }
}

module.exports = { updateJSXElement };
