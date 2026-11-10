import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import debounce from 'lodash/debounce';
import { EditorContent, useEditor } from '@tiptap/react';
import { DragHandle } from '@tiptap/extension-drag-handle-react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import { CharacterCount, Placeholder } from '@tiptap/extensions';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { TableKit } from '@tiptap/extension-table';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyleKit } from '@tiptap/extension-text-style';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { FindAndReplace } from '@tiptap/extension-find-and-replace';
import Mathematics from '@tiptap/extension-mathematics';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Youtube from '@tiptap/extension-youtube';
import { createLowlight } from 'lowlight';
import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import python from 'highlight.js/lib/languages/python';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import DOMPurify from 'dompurify';
import Callout, { CalloutType } from '../extensions/Callout';
import OutlineList from '../extensions/OutlineList';
import BlockMetadata, { createBlockId } from '../extensions/BlockMetadata';
import WebEmbed from '../extensions/WebEmbed';
import MediaEmbed, { MediaKind } from '../extensions/MediaEmbed';
import 'katex/dist/katex.min.css';

const lowlight = createLowlight();
lowlight.register({
  bash,
  css,
  html: xml,
  java,
  javascript,
  json,
  python,
  sql,
  typescript,
  xml,
});

interface DynamicProps {
  debugMode: boolean;
  onChange: (text: string) => void;
  readOnly: boolean;
  text: string;
}

interface ToolbarButtonProps {
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
  onClick: () => void;
}

interface SlashMenuState {
  open: boolean;
  query: string;
  from: number;
  to: number;
  x: number;
  y: number;
  selected: number;
}

interface SlashCommandDefinition {
  id: string;
  label: string;
  description: string;
  keywords: string;
}

const CLOSED_SLASH_MENU: SlashMenuState = {
  open: false,
  query: '',
  from: 0,
  to: 0,
  x: 0,
  y: 0,
  selected: 0,
};

const SLASH_COMMANDS: SlashCommandDefinition[] = [
  {
    id: 'paragraph',
    label: '正文',
    description: '普通正文段落',
    keywords: '正文 段落 text normal paragraph',
  },
  {
    id: 'heading1',
    label: '一级标题',
    description: '一级大标题',
    keywords: '一级标题 标题 h1 title heading',
  },
  {
    id: 'heading2',
    label: '二级标题',
    description: '二级标题',
    keywords: '二级标题 标题 h2 subtitle heading',
  },
  {
    id: 'heading3',
    label: '三级标题',
    description: '三级标题',
    keywords: '三级标题 标题 h3 heading',
  },
  {
    id: 'bullet-list',
    label: '无序列表',
    description: '项目符号列表',
    keywords: '无序列表 项目符号 bullet list unordered',
  },
  {
    id: 'ordered-list',
    label: '有序列表',
    description: '编号列表',
    keywords: '有序列表 编号 ordered numbered list',
  },
  {
    id: 'outline-list',
    label: '大纲列表',
    description: '多级层次编号',
    keywords: '大纲 层级 outline nested hierarchy numbered list',
  },
  {
    id: 'task-list',
    label: '任务列表',
    description: '可勾选任务清单',
    keywords: '任务 待办 清单 task todo checkbox checklist',
  },
  {
    id: 'callout',
    label: '提示块',
    description: '醒目的提示/警告内容块',
    keywords: '提示 信息 警告 callout note info tip warning',
  },
  {
    id: 'quote',
    label: '引用',
    description: '引用块',
    keywords: 'blockquote quote',
  },
  {
    id: 'code-block',
    label: '代码块',
    description: '预格式化代码',
    keywords: 'code preformatted',
  },
  {
    id: 'inline-math',
    label: '行内公式',
    description: '正文中的 KaTeX 公式',
    keywords: 'math latex katex equation inline',
  },
  {
    id: 'block-math',
    label: '公式块',
    description: '居中的 KaTeX 公式块',
    keywords: 'math latex katex equation block',
  },
  {
    id: 'table',
    label: '表格',
    description: '插入 3×3 表格',
    keywords: 'table grid',
  },
  {
    id: 'image',
    label: '图片',
    description: '通过 URL 插入图片',
    keywords: 'image picture photo url',
  },
  {
    id: 'youtube',
    label: 'YouTube',
    description: '嵌入 YouTube 视频',
    keywords: 'youtube video embed media',
  },
  {
    id: 'web-embed',
    label: '网页嵌入',
    description: '安全沙箱嵌入 HTTPS 网页',
    keywords: 'web iframe embed page media',
  },
  {
    id: 'audio',
    label: '音频',
    description: '嵌入远程 HTTPS 音频',
    keywords: 'audio sound music media',
  },
  {
    id: 'video',
    label: '视频',
    description: '嵌入远程 HTTPS 视频',
    keywords: 'video movie media',
  },
  {
    id: 'divider',
    label: '分割线',
    description: '水平分割线',
    keywords: 'divider separator horizontal rule',
  },
  {
    id: 'date',
    label: '当前日期',
    description: '插入本地日期',
    keywords: 'date today calendar',
  },
  {
    id: 'time',
    label: '当前时间',
    description: '插入本地时间',
    keywords: 'time clock now',
  },
  {
    id: 'date-time',
    label: '日期和时间',
    description: '插入本地日期和时间',
    keywords: 'date time timestamp now',
  },
];

const ToolbarButton = ({
  active,
  disabled,
  title,
  children,
  onClick,
}: ToolbarButtonProps) => (
  <button
    type="button"
    className={`rich-toolbar-button${active ? ' active' : ''}`}
    disabled={disabled}
    title={title}
    aria-label={title}
    onMouseDown={(event) => {
      event.preventDefault();
      if (!disabled) {
        onClick();
      }
    }}
  >
    {children}
  </button>
);

