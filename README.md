# The World

> **状态**：官方扩展开发中；此仓库是独立发布与远程更新的源代码仓库。

The World 是 Loom Studio 的官方世界状态扩展。它把地点、场景、世界时间、日历、背景、天气和资源引用放入 Loom State / EC；作者最终界面通过 Renderer 自行实现，官方调试台只用于检查数据和关系。

## 已实现入口

- `src/contracts.ts`：WorldEntity、Place、Scene、WorldTime、Calendar、Background 与 mutation 合同。
- `src/world-state.js`：客户端、RPC、工具共用的原生 EC 校验、当前场景投影与显式升级；`src/world-model.ts` 提供类型化入口。实体只保存组件，不保存重复身份、版本和创建来源。
- `src/calendar-model.ts`：自定义日历格式化与月份网格。
- `src/media-model.ts`：天气与环境音生命周期模型。
- `src/migration-parser.ts`：`<WorldState>`、`<MapUpdate>`、旧式 `<Map>` 和 `MOVEBLOCK` 解析。
- `src/importer.ts`：把 ST 解析结果转换为显式目标分支的 Loom mutation。
- Client Renderer：`official.the-world.debugger`，由宿主绑定当前 Timeline / Branch，并订阅 State 修订。
- Server RPC：`official.the-world.readWorldState`、`official.the-world.writeWorldState`。
- Agent Tools：`official.the-world/read-world-state`、`official.the-world/update-world-state`；更新工具使用受限 JSON Patch，只修改 `/entities` 下的 The World 数据。
- Prompt Lore：`world-state-maintenance`，提供先读后写、稳定引用与局部更新规则；显式导入后由使用它的 Preset 采用。

RPC 写入要求显式 Timeline / Branch、`expectedRevisionId` 与 `idempotencyKey`。AI 工具的目标与调用身份由宿主提供，模型只提交 revision 与局部变化。业务 State 不再重复保存分支身份。扩展不写世界书、不维护 localStorage 地图数据库。

详细字段见 [State / EC 数据合同](docs/state-contract.md)，迁移边界见 [迁移讨论与执行计划](docs/migration-discussion.md)。

## 将工具交给 AI

1. 安装扩展并启用 Server Module，授予声明的 State 能力。模块启用只注册执行器，不自动挂载到全部 Agent。
2. 新版宿主在全局 Git / ZIP / 目录安装完成后自动导入包内资源，得到世界状态维护 Lore 和两个 Agent Tool Definition。已有本地开发目录或历史安装仍可在扩展资源中点击“导入资源”；导入失败时也保留此重试入口。
3. 在实际使用的 Agent Preset 中采用维护 Lore，并启用读取 / 更新世界状态工具。
4. 创建 Timeline 前，在角色默认采用配置中选用 The World；已有 Timeline 通过扩展采用面板显式加入。贡献登记平台实体类型 `official-the-world-entity`、固定 `world` 实体和七种组件模板，只默认挂载空 `world` 组件；场景、地点、时间和天气均保持未知。完整示例见 `resources/examples/world-ec.json`，这是示例子树，不会自动写入用户世界。
5. 在绑定 Narrative 的 Agent Turn 中调用工具。读取参数为 `{}`，更新只需 `expectedRevisionId` 与 `patch`。没有 Narrative 目标的独立会话明确拒绝调用。

需要支持 Timeline 采用、受管执行及 `ExtensionAgentToolHandlerContext.invocationId / narrativeTarget` 的新版宿主。既有 v1/v2 State 不自动转换：数据转换保留显式 `previewWorldUpgrade` / `commitWorldUpgrade`，详见合同。旧安装的采用声明与新 EC 声明不同，平台仍会拒绝直接恢复；数据转换 RPC 不等于已实现跨声明的安装迁移。本轮不改写旧 Timeline，使用新 Timeline 验证新声明。旧版 Lore / Tool 资源需重新显式导入并采用，不自动覆盖作者修改。

面板按固定世界指针读取当前场景、地点、时间与天气，不再手填目标或手动刷新。只有当前故事已采用扩展、
当前分支有有效的时间和天气时才绘制天色与天气。未知数据保持未知；分支缺失数据会显示未初始化，不自动补建。
暂停、切换目标、断线或卸载会清理旧实例的天气、云层、定时器和订阅。天色仍使用宿主 DOM 的实验性接口，
不是正式 Background 资源的完整呈现合同。

旧的天气/时间预览及音量、环境音等无实现控件已移除。天气效果偏好通过现有 Config 保存，
只控制当前被采用故事的表现，不改写业务 State；主题和毛玻璃仅是本次面板实例的显示选项。
需要支持 `ClientExtensionActivationContext.timeline.target` 与 `state.subscribe` 的新版宿主。

## 开发与发布

扩展独立分发，不加入 Loom Studio 主仓库跟踪。扩展自己的 `.gitignore` 不再忽略 `dist/`；修改 Client 源码后运行 `pnpm build`，将 `dist/client.js` 与源码、Manifest、resources、assets 一起提交到独立扩展仓库。`node_modules/` 仍不提交。

宿主通过 Git 安装只下载和校验包，不执行构建。因此远端分支必须包含已经生成的 `dist/client.js`，玩家才可通过 GitHub 远程链接添加：

```text
https://github.com/The-LoomStudio/LS_The_World.git
```

这是目标仓库地址，不表示本地变更已经推送。可在远程安装入口使用该 Git URL，并指定已发布的分支、Tag 或 commit。当前本地目录没有独立 Git 根；仅移除 ignore 不会自动将产物加入远端。本轮没有初始化仓库、提交、推送或发布，也未验证公网下载。

## 作者接入边界

The World 提供底层 State、分支感知的读取/更新、地点关系、日历和动态天色计算。作者可以通过自己的 Renderer 读取同一份 State，并自行决定地图、手机界面、HUD 或日历 App 的呈现方式。动态天色函数位于 `src/sky-gradient.ts`，不会自行读取系统时间或修改宿主 DOM。

## 远程更新

`update-manifest.json` 是宿主试验远程更新时使用的最小清单。正式接入时，宿主应先校验 `packageId`、Manifest 版本和发布渠道，再下载对应 Release 归档；扩展本身不在运行时执行远程代码。

## 独立仓库本地验证

独立仓库默认不携带依赖目录。开发依赖就绪后，在扩展根目录运行：

```bash
pnpm typecheck
pnpm smoke
pnpm build
```
