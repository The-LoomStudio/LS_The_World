# Server 源码边界

> **状态**：Timeline 采用与受管 RPC 已接入，正式 EC 及客户端采用状态仍在实施。

`index.js` 导出 `activate(context)`，注册 `official.the-world.readWorldState` RPC。调用方必须提供 `timelineId` 与 `branchId`，模块通过 `context.state.read()` 读取宿主维护的当前 Revision；可选 `entityId` 和 `component` 用于读取地点、场景、世界时间、日历或背景组件。

Manifest 声明 `participation: "timeline"`；安装和加载代码不会自动采用到所有故事。角色卡默认配置仅影响新 Timeline，已有故事通过平台的“故事采用”入口显式加入。采用关系归 Timeline，State Revision 仍归 Branch；暂停不删除数据。

模块申请 `state.read`、`state.write` 与 `state.contribute` 权限，不建立另一套世界状态数据库，不直接依赖 ST 或 TavernHelper。所有世界状态 RPC 使用 `context.timeline.run(target, work)`；Host 核对采用资格、安装版本与执行代次。读取 RPC 返回 State Snapshot 的 revision 元数据和原始 JSON；写入 RPC `official.the-world.writeWorldState` 只修改 `theWorld` 根，并要求显式分支、`expectedRevisionId` 与 `idempotencyKey`。分支隔离、并发和生命周期由 Extension Host / State Service 负责。

参见 [State / EC 数据合同](../../docs/state-contract.md) 与 [迁移讨论](../../docs/migration-discussion.md)。

## Agent Tools

- `official.the-world/read-world-state`：按 Host 绑定的 Timeline / Branch 读取世界状态，可选实体。
- `official.the-world/update-world-state`：按 `expectedRevisionId`、Host 提供的调用身份和受限 JSON Patch 更新 `theWorld/entities`；写入前重新读取 Revision，冲突由 State Service 拒绝。只允许 `add`、`replace`、`remove`，不接受任意根路径。工具入口由 Host 自动绑定受管执行范围，模型不能指定目标故事。
