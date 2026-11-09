import { mergeAttributes, Node } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    outlineList: {
      toggleOutlineList: () => ReturnType;
    };
  }
}

export const OutlineList = Node.create({
  name: 'outlineList',
  group: 'block list',
  content: 'listItem+',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  parseHTML() {
    return [{ tag: 'ol[data-outline-list]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'ol',
      mergeAttributes(
        { 'data-outline-list': 'true', class: 'outline-list' },
        HTMLAttributes
      ),
      0,
    ];
  },

  addCommands() {
    return {
      toggleOutlineList:
        () =>
        ({ commands }) =>
          commands.toggleList(this.name, 'listItem'),
    };
  },
});

export default OutlineList;
