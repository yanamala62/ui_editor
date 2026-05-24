const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const t = require('@babel/types');
const recast = require('recast');

const parseCache = new Map();

function getParser() {
  return {
    parse(source) {
      return parser.parse(source, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript', 'decorators-legacy', 'classProperties', 'optionalChaining', 'nullishCoalescingOperator'],
        tokens: true,
      });
    },
  };
}

function parseFile(filePath) {
  const abs = path.resolve(filePath);
  const content = fs.readFileSync(abs, 'utf-8');
  const stat = fs.statSync(abs);
  const cacheKey = `${abs}:${stat.mtimeMs}`;
  if (parseCache.has(cacheKey)) return parseCache.get(cacheKey);
  const ast = recast.parse(content, { parser: getParser() });
  const result = { ast, content, filePath: abs };
  parseCache.set(cacheKey, result);
  return result;
}

function findElementByLine(ast, line) {
  let found = null;
  traverse(ast, {
    JSXElement(p) {
      if (p.node.loc && p.node.loc.start.line === line) {
        found = p;
        p.stop();
      }
    },
  });
  return found;
}

function findElementByText(ast, text) {
  let found = null;
  traverse(ast, {
    JSXElement(p) {
      const children = p.node.children || [];
      for (const child of children) {
        if (t.isJSXText(child) && child.value.trim() === text.trim()) {
          found = p;
          p.stop();
          return;
        }
      }
    },
  });
  return found;
}

function updateTextContent(filePath, elementInfo, newText) {
  const { ast, content } = parseFile(filePath);
  const line = elementInfo.react?.line || elementInfo.line;
  const elemPath = line ? findElementByLine(ast, line) : findElementByText(ast, elementInfo.text);
  if (!elemPath) return { success: false, error: 'Element not found in AST' };
  elemPath.node.children = [t.jsxText(newText)];
  const output = recast.print(ast).code;
  const tmp = filePath + '.tmp';
  fs.writeFileSync(tmp, output, 'utf-8');
  fs.renameSync(tmp, filePath);
  parseCache.clear();
  return { success: true, diff: `Text changed to: "${newText}"` };
}

function updateClassName(filePath, elementInfo, newClasses) {
  const { ast } = parseFile(filePath);
  const line = elementInfo.react?.line || elementInfo.line;
  const elemPath = line ? findElementByLine(ast, line) : null;
  if (!elemPath) return { success: false, error: 'Element not found' };
  const opening = elemPath.node.openingElement;
  const attr = opening.attributes.find(a => t.isJSXAttribute(a) && a.name.name === 'className');
  if (attr) {
    attr.value = t.stringLiteral(newClasses);
  } else {
    opening.attributes.push(t.jsxAttribute(t.jsxIdentifier('className'), t.stringLiteral(newClasses)));
  }
  const output = recast.print(ast).code;
  fs.writeFileSync(filePath, output, 'utf-8');
  parseCache.clear();
  return { success: true, diff: `Classes updated to: "${newClasses}"` };
}

function updateStyles(filePath, elementInfo, styles) {
  const { ast } = parseFile(filePath);
  const line = elementInfo.react?.line || elementInfo.line;
  const elemPath = line ? findElementByLine(ast, line) : null;
  if (!elemPath) return { success: false, error: 'Element not found' };
  const opening = elemPath.node.openingElement;
  const styleAttr = opening.attributes.find(a => t.isJSXAttribute(a) && a.name.name === 'style');
  const props = Object.entries(styles).map(([k, v]) => t.objectProperty(t.identifier(k), t.stringLiteral(v)));
  const styleObj = t.jsxExpressionContainer(t.objectExpression(props));
  if (styleAttr) {
    styleAttr.value = styleObj;
  } else {
    opening.attributes.push(t.jsxAttribute(t.jsxIdentifier('style'), styleObj));
  }
  const output = recast.print(ast).code;
  fs.writeFileSync(filePath, output, 'utf-8');
  parseCache.clear();
  return { success: true, diff: 'Styles updated' };
}

function updateProp(filePath, elementInfo, propName, value) {
  const { ast } = parseFile(filePath);
  const line = elementInfo.react?.line || elementInfo.line;
  const elemPath = line ? findElementByLine(ast, line) : null;
  if (!elemPath) return { success: false, error: 'Element not found' };
  const opening = elemPath.node.openingElement;
  const attr = opening.attributes.find(a => t.isJSXAttribute(a) && a.name.name === propName);
  const val = typeof value === 'string' ? t.stringLiteral(value) : t.jsxExpressionContainer(t.numericLiteral(Number(value)));
  if (attr) {
    attr.value = val;
  } else {
    opening.attributes.push(t.jsxAttribute(t.jsxIdentifier(propName), val));
  }
  const output = recast.print(ast).code;
  fs.writeFileSync(filePath, output, 'utf-8');
  parseCache.clear();
  return { success: true, diff: `Prop ${propName} updated` };
}

function applyCode(filePath, newCode) {
  try {
    parser.parse(newCode, { sourceType: 'module', plugins: ['jsx', 'typescript'] });
  } catch (e) {
    return { success: false, error: `Syntax error: ${e.message}` };
  }
  fs.writeFileSync(filePath, newCode, 'utf-8');
  parseCache.clear();
  return { success: true };
}

function scanComponents(repoPath) {
  const { globSync } = require('glob');
  const files = globSync('**/*.{jsx,tsx}', { cwd: repoPath, ignore: ['node_modules/**', 'dist/**', 'build/**'] });
  const registry = {};
  for (const file of files) {
    const abs = path.join(repoPath, file);
    try {
      const content = fs.readFileSync(abs, 'utf-8');
      const matches = content.match(/(?:export\s+(?:default\s+)?(?:function|class|const)\s+)(\w+)/g);
      if (matches) {
        for (const m of matches) {
          const name = m.match(/(\w+)$/)?.[1];
          if (name && name[0] === name[0].toUpperCase()) {
            registry[name] = { file: abs, relativePath: file };
          }
        }
      }
    } catch (_) {}
  }
  return registry;
}

module.exports = { parseFile, updateTextContent, updateClassName, updateStyles, updateProp, applyCode, scanComponents };
