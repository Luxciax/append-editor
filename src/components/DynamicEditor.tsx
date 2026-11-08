import React, { useEffect, useMemo, useState } from 'react';
import debounce from 'lodash/debounce';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import { Placeholder } from '@tiptap/extensions';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { TableKit } from '@tiptap/extension-table';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyleKit } from '@tiptap/extension-text-style';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';

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

export default function DynamicEditor({
  debugMode,
  onChange,
  readOnly,
  text,
}: DynamicProps) {
  const [sourceMode, setSourceMode] = useState(false);
  const [sourceText, setSourceText] = useState(text || '');
  const [, setRevision] = useState(0);

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
        link: {
          openOnClick: false,
          autolink: true,
          linkOnPaste: true,
        },
      }),
      Markdown,
      Placeholder.configure({
        placeholder: "Type '/' for commands, or start writing Markdown…",
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
    ],
    content: text || '',
    contentType: 'markdown',
    editable: !readOnly,
    editorProps: {
      attributes: {
        class: 'append-rich-editor ProseMirror',
        spellcheck: 'true',
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      const markdown = currentEditor.getMarkdown();
      setSourceText(markdown);
      emitChange(markdown);
      if (debugMode) {
        console.log('DynamicEditor markdown:', markdown);
      }
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!readOnly);
  }, [editor, readOnly]);

  useEffect(() => {
    if (!editor || sourceMode) return;

    const currentMarkdown = editor.getMarkdown();
    if (currentMarkdown !== text) {
      editor.commands.setContent(text || '', {
        contentType: 'markdown',
        emitUpdate: false,
      });
      setSourceText(text || '');
    }
  }, [editor, sourceMode, text]);

  useEffect(() => {
    if (!editor) return;

    const rerender = () => setRevision((value) => value + 1);
    editor.on('selectionUpdate', rerender);
    editor.on('transaction', rerender);

    return () => {
      editor.off('selectionUpdate', rerender);
      editor.off('transaction', rerender);
    };
  }, [editor]);

  if (!editor) {
    return <div className="DynamicEditor rich-editor-loading">Loading editor…</div>;
  }

  const toggleSourceMode = () => {
    if (sourceMode) {
      editor.commands.setContent(sourceText, {
        contentType: 'markdown',
        emitUpdate: false,
      });
      setSourceMode(false);
      window.setTimeout(() => editor.commands.focus(), 0);
      return;
    }

    setSourceText(editor.getMarkdown());
    setSourceMode(true);
  };

  const setLink = () => {
    const previous = editor.getAttributes('link').href || '';
    const value = window.prompt('Link URL', previous);
    if (value === null) return;

    const href = normalizeLink(value);
    if (!href) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
  };

  const insertImage = () => {
    const value = window.prompt('Image URL (http/https)');
    if (!value) return;

    if (!isRemoteImageUrl(value)) {
      window.alert('Only http/https image URLs are supported in this mode.');
      return;
    }

    const alt = window.prompt('Alt text (optional)') || '';
    editor.chain().focus().setImage({ src: value.trim(), alt }).run();
  };

  const currentHeading = [1, 2, 3, 4, 5, 6].find((level) =>
    editor.isActive('heading', { level })
  );

  const inTable = editor.isActive('table');

  return (
    <div className="DynamicEditor">
      <div className="rich-toolbar" role="toolbar" aria-label="Formatting toolbar">
        <div className="rich-toolbar-group">
          <select
            className="rich-toolbar-select"
            aria-label="Text style"
            title="Text style"
            disabled={sourceMode || readOnly}
            value={currentHeading ? `h${currentHeading}` : 'paragraph'}
            onChange={(event) => {
              const value = event.target.value;
              if (value === 'paragraph') {
                editor.chain().focus().setParagraph().run();
              } else {
                const level = Number(value.substring(1)) as 1 | 2 | 3 | 4 | 5 | 6;
                editor.chain().focus().toggleHeading({ level }).run();
              }
            }}
          >
            <option value="paragraph">Paragraph</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
            <option value="h4">Heading 4</option>
            <option value="h5">Heading 5</option>
            <option value="h6">Heading 6</option>
          </select>

          <select
            className="rich-toolbar-select compact"
            aria-label="Font size"
            title="Font size"
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
            <option value="">Size</option>
            <option value="12px">12</option>
            <option value="14px">14</option>
            <option value="16px">16</option>
            <option value="18px">18</option>
            <option value="20px">20</option>
            <option value="24px">24</option>
            <option value="32px">32</option>
          </select>
        </div>

        <div className="rich-toolbar-group">
          <ToolbarButton
            title="Bold"
            active={editor.isActive('bold')}
            disabled={sourceMode || readOnly}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <strong>B</strong>
          </ToolbarButton>
          <ToolbarButton
            title="Italic"
            active={editor.isActive('italic')}
            disabled={sourceMode || readOnly}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <em>I</em>
          </ToolbarButton>
          <ToolbarButton
            title="Underline"
            active={editor.isActive('underline')}
            disabled={sourceMode || readOnly}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <u>U</u>
          </ToolbarButton>
          <ToolbarButton
            title="Strikethrough"
            active={editor.isActive('strike')}
            disabled={sourceMode || readOnly}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            <s>S</s>
          </ToolbarButton>
          <ToolbarButton
            title="Inline code"
            active={editor.isActive('code')}
            disabled={sourceMode || readOnly}
            onClick={() => editor.chain().focus().toggleCode().run()}
          >
            {'</>'}
          </ToolbarButton>
          <ToolbarButton
            title="Subscript"
            active={editor.isActive('subscript')}
            disabled={sourceMode || readOnly}
            onClick={() => editor.chain().focus().toggleSubscript().run()}
          >
            X₂
          </ToolbarButton>
          <ToolbarButton
            title="Superscript"
            active={editor.isActive('superscript')}
            disabled={sourceMode || readOnly}
            onClick={() => editor.chain().focus().toggleSuperscript().run()}
          >
            X²
          </ToolbarButton>
        </div>

        <div className="rich-toolbar-group">
          <label className="rich-color-control" title="Text color">
            A
            <input
              type="color"
              aria-label="Text color"
              disabled={sourceMode || readOnly}
              onChange={(event) =>
                editor.chain().focus().setColor(event.target.value).run()
              }
            />
          </label>
          <label className="rich-color-control highlight" title="Highlight color">
            H
            <input
              type="color"
              aria-label="Highlight color"
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
            title="Remove inline formatting"
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
            title="Bullet list"
            active={editor.isActive('bulletList')}
            disabled={sourceMode || readOnly}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            • List
          </ToolbarButton>
          <ToolbarButton
            title="Numbered list"
            active={editor.isActive('orderedList')}
            disabled={sourceMode || readOnly}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            1. List
          </ToolbarButton>
          <ToolbarButton
            title="Task list"
            active={editor.isActive('taskList')}
            disabled={sourceMode || readOnly}
            onClick={() => editor.chain().focus().toggleTaskList().run()}
          >
            ☑
          </ToolbarButton>
          <ToolbarButton
            title="Blockquote"
            active={editor.isActive('blockquote')}
            disabled={sourceMode || readOnly}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            “ ”
          </ToolbarButton>
          <ToolbarButton
            title="Code block"
            active={editor.isActive('codeBlock')}
            disabled={sourceMode || readOnly}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          >
            Code
          </ToolbarButton>
          <ToolbarButton
            title="Horizontal rule"
            disabled={sourceMode || readOnly}
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
          >
            —
          </ToolbarButton>
        </div>

        <div className="rich-toolbar-group">
          {(['left', 'center', 'right', 'justify'] as const).map((alignment) => (
            <ToolbarButton
              key={alignment}
              title={`Align ${alignment}`}
              active={editor.isActive({ textAlign: alignment })}
              disabled={sourceMode || readOnly}
              onClick={() => editor.chain().focus().setTextAlign(alignment).run()}
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
        </div>

        <div className="rich-toolbar-group">
          <ToolbarButton
            title="Add or edit link"
            active={editor.isActive('link')}
            disabled={sourceMode || readOnly}
            onClick={setLink}
          >
            Link
          </ToolbarButton>
          <ToolbarButton
            title="Insert image by URL"
            disabled={sourceMode || readOnly}
            onClick={insertImage}
          >
            Image
          </ToolbarButton>
          <ToolbarButton
            title="Insert table"
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

        {inTable && !sourceMode && (
          <div className="rich-toolbar-group table-tools">
            <ToolbarButton
              title="Add row"
              disabled={readOnly}
              onClick={() => editor.chain().focus().addRowAfter().run()}
            >
              Row+
            </ToolbarButton>
            <ToolbarButton
              title="Delete row"
              disabled={readOnly}
              onClick={() => editor.chain().focus().deleteRow().run()}
            >
              Row−
            </ToolbarButton>
            <ToolbarButton
              title="Add column"
              disabled={readOnly}
              onClick={() => editor.chain().focus().addColumnAfter().run()}
            >
              Col+
            </ToolbarButton>
            <ToolbarButton
              title="Delete column"
              disabled={readOnly}
              onClick={() => editor.chain().focus().deleteColumn().run()}
            >
              Col−
            </ToolbarButton>
            <ToolbarButton
              title="Delete table"
              disabled={readOnly}
              onClick={() => editor.chain().focus().deleteTable().run()}
            >
              Delete table
            </ToolbarButton>
          </div>
        )}

        <div className="rich-toolbar-group rich-toolbar-spacer">
          <ToolbarButton
            title="Undo"
            disabled={
              sourceMode || readOnly || !editor.can().chain().focus().undo().run()
            }
            onClick={() => editor.chain().focus().undo().run()}
          >
            ↶
          </ToolbarButton>
          <ToolbarButton
            title="Redo"
            disabled={
              sourceMode || readOnly || !editor.can().chain().focus().redo().run()
            }
            onClick={() => editor.chain().focus().redo().run()}
          >
            ↷
          </ToolbarButton>
          <ToolbarButton
            title={sourceMode ? 'Return to rich editor' : 'Edit Markdown source'}
            active={sourceMode}
            disabled={readOnly}
            onClick={toggleSourceMode}
          >
            {'</>'}
          </ToolbarButton>
        </div>
      </div>

      {sourceMode ? (
        <textarea
          className="rich-source-editor"
          aria-label="Markdown source"
          spellCheck={false}
          value={sourceText}
          onChange={(event) => {
            const value = event.target.value;
            setSourceText(value);
            emitChange(value);
          }}
        />
      ) : (
        <EditorContent editor={editor} />
      )}
    </div>
  );
}
