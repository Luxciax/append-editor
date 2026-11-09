import React from 'react';
import prettier from 'prettier/standalone';
import parserMarkdown from 'prettier/parser-markdown';
import { EditingModes } from './AppendEditor';
import {
  ChevronToggleButton,
  CopyButton,
  EyeButton,
  PencilButton,
  PrintButton,
} from './Buttons';

// Import types
import { HtmlElementId } from './AppendEditor';

enum HtmlClassName {
  chevronToggleButton = 'menu-button chevron-toggle-button',
  menuButton = 'menu-button',
  on = ' on',
  off = ' off',
}

interface MenuProps {
  borderlessMode?: boolean;
  editingMode?: string;
  fixedHeightMode?: boolean;
  fullWidthMode?: boolean;
  monacoEditorLanguage: string;
  onConfirmPrintUrl: () => void;
  overflowMode?: boolean;
  refreshEdit: () => void;
  refreshView: () => void;
  saveText: (text: string) => void;
  showMenuOptionsEdit?: boolean;
  //showMenuOptionsMonacoEditor?: boolean;
  showMenuOptionsShare?: boolean;
  showMenuOptionsView?: boolean;
  text: string;
  toggleBorderlessMode: () => void;
  toggleFixedHeightMode: () => void;
  toggleFullWidthMode: () => void;
  toggleOverflowMode: () => void;
  toggleShowMenu: () => void;
  toggleShowMenuOptionsEdit: () => void;
  //toggleShowMenuOptionsMonacoEditor?: () => void;
  toggleShowMenuOptionsView: () => void;
  toggleShowMenuOptionsShare: () => void;
  viewMode?: boolean;
}

interface MenuState {
  message?: string;
  displayMessageShare: boolean;
  displayMessageEdit: boolean;
}

export default class Menu extends React.Component<MenuProps, MenuState> {
  clearTooltipTimer: NodeJS.Timeout | undefined;
  constructor(props: MenuProps) {
    super(props);
    this.state = {
      message: '',
      displayMessageEdit: false,
      displayMessageShare: false,
    };
  }

  resetMessageTimer = () => {
    if (this.clearTooltipTimer) {
      clearTimeout(this.clearTooltipTimer);
    }
    this.clearTooltipTimer = setTimeout(() => {
      this.setState({
        displayMessageEdit: false,
        displayMessageShare: false,
      });
    }, 5000);
  };

  showMessageEdit = () => {
    this.setState(
      {
        displayMessageEdit: true,
        displayMessageShare: false,
      },
      () => {
        this.resetMessageTimer();
      }
    );
  };
  showMessageShare = () => {
    this.setState(
      {
        displayMessageEdit: false,
        displayMessageShare: true,
      },
      () => {
        this.resetMessageTimer();
      }
    );
  };

  copyToClipboard = (text: string) => {
    const textField = document.createElement('textarea');
    textField.value = text;
    document.body.appendChild(textField);
    textField.select();
    document.execCommand('copy');
    this.showMessageShare();
    textField.remove();
  };

  copyText = () => {
    if (this.props.text) {
      this.setState({ message: '已复制笔记文本到剪贴板' }, () => {
        this.copyToClipboard(this.props.text);
      });
    } else {
      this.setState({ message: '没有可复制的内容，当前笔记为空' }, () => {
        this.showMessageShare();
      });
    }
  };

  copyHtml = () => {
    if (!this.props.viewMode) {
      this.setState(
        { message: '当前模式无法复制渲染后的 HTML' },
        () => this.showMessageShare()
      );
    } else if (!this.props.text) {
      this.setState({ message: '没有可复制的 HTML，当前笔记为空' }, () => {
        this.showMessageShare();
      });
    } else {
      const renderedNote = document.getElementById('renderedNote');
      if (renderedNote?.firstElementChild?.innerHTML) {
        this.setState({ message: '已复制渲染后的 HTML 到剪贴板' });
        this.copyToClipboard(renderedNote?.firstElementChild.innerHTML);
      }
    }
  };

  formatText = () => {
    if (
      this.props.monacoEditorLanguage !== 'markdown' &&
      this.props.editingMode === EditingModes.useMonacoEditor
    ) {
      this.setState(
        {
          message:
            '错误：Monaco 当前语言不是 Markdown，格式化仅支持 Markdown',
        },
        () => {
          this.showMessageEdit();
        }
      );
    } else if (this.props.text) {
      this.setState(
        { message: '已使用 Prettier 格式化 Markdown' },
        () => {
          try {
            const formattedText = prettier.format(this.props.text, {
              parser: 'markdown',
              plugins: [parserMarkdown],
            });
            this.props.saveText(formattedText);
            this.props.refreshEdit();
            this.props.refreshView();
            this.showMessageEdit();
          } catch (e) {
            this.setState({ message: '格式化失败：' + e }, () => {
              this.showMessageEdit();
            });
            console.log('格式化失败：' + e);
          }
        }
      );
    } else {
      this.setState(
        { message: '没有可格式化的内容，当前笔记为空' },
        () => {
          this.showMessageEdit();
        }
      );
    }
  };

  uncheckBoxes = () => {
    const { text } = this.props;
    const checkedBoxes = new RegExp(/- \[x\]/gm);
    if (checkedBoxes.test(text)) {
      const newText = text.replace(checkedBoxes, '- [ ]');
      this.props.saveText(newText);
      this.props.refreshEdit();
      this.props.refreshView();
      this.setState({ message: '已取消勾选全部任务' }, () => {
        this.showMessageEdit();
      });
    } else {
      this.setState({ message: '没有找到已勾选的任务' }, () => {
        this.showMessageEdit();
      });
    }
  };

