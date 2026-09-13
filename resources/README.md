# 声明式资源

当前资源目录包含 The World 的 Agent Tool Definition：读取和更新世界状态。资源由 Manifest 声明，安装或发现扩展不会自动注入 Agent；宿主按既有 Extension Resource 流程显式导入、版本化和移除。

Tool Definition 与 Server Handler 分离：JSON 负责模型可见的名称、描述和输入 Schema，`src/server/index.js` 负责运行时读取与受控写入。
