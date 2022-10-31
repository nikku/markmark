import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';

import tagLinks from './tag-links.js';

/**
 * @type { import('unified').Processor }
 */
export default function remark() {

  return unified()
    .use(remarkParse)
    .use(remarkFrontmatter)
    .use(remarkGfm)
    .use(tagLinks)
    .freeze();
}
