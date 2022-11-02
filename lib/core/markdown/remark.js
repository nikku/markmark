import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';

import remarkTags from './tags.js';

import extractMetadata from './extract-metadata.js';

/**
 * @type { import('unified').Processor }
 */
export default function remark() {

  return unified()
    .use(remarkParse)
    .use(remarkFrontmatter)
    .use(remarkTags)
    .use(remarkGfm)
    .use(extractMetadata)
    .freeze();
}
