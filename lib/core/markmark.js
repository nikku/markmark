import { EventEmitter } from 'node:events';

import References from './references.js';
import Completions from './completions.js';
import Workqueue from './workqueue.js';
import Processor from './processor.js';
import Watcher from './watcher.js';
import Indexer from './indexer.js';
import Linter from './linter.js';

/**
 * @typedef { import('./types').DocumentRange } DocumentRange
 * @typedef { import('./types').Positioned } Positioned
 */

export default class Markmark extends EventEmitter {

  /**
   * @param { import('./logger').default } logger
   */
  constructor(logger) {

    super();

    this._logger = logger;

    this._workqueue = new Workqueue(this);
    this._processor = new Processor(logger);
    this._indexer = new Indexer(logger, this, this._processor, this._workqueue);

    this._references = new References(logger, this);
    this._linter = new Linter(logger, this, this._references);

    this._completions = new Completions(logger, this._indexer, this._references);
  }

  /**
   * Add root
   *
   * @param { string } uri
   */
  addRoot(uri) {
    return this._indexer.addRoot(uri);
  }

  /**
   * Remove root
   *
   * @param { string } uri
   */
  removeRoot(uri) {
    return this._indexer.removeRoot(uri);
  }

  /**
   * Add file
   *
   * @param {string} uri
   */
  addFile(uri) {
    return this._indexer.add(uri);
  }

  /**
   * Notify file changed
   *
   * @param {string} uri
   */
  updateFile(uri) {
    return this.addFile(uri);
  }

  /**
   * Remove file
   *
   * @param {string} uri
   */
  removeFile(uri) {
    return this._indexer.remove(uri);
  }

  /**
   * Notify file opened
   *
   * @param { { uri: string, value: string } } fileProps
   */
  fileOpen(fileProps) {
    return this._indexer.fileOpen(fileProps);
  }

  /**
   * Notify file content changed
   *
   * @param { { uri: string, value: string } } fileProps
   */
  fileContentChanged(fileProps) {
    return this._indexer.fileContentChanged(fileProps);
  }

  /**
   * Notify file closed
   *
   * @param { string } uri
   */
  fileClosed(uri) {
    return this._indexer.fileClosed(uri);
  }

  /**
   * Find definitions of reference
   *
   * @param { DocumentRange } ref
   *
   * @return { Positioned[] } definitions
   */
  findDefinitions(ref) {
    return this._references.findDefinitions(ref);
  }

  /**
   * Find references to referenced link _or_ current document
   *
   * @param { DocumentRange } ref
   *
   * @return { Positioned[] } references
   */
  findReferences(ref) {
    return this._references.findReferences(ref);
  }

  /**
   * Find references to referenced link _or_ current document
   *
   * @param { string } uri
   *
   * @return { Positioned[] } references
   */
  findDocumentLinks(uri) {
    return this._references.findDocumentLinks(uri);
  }

  /**
   * Get completion at position
   *
   * @param { DocumentRange } ref
   *
   * @return { Promise<Completion[]> } completions
   */
  getCompletions(ref) {
    return this._completions.get(ref);
  }

  /**
   * @return { Promise<Void> }
   */
  close() {

    if (this._watcher) {
      return this._watcher.close();
    }

    return Promise.resolve();
  }

  /**
   * @param { { watch: boolean } } opts
   */
  init(opts) {

    if (opts.watch) {
      this._watcher = new Watcher(this._logger, this);

      this.once('watcher:ready', () => {
        this.once('workqueue:empty', () => this.emit('ready'));
      });
    } else {
      this.once('workqueue:empty', () => this.emit('ready'));
    }
  }

}
