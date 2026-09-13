# 迁移导入 UI 合同

导入界面应接收旧 The World 文本与目标 `timelineId`、`branchId`，调用 `inspectLegacyWorldImport()` 生成预览报告。界面必须先展示 mutation 数量和诊断，再由用户提交；提交时使用报告中的显式 `revisionId` 与 `idempotencyKey`，不得静默覆盖新版本 State。

报告状态含义：

- `ready`：没有诊断错误，可以提交；
- `warning`：可以提交，但必须显示警告；
- `error`：禁止提交，只显示诊断。

导入 UI 不应直接写世界书、localStorage 或任意远程 URL。资源引用失效时保留诊断，交由作者重新注册资源。
