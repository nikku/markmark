/**
 * @typedef {import('unist').Point} Point
 * @typedef {import('unist').Position} UnistPosition
 * @typedef {import('vfile-message').VFileMessage} VFileMessage
 */

import { URL } from 'node:url';
import { VFile } from 'vfile';

import {
  createConnection,
  CodeAction,
  CodeActionKind,
  Diagnostic,
  DiagnosticSeverity,
  Position,
  ProposedFeatures,
  Range,
  TextDocuments,
  TextDocumentSyncKind,
  TextEdit,
  Location
} from 'vscode-languageserver/node.js';

import { TextDocument } from 'vscode-languageserver-textdocument';

import { createLogger } from './logger.js';

import Markmark from '../core/markmark.js';


/**
 * Convert a unist point to a language server protocol position.
 *
 * @param {Point} point
 * @returns {Position}
 */
function unistPointToLspPosition(point) {
  return Position.create(point.line - 1, point.column - 1);
}


/**
 * Convert a position to a language server protocol position.
 *
 * @param {Position} position
 * @returns {Point}
 */
function lspPositionToUinstPoint(position) {
  return {
    line: position.line + 1,
    column: position.character + 1
  };
}

/**
 * @param {Point|null|undefined} point
 * @returns {boolean}
 */
function isValidUnistPoint(point) {
  return Boolean(
    point && Number.isInteger(point.line) && Number.isInteger(point.column) && point.line > 0 && point.column > 0
  );
}

/**
 * Convert a unist position to a language server protocol range.
 *
 * If no position is given, a range is returned  which represents the beginning
 * of the document.
 *
 * @param {UnistPosition|null|undefined} position
 * @returns {Range}
 */
function unistLocationToLspRange(position) {
  if (position) {
    const end = isValidUnistPoint(position.end)
      ? unistPointToLspPosition(position.end)
      : undefined;
    const start = isValidUnistPoint(position.start)
      ? unistPointToLspPosition(position.start)
      : end;

    if (start) {
      return Range.create(start, end || start);
    }
  }

  return Range.create(0, 0, 0, 0);
}

/**
 * Convert a vfile message to a language server protocol diagnostic.
 *
 * @param {VFileMessage} message
 * @returns {Diagnostic}
 */
// eslint-disable-next-line
function vfileMessageToDiagnostic(message) {
  const diagnostic = Diagnostic.create(
    unistLocationToLspRange(message.position),
    String(message.stack || message.reason),
    message.fatal === true
      ? DiagnosticSeverity.Error
      : message.fatal === false
        ? DiagnosticSeverity.Warning
        : DiagnosticSeverity.Information,
    message.ruleId || undefined,
    message.source || undefined
  );
  if (message.url) {
    diagnostic.codeDescription = { href: message.url };
  }

  if (message.expected) {

    // Type-coverage:ignore-next-line
    diagnostic.data = {
      expected: message.expected
    };
  }

  if (message.note) {
    diagnostic.message += '\n' + message.note;
  }

  return diagnostic;
}

/**
 * Convert language server protocol text document to a vfile.
 *
 * @param {TextDocument} document
 * @param {string} cwd
 *
 * @returns {VFile}
 */
// eslint-disable-next-line
function lspDocumentToVFile(document, cwd) {
  return new VFile({
    cwd,
    path: new URL(document.uri),
    value: document.getText(),
    data: {
      uri: document.uri
    }
  });
}

/**
 * Create a language server for linked markdown editing.
 *
 * @param {Options} options
 *   Configuration for the language server.
 *
 * @return
 */
