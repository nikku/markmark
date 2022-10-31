export default class Workqueue {

  /**
   * @type {Set<Promise<any>>}
   */
  queue = new Set();

  /**
   * @param {import('node:events').EventEmitter} eventBus
   */
  constructor(eventBus) {
    this.eventBus = eventBus;
  }

  /**
   * Add work queue item.
   *
   * @template T
   *
   * @param {Promise<T>} value
   *
   * @return { Promise<T> }
   */
  add(value) {

    this.queue.add(value);

    return value.finally(() => {
      this.queue.delete(value);

      if (this.queue.size === 0) {
        this.eventBus.emit('workqueue:empty');
      }
    });
  }

}
