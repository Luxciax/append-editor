import React from 'react';
import { HelpIcon } from './Icons';
import { clickHelpButton } from '../lib/clickButton';

interface HelpProps {
  debugMode: boolean;
  printURL: boolean;
}

const Help: React.FC<HelpProps> = () => (
  <div id="help">
    <h2>Append Editor Rich 帮助</h2>
    <p>
      这是一个面向 Standard Notes 的第三方富文本 Markdown 编辑器。
      默认使用真正的所见即所得画布：编辑时看到的就是最终排版，不再区分传统的“编辑模式”和“预览模式”。
    </p>

    <h3>主要功能</h3>
    <ul>
      <li>富文本实时编辑，同时优先保存为 Markdown。</li>
      <li>标题、粗体、斜体、下划线、删除线、颜色、高亮、上下标和对齐。</li>
      <li>无序列表、有序列表、任务列表和多级大纲。</li>
      <li>Callout、代码块、语法高亮、KaTeX 公式和增强表格。</li>
      <li>Slash 命令、查找替换、块拖拽、块 ID、YouTube/网页/音视频嵌入。</li>
      <li>Markdown 无法无损表达的格式会自动使用 Rich HTML 兜底。</li>
    </ul>

    <h3>源码模式</h3>
    <p>
      富文本工具栏中的 <code>&lt;/&gt;</code> 只是可选的源码入口。
      日常写作直接在富文本画布中完成即可，不需要手动切换到预览。
    </p>

    <h3>安装与更新</h3>
    <p>
      在 Standard Notes 的“设置 → 插件 → 安装自定义插件”中使用：
    </p>
    <p>
      <code>https://cdn.jsdelivr.net/gh/Luxciax/append-editor@main/public/ext.json</code>
    </p>

    <h3>问题反馈</h3>
    <p>
      如果遇到稳定可复现的问题，请前往{' '}
      <a
        href="https://github.com/Luxciax/append-editor/issues"
        target="_blank"
        rel="noopener noreferrer"
      >
        GitHub Issues
      </a>{' '}
      提交错误信息。
    </p>

    <button
      className="inline-text-and-svg"
      onClick={clickHelpButton}
      title="关闭帮助"
    >
      <HelpIcon fill={'var(--sn-stylekit-info-color)'} role="button" />
      <span>&nbsp;关闭帮助</span>
    </button>
    <hr />
  </div>
);

export default Help;
