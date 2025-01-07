import { read } from 'to-vfile';
import { VFile } from 'vfile';

import { createIndexItem } from './util.js';


/**
 * @typedef { import('./types.js').IndexItem } IndexItem
 * @typedef { import('./types.js').TaggedRoot } TaggedRoot
 *
 * @typedef { IndexItem & { file: VFile } } ReadIndexItem
 * @typedef { import('./types.js').ParsedIndexItem } ParsedIndexItem
 *
 * @typedef { IndexItem & {
 *   _read?: () => Promise<ReadIndexItem>,
 *   _process?: () => Promise<ParsedIndexItem>,
 *   _parsed?: Promise<ParsedIndexItem>,
 *   parseTree?: TaggedRoot
 * } } InternalIndexItem
 */


export default class Indexer {

  /**
   * @type { Set<string> }
   */
  roots = new Set();

  /**
   * @type { Map<string, IndexItem> }
   */
  items = new Map();

  /**
   * @param { import('./logger.js').default } logger
   * @param { import('node:events').EventEmitter } eventBus
   * @param { import('./processor.js').default } processor
   * @param { import('./workqueue.js').default } workqueue
   */
  constructor(logger, eventBus, processor, workqueue) {

    this._logger = logger;
    this._eventBus = eventBus;
    this._processor = processor;
    this._workqueue = workqueue;

    eventBus.on('watcher:add', (uri) => {
      this.add(uri);
    });

    eventBus.on('watcher:remove', (uri) => {
      this.remove(uri);
    });
  }

  on(event, callback) {
    this._eventBus.on('indexer:' + event, callback);
  }

  once(event, callback) {
    this._eventBus.once('indexer:' + event, callback);
  }

  _emit(event, ...args) {
    this._eventBus.emit('indexer:' + event, ...args);
  }

  /**
   * Add root
   *
   * @param { string } uri
   */
  addRoot(uri) {
    this.roots.add(uri);

    this._emit('roots:add', uri);
  }

  /**
   * Remove root
   *
   * @param { string } uri
   */
  removeRoot(uri) {
    this.roots.delete(uri);

    this._emit('roots:remove', uri);
  }

  /**
   * @return { string[] } roots
   */
  getRoots() {
    return Array.from(this.roots);
  }

  /**
   * @param { string } uri
   * @param { string } [localValue]
   */
  add(uri, localValue) {
    this._logger.log('indexer :: add', uri, !!localValue);

    let indexItem = this.items.get(uri);

    if (!indexItem) {
      indexItem = createIndexItem({ uri, localValue });

      this.items.set(uri, indexItem);
    }

    if (localValue) {
      indexItem.value = indexItem.localValue = localValue;
      indexItem._read = () => Promise.resolve(indexItem);
    } else {
      indexItem._read = undefined;
      indexItem.global = true;
    }

    indexItem._process = undefined;

    return this._parseItem(indexItem);
  }

  /**
   * Notify file opened
   *
   * @param { { uri: string, value: string } } fileProps
   */
  fileOpen(fileProps) {

    const {
      uri,
      value
    } = fileProps;

    return this.add(uri, value);
  }

  /**
   * Notify file content changed
   *
   * @param { { uri: string, value: string } } fileProps
   */
  fileContentChanged(fileProps) {

    const {
      uri,
      value
    } = fileProps;

    return this.add(uri, value);
  }

  /**
   * Notify file closed
   *
   * @param {string} uri
   */
  fileClosed(uri) {
    this.remove(uri, true);
  }

  /**
   * @param {string} uri
   * @param {boolean} [local]
   */
  remove(uri, local = false) {
    this._logger.log('indexer :: remove', uri, local);

    const item = this.items.get(uri);

    if (!item) {
      return;
    }

    if (local) {
      item.value = item.localValue = undefined;

      item._read = undefined;
      item._process = undefined;

      if (item.global) {
        return this._parseItem(item);
      }
    } else {
      if (item.localValue) {
        item.global = false;

        return this._parseItem(item);
      }
    }

    this.items.delete(uri);

    return this._removed(item);
  }

  /**
   * @internal
   *
   * @param {InternalIndexItem} item
   *
   * @return {Promise<ParsedIndexItem>}
   */
  async _parseItem(item) {

    let {
      _read,
      _process,
      _parsed
    } = item;

    if (!_read) {
      this._logger.log('indexer :: reading item ' + item.uri);

      _read = item._read = () => this._readItem(item);
      _parsed = undefined;
    }

    if (!_process) {
      this._logger.log('indexer :: processing item ' + item.uri);

      _process = item._process = () => this._processItem(item);
      _parsed = undefined;
    }

    if (!_parsed) {
      _parsed = item._parsed = _read().then(_process).then((item) => {
        this._updated(item);

        return item;
      }, err => {
        this._logger.log('indexer :: failed to parse item ' + item.uri, err);

        throw err;
      });
    }

    return this._queue(_parsed);
  }

  /**
   * @internal
   *
   * @param { IndexItem } item
   *
   * @return { Promise<IndexItem> }
   */
  async _readItem(item) {
    item.file = await read(new URL(item.uri)).catch(err => new VFile({
      path: new URL(item.uri),
      value: ''
    }));

    return item;
  }

  /**
   * @internal
   *
   * @param { InternalIndexItem } item
   *
   * @return { Promise<ParsedIndexItem> }
   */
  async _processItem(item) {
    item.parseTree = await this._processor.process(item);

    return /** @type { ParsedIndexItem } */ (item);
  }

  /**
   * @internal
   *
   * @template T
   *
   * @param {Promise<T>} value
   *
   * @return {Promise<T>}
   */
  _queue(value) {
    return this._workqueue.add(value);
  }

  /**
   * @internal
   *
   * @param {IndexItem} item
   */
  _updated(item) {
    this._logger.log('indexer :: updated', item.uri);

    this._emit('updated', item);
  }

  /**
   * @internal
   *
   * @param {IndexItem} item
   */
  _removed(item) {
    this._emit('removed', item);
  }

  /**
   * Get item with the given uri
   *
   * @param { string } uri
   *
   * @return { Promise<ParsedIndexItem | undefined> }
   */
  async get(uri) {

    const item = this.items.get(uri);

    if (!item) {
      return undefined;
    }

    return this._parseItem(item);
  }

  /**
   * Return known index items.
   *
   * @return { IndexItem[] }
   */
  getItems() {
    return Array.from(this.items.values());
  }

}
