import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import type { SymbolInfo, SymbolKind } from './types.js';

export interface ImportInfo {
  source: string;
  symbols: string[];
  isTypeOnly: boolean;
}

export interface ParseResult {
  symbols: SymbolInfo[];
  imports: ImportInfo[];
}

export async function parseFile(filePath: string): Promise<ParseResult> {
  const content = await readFile(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    getScriptKind(filePath),
  );
  const symbols: SymbolInfo[] = [];
  const imports: ImportInfo[] = [];
  ts.forEachChild(sourceFile, (node) => visitNode(node, sourceFile, symbols, imports));
  return { symbols, imports };
}

function getScriptKind(filePath: string): ts.ScriptKind {
  if (filePath.endsWith('.tsx')) return ts.ScriptKind.TSX;
  if (filePath.endsWith('.jsx')) return ts.ScriptKind.JSX;
  if (filePath.endsWith('.mts')) return ts.ScriptKind.TS;
  if (filePath.endsWith('.mjs')) return ts.ScriptKind.JS;
  if (filePath.endsWith('.ts')) return ts.ScriptKind.TS;
  if (filePath.endsWith('.js')) return ts.ScriptKind.JS;
  return ts.ScriptKind.Unknown;
}

function hasExportModifier(node: ts.Node): boolean {
  const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
  return modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
}

function getLineNumber(node: ts.Node, sourceFile: ts.SourceFile): number {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function visitNode(
  node: ts.Node,
  sourceFile: ts.SourceFile,
  symbols: SymbolInfo[],
  imports: ImportInfo[],
): void {
  // Import declarations
  if (ts.isImportDeclaration(node)) {
    const moduleSpecifier = node.moduleSpecifier;
    if (ts.isStringLiteral(moduleSpecifier)) {
      const importSymbols: string[] = [];
      const isTypeOnly = node.importClause?.isTypeOnly ?? false;

      if (node.importClause) {
        // Default import
        if (node.importClause.name) {
          importSymbols.push(node.importClause.name.text);
        }
        // Named imports
        const namedBindings = node.importClause.namedBindings;
        if (namedBindings && ts.isNamedImports(namedBindings)) {
          for (const element of namedBindings.elements) {
            importSymbols.push(element.name.text);
          }
        }
        // Namespace import
        if (namedBindings && ts.isNamespaceImport(namedBindings)) {
          importSymbols.push(namedBindings.name.text);
        }
      }

      imports.push({
        source: moduleSpecifier.text,
        symbols: importSymbols,
        isTypeOnly,
      });
    }
    return;
  }

  // Export declarations (re-exports)
  if (ts.isExportDeclaration(node)) {
    if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const exportSymbols: string[] = [];
      if (node.exportClause && ts.isNamedExports(node.exportClause)) {
        for (const element of node.exportClause.elements) {
          exportSymbols.push(element.name.text);
        }
      }
      imports.push({
        source: node.moduleSpecifier.text,
        symbols: exportSymbols,
        isTypeOnly: node.isTypeOnly,
      });
    }
    return;
  }

  // Function declarations
  if (ts.isFunctionDeclaration(node)) {
    if (node.name) {
      const params = node.parameters
        .map((p) => p.getText(sourceFile))
        .join(', ');
      const returnType = node.type ? ': ' + node.type.getText(sourceFile) : '';
      symbols.push({
        name: node.name.text,
        kind: 'function',
        exported: hasExportModifier(node),
        line: getLineNumber(node, sourceFile),
        signature: `(${params})${returnType}`,
      });
    }
    return;
  }

  // Class declarations
  if (ts.isClassDeclaration(node)) {
    if (node.name) {
      symbols.push({
        name: node.name.text,
        kind: 'class',
        exported: hasExportModifier(node),
        line: getLineNumber(node, sourceFile),
      });
    }
    return;
  }

  // Interface declarations
  if (ts.isInterfaceDeclaration(node)) {
    symbols.push({
      name: node.name.text,
      kind: 'interface',
      exported: hasExportModifier(node),
      line: getLineNumber(node, sourceFile),
    });
    return;
  }

  // Type alias declarations
  if (ts.isTypeAliasDeclaration(node)) {
    symbols.push({
      name: node.name.text,
      kind: 'type',
      exported: hasExportModifier(node),
      line: getLineNumber(node, sourceFile),
    });
    return;
  }

  // Enum declarations
  if (ts.isEnumDeclaration(node)) {
    symbols.push({
      name: node.name.text,
      kind: 'enum',
      exported: hasExportModifier(node),
      line: getLineNumber(node, sourceFile),
    });
    return;
  }

  // Variable statements
  if (ts.isVariableStatement(node)) {
    const exported = hasExportModifier(node);
    for (const decl of node.declarationList.declarations) {
      if (ts.isIdentifier(decl.name)) {
        const isArrowFn =
          decl.initializer &&
          (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer));
        const kind: SymbolKind = isArrowFn ? 'function' : 'variable';

        let signature: string | undefined;
        if (isArrowFn && ts.isArrowFunction(decl.initializer!)) {
          const fn = decl.initializer as ts.ArrowFunction;
          const params = fn.parameters.map((p) => p.getText(sourceFile)).join(', ');
          const returnType = fn.type ? ': ' + fn.type.getText(sourceFile) : '';
          signature = `(${params})${returnType}`;
        }

        symbols.push({
          name: decl.name.text,
          kind,
          exported,
          line: getLineNumber(node, sourceFile),
          ...(signature ? { signature } : {}),
        });
      }
    }
    return;
  }
}