  render() {
    // You can render any custom fallback UI
    return [
      <div
        className="menu-overlay"
        key={'menu-overlay'}
        onClick={this.props.toggleShowMenu}
      />,
      <div id={HtmlElementId.menu} key={HtmlElementId.menu}>
        <ChevronToggleButton
          caption={'外观'}
          className={HtmlClassName.chevronToggleButton}
          condition={this.props.showMenuOptionsView}
          key={'appearance'}
          onClick={this.props.toggleShowMenuOptionsView}
          title={'展开/收起编辑器外观选项'}
        />
        {this.props.showMenuOptionsView && [
          <EyeButton
            caption={'无边框'}
            className={
              HtmlClassName.menuButton +
              (this.props.borderlessMode ? HtmlClassName.on : HtmlClassName.off)
            }
            condition={this.props.borderlessMode}
            key={'borderless'}
            messageOn={'开启'}
            messageOff={'关闭'}
            onClick={this.props.toggleBorderlessMode}
            title={
              '切换无边框模式，让边框和边距融入背景'
            }
          />,
          <EyeButton
            caption={'固定高度'}
            className={
              HtmlClassName.menuButton +
              (this.props.fixedHeightMode
                ? HtmlClassName.on
                : HtmlClassName.off)
            }
            condition={this.props.fixedHeightMode}
            key={'fixed-height'}
            messageOn={'开启'}
            messageOff={'关闭'}
            onClick={this.props.toggleFixedHeightMode}
            title={
              '切换固定高度模式，便于并排编辑'
            }
          />,
          <EyeButton
            caption={'全宽'}
            className={
              HtmlClassName.menuButton +
              (this.props.fullWidthMode ? HtmlClassName.on : HtmlClassName.off)
            }
            condition={this.props.fullWidthMode}
            key={'full-width'}
            messageOn={'开启'}
            messageOff={'关闭'}
            onClick={this.props.toggleFullWidthMode}
            title={
              '切换全宽模式，取消内容最大宽度限制'
            }
          />,
          <EyeButton
            caption={'横向溢出'}
            className={
              HtmlClassName.menuButton +
              (this.props.overflowMode ? HtmlClassName.on : HtmlClassName.off)
            }
            condition={this.props.overflowMode}
            key={'horizontal-overflow'}
            messageOn={'显示'}
            messageOff={'自动'}
            onClick={this.props.toggleOverflowMode}
            title={
              '切换横向溢出，适合宽表格和预格式化内容'
            }
          />,
        ]}
        <ChevronToggleButton
          caption={'分享'}
          className={HtmlClassName.chevronToggleButton}
          condition={this.props.showMenuOptionsShare}
          key={'share'}
          onClick={this.props.toggleShowMenuOptionsShare}
          title={'展开/收起分享选项'}
        />
        {this.props.showMenuOptionsShare && [
          <CopyButton
            caption={'复制笔记文本'}
            className={HtmlClassName.menuButton}
            fill={'var(--sn-stylekit-success-color)'}
            key={'copy-note-text'}
            onClick={this.copyText}
            title={'复制笔记原始文本到剪贴板'}
          />,
          <CopyButton
            caption={'复制渲染 HTML'}
            className={HtmlClassName.menuButton}
            fill={'var(--sn-stylekit-success-color)'}
            key={'copy-rendered-html'}
            onClick={this.copyHtml}
            title={
              '复制渲染后的 HTML 到剪贴板'
            }
          />,
          <PrintButton
            caption={'打印笔记'}
            className={'menu-button off'}
            fill={'var(--sn-stylekit-foreground-color)'}
            key={'print-rendered-note'}
            id={HtmlElementId.printButton}
            onClick={this.props.onConfirmPrintUrl}
            title={
              '打印当前笔记；桌面 Chromium 环境兼容性最好'
            }
          />,
          <div
            className={`notification ${
              this.state.displayMessageShare ? 'visible' : 'hidden'
            }`}
            key={'notification'}
          >
            <p>
              <b>{this.state.message}</b>
            </p>
          </div>,
        ]}
        <ChevronToggleButton
          caption={'操作'}
          className={HtmlClassName.chevronToggleButton}
          condition={this.props.showMenuOptionsEdit}
          onClick={this.props.toggleShowMenuOptionsEdit}
          title={'展开/收起快捷编辑操作'}
        />
        {this.props.showMenuOptionsEdit && [
          <PencilButton
            caption={'格式化 Markdown'}
            className={HtmlClassName.menuButton}
            fill={'var(--sn-stylekit-warning-color)'}
            key={'format-markdown-text'}
            onClick={this.formatText}
            title={
              '使用 Prettier 格式化 Markdown；可能会改写部分源码排版'
            }
          />,
          <PencilButton
            caption={'取消全部任务勾选'}
            className={HtmlClassName.menuButton}
            fill={'var(--sn-stylekit-danger-color)'}
            key={'uncheck-all-checkboxes'}
            onClick={this.uncheckBoxes}
            title={
              '取消当前笔记中所有任务勾选状态'
            }
          />,
          <div
            className={`notification ${
              this.state.displayMessageEdit ? 'visible' : 'hidden'
            }`}
            key={'notification'}
          >
            <p>
              <b>{this.state.message}</b>
            </p>
          </div>,
        ]}
        <div className="extra-space"></div>
      </div>,
    ];
  }
}
