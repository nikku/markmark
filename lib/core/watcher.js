import {
  FSWatcher
} from 'chokidar';

import {
  pathToFileURL,
  fileURLToPath
} from 'node:url';


export default class Watcher {

  /**
   * @param { import('./logger') } logger
   * @param { import('node:events').EventEmitter } eventBus
   */
  constructor(logger, eventBus) {

    this._logger = logger;
    this._eventBus = eventBus;

    /**
     * @type { string[] }
     */
    this.roots = [];

    /**
     * @type {Set<string>}
     */
    this.files = new Set();

    /**
     * @type { import('chokidar').FSWatcher }
     */
    this.chokidar = new FSWatcher({
      ignored: /\/(node_modules|\.git)\//i,
      atomic: 300
    });

    this.chokidar.on('add', path => {

      if (!/\.md$/i.test(path)) {
        return;
      }

      this.files.add(path);

      this.emit('add', pathToFileURL(path).toString());

      this._changed();
    });

    this.chokidar.on('unlink', path => {
      this.emit('remove', pathToFileURL(path).toString());

      this.files.delete(path);

      this._changed();
    });

    false && this.chokidar.on('all', (event, arg0) => {
      logger.log(event, arg0);
    });

    this.chokidar.on('ready', () => {
      this.emit('ready');
    });
  }

  /**
   * @param { string } event
   *
   * @param { ...any[] } args
   */
  emit(event, ...args) {
    this._eventBus.emit('watcher:' + event, ...args);
  }

  /**
   * @internal
   */
  _changed() {
    clearTimeout(this._changedTimer);

    this._changedTimer = setTimeout(() => {
      this.emit('changed');
    }, 300);

  }

  /**
   * @return {string[]}
   */
  getFiles() {
    return Array.from(this.files);
  }

  /**
   * Add watched folder
   *
   * @param {string} uri
   */
  addFolder(uri) {
    this._logger.log('watcher :: addFolder', uri);

    const path = fileURLToPath(uri);

    if (this.roots.some(root => path.startsWith(root))) {
      return;
    }

    this.roots.push(path);

    this.chokidar.add(path);
  }

  /**
   * Remove watched folder
   *
   * @param {string} uri
   */
  removeFolder(uri) {
    this._logger.log('watcher :: removeFolder', uri);

    const path = fileURLToPath(uri);

    if (!this.roots.some(root => path.startsWith(root))) {
      return;
    }

    this.chokidar.unwatch(path);

    this.roots = this.roots.filter(p => p !== path);
  }

  close() {
    this._logger.log('watcher :: close');

    return this.chokidar.close();
  }
}
