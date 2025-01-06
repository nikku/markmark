import { Literal } from 'mdast';

interface Tag extends Literal {
  type: 'tag';
  value: string;
}

declare module 'mdast' {

  interface RootContentMap {
    tag: Tag
  }
}

declare module 'micromark-util-types' {

  interface TokenTypeMap {
    tag: 'tag'
    tagName: 'tagName'
  }

}
