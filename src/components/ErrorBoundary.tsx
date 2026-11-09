import React, { ErrorInfo } from 'react';
import { GearIcon } from './Icons';
import { clickSettingsButton } from '../lib/clickButton';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export default class ErrorBoundary extends React.Component<
  any,
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.log('编辑器错误:', error, '\n错误信息:', errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="sk-panel main">
          <div className="sk-panel-content view">
            <div id="errorBoundary">
              <h1>编辑器运行出错</h1>
              <p>
                错误类型：<code>{this.state.error?.name}</code>
              </p>
              <p>
                错误信息：<code>{this.state.error?.message}</code>
              </p>
              <p>可以打开开发者控制台查看完整错误堆栈。</p>
              <hr />
              <p>
                这通常不是笔记内容丢失，而是编辑器运行时、扩展节点或旧格式兼容出现问题。
                你可以先打开
                <button
                  className="inline-text-and-svg"
                  onClick={clickSettingsButton}
                  title="打开设置"
                >
                  <span>&nbsp;</span>
                  <GearIcon role="button" />
                  <span>&nbsp;</span>
                </button>
                ，切换到 Monaco 源码模式检查原始内容。
              </p>
              <p>
                如果问题可以稳定复现，请在{' '}
                <a
                  href="https://github.com/Luxciax/append-editor/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Luxciax/append-editor
                </a>{' '}
                提交问题，并附上错误信息。
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