export function createLanguageServer() {
  const connection = createConnection(ProposedFeatures.all);
  const documents = new TextDocuments(TextDocument);

  const logger = createLogger(connection);
  const markmark = new Markmark(logger);

  let hasWorkspaceFolderCapability = false;

  /**
   * Resolve references to symbol at location.
   */
  connection.onReferences((event) => {

    logger.log('connection.onReferences', event);

    const uri = event.textDocument.uri;
    const point = lspPositionToUinstPoint(event.position);

    logger.log('connection.onReferences :: point', point);

    const refs = markmark.findReferences({
      uri,
      position: {
        start: point,
        end: point
      }
    });

    logger.log('connection.onReferences :: refs', refs);

    return refs.map(
      ref => Location.create(ref.uri, unistLocationToLspRange(ref.position))
    );
  });

  connection.onDefinition((event) => {

    logger.log('connection.onDefinition', event);

    const uri = event.textDocument.uri;
    const point = lspPositionToUinstPoint(event.position);

    logger.log('connection.onDefinition :: point', point);

    const defs = markmark.findDefinitions({
      uri,
      position: {
        start: point,
        end: point
      }
    });

    logger.log('connection.onDefinition :: defs', defs);

    return defs.map(
      def => Location.create(def.uri, unistLocationToLspRange(def.position))
    )[0];
  });

  connection.onInitialize((event, _, workDoneProgress) => {
    logger.log('connection.onInitialize');

    workDoneProgress.begin('Initializing Markmark language features');

    if (event.workspaceFolders) {
      for (const workspace of event.workspaceFolders) {
        markmark.addFolder(workspace.uri);
      }
    } else if (event.rootUri) {
      markmark.addFolder(event.rootUri);
    }

    markmark.on('ready', () => {
      logger.log('connection.onInitialize');

      workDoneProgress.done();
    });

    hasWorkspaceFolderCapability = Boolean(
      event.capabilities.workspace &&
        event.capabilities.workspace.workspaceFolders
    );

    return {
      capabilities: {
        textDocumentSync: TextDocumentSyncKind.Full,
        referencesProvider: true,
        codeActionProvider: {
          codeActionKinds: [ CodeActionKind.QuickFix ],
          resolveProvider: true
        },
        definitionProvider: true,
        workspace: hasWorkspaceFolderCapability
          ? {
            workspaceFolders: {
              supported: true,
              changeNotifications: true,
            }
          }
          : undefined
      }
    };
  });

  connection.onInitialized(() => {

    if (!hasWorkspaceFolderCapability) {
      return;
    }

    connection.workspace.onDidChangeWorkspaceFolders((event) => {

      logger.log('connection.workspace.onDidChangeWorkspaceFolders', event);

      for (const workspace of event.removed) {
        markmark.removeFolder(workspace.uri);
      }

      for (const workspace of event.added) {
        markmark.addFolder(workspace.uri);
      }
    });

  });

  connection.onExit(() => {
    return markmark.close();
  });

  connection.onCodeAction((event) => {

    /** @type {CodeAction[]} */
    const codeActions = [];

    const document = documents.get(event.textDocument.uri);

    // This might happen if a client calls this function without synchronizing
    // the document first.
    if (!document) {
      return;
    }

    for (const diagnostic of event.context.diagnostics) {

      // Type-coverage:ignore-next-line
      const data = /** @type {{expected?: unknown[]}} */ (diagnostic.data);
      if (typeof data !== 'object' || !data) {
        continue;
      }

      const { expected } = data;

      if (!Array.isArray(expected)) {
        continue;
      }

      const { end, start } = diagnostic.range;
      const actual = document.getText(diagnostic.range);

      for (const replacement of expected) {
        if (typeof replacement !== 'string') {
          continue;
        }

        codeActions.push(
          CodeAction.create(
            replacement
              ? start.line === end.line && start.character === end.character
                ? 'Insert `' + replacement + '`'
                : 'Replace `' + actual + '` with `' + replacement + '`'
              : 'Remove `' + actual + '`',
            {
              changes: {
                [document.uri]: [
                  TextEdit.replace(diagnostic.range, replacement)
                ]
              }
            },
            CodeActionKind.QuickFix
          )
        );
      }
    }

    return codeActions;
  });

  documents.onDidOpen((event) => {

    const {
      document
    } = event;

    markmark.fileOpen({
      uri: document.uri,
      value: document.getText(),
      version: document.version
    });
  });

  documents.onDidChangeContent((event) => {

    const {
      document
    } = event;

    markmark.fileContentChanged({
      uri: document.uri,
      value: document.getText(),
      version: document.version
    });

  });

  documents.onDidClose((event) => {
    const { uri, version } = event.document;

    markmark.fileClosed(uri);

    connection.sendDiagnostics({
      uri,
      version,
      diagnostics: []
    });
  });

  documents.listen(connection);

  connection.listen();

  return connection;
}
