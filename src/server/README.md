# Server 源码边界

> **状态**：WP2 / State 读取入口

`index.js` 导出 `activate(context)`，注册 `official.the-world.readWorldState` RPC。调用方必须提供 `timelineId` 与 `branchId`，模块通过 `context.state.read()` 读取宿主维护的当前 Revision；可选 `entityId` 和 `component` 用于读取地点、场景、世界时间、日历或背景组件。

模块只申请 `state.read` 与 `state.write` 权限，不建立另一套世界状态数据库，不直接依赖 ST 或 TavernHelper。读取 RPC 返回 State Snapshot 的 revision 元数据和原始 JSON；写入 RPC `official.the-world.writeWorldState` 只修改 `theWorld` 根，并要求显式分支、`expectedRevisionId` 与 `idempotencyKey`。分支隔离、并发和生命周期由 Extension Host / State Service 负责。

参见 [State / EC 数据合同](../../docs/state-contract.md) 与 [迁移讨论](../../docs/migration-discussion.md)。

## Agent Tools

- `official.the-world/read-world-state`：按显式 Timeline / Branch 读取世界状态，可选实体。
- `official.the-world/update-world-state`：按 `expectedRevisionId`、`idempotencyKey` 和受限 JSON Patch 更新 `theWorld/entities`；写入前重新读取 Revision，冲突由 State Service 拒绝。只允许 `add`、`replace`、`remove`，不接受任意根路径。
