import { EventEmitter } from 'node:events';

import References from './references.js';
import Completions from './completions.js';
import Workqueue from './workqueue.js';
import Processor from './processor.js';
import Watcher from './watcher.js';
import Indexer from './indexer.js';

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

    this._workqueue = new Workqueue(this);
    this._processor = new Processor(logger);
    this._watcher = new Watcher(logger, this);
    this._indexer = new Indexer(logger, this, this._processor, this._workqueue);

    this._references = new References(logger, this);
    this._completions = new Completions(logger, this._indexer, this._references);

    this.once('indexer:ready', () => {
      this.emit('ready');
    });
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
    return this._watcher.close();
  }
}
