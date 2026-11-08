/// <reference types="react-scripts" />

declare module '@tiptap/react/menus' {
  import * as React from 'react';

  interface TiptapMenuProps {
    editor: any;
    options?: any;
    shouldShow?: (props: any) => boolean;
    children?: React.ReactNode;
  }

  export const BubbleMenu: React.ComponentType<TiptapMenuProps>;
  export const FloatingMenu: React.ComponentType<TiptapMenuProps>;
}
