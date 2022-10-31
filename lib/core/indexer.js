import { read } from 'to-vfile';

import { createIndexItem } from './util.js';


/**
 * @typedef { import('./types').IndexItem } IndexItem
 */


export default class Indexer {

  /**
   * @type {Map<string, IndexItem>}
   */
  items = new Map();

  /**
   * @param { import('./logger') } logger
   * @param { import('node:events').EventEmitter } eventBus
   * @param { import('./processor') } processor
   * @param { import('./workqueue') } workqueue
   */
  constructor(logger, eventBus, processor, workqueue) {

    this._logger = logger;
    this._eventBus = eventBus;
    this._processor = processor;
    this._workqueue = workqueue;

    eventBus.once('watcher:ready', () => {
      eventBus.once('workqueue:empty', () => this._emit('ready'));
    });

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
      indexItem.value = localValue;

      return this._processItem(indexItem);
    }

    return this._readItem(indexItem);
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
      item.value = undefined;

      return this._readItem(item);
    }

    this.items.delete(uri);

    return this.removed(item);
  }

  /**
   * @internal
   *
   * @param {string} uri
   */
  _readItem(item) {

    /** @param { IndexItem } item */
    const readFile = async (item) => {
      try {
        const vfile = await read(new URL(item.uri));

        vfile.data.uri = item.uri;

        const file = /** @type File */ (vfile);

        item.file = file;

        return this._processItem(item);
      } catch (err) {
        this._logger.log('indexer :: failed to process ' + item.uri, String(err));
      }
    };

    return this._queue(readFile(item));
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
   *
   * @returns {Promise<IndexItem>}
   */
  _processItem(item) {

    /** @param { IndexItem } item */
    const processFile = async (item) => {
      try {
        await this._processor.process(item);

        this._updated(item);

        return item;
      } catch (err) {
        this._logger.log('indexer :: failed to process item ' + item.uri, String(err));
      }
    };

    return this._queue(processFile(item));
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
   * @return { IndexItem[] }
   */
  getItems() {
    return Array.from(this.items.values());
  }

}
