/**
 * @typedef { import('unist').Point } Point
 * @typedef { import('unist').Position } UnistPosition
 * @typedef { import('vfile-message').VFileMessage} VFileMessage
 *
 * @typedef { import('../core/types').LinterResults } LinterResults
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
  Location,
  CompletionItem,
  CompletionItemKind,
  FileChangeType,
  DidChangeWatchedFilesNotification
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
 * @param { string } severity
 *
 * @return { DiagnosticSeverity }
 */
function toLspSeverity(severity) {
  return ({
    'error': DiagnosticSeverity.Error,
    'warn': DiagnosticSeverity.Warning,
    'info': DiagnosticSeverity.Information,
    'hint': DiagnosticSeverity.Hint
  })[severity] || DiagnosticSeverity.Information;
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
    value: document.getText()
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

  /** @type { Set<string> } */
  const diagnostics = new Set();

  const logger = createLogger(connection);
  const markmark = new Markmark(logger);

  /**
   * Resolve references to symbol at location.
   */
  connection.onReferences((event) => {

    logger.info('connection.onReferences', event);

    const uri = event.textDocument.uri;
    const position = lspPositionToUinstPoint(event.position);

    logger.info('connection.onReferences :: position', position);

    const refs = markmark.findReferences({
      uri,
      position: {
        start: position,
        end: position
      }
    });

    logger.info('connection.onReferences :: refs', refs);

    return refs.map(
      ref => Location.create(ref.uri, unistLocationToLspRange(ref.position))
    );
  });

  markmark.on('linter:lint', /** @param { LinterResults[] } reports */ (reports) => {

    /** @type { Set<string> } */
    const oldDiagnostics = new Set(Array.from(diagnostics));

    /** @type { Promise<void> } */
    const jobs = [];

    for (const report of reports) {

      const doc = documents.get(report.uri);

      // only report diagnostics for open files
      if (!doc) {
        continue;
      }

      logger.info('markmark :: linter:lint :: add diagnostics', doc.uri, report);

      jobs.push(connection.sendDiagnostics({
        uri: report.uri,
        diagnostics: report.results.map(result => Diagnostic.create(
          unistLocationToLspRange(result.position),
          result.message,
          toLspSeverity(result.severity),
          undefined,
          'markmark'
        ))
      }));

      diagnostics.add(report.uri);
      oldDiagnostics.delete(report.uri);
    }

    for (const oldUri of oldDiagnostics) {

      logger.info('markmark :: linter:lint :: clear diagnostics', oldUri);

      diagnostics.delete(oldUri);

      jobs.push(connection.sendDiagnostics({
        uri: oldUri,
        diagnostics: []
      }));
    }

    Promise.all(jobs).catch(err => {
      logger.warn('markmark :: linter:lint :: failed to send diagnostics', err);
    });
  });

  connection.onDefinition((event) => {

    logger.info('connection.onDefinition', event);

    const uri = event.textDocument.uri;
    const position = lspPositionToUinstPoint(event.position);

    logger.info('connection.onDefinition :: position', position);

    const defs = markmark.findDefinitions({
      uri,
      position: {
        start: position,
        end: position
      }
    });

    logger.info('connection.onDefinition :: defs', defs);

    return defs.map(
      def => Location.create(def.uri, unistLocationToLspRange(def.position))
    )[0];
  });

  connection.onCompletion(async (event, _, workDoneProgress) => {

    const uri = event.textDocument.uri;
    const position = lspPositionToUinstPoint(event.position);

    logger.info('connection.onCompletion :: get', uri, position);

    try {
      const completions = await markmark.getCompletions({
        uri,
        position
      });

      return completions.map(completion => {

        const {
          label,
          replace: {
            position,
            newText
          },
          detail
        } = completion;

        const completionItem = CompletionItem.create(label);

        completionItem.kind = CompletionItemKind.Reference;
        completionItem.textEdit = TextEdit.replace(unistLocationToLspRange(position), newText);
        completionItem.detail = detail;

        return completionItem;
      });
    } catch (err) {
      logger.error(err.message, err.stack);

      return [];
    }
  });

  connection.onInitialize((event, _, workDoneProgress) => {
    logger.info('connection.onInitialize');

    workDoneProgress.begin('Initializing Markmark language features');

    if (event.workspaceFolders) {
      for (const workspace of event.workspaceFolders) {
        markmark.addRoot(workspace.uri);
      }
    } else if (event.rootUri) {
      markmark.addRoot(event.rootUri);
    }

    markmark.on('ready', () => {
      logger.info('connection.onInitialize');

      workDoneProgress.done();
    });

    const hasWorkspaceFolderSupport = Boolean(
      event.capabilities.workspace &&
        event.capabilities.workspace.workspaceFolders
    );

    const hasFileWatchingSupport = Boolean(
      event.capabilities.workspace.didChangeWatchedFiles
    );

    hasWorkspaceFolderSupport && connection.onInitialized(() => {

      connection.workspace.onDidChangeWorkspaceFolders((event) => {

        logger.info('connection.workspace.onDidChangeWorkspaceFolders', event);

        for (const workspace of event.removed) {
          markmark.removeRoot(workspace.uri);
        }

        for (const workspace of event.added) {
          markmark.addRoot(workspace.uri);
        }
      });

    });

    hasFileWatchingSupport && connection.client.register(DidChangeWatchedFilesNotification.type, {
      watchers: [
        { globPattern: '**/*.md' }
      ]
    });

    hasFileWatchingSupport && connection.onDidChangeWatchedFiles((event) => {

      for (const change of event.changes) {

        const { type, uri } = change;

        switch (type) {
        case FileChangeType.Changed:
          markmark.updateFile(uri);
          break;
        case FileChangeType.Created:
          markmark.addFile(uri);
          break;
        case FileChangeType.Deleted:
          markmark.removeFile(uri);
          break;
        }
      }
    });

    markmark.init({
      watch: !hasFileWatchingSupport
    });

    return {
      capabilities: {
        diagnosticProvider: {
          interFileDependencies: true
        },
        completionProvider: {},
        textDocumentSync: TextDocumentSyncKind.Full,
        referencesProvider: true,
        codeActionProvider: {
          codeActionKinds: [ CodeActionKind.QuickFix ],
          resolveProvider: true
        },
        definitionProvider: true,
        workspace: hasWorkspaceFolderSupport
          ? {
            workspaceFolders: {
              supported: true,
              changeNotifications: true
            }
          }
          : undefined
      }
    };
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
