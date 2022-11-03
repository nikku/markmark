import Indexer from '../../../lib/core/indexer.js';
import Processor from '../../../lib/core/processor.js';
import Workqueue from '../../../lib/core/workqueue.js';
import Completions from '../../../lib/core/completions.js';
import References from '../../../lib/core/references.js';

import { EventEmitter } from 'node:events';

import { expect } from 'chai';
import { pathToFileURL } from 'node:url';


const NOTES_ROOT_URI = pathToFileURL('test/fixtures/notes').toString();
const IDEAS_URI = pathToFileURL('test/fixtures/notes/IDEAS.md').toString();

const COMPLETIONS_ROOT_URI = pathToFileURL('test/fixtures/completions').toString();
const BASE_URI = pathToFileURL('test/fixtures/completions/BASE.md').toString();
const ANCHOR_URI = pathToFileURL('test/fixtures/completions/ANCHOR.md').toString();
const TAGGED_URI = pathToFileURL('test/fixtures/completions/TAGGED.md').toString();


describe('core/completions', () => {

  let processor, indexer, workqueue,
      eventBus, completions, references;

  beforeEach(() => {
    eventBus = new EventEmitter();
    workqueue = new Workqueue(eventBus);
    processor = new Processor(console);
    indexer = new Indexer(console, eventBus, processor, workqueue);
    references = new References(console, eventBus);
    completions = new Completions(console, indexer, references);
  });


  beforeEach(async () => {
    indexer.addRoot(COMPLETIONS_ROOT_URI);
    await indexer.add(ANCHOR_URI);
    await indexer.add(BASE_URI);
    await indexer.add(TAGGED_URI);

    indexer.addRoot(NOTES_ROOT_URI);
    await indexer.add(IDEAS_URI);
  });


  it('should complete tag', async () => {

    // when
    const items = await completions.get({
      uri: BASE_URI,
      position: {
        line: 1,
        column: 3
      }
    });

    // then
    expect(items).to.eql([
      {
        label: '#fo',
        replace: {
          position: {
            start: {
              line: 1,
              column: 1,
              offset: 0
            },
            end: {
              line: 1,
              column: 4,
              offset: 3
            }
          },
          newText: '#fo'
        }
      },
      {
        label: '#fooop',
        replace: {
          position: {
            start: {
              line: 1,
              column: 1,
              offset: 0
            },
            end: {
              line: 1,
              column: 4,
              offset: 3
            }
          },
          newText: '#fooop'
        }
      }
    ]);
  });


  it('should complete text <#>', async () => {

    // when
    const items = await completions.get({
      uri: BASE_URI,
      position: {
        line: 1,
        column: 6
      }
    });

    const expectedCompletions = [
      'fo',
      'fooop',
      'other',
      'bar'
    ].map(tag => ({
      label: '#' + tag,
      replace: {
        position: {
          start: {
            line: 1,
            column: 5,
            offset: 4
          },
          end: {
            line: 1,
            column: 6,
            offset: 5
          }
        },
        newText: '#' + tag
      }
    }));

    // then
    expect(items).to.eql(expectedCompletions);
  });


  it('should complete heading <#>', async () => {

    // when
    const items = await completions.get({
      uri: BASE_URI,
      position: {
        line: 14,
        column: 2
      }
    });

    const expectedCompletions = [
      'fo',
      'fooop',
      'other',
      'bar'
    ].map(tag => ({
      label: '#' + tag,
      replace: {
        position: {
          start: {
            line: 14,
            column: 1,
            offset: 109
          },
          end: {
            line: 14,
            column: 2,
            offset: 110
          }
        },
        newText: '#' + tag
      }
    }));

    // then
    expect(items).to.eql(expectedCompletions);
  });


  it('should NOT complete link name', async () => {

    // when
    const nameCompletions = await completions.get({
      uri: BASE_URI,
      position: {
        line: 3,
        column: 2
      }
    });

    // then
    expect(nameCompletions).to.eql([]);
  });


  it('should complete link ref', async () => {

    // [](|)

    // when
    const refCompletions = await completions.get({
      uri: BASE_URI,
      position: {
        line: 3,
        column: 4
      }
    });

    // then
    expect(refCompletions).to.eql([
      {
        'label': './ANCHOR.md#anchor',
        'replace': {
          'position': {
            'start': {
              'line': 3,
              'column': 4,
              'offset': 17
            },
            'end': {
              'line': 3,
              'column': 4,
              'offset': 17
            }
          },
          'newText': './ANCHOR.md#anchor'
        }
      },
      {
        'label': './ANCHOR.md#deeplink',
        'replace': {
          'position': {
            'start': {
              'line': 3,
              'column': 4,
              'offset': 17
            },
            'end': {
              'line': 3,
              'column': 4,
              'offset': 17
            }
          },
          'newText': './ANCHOR.md#deeplink'
        }
      },
      {
        'label': './ANCHOR.md',
        'replace': {
          'position': {
            'start': {
              'line': 3,
              'column': 4,
              'offset': 17
            },
            'end': {
              'line': 3,
              'column': 4,
              'offset': 17
            }
          },
          'newText': './ANCHOR.md'
        }
      },
      {
        'label': '#local',
        'replace': {
          'position': {
            'start': {
              'line': 3,
              'column': 4,
              'offset': 17
            },
            'end': {
              'line': 3,
              'column': 4,
              'offset': 17
            }
          },
          'newText': '#local'
        }
      },
      {
        'label': './TAGGED.md#tagged',
        'replace': {
          'position': {
            'start': {
              'line': 3,
              'column': 4,
              'offset': 17
            },
            'end': {
              'line': 3,
              'column': 4,
              'offset': 17
            }
          },
          'newText': './TAGGED.md#tagged'
        }
      },
      {
        'label': './TAGGED.md',
        'replace': {
          'position': {
            'start': {
              'line': 3,
              'column': 4,
              'offset': 17
            },
            'end': {
              'line': 3,
              'column': 4,
              'offset': 17
            }
          },
          'newText': './TAGGED.md'
        }
      }
    ]);
  });


  it('should complete link ref within root', async () => {

    // [](|)

    // when
    const refCompletions = await completions.get({
      uri: BASE_URI,
      position: {
        line: 5,
        column: 9
      }
    });

    // then
    expect(refCompletions).to.eql([]);
  });


  it('should complete link ref with prefix', async () => {

    // [](./A|N)

    // when
    const refCompletions = await completions.get({
      uri: BASE_URI,
      position: {
        line: 7,
        column: 7
      }
    });

    // then
    expect(refCompletions).to.eql([
      {
        'label': './ANCHOR.md#anchor',
        'replace': {
          'position': {
            'start': {
              'line': 7,
              'column': 4,
              'offset': 43
            },
            'end': {
              'line': 7,
              'column': 8,
              'offset': 47
            }
          },
          'newText': './ANCHOR.md#anchor'
        }
      },
      {
        'label': './ANCHOR.md#deeplink',
        'replace': {
          'position': {
            'start': {
              'line': 7,
              'column': 4,
              'offset': 43
            },
            'end': {
              'line': 7,
              'column': 8,
              'offset': 47
            }
          },
          'newText': './ANCHOR.md#deeplink'
        }
      },
      {
        'label': './ANCHOR.md',
        'replace': {
          'position': {
            'start': {
              'line': 7,
              'column': 4,
              'offset': 43
            },
            'end': {
              'line': 7,
              'column': 8,
              'offset': 47
            }
          },
          'newText': './ANCHOR.md'
        }
      }
    ]);
  });

});


// eslint-disable-next-line
function on(event, eventBus) {
  return new Promise((resolve) => {
    eventBus.once(event, resolve);
  });
}
