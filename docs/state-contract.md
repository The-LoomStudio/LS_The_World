# State / EC 数据合同

当前合同版本为 `1`，由 `src/contracts.ts` 导出。它描述 The World 在 Loom State 中保存的最小结构化事实；State 的 revision、changeset 和 branch 仍由宿主维护。

## 范围与归属

`WorldStateSnapshot` 必须绑定一个 `timelineId` 与 `branchId`。每个 `WorldEntity.branch` 必须与写入目标一致，读取或更新时不能把另一个分支的实体合并进来。`WorldEntity.id` 在同一分支内稳定且唯一；跨分支可以复用同一个 ID，但不会共享后续修订。

实体只保存短描述和可查询事实。长篇世界观文本继续由 Setting / Prompt Resource 提供。`WorldEntity.components` 允许地点、场景、世界时间、日历和背景按需渐进补充。

## 实体与组件

- `WorldEntity`：稳定 ID、实体种类、分支归属、来源和组件集合。`createdBy` 区分作者初始化、叙事发现、迁移和系统写入。
- `PlaceComponent`：名称、简述、父地点、连接、可选坐标、结构化事实和资源引用。连接只保存目标 ID，不复制目标地点正文。
- `SceneComponent`：场景名称、简述、所在地点、参与者实体 ID、资源和可选背景。
- `WorldTimeComponent`：不依赖系统时钟的历法日期时间；`calendarId` 指向同一分支中的 `CalendarComponent`。时区和暂停状态可选。
- `CalendarComponent`：历法 ID、名称、月份、可选星期、起始星期和纪元。当前包提供日期格式化和月份网格计算；历法推进、换算、节日和回溯规则仍由后续 State 规则合同定义。

## 资源与背景

`WorldResourceReference` 只保存宿主管理的稳定资源 ID、用途和可诊断的可用性，不保存磁盘路径或任意 URL。背景使用 `BackgroundReference`，其中的 `asset` 必须是角色为 `background` 的 Asset 引用；宿主通过 `context.backgrounds.register()` 将它解析为包含 `id`、`name`、`description`、`image` 和 `source` 的注册项。

资源失效或扩展卸载时保留引用，并将 `availability.status` 标为 `missing` 或 `revoked`，同时记录原因和观测时间；Renderer 应显示可诊断状态并跳过失效资源。宿主撤销背景注册后，State 中的引用不会伪装成仍可用，也不会静默改写成另一个资源。

## 更新、幂等与修订

`WorldMutation` 是包内迁移和 RPC 的实体操作形状；AI 更新工具使用同一分支边界下的受限 JSON Patch：

1. `target` 明确写入的 Timeline / Branch；禁止依赖服务端全局“当前聊天”。
2. `expectedRevisionId` 用于乐观并发检查。冲突时由宿主拒绝，调用方重新读取后再决定如何合并。
3. `idempotencyKey` 对同一目标分支和同一操作请求保持稳定。重复提交必须重放原结果，不重复创建实体、组件或背景副作用。
4. 操作仅表达实体/组件的 upsert、删除和替换；真正提交时由 State 生成 revision 与 changeset，旧 revision 保留供追踪。

服务端模块已通过公开 `context.state.read/write` 接入读写 RPC；迁移解析和 mutation 生成仍是显式调用，不写入世界书、不自动合并或回滚。
