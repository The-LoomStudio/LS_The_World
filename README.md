# The World

> **状态**：官方扩展开发中；此仓库是独立发布与远程更新的源代码仓库。

The World 是 Loom Studio 的官方世界状态扩展。它把地点、场景、世界时间、日历、背景、天气和资源引用放入 Loom State / EC；作者最终界面通过 Renderer 自行实现，官方调试台只用于检查数据和关系。

## 已实现入口

- `src/contracts.ts`：WorldEntity、Place、Scene、WorldTime、Calendar、Background 与 mutation 合同。
- `src/world-model.ts`：快照校验、分支一致性、revision 冲突和地点查询。
- `src/calendar-model.ts`：自定义日历格式化与月份网格。
- `src/media-model.ts`：天气与环境音生命周期模型。
- `src/migration-parser.ts`：`<WorldState>`、`<MapUpdate>`、旧式 `<Map>` 和 `MOVEBLOCK` 解析。
- `src/importer.ts`：把 ST 解析结果转换为显式目标分支的 Loom mutation。
- Client Renderer：`official.the-world.debugger`，读取 Global State 并显示调试摘要。
- Server RPC：`official.the-world.readWorldState`、`official.the-world.writeWorldState`。
- Agent Tools：`official.the-world/read-world-state`、`official.the-world/update-world-state`；更新工具使用受限 JSON Patch，只修改 `/entities` 下的 The World 数据。

所有写入都要求显式 Timeline / Branch、`expectedRevisionId` 与 `idempotencyKey`。扩展不写世界书、不维护 localStorage 地图数据库，也不直接访问任意图片 URL。

详细字段见 [State / EC 数据合同](docs/state-contract.md)，迁移边界见 [迁移讨论与执行计划](docs/migration-discussion.md)。

## 开发与发布

本仓库独立于 Loom Studio 主应用仓库，拥有自己的版本、发布和更新节奏。提交前运行 `pnpm typecheck`。

## 作者接入边界

The World 提供底层 State、分支感知的读取/更新、地点关系、日历和动态天色计算。作者可以通过自己的 Renderer 读取同一份 State，并自行决定地图、手机界面、HUD 或日历 App 的呈现方式。动态天色函数位于 `src/sky-gradient.ts`，不会自行读取系统时间或修改宿主 DOM。

## 远程更新

`update-manifest.json` 是宿主试验远程更新时使用的最小清单。正式接入时，宿主应先校验 `packageId`、Manifest 版本和发布渠道，再下载对应 Release 归档；扩展本身不在运行时执行远程代码。

## 独立仓库本地验证

独立仓库默认不携带依赖目录。若在 LoomStudio 单仓库环境中验证，可从主仓库运行：

```bash
pnpm exec tsx /Users/macbookair/Desktop/LS_The_World/scripts/smoke.ts
pnpm exec tsc -p /Users/macbookair/Desktop/LS_The_World/tsconfig.json --noEmit
```
