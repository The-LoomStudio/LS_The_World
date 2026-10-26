# State / EC 数据合同

当前持久化使用平台原生 EC，不在 State 中重复保存管理 metadata。类型在 `src/contracts.ts`，可执行校验、变更和投影共用 `src/world-state.js`。组件模板版本由平台声明管理，RPC mutation 协议版本为 3，不写入 State。

## 归属与投影

新故事的固定 `world` 实体预挂载 `world`、`worldTime`、`calendar`、`weather` 四个组件。`currentSceneId`、历法 id/name/months、时间的 calendarId/year/month/day/hour/minute，以及天气 kind/label/intensity 均以 `null` 表示未知。根只包含实体集合，实体只包含组件，不保存 id、kind、schemaVersion、createdBy、createdAt、updatedAt 或 branch，也不把它们搬进 metadata 组件。实体 ID 是集合键；投影结果可以额外返回 ID 供界面使用，但不持久化这个副本。Timeline / Branch 的权威身份只在宿主 State target 中；Fork 复制快照后不需要重写业务 JSON。

平台声明实体类型 `official-the-world-entity`，集合路径为 `theWorld.entities`，固定实体 `world` 至少包含 `components.world`，旧故事仍可保留原先的空对象形式。可选 `currentSceneId` 指向具备 scene 组件的实体，`scene.placeId` 指向具备 place 组件的实体。不按实体顺序猜当前位置。

- 时间只来自固定 world 的 worldTime。
- 天气和背景优先来自当前 Scene，缺省时使用 world 组件；都不存在则未知。
- 日期、天气、地点和时间戳不自动生成；不使用系统时钟补剧情事实。
- 不保存实体管理 metadata；资源 ID、历法 ID 和天气 kind 属于实际业务数据，不在本次删除范围内。
- 完整初始化示例见 `resources/examples/world-ec.json`。Contribution 声明七种组件模板，默认挂载上述四种空值组件，不自动安装示例，也不创建虚构地点或场景实体。

## 组件与引用

Place 保存名称、描述、parentPlaceId、connections、坐标、短事实和资源。父地点、连接及场景地点必须存在；父地点不得成环。Scene 保存名称、描述、placeId、参与者引用与资源。参与者可指向外部身份，当前版本不把它们当成 The World 内部实体。

WorldTime 包含 calendarId、整数 year、从 1 开始的 month/day，以及 hour 0–23、minute/second 0–59、millisecond 0–999。Calendar ID 在世界内唯一；months 定义非空、有稳定 ID 的月份及正整数 days。日期按对应 Calendar 的实际月份长度校验，不套用 Gregorian；零点和第 0 年有效。历法缺失不降级为系统日历。

Weather kind 为 clear、rain、snow、storm、fog、custom；intensity 若提供须在 0–1。资源引用保存稳定 id、kind、role、availability。Background 必须引用 role=background 的 Asset。失效资源可以明确标记 missing/revoked 并提供 observedAt，但本包尚无宿主卸载后自动更新这些持久标记的监听链。

实体的业务用途由其组件表达；组件集合限定 world、place、scene、worldTime、calendar、background、weather，不保存组件内的 version。没有事实依据的字段保留 null，并不代表已有天气或历法；完整业务校验仍由共享校验器执行。JSON 值必须有限且可序列化。长篇世界观仍由作者的 Lore 提供。

## 写入和工具

RPC `writeWorldState` 接收显式 timelineId / branchId 与 mutation。mutation 包含 schemaVersion=3、同一 target、expectedRevisionId、idempotencyKey 及实体或组件操作。upsert-entity 使用操作级 entityId，entity 内只有 components。禁止未知操作。

AI 工具不接收目标与幂等键：

```json
{
  "expectedRevisionId": "读取返回的 revision",
  "patch": [
    {"op":"add","path":"/entities/world/components/weather","value":{"kind":"rain"}}
  ]
}
```

`read-world-state` 参数为 `{}` 或 `{entityId:"..."}`。宿主从已授权的 Narrative Turn 提供只读 narrativeTarget 和 invocationId；未绑定则拒绝，模型传入 timelineId、branchId、target 或 idempotencyKey 也拒绝。返回仅包含 The World 子树，不泄露其他扩展的 State。

JSON Patch 仅支持 `/entities/` 下的 add、replace、remove。父对象必须已存在；replace/remove 的路径必须存在；数组只整体替换，不支持索引。禁止原型键。整批操作结束后统一检查引用，允许同批创建实体并引用，删除被引用实体时必须同时修正引用。

执行器提交确定性的局部 State operations。幂等身份按包、目标分支和 invocationId 隔离，RPC 则使用显式键。宿主 State Service 判定相同 expectedRevisionId 与相同规范化操作的重放，返回原结果，不推进当前 head；同键不同操作拒绝。新的 stale 请求产生 head conflict，不覆盖并发更新。不自动回滚已成功的工具写入。

## 旧数据显式升级

启用、安装或重载不迁移既有 Timeline。v1/v2 的普通读取明确要求升级，缺根明确要求初始化。以下 RPC 是数据转换入口，不更新平台保存的贡献声明；旧安装声明与新 EC 声明不同，采用恢复仍需单独的跨声明迁移，当前未实现，不能以这些 RPC 绕过。

1. 调用 `official.the-world.previewWorldUpgrade`，传 timelineId / branchId；旧 world 不叫 `world` 时显式提供 worldEntityId，需要当前场景时提供 currentSceneId。
2. 预览只返回 target、revisionId、原生 EC state、options，不写数据。移除根/实体旧版本、身份副本、来源、时间戳、branch 及组件 version，固定 world 身份，保留已有当前场景指针；不猜时间、历法或当前场景。空旧根可得到空 world，身份冲突或无效引用拒绝。
3. 审阅后调用 `official.the-world.commitWorldUpgrade`，携带相同目标、选择字段、预览 state、expectedRevisionId 和稳定 idempotencyKey。服务端重新计算预览并比对，随后交由 State Service 提交；版本冲突需重新预览。

旧数据缺 Calendar 或已有坏引用时预览拒绝，必须由作者显式修正源数据，不能静默丢字段。升级 RPC 已提供，专用升级 UI 尚未实现。宿主历史 revision 保留，升级不是原地覆盖历史。

## 表现边界

面板与服务端用同一固定指针投影。客户端绑定宿主提供的当前 Timeline / Branch，通过 State 订阅更新面板和天气效果；地图显示合法地点层级中的全部地点，并保留选择和描述查看。暂停、切换目标或卸载时清理旧实例的效果与订阅，读取失败时撤下天气表现。当前天色使用实验性宿主 DOM 接口，正式 Background 资源的完整呈现合同尚未交付。

## 空值与首次输入

初始化只建立字段结构，不调用模型、不读取系统时间，也不预设晴天。用户第一次输入之后，AI 通过已有读取/更新工具，根据输入、开场及已采用 Lore 中确认的事实逐项填写。没有依据的字段不填；不要求一次消除所有 null。

时间允许部分字段已知（例如 hour=0 而日期仍为 null）；只有时间必需字段完整时才投影为可用世界时间。未知天气不触发晴天效果，未知历法不出现在可用历法列表。非空值仍遵循原来的类型、范围、引用与自定义历法校验，更新与回滚使用原生 revision 合同。

已有 Timeline 不因更新或重载被批量补值；新建 Timeline 或按平台当前声明显式初始化时使用新初值。维护 Lore 需通过资源更新流程采用新版内容。
