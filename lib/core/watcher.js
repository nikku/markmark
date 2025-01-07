import {
  FSWatcher
} from 'chokidar';

import {
  pathToFileURL,
  fileURLToPath
} from 'node:url';


export default class Watcher {

  /**
   * @param { import('./logger.js').default } logger
   * @param { import('node:events').EventEmitter } eventBus
   */
  constructor(logger, eventBus) {

    this._logger = logger;
    this._eventBus = eventBus;

    /**
     * @type { string[] }
     */
    this._roots = [];

    /**
     * @type {Set<string>}
     */
    this._files = new Set();

    this._logger.log('watcher :: start');

    /**
     * @type { import('chokidar').FSWatcher }
     */
    this._chokidar = new FSWatcher({
      ignored: /\/(node_modules|\.git)\//i,
      atomic: 300
    });

    this._chokidar.on('add', path => {

      if (!/\.md$/i.test(path)) {
        return;
      }

      this._addFile(path);
    });

    this._chokidar.on('unlink', path => {
      this._removeFile(path);
    });

    if (/\*|events/.test(process.env.DEBUG || '')) {
      this._chokidar.on('all', (event, arg0) => {
        this._logger.log(event, arg0);
      });
    }

    this._chokidar.on('ready', () => {
      this._emit('ready');
    });

    eventBus.on('indexer:roots:add', (uri) => {
      this.addFolder(uri);
    });

    eventBus.on('indexer:roots:remove', (uri) => {
      this.removeFolder(uri);
    });

  }

  /**
   * @param {string} path
   */
  _removeFile(path) {
    this._emit('remove', pathToFileURL(path).toString());

    this._files.delete(path);

    this._changed();
  }

  /**
   * @param { string } path
   */
  _addFile(path) {
    this._files.add(path);

    this._emit('add', pathToFileURL(path).toString());

    this._changed();
  }

  /**
   * @param { string } event
   *
   * @param { ...unknown } args
   */
  _emit(event, ...args) {
    this._eventBus.emit('watcher:' + event, ...args);
  }

  /**
   * @internal
   */
  _changed() {
    clearTimeout(this._changedTimer);

    this._changedTimer = setTimeout(() => {
      this._emit('changed');
    }, 300);

  }

  /**
   * @return {string[]}
   */
  getFiles() {
    return Array.from(this._files);
  }

  /**
   * Add watched folder
   *
   * @param {string} uri
   */
  addFolder(uri) {
    this._logger.log('watcher :: addFolder', uri);

    const path = fileURLToPath(uri);

    if (this._roots.some(root => path.startsWith(root))) {
      return;
    }

    this._roots.push(path);

    this._chokidar.add(path);
  }

  /**
   * Remove watched folder
   *
   * @param {string} uri
   */
  removeFolder(uri) {
    this._logger.log('watcher :: removeFolder', uri);

    const path = fileURLToPath(uri);

    if (!this._roots.some(root => path.startsWith(root))) {
      return;
    }

    this._chokidar.unwatch(path);

    this._roots = this._roots.filter(p => p !== path);

    for (const file of this._files) {

      if (file.startsWith(path)) {
        this._removeFile(file);
      }
    }
  }

  close() {
    this._logger.log('watcher :: close');

    return this._chokidar.close();
  }
}
