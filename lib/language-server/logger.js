/**
 * @param { import('vscode-languageserver').Connection } connection
 *
 * @return { import('../core/logger.js').default }
 */
export function createLogger(connection) {

  return {

    /**
     * @param { unknown[] } args
     */
    log(...args) {
      return connection.console.log(toMessage(args));
    },

    /**
     * @param { unknown[] } args
     */
    info(...args) {
      return connection.console.info(toMessage(args));
    },

    /**
     * @param { unknown[] } args
     */
    warn(...args) {
      return connection.console.debug(toMessage(args));
    },

    /**
     * @param { unknown[] } args
     */
    error(...args) {
      return connection.console.debug(toMessage(args));
    }
  };

}


// helpers ///////////////

/**
 * @param { unknown[] } args
 *
 * @return { string }
 */
function toMessage(args) {
  return args.map(arg => {
    if (typeof arg === 'string') {
      return arg;
    }

    return JSON.stringify(arg, null, 2);
  }).join(' ');
}