const normalizeLink = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^(https?:|mailto:|tel:|#|\/)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

const isRemoteImageUrl = (value: string) => /^https?:\/\//i.test(value.trim());

const richOnlyMarks = new Set([
  'highlight',
  'subscript',
  'superscript',
  'textStyle',
]);

const hasRichOnlyFormatting = (node: any): boolean => {
  if (!node) return false;

  if (
    node.type === 'callout' ||
    node.type === 'outlineList' ||
    node.type === 'youtube' ||
    node.type === 'webEmbed' ||
    node.type === 'mediaEmbed'
  ) {
    return true;
  }

  if (node.attrs && node.attrs.blockId) {
    return true;
  }

  if (
    Array.isArray(node.marks) &&
    node.marks.some((mark: any) => richOnlyMarks.has(mark.type))
  ) {
    return true;
  }

  if (
    node.attrs &&
    typeof node.attrs.textAlign === 'string' &&
    node.attrs.textAlign !== 'left'
  ) {
    return true;
  }

  if (node.attrs && typeof node.attrs.dir === 'string' && node.attrs.dir) {
    return true;
  }

  if (
    node.type === 'image' &&
    node.attrs &&
    (node.attrs.width || node.attrs.height)
  ) {
    return true;
  }

  return Array.isArray(node.content)
    ? node.content.some((child: any) => hasRichOnlyFormatting(child))
    : false;
};

const serializeEditorContent = (editor: any) =>
  hasRichOnlyFormatting(editor.getJSON()) ? editor.getHTML() : editor.getMarkdown();

const supportedHtmlTags = new Set([
  'a',
  'aside',
  'audio',
  'b',
  'blockquote',
  'br',
  'code',
  'del',
  'div',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'i',
  'img',
  'input',
  'li',
  'mark',
  'ol',
  'p',
  'pre',
  's',
  'span',
  'strong',
  'sub',
  'sup',
  'table',
  'tbody',
  'video',
  'td',
  'th',
  'thead',
  'tr',
  'u',
  'ul',
]);

const hasPotentiallyUnsupportedHtml = (value: string) => {
  if (!/<[a-z][\s\S]*>/i.test(value)) return false;

  const documentValue = new DOMParser().parseFromString(value, 'text/html');
  const elements = Array.from(documentValue.body.querySelectorAll('*'));

  for (const element of elements) {
    const tag = element.tagName.toLowerCase();

    if (tag === 'iframe') {
      if (
        element.closest('[data-youtube-video]') ||
        element.closest('[data-web-embed]')
      ) {
        continue;
      }
      return true;
    }

    if (!supportedHtmlTags.has(tag)) {
      return true;
    }
  }

  return false;
};

const isRichHtmlDocument = (value: string) =>
  /^\s*<(?:p|h[1-6]|ul|ol|blockquote|table|pre|div|aside)\b/i.test(value);

const setEditorContent = (editor: any, value: string, emitUpdate = false) => {
  editor.commands.setContent(value || '', {
    contentType: isRichHtmlDocument(value) ? 'html' : 'markdown',
    emitUpdate,
  });
};

export default function DynamicEditor({
  debugMode,
  onChange,
  readOnly,
  text,
}: DynamicProps) {
  const [sourceMode, setSourceMode] = useState(() =>
    hasPotentiallyUnsupportedHtml(text || '')
  );
  const [sourceText, setSourceText] = useState(text || '');
  const [, setRevision] = useState(0);
  const [slashMenu, setSlashMenu] = useState<SlashMenuState>(
    CLOSED_SLASH_MENU
  );
  const [findOpen, setFindOpen] = useState(false);
  const [searchTerm, setSearchTermState] = useState('');
  const [replaceTerm, setReplaceTermState] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const runSlashCommandRef = useRef<(command: SlashCommandDefinition) => void>(
    () => {}
  );

  const emitChange = useMemo(
    () =>
      debounce((value: string) => {
        onChange(value);
      }, 120),
    [onChange]
  );

  useEffect(() => {
    return () => emitChange.cancel();
  }, [emitChange]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        link: {
          openOnClick: false,
          autolink: true,
          linkOnPaste: true,
        },
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
      Markdown,
      CharacterCount,
      Placeholder.configure({
        placeholder: "直接开始输入，或输入 / 打开命令菜单…",
      }),
      Highlight.configure({ multicolor: true }),
      Image.configure({
        allowBase64: false,
        resize: {
          enabled: true,
          directions: ['top', 'bottom', 'left', 'right'],
          minWidth: 40,
          minHeight: 40,
          alwaysPreserveAspectRatio: true,
        },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      OutlineList,
      Callout,
      WebEmbed,
      MediaEmbed,
      Youtube.configure({
        controls: true,
        nocookie: true,
        modestBranding: true,
        width: 720,
        height: 405,
      }),
      BlockMetadata,
      TableKit.configure({
        table: {
          resizable: true,
          lastColumnResizable: true,
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
      }),
      TextStyleKit,
      Subscript,
      Superscript,
      Mathematics.configure({
        katexOptions: {
          throwOnError: false,
          strict: false,
        },
      }),
      FindAndReplace.configure({
        injectCSS: false,
        searchDebounceMs: 100,
      }),
    ],
    content: text || '',
    contentType: isRichHtmlDocument(text || '') ? 'html' : 'markdown',
    textDirection: 'auto',
    editable: !readOnly,
    editorProps: {
      attributes: {
        class: 'append-rich-editor ProseMirror',
        spellcheck: 'true',
      },
      transformPastedHTML: (html) =>
        DOMPurify.sanitize(html, {
          FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
          FORBID_ATTR: ['srcdoc'],
        }),
    },
    onUpdate: ({ editor: currentEditor }) => {
      const serialized = serializeEditorContent(currentEditor);
      setSourceText(serialized);
      emitChange(serialized);
      if (debugMode) {
        console.log(
          'DynamicEditor serialized content:',
          hasRichOnlyFormatting(currentEditor.getJSON()) ? 'rich-html' : 'markdown',
          serialized
        );
      }
    },
  });

  const updateSlashMenu = useCallback(() => {
    if (!editor || sourceMode || readOnly) {
      setSlashMenu(CLOSED_SLASH_MENU);
      return;
    }

    const { selection } = editor.state;
    const { $from, empty } = selection;

    if (!empty || !$from.parent.isTextblock) {
      setSlashMenu(CLOSED_SLASH_MENU);
      return;
    }

    const prefix = $from.parent.textBetween(
      0,
      $from.parentOffset,
      undefined,
      '\ufffc'
    );
    const match = prefix.match(/^\/([a-z0-9 -]*)$/i);

    if (!match) {
      setSlashMenu(CLOSED_SLASH_MENU);
      return;
    }

    const coords = editor.view.coordsAtPos($from.pos);
    const from = $from.pos - prefix.length;
    const query = match[1].trim().toLowerCase();

    setSlashMenu((previous) => ({
      open: true,
      query,
      from,
      to: $from.pos,
      x: Math.min(coords.left, window.innerWidth - 300),
      y: Math.min(coords.bottom + 6, window.innerHeight - 340),
      selected:
        previous.open && previous.query === query ? previous.selected : 0,
    }));
  }, [editor, readOnly, sourceMode]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!readOnly);
  }, [editor, readOnly]);

  useEffect(() => {
    if (!editor || sourceMode) return;

    const currentSerialized = serializeEditorContent(editor);
    if (currentSerialized !== text) {
      setEditorContent(editor, text || '', false);
      setSourceText(text || '');
    }
  }, [editor, sourceMode, text]);

  useEffect(() => {
    if (!editor) return;

    const onTransaction = () => {
      setRevision((value) => value + 1);
      updateSlashMenu();
    };

    const onSelectionUpdate = () => {
      setRevision((value) => value + 1);
      updateSlashMenu();
    };

    editor.on('selectionUpdate', onSelectionUpdate);
    editor.on('transaction', onTransaction);

    return () => {
      editor.off('selectionUpdate', onSelectionUpdate);
      editor.off('transaction', onTransaction);
    };
  }, [editor, updateSlashMenu]);

  useEffect(() => {
    if (!editor) return;

    const handleDoubleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const mathElement = target?.closest(
        '[data-type="inline-math"], [data-type="block-math"]'
      ) as HTMLElement | null;

      if (!mathElement) return;

      let pos: number;
      try {
        pos = editor.view.posAtDOM(mathElement, 0);
      } catch {
        return;
      }

      const node = editor.state.doc.nodeAt(pos);
      if (!node || (node.type.name !== 'inlineMath' && node.type.name !== 'blockMath')) {
        return;
      }

      const latex = window.prompt('编辑 LaTeX 公式', node.attrs.latex || '');
      if (latex === null || !latex.trim()) return;

      if (node.type.name === 'inlineMath') {
        editor.commands.updateInlineMath({ latex: latex.trim(), pos });
      } else {
        editor.commands.updateBlockMath({ latex: latex.trim(), pos });
      }
    };

    editor.view.dom.addEventListener('dblclick', handleDoubleClick);
    return () => editor.view.dom.removeEventListener('dblclick', handleDoubleClick);
  }, [editor]);

  useEffect(() => {
    if (!editor || sourceMode) return;

    const handleFindShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        setFindOpen(true);
        window.setTimeout(() => searchInputRef.current?.focus(), 0);
      }
    };

    window.addEventListener('keydown', handleFindShortcut);
    return () => window.removeEventListener('keydown', handleFindShortcut);
  }, [editor, sourceMode]);

  useEffect(() => {
    if (!editor) return;

    if (findOpen) {
      if (searchTerm) {
        editor.commands.setSearchTerm(searchTerm);
      }
      window.setTimeout(() => searchInputRef.current?.focus(), 0);
    } else {
      editor.commands.clearSearch();
    }
  }, [editor, findOpen]);

  useEffect(() => {
    if (!editor || !slashMenu.open) return;

    const handleSlashKeys = (event: KeyboardEvent) => {
      const commands = SLASH_COMMANDS.filter((command) => {
        if (!slashMenu.query) return true;
        const haystack = `${command.label} ${command.description} ${command.keywords}`.toLowerCase();
        return haystack.includes(slashMenu.query);
      });

      if (!commands.length) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSlashMenu((previous) => ({
          ...previous,
          selected: (previous.selected + 1) % commands.length,
        }));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSlashMenu((previous) => ({
          ...previous,
          selected:
            (previous.selected - 1 + commands.length) % commands.length,
        }));
      } else if (event.key === 'Enter') {
        event.preventDefault();
        const selected =
          commands[Math.min(slashMenu.selected, commands.length - 1)];
        if (selected) {
          runSlashCommandRef.current(selected);
        }
      } else if (event.key === 'Escape') {
        event.preventDefault();
        setSlashMenu(CLOSED_SLASH_MENU);
      }
    };

    editor.view.dom.addEventListener('keydown', handleSlashKeys);
    return () =>
      editor.view.dom.removeEventListener('keydown', handleSlashKeys);
  }, [editor, slashMenu]);

  if (!editor) {
    return <div className="DynamicEditor rich-editor-loading">编辑器加载中…</div>;
  }

  const toggleSourceMode = () => {
    if (sourceMode) {
      if (
        hasPotentiallyUnsupportedHtml(sourceText) &&
        !window.confirm(
          'This note contains HTML elements the rich editor may not understand. Switching to WYSIWYG mode can normalize or remove unsupported HTML. Continue?'
        )
      ) {
        return;
      }

      setEditorContent(editor, sourceText, false);
      setSourceMode(false);
      window.setTimeout(() => editor.commands.focus(), 0);
      return;
    }

    setSourceText(serializeEditorContent(editor));
    setSourceMode(true);
    setSlashMenu(CLOSED_SLASH_MENU);
    setFindOpen(false);
  };

  const setLink = () => {
    const previous = editor.getAttributes('link').href || '';
    const value = window.prompt('链接 URL', previous);
    if (value === null) return;

    const href = normalizeLink(value);
    if (!href) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
  };

  const insertImage = () => {
    const value = window.prompt('图片 URL（http/https）');
    if (!value) return;

    if (!isRemoteImageUrl(value)) {
      window.alert('目前仅支持 http/https 图片地址。');
      return;
    }

    const alt = window.prompt('图片说明（可选）') || '';
    editor.chain().focus().setImage({ src: value.trim(), alt }).run();
  };

  const insertYoutube = () => {
    const value = window.prompt('YouTube 视频 URL');
    if (!value?.trim()) return;
    const ok = editor
      .chain()
      .focus()
      .setYoutubeVideo({ src: value.trim() })
      .run();

    if (!ok) {
      window.alert('这不是受支持的 YouTube 地址。');
    }
  };

  const insertWebEmbed = () => {
    const value = window.prompt('HTTPS 网页地址');
    if (!value?.trim()) return;
    const title = window.prompt('嵌入标题（可选）') || '嵌入内容';
    const ok = editor
      .chain()
      .focus()
      .setWebEmbed({ src: value.trim(), title })
      .run();

    if (!ok) {
      window.alert('只能嵌入有效的 HTTPS 地址。');
    }
  };

  const insertMedia = (kind: MediaKind) => {
    const value = window.prompt(
      kind === 'video' ? 'HTTPS 视频地址' : 'HTTPS 音频地址'
    );
    if (!value?.trim()) return;

    const title =
      window.prompt(kind === 'video' ? '视频标题（可选）' : '音频标题（可选）') ||
      (kind === 'video' ? '视频' : '音频');

    const ok = editor
      .chain()
      .focus()
      .setMediaEmbed({ kind, src: value.trim(), title })
      .run();

    if (!ok) {
      window.alert('只能嵌入有效的 HTTPS 媒体地址。');
    }
  };

  const insertInlineMath = () => {
    const latex = window.prompt('行内 LaTeX 公式', 'E = mc^2');
    if (!latex?.trim()) return;
    editor.chain().focus().insertInlineMath({ latex: latex.trim() }).run();
  };

  const insertBlockMath = () => {
    const latex = window.prompt('块级 LaTeX 公式', '\\frac{a}{b}');
    if (!latex?.trim()) return;
    editor.chain().focus().insertBlockMath({ latex: latex.trim() }).run();
  };

  const insertDateTime = (kind: 'date' | 'time' | 'date-time') => {
    const now = new Date();
    const date = now.toLocaleDateString();
    const time = now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    const value =
      kind === 'date' ? date : kind === 'time' ? time : `${date} ${time}`;

    editor.chain().focus().insertContent(value).run();
  };

  const insertCallout = (type: CalloutType = 'info') => {
    if (editor.isActive('callout')) {
      editor.chain().focus().setCalloutType(type).run();
      return;
    }

    editor.chain().focus().toggleCallout({ type }).run();
  };

  const getSelectedBlock = () => {
    const { $from } = editor.state.selection;

    for (let depth = $from.depth; depth >= 1; depth -= 1) {
      const node = $from.node(depth);
      if (Object.prototype.hasOwnProperty.call(node.attrs, 'blockId')) {
        return {
          node,
          type: node.type.name,
          blockId: node.attrs.blockId as string | null,
        };
      }
    }

    return null;
  };

  const assignBlockId = async () => {
    const selected = getSelectedBlock();
    if (!selected) {
      window.alert('请先把光标放到支持块 ID 的内容块中。');
      return;
    }

    const current = selected.blockId || '';
    const requested = window.prompt(
      '块 ID（留空则自动生成）',
      current
    );

    if (requested === null) return;

    const blockId = requested.trim() || createBlockId();
    editor
      .chain()
      .focus()
      .updateAttributes(selected.type, { blockId })
      .run();

    try {
      await navigator.clipboard?.writeText(`^${blockId}`);
    } catch {
      // Clipboard access is optional inside Standard Notes webviews.
    }
  };

  const clearBlockId = () => {
    const selected = getSelectedBlock();
    if (!selected) return;
    editor
      .chain()
      .focus()
      .updateAttributes(selected.type, { blockId: null })
      .run();
  };

  const currentHeading = [1, 2, 3, 4, 5, 6].find((level) =>
    editor.isActive('heading', { level })
  );

  const inTable = editor.isActive('table');
  const inCodeBlock = editor.isActive('codeBlock');
  const activeCodeLanguage = editor.getAttributes('codeBlock').language || '';
  const activeTextStyle = editor.getAttributes('textStyle');
  const activeFontFamily = activeTextStyle.fontFamily || '';
  const activeLineHeight = activeTextStyle.lineHeight || '';
  const activeDirection =
    editor.getAttributes('paragraph').dir ||
    editor.getAttributes('heading').dir ||
    '';
  const inCallout = editor.isActive('callout');
  const activeCalloutType = inCallout
    ? ((editor.getAttributes('callout').type || 'info') as CalloutType)
    : 'info';
  const richStorage = hasRichOnlyFormatting(editor.getJSON());
  const characterStorage = (editor.storage as any).characterCount;
  const characterCount = characterStorage?.characters?.() ?? 0;
  const wordCount = characterStorage?.words?.() ?? 0;
  const findStorage = (editor.storage as any).findAndReplace || {
    results: [],
    currentIndex: null,
  };
  const resultCount = Array.isArray(findStorage.results)
    ? findStorage.results.length
    : 0;
  const currentResult =
    typeof findStorage.currentIndex === 'number'
      ? findStorage.currentIndex + 1
      : 0;

  const filteredSlashCommands = SLASH_COMMANDS.filter((command) => {
    if (!slashMenu.query) return true;
    const haystack = `${command.label} ${command.description} ${command.keywords}`.toLowerCase();
    return haystack.includes(slashMenu.query);
  });

  const runSlashCommand = (command: SlashCommandDefinition) => {
    const { from, to } = slashMenu;
    const chain = editor.chain().focus().deleteRange({ from, to });

    switch (command.id) {
      case 'paragraph':
        chain.setParagraph().run();
        break;
      case 'heading1':
        chain.setHeading({ level: 1 }).run();
        break;
      case 'heading2':
        chain.setHeading({ level: 2 }).run();
        break;
      case 'heading3':
        chain.setHeading({ level: 3 }).run();
        break;
      case 'bullet-list':
        chain.toggleBulletList().run();
        break;
      case 'ordered-list':
        chain.toggleOrderedList().run();
        break;
      case 'outline-list':
        chain.toggleOutlineList().run();
        break;
      case 'task-list':
        chain.toggleTaskList().run();
        break;
      case 'callout':
        chain.run();
        window.setTimeout(() => insertCallout('info'), 0);
        break;
      case 'quote':
        chain.toggleBlockquote().run();
        break;
      case 'code-block':
        chain.toggleCodeBlock().run();
        break;
      case 'inline-math':
        chain.run();
        window.setTimeout(insertInlineMath, 0);
        break;
      case 'block-math':
        chain.run();
        window.setTimeout(insertBlockMath, 0);
        break;
      case 'table':
        chain
          .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
          .run();
        break;
      case 'image':
        chain.run();
        window.setTimeout(insertImage, 0);
        break;
      case 'youtube':
        chain.run();
        window.setTimeout(insertYoutube, 0);
        break;
      case 'web-embed':
        chain.run();
        window.setTimeout(insertWebEmbed, 0);
        break;
      case 'audio':
        chain.run();
        window.setTimeout(() => insertMedia('audio'), 0);
        break;
      case 'video':
        chain.run();
        window.setTimeout(() => insertMedia('video'), 0);
        break;
      case 'divider':
        chain.setHorizontalRule().run();
        break;
      case 'date':
        chain.run();
        window.setTimeout(() => insertDateTime('date'), 0);
        break;
      case 'time':
        chain.run();
        window.setTimeout(() => insertDateTime('time'), 0);
        break;
      case 'date-time':
        chain.run();
        window.setTimeout(() => insertDateTime('date-time'), 0);
        break;
      default:
        chain.run();
        break;
    }

    setSlashMenu(CLOSED_SLASH_MENU);
  };

  runSlashCommandRef.current = runSlashCommand;

  const updateSearchTerm = (value: string) => {
    setSearchTermState(value);
    editor.commands.setSearchTerm(value);
  };

  const updateReplaceTerm = (value: string) => {
    setReplaceTermState(value);
    editor.commands.setReplaceTerm(value);
  };

  const toggleCaseSensitive = () => {
    const next = !caseSensitive;
    setCaseSensitive(next);
    editor.commands.setCaseSensitive(next);
  };

  const toggleWholeWord = () => {
    const next = !wholeWord;
    setWholeWord(next);
    editor.commands.setWholeWord(next);
  };

  const toggleRegex = () => {
    const next = !useRegex;
    setUseRegex(next);
    editor.commands.setUseRegex(next);
  };

  return (
    <div className="DynamicEditor">
      {!sourceMode && !readOnly && (
        <>
          <BubbleMenu
            editor={editor}
            options={{ placement: 'top', offset: 8 }}
            shouldShow={({ from, to }) =>
              from !== to &&
              !findOpen &&
              !window.matchMedia('(pointer: coarse)').matches &&
              window.innerWidth > 700
            }
          >
            <div className="rich-context-menu selection-menu">
              <ToolbarButton
                title="加粗"
                active={editor.isActive('bold')}
                onClick={() => editor.chain().focus().toggleBold().run()}
              >
                <strong>B</strong>
              </ToolbarButton>
              <ToolbarButton
                title="斜体"
                active={editor.isActive('italic')}
                onClick={() => editor.chain().focus().toggleItalic().run()}
              >
                <em>I</em>
              </ToolbarButton>
              <ToolbarButton
                title="下划线"
                active={editor.isActive('underline')}
                onClick={() => editor.chain().focus().toggleUnderline().run()}
              >
                <u>U</u>
              </ToolbarButton>
              <ToolbarButton
                title="删除线"
                active={editor.isActive('strike')}
                onClick={() => editor.chain().focus().toggleStrike().run()}
              >
                <s>S</s>
              </ToolbarButton>
              <ToolbarButton
                title="高亮"
                active={editor.isActive('highlight')}
                onClick={() =>
                  editor.chain().focus().toggleHighlight({ color: '#fff59d' }).run()
                }
              >
                H
              </ToolbarButton>
              <ToolbarButton
                title="链接"
                active={editor.isActive('link')}
                onClick={setLink}
              >
                Link
              </ToolbarButton>
            </div>
          </BubbleMenu>

        </>
      )}

      <div className="rich-toolbar" role="toolbar" aria-label="格式工具栏">
        <div className="rich-toolbar-group">
          <select
            className="rich-toolbar-select"
            aria-label="文本样式"
            title="文本样式"
            disabled={sourceMode || readOnly}
            value={currentHeading ? `h${currentHeading}` : 'paragraph'}
            onChange={(event) => {
              const value = event.target.value;
              if (value === 'paragraph') {
                editor.chain().focus().setParagraph().run();
              } else {
                const level = Number(value.substring(1)) as
                  | 1
                  | 2
                  | 3
                  | 4
                  | 5
                  | 6;
                editor.chain().focus().toggleHeading({ level }).run();
              }
            }}
          >
            <option value="paragraph">正文</option>
            <option value="h1">一级标题</option>
            <option value="h2">二级标题</option>
            <option value="h3">三级标题</option>
            <option value="h4">四级标题</option>
            <option value="h5">五级标题</option>
            <option value="h6">六级标题</option>
          </select>

          <select
            className="rich-toolbar-select"
            aria-label="字体"
            title="字体"
            disabled={sourceMode || readOnly}
            value={activeFontFamily}
            onChange={(event) => {
              const value = event.target.value;
              if (!value) {
                editor.chain().focus().unsetFontFamily().run();
              } else {
                editor.chain().focus().setFontFamily(value).run();
              }
            }}
          >
            <option value="">字体</option>
            <option value="Arial">Arial</option>
            <option value="Georgia">Georgia</option>
            <option value="'Times New Roman'">Times New Roman</option>
            <option value="Verdana">Verdana</option>
            <option value="Tahoma">Tahoma</option>
            <option value="'Courier New'">Courier New</option>
            <option value="monospace">等宽字体</option>
          </select>

          <select
            className="rich-toolbar-select compact"
            aria-label="字号"
            title="字号"
            disabled={sourceMode || readOnly}
            defaultValue=""
            onChange={(event) => {
              const value = event.target.value;
              if (!value) {
                editor.chain().focus().unsetFontSize().run();
              } else {
                editor.chain().focus().setFontSize(value).run();
              }
            }}
          >
            <option value="">字号</option>
            <option value="12px">12</option>
            <option value="14px">14</option>
            <option value="16px">16</option>
            <option value="18px">18</option>
            <option value="20px">20</option>
            <option value="24px">24</option>
            <option value="32px">32</option>
          </select>

          <select
            className="rich-toolbar-select compact"
            aria-label="行高"
            title="行高"
            disabled={sourceMode || readOnly}
            value={activeLineHeight}
            onChange={(event) => {
              const value = event.target.value;
              if (!value) {
                editor.chain().focus().unsetLineHeight().run();
              } else {
                editor.chain().focus().setLineHeight(value).run();
              }
            }}
          >
            <option value="">行高</option>
            <option value="1">1.0</option>
            <option value="1.25">1.25</option>
            <option value="1.5">1.5</option>
            <option value="1.75">1.75</option>
            <option value="2">2.0</option>
          </select>
        </div>

        <div className="rich-toolbar-group">
          <ToolbarButton
            title="加粗"
            active={editor.isActive('bold')}
            disabled={sourceMode || readOnly}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <strong>B</strong>
          </ToolbarButton>
          <ToolbarButton
            title="斜体"
            active={editor.isActive('italic')}
            disabled={sourceMode || readOnly}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <em>I</em>
          </ToolbarButton>
          <ToolbarButton
            title="下划线"
            active={editor.isActive('underline')}
            disabled={sourceMode || readOnly}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <u>U</u>
          </ToolbarButton>
          <ToolbarButton
            title="删除线"
            active={editor.isActive('strike')}
            disabled={sourceMode || readOnly}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            <s>S</s>
          </ToolbarButton>
          <ToolbarButton
            title="行内代码"
            active={editor.isActive('code')}
            disabled={sourceMode || readOnly}
            onClick={() => editor.chain().focus().toggleCode().run()}
          >
            {'</>'}
          </ToolbarButton>
          <ToolbarButton
            title="下标"
            active={editor.isActive('subscript')}
            disabled={sourceMode || readOnly}
            onClick={() => editor.chain().focus().toggleSubscript().run()}
          >
            X₂
          </ToolbarButton>
          <ToolbarButton
            title="上标"
            active={editor.isActive('superscript')}
            disabled={sourceMode || readOnly}
            onClick={() => editor.chain().focus().toggleSuperscript().run()}
          >
            X²
          </ToolbarButton>
        </div>

        <div className="rich-toolbar-group">
          <label className="rich-color-control" title="文字颜色">
            A
            <input
              type="color"
              aria-label="文字颜色"
              disabled={sourceMode || readOnly}
              onChange={(event) =>
                editor.chain().focus().setColor(event.target.value).run()
              }
            />
          </label>
          <label className="rich-color-control highlight" title="高亮颜色">
            H
            <input
              type="color"
              aria-label="高亮颜色"
              disabled={sourceMode || readOnly}
              defaultValue="#fff59d"
              onChange={(event) =>
                editor
                  .chain()
                  .focus()
                  .setHighlight({ color: event.target.value })
                  .run()
              }
            />
          </label>
          <ToolbarButton
            title="清除格式"
            disabled={sourceMode || readOnly}
            onClick={() =>
              editor.chain().focus().unsetAllMarks().clearNodes().run()
            }
          >
            Clear
          </ToolbarButton>
        </div>

        <div className="rich-toolbar-group">
          <ToolbarButton
            title="无序列表"
            active={editor.isActive('bulletList')}
            disabled={sourceMode || readOnly}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            • List
          </ToolbarButton>
          <ToolbarButton
            title="有序列表"
            active={editor.isActive('orderedList')}
            disabled={sourceMode || readOnly}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            1. List
          </ToolbarButton>
          <ToolbarButton
            title="任务列表"
            active={editor.isActive('taskList')}
            disabled={sourceMode || readOnly}
            onClick={() => editor.chain().focus().toggleTaskList().run()}
          >
            ☑
          </ToolbarButton>
          <ToolbarButton
            title="提示块"
            active={inCallout}
            disabled={sourceMode || readOnly}
            onClick={() => insertCallout('info')}
          >
            💡
          </ToolbarButton>
          <ToolbarButton
            title="引用"
            active={editor.isActive('blockquote')}
            disabled={sourceMode || readOnly}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            “ ”
          </ToolbarButton>
          <ToolbarButton
            title="代码块"
            active={editor.isActive('codeBlock')}
            disabled={sourceMode || readOnly}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          >
            Code
          </ToolbarButton>
          <ToolbarButton
            title="分割线"
            disabled={sourceMode || readOnly}
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
          >
            —
          </ToolbarButton>
        </div>

        {inCallout && !sourceMode && (
          <div className="rich-toolbar-group callout-tools">
            <select
              className="rich-toolbar-select"
              aria-label="提示块类型"
              title="提示块类型"
              value={activeCalloutType}
              disabled={readOnly}
              onChange={(event) =>
                editor
                  .chain()
                  .focus()
                  .setCalloutType(event.target.value as CalloutType)
                  .run()
              }
            >
              <option value="info">信息</option>
              <option value="tip">提示</option>
              <option value="warning">警告</option>
              <option value="danger">危险</option>
            </select>
            <ToolbarButton
              title="移除提示块"
              disabled={readOnly}
              onClick={() => editor.chain().focus().unsetCallout().run()}
            >
              Remove
            </ToolbarButton>
          </div>
        )}

        <div className="rich-toolbar-group">
          {(['left', 'center', 'right', 'justify'] as const).map((alignment) => (
            <ToolbarButton
              key={alignment}
              title={`Align ${alignment}`}
              active={editor.isActive({ textAlign: alignment })}
              disabled={sourceMode || readOnly}
              onClick={() =>
                editor.chain().focus().setTextAlign(alignment).run()
              }
            >
              {alignment === 'left'
                ? '⇤'
                : alignment === 'center'
                ? '↔'
                : alignment === 'right'
                ? '⇥'
                : '≡'}
            </ToolbarButton>
          ))}
          <select
            className="rich-toolbar-select compact"
            aria-label="文字方向"
            title="文字方向"
            disabled={sourceMode || readOnly}
            value={activeDirection}
            onChange={(event) => {
              const value = event.target.value;
              if (!value) {
                editor.chain().focus().unsetTextDirection().run();
              } else {
                editor
                  .chain()
                  .focus()
                  .setTextDirection(value as 'ltr' | 'rtl' | 'auto')
                  .run();
              }
            }}
          >
            <option value="">方向</option>
            <option value="auto">自动</option>
            <option value="ltr">LTR</option>
            <option value="rtl">RTL</option>
          </select>
        </div>

        <div className="rich-toolbar-group">
          <ToolbarButton
            title="添加或编辑链接"
            active={editor.isActive('link')}
            disabled={sourceMode || readOnly}
            onClick={setLink}
          >
            Link
          </ToolbarButton>
          <ToolbarButton
            title="通过 URL 插入图片"
            disabled={sourceMode || readOnly}
            onClick={insertImage}
          >
            Image
          </ToolbarButton>
          <ToolbarButton
            title="插入 YouTube 视频"
            disabled={sourceMode || readOnly}
            onClick={insertYoutube}
          >
            YouTube
          </ToolbarButton>
          <ToolbarButton
            title="插入安全网页嵌入"
            disabled={sourceMode || readOnly}
            onClick={insertWebEmbed}
          >
            Embed
          </ToolbarButton>
          <ToolbarButton
            title="插入远程音频"
            disabled={sourceMode || readOnly}
            onClick={() => insertMedia('audio')}
          >
            Audio
          </ToolbarButton>
          <ToolbarButton
            title="插入远程视频"
            disabled={sourceMode || readOnly}
            onClick={() => insertMedia('video')}
          >
            Video
          </ToolbarButton>
          <ToolbarButton
            title="插入行内公式"
            disabled={sourceMode || readOnly}
            onClick={insertInlineMath}
          >
            ∑
          </ToolbarButton>
          <ToolbarButton
            title="插入块级公式"
            disabled={sourceMode || readOnly}
            onClick={insertBlockMath}
          >
            ∫
          </ToolbarButton>
          <ToolbarButton
            title="插入表格"
            disabled={sourceMode || readOnly}
            onClick={() =>
              editor
                .chain()
                .focus()
                .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                .run()
            }
          >
            Table
          </ToolbarButton>
        </div>

        {inCodeBlock && !sourceMode && (
          <div className="rich-toolbar-group code-tools">
            <select
              className="rich-toolbar-select"
              aria-label="代码语言"
              title="代码语言"
              value={activeCodeLanguage}
              disabled={readOnly}
              onChange={(event) =>
                editor
                  .chain()
                  .focus()
                  .updateAttributes('codeBlock', {
                    language: event.target.value || null,
                  })
                  .run()
              }
            >
              <option value="">纯文本代码</option>
              <option value="bash">Bash</option>
              <option value="css">CSS</option>
              <option value="html">HTML</option>
              <option value="java">Java</option>
              <option value="javascript">JavaScript</option>
              <option value="json">JSON</option>
              <option value="python">Python</option>
              <option value="sql">SQL</option>
              <option value="typescript">TypeScript</option>
              <option value="xml">XML</option>
            </select>
          </div>
        )}

        {inTable && !sourceMode && (
          <div className="rich-toolbar-group table-tools">
            <ToolbarButton
              title="新增行"
              disabled={readOnly}
              onClick={() => editor.chain().focus().addRowAfter().run()}
            >
              Row+
            </ToolbarButton>
            <ToolbarButton
              title="删除行"
              disabled={readOnly}
              onClick={() => editor.chain().focus().deleteRow().run()}
            >
              Row−
            </ToolbarButton>
            <ToolbarButton
              title="新增列"
              disabled={readOnly}
              onClick={() => editor.chain().focus().addColumnAfter().run()}
            >
              Col+
            </ToolbarButton>
            <ToolbarButton
              title="删除列"
              disabled={readOnly}
              onClick={() => editor.chain().focus().deleteColumn().run()}
            >
              Col−
            </ToolbarButton>
            <ToolbarButton
              title="切换表头行"
              disabled={readOnly}
              onClick={() => editor.chain().focus().toggleHeaderRow().run()}
            >
              Header
            </ToolbarButton>
            <ToolbarButton
              title="合并选中单元格"
              disabled={readOnly || !editor.can().mergeCells()}
              onClick={() => editor.chain().focus().mergeCells().run()}
            >
              Merge
            </ToolbarButton>
            <ToolbarButton
              title="拆分单元格"
              disabled={readOnly || !editor.can().splitCell()}
              onClick={() => editor.chain().focus().splitCell().run()}
            >
              Split
            </ToolbarButton>
            <ToolbarButton
              title="删除表格"
              disabled={readOnly}
              onClick={() => editor.chain().focus().deleteTable().run()}
            >
              Delete table
            </ToolbarButton>
          </div>
        )}

        <div className="rich-toolbar-group block-tools">
          <ToolbarButton
            title="切换大纲列表"
            active={editor.isActive('outlineList')}
            disabled={sourceMode || readOnly}
            onClick={() => editor.chain().focus().toggleOutlineList().run()}
          >
            Outline
          </ToolbarButton>
          <ToolbarButton
            title="设置/生成块 ID 并复制引用"
            disabled={sourceMode || readOnly}
            onClick={assignBlockId}
          >
            Block ID
          </ToolbarButton>
          <ToolbarButton
            title="移除块 ID"
            disabled={sourceMode || readOnly || !getSelectedBlock()?.blockId}
            onClick={clearBlockId}
          >
            ID−
          </ToolbarButton>
        </div>

        <div className="rich-toolbar-group rich-toolbar-spacer">
          <span
            className={`rich-storage-badge${richStorage ? ' rich' : ''}`}
            title={
              richStorage
                ? 'HTML fallback is active to preserve formatting that Markdown cannot represent'
                : 'This note is currently stored as Markdown'
            }
          >
            {richStorage ? 'Rich HTML' : 'Markdown'}
          </span>
          <ToolbarButton
            title="查找替换（Ctrl/Cmd+F）"
            active={findOpen}
            disabled={sourceMode}
            onClick={() => setFindOpen((value) => !value)}
          >
            Find
          </ToolbarButton>
          <ToolbarButton
            title="撤销"
            disabled={
              sourceMode || readOnly || !editor.can().chain().focus().undo().run()
            }
            onClick={() => editor.chain().focus().undo().run()}
          >
            ↶
          </ToolbarButton>
          <ToolbarButton
            title="重做"
            disabled={
              sourceMode || readOnly || !editor.can().chain().focus().redo().run()
            }
            onClick={() => editor.chain().focus().redo().run()}
          >
            ↷
          </ToolbarButton>
          <ToolbarButton
            title={sourceMode ? '返回富文本编辑' : '编辑源码'}
            active={sourceMode}
            disabled={readOnly}
            onClick={toggleSourceMode}
          >
            {'</>'}
          </ToolbarButton>
        </div>
      </div>

      {findOpen && !sourceMode && (
        <div className="find-replace-panel" role="search" aria-label="查找替换">
          <div className="find-replace-row">
            <input
              ref={searchInputRef}
              className="find-replace-input"
              type="text"
              value={searchTerm}
              placeholder="查找"
              aria-label="查找"
              onChange={(event) => updateSearchTerm(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  if (event.shiftKey) {
                    editor.commands.goToPreviousResult();
                  } else {
                    editor.commands.goToNextResult();
                  }
                } else if (event.key === 'Escape') {
                  setFindOpen(false);
                }
              }}
            />
            <span className="find-replace-count" aria-live="polite">
              {currentResult} / {resultCount}
            </span>
            <button
              type="button"
              className="find-replace-button"
              disabled={!resultCount}
              onClick={() => editor.commands.goToPreviousResult()}
              title="上一个结果"
            >
              ↑
            </button>
            <button
              type="button"
              className="find-replace-button"
              disabled={!resultCount}
              onClick={() => editor.commands.goToNextResult()}
              title="下一个结果"
            >
              ↓
            </button>
            <button
              type="button"
              className="find-replace-button"
              onClick={() => setFindOpen(false)}
              title="关闭查找替换"
            >
              ×
            </button>
          </div>
          <div className="find-replace-row">
            <input
              className="find-replace-input"
              type="text"
              value={replaceTerm}
              placeholder="替换为"
              aria-label="替换为"
              disabled={readOnly}
              onChange={(event) => updateReplaceTerm(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !readOnly) {
                  event.preventDefault();
                  editor.commands.replace();
                }
              }}
            />
            <button
              type="button"
              className="find-replace-button text"
              disabled={readOnly || !resultCount}
              onClick={() => editor.commands.replace()}
            >
              Replace
            </button>
            <button
              type="button"
              className="find-replace-button text"
              disabled={readOnly || !resultCount}
              onClick={() => editor.commands.replaceAll()}
            >
              All
            </button>
          </div>
          <div className="find-replace-options">
            <label>
              <input
                type="checkbox"
                checked={caseSensitive}
                onChange={toggleCaseSensitive}
              />
              Match case
            </label>
            <label>
              <input
                type="checkbox"
                checked={wholeWord}
                disabled={useRegex}
                onChange={toggleWholeWord}
              />
              Whole word
            </label>
            <label>
              <input
                type="checkbox"
                checked={useRegex}
                onChange={toggleRegex}
              />
              Regex
            </label>
          </div>
        </div>
      )}

      {slashMenu.open && (
        <div
          className="slash-command-menu"
          role="listbox"
          aria-label="插入内容块"
          style={{ left: slashMenu.x, top: slashMenu.y }}
        >
          <div className="slash-command-header">
            {slashMenu.query ? `Commands matching “${slashMenu.query}”` : 'Insert'}
          </div>
          {filteredSlashCommands.length ? (
            filteredSlashCommands.map((command, index) => (
              <button
                type="button"
                role="option"
                aria-selected={index === slashMenu.selected}
                className={`slash-command-item${
                  index === slashMenu.selected ? ' selected' : ''
                }`}
                key={command.id}
                onMouseDown={(event) => {
                  event.preventDefault();
                  runSlashCommand(command);
                }}
                onMouseEnter={() =>
                  setSlashMenu((previous) => ({
                    ...previous,
                    selected: index,
                  }))
                }
              >
                <strong>{command.label}</strong>
                <span>{command.description}</span>
              </button>
            ))
          ) : (
            <div className="slash-command-empty">没有匹配的命令</div>
          )}
        </div>
      )}

      {sourceMode ? (
        <textarea
          className="rich-source-editor"
          aria-label="笔记源码"
          spellCheck={false}
          value={sourceText}
          onChange={(event) => {
            const value = event.target.value;
            setSourceText(value);
            emitChange(value);
          }}
        />
      ) : (
        <>
          {!readOnly && (
            <DragHandle
              editor={editor}
              nested
              className="append-block-drag-handle"
            >
              <button
                type="button"
                className="append-block-drag-button"
                title="拖动内容块"
                aria-label="拖动内容块"
              >
                ⋮⋮
              </button>
            </DragHandle>
          )}
          <EditorContent editor={editor} />
        </>
      )}

      {!sourceMode && (
        <div className="rich-editor-status">
          <span>{wordCount} words · {characterCount} characters</span>
          <span>输入 / 打开插入命令</span>
          <span>双击公式可编辑 LaTeX</span>
          <span>Ctrl/Cmd+F 查找</span>
        </div>
      )}
    </div>
  );
}
