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

      const message = args.map(arg => {
        if (typeof arg === 'string') {
          return arg;
        }

        return JSON.stringify(arg, null, 2);
      }).join(' ');

      connection.console.log(message);
    }
  };

}
