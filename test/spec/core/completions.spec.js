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
const HEADING_URI = pathToFileURL('test/fixtures/completions/HEADING.md').toString();
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
    await indexer.add(HEADING_URI);

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
      uri: HEADING_URI,
      position: {
        line: 1,
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
            line: 1,
            column: 1,
            offset: 0
          },
          end: {
            line: 1,
            column: 2,
            offset: 1
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
      },
      {
        'label': './HEADING.md',
        'replace': {
          'newText': './HEADING.md',
          'position': {
            'end': {
              'column': 4,
              'line': 3,
              'offset': 17
            },
            'start': {
              'column': 4,
              'line': 3,
              'offset': 17
            }
          }
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
              'offset': 44
            },
            'end': {
              'line': 7,
              'column': 8,
              'offset': 48
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
              'offset': 44
            },
            'end': {
              'line': 7,
              'column': 8,
              'offset': 48
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
              'offset': 44
            },
            'end': {
              'line': 7,
              'column': 8,
              'offset': 48
            }
          },
          'newText': './ANCHOR.md'
        }
      }
    ]);
  });


  it('should complete link (with image) ref', async () => {

    // [](./A|N)

    // when
    const refCompletions = await completions.get({
      uri: BASE_URI,
      position: {
        line: 8,
        column: 24
      }
    });

    const expectedCompletions = [
      './ANCHOR.md#anchor',
      './ANCHOR.md#deeplink',
      './ANCHOR.md'
    ].map(ref => ({
      'label': ref,
      'replace': {
        'position': {
          'start': {
            'line': 8,
            'column': 21,
            'offset': 70
          },
          'end': {
            'line': 8,
            'column': 25,
            'offset': 74
          }
        },
        'newText': ref
      }
    }));

    // then
    expect(refCompletions).to.eql(expectedCompletions);
  });


  it('should complete link (with image) ref', async () => {

    // [](./A|N)

    // when
    const refCompletions = await completions.get({
      uri: BASE_URI,
      position: {
        line: 4,
        column: 7
      }
    });

    const expectedCompletions = [
      './ANCHOR.md#anchor',
      './ANCHOR.md#deeplink',
      './ANCHOR.md',
      '#local',
      './TAGGED.md#tagged',
      './TAGGED.md',
      './HEADING.md'
    ].map(ref => ({
      'label': ref,
      'replace': {
        'position': {
          'start': {
            'line': 4,
            'column': 7,
            'offset': 25
          },
          'end': {
            'line': 4,
            'column': 7,
            'offset': 25
          }
        },
        'newText': ref
      }
    }));

    // then
    expect(refCompletions).to.eql(expectedCompletions);
  });

});


// eslint-disable-next-line
function on(event, eventBus) {
  return new Promise((resolve) => {
    eventBus.once(event, resolve);
  });
}
