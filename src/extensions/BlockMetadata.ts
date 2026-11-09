import { Extension } from '@tiptap/core';

const blockTypes = [
  'paragraph',
  'heading',
  'blockquote',
  'codeBlock',
  'bulletList',
  'orderedList',
  'outlineList',
  'taskList',
  'callout',
  'table',
  'youtube',
  'webEmbed',
];

export const createBlockId = () => {
  const random = Math.random().toString(36).slice(2, 8);
  return `block-${Date.now().toString(36)}-${random}`;
};

export const BlockMetadata = Extension.create({
  name: 'blockMetadata',

  addGlobalAttributes() {
    return [
      {
        types: blockTypes,
        attributes: {
          blockId: {
            default: null,
            parseHTML: (element) => element.getAttribute('data-block-id'),
            renderHTML: (attributes) =>
              attributes.blockId
                ? { 'data-block-id': attributes.blockId }
                : {},
          },
        },
      },
    ];
  },
});

export default BlockMetadata;
