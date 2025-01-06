import { VFile } from 'vfile';

import { Position, Point } from 'unist';
import { Node as UnistNode, Parent as UnistParent } from 'unist';

import { Root, Content, Heading, Definition } from 'mdast';

export type Node = (Content|Root) & UnistNode;
export type Parent = UnistParent;

export type Positioned = {
  position: Position
};

export type DocumentRange = Positioned & {
  uri: string
};

export type LocalLink = Positioned & {
  targetUri: string
};

export type LocalAnchor = Positioned & {
  uri: string
};

export type LocalTag = Positioned & {
  value: string
};

export type DocumentLocation = {
  uri: string,
  position: Point
};

export type File = VFile;

export type TaggedRoot = Root & {
  anchors: LocalAnchor[],
  links: LocalLink[],
  tags: LocalTag[]
};

export type Completion = {
  label: string,
  replace: {
    position: Position,
    newText: string
  },
  detail?: string
};

export type LinterResult = {
  message: string,
  severity: 'warn' | 'error' | 'info' | 'hint',
  position: Position
};

export type LinterResults = {
  uri: string,
  results: LinterResult[]
};

export type IndexItem = Record<string, unknown> & {
  uri: string,
  value?: string,
  version?: number,
  localValue?: string,
  file: File
}

export type ParsedIndexItem = IndexItem & {
  parseTree: TaggedRoot
}

export {
  Root,
  Heading,
  Definition,
  Position,
  Point
};
