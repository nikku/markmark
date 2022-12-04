/**
 * @param {import('vscode-languageserver').Connection} connection
 *
 * @return { import('../core/logger').Logger }
 */
export function createLogger(connection) {

  return {

    /**
     * @param { any[] } args
     */
    log(...args) {
      return connection.console.log(toMessage(args));
    },

    /**
     * @param { any[] } args
     */
    info(...args) {
      return connection.console.info(toMessage(args));
    },

    /**
     * @param { any[] } args
     */
    warn(...args) {
      return connection.console.debug(toMessage(args));
    },

    /**
     * @param { any[] } args
     */
    error(...args) {
      return connection.console.debug(toMessage(args));
    }
  };

}


// helpers ///////////////

function toMessage(args) {
  return args.map(arg => {
    if (typeof arg === 'string') {
      return arg;
    }

    return JSON.stringify(arg, null, 2);
  }).join(' ');
}
