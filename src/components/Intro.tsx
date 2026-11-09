import React from 'react';

interface IntroProps {
  appendMode: boolean;
  editMode: boolean;
  showHelp: boolean;
}

const Intro: React.FC<IntroProps> = () => (
  <div id="intro">
    <details open>
      <summary>开始使用 Append Editor Rich</summary>
      <p>
        当前笔记是空的。直接在富文本画布中输入即可，内容会按最终排版效果实时显示。
      </p>
      <p>
        输入 <code>/</code> 可以打开插入命令；工具栏可插入标题、列表、任务、
        Callout、表格、公式、图片和媒体。
      </p>
      <p>
        如果需要直接查看或修改 Markdown/HTML 原文，请点击富文本工具栏中的
        <code>&lt;/&gt;</code> 源码按钮。正常写作不需要在“编辑”和“预览”之间切换。
      </p>
    </details>
  </div>
);

export default Intro;
