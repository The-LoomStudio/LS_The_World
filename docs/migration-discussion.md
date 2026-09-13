# The World 迁移讨论

> **状态**：Deferred / Discussion
> **日期**：2026-09-12
> **授权范围**：建立官方工程骨架并保存迁移讨论；未批准功能实现。排期靠后，开始前重新核对平台合同。

## 目标与当前事实

将 ST 的 The World 迁移为 Loom 原生官方扩展，核心不是复制一套固定地图 UI，而是提供可被作者和自定义界面消费的地理记忆、世界时间与日历数据规范。地图、日历和沉浸效果保留为调试台或可选表现，不逐文件照搬宿主接线。

本轮参考本机 `/Users/macbookair/SillyTavern/public/scripts/extensions/the_world/`，Manifest 标注版本 1.0.0；未冻结 commit，未运行插件，不代表上游最新版本。该路径只是研究来源，不是项目依赖。后续复用代码或素材前确认来源、版本与授权。

- ST 入口 `script.js` 等待 SillyTavern、TavernHelper、jQuery 与 toastr；这些不是 Loom 依赖。
- `TheWorldApp.js` 从消息提取 WorldState、MapUpdate 与 command；地图还通过 Function Tools 更新。
- `DataManager.js` 保存 localStorage；`LorebookManager.js` 把地图写入角色绑定世界书；Atlas / Locator 维护给模型的总览与周边信息。
- 历史重算不重放 MapUpdate；消息删除处理只撤销所记录的新增世界书条目，聊天切换清空事务记录。因此不能视为完整地图回滚。
- Loom 已有 Package / Module / Instance、Client Renderer、State Revision / Branch、Agent Tools、宏提供者、Config 和 Asset 基础；Client Config 与活动世界上下文仍有缺口。

现有合同见 [Extension Architecture](../../../../docs/architecture/extensions/README.md)、[Renderer Host](../../../../docs/architecture/extensions/client-renderer-host.md) 和 [State](../../../../docs/architecture/application/state-and-variables.md)。

## 核心定位：底层世界数据，而不是强制展示层

The World 的权威数据来源应是 Loom State，必要时使用 State 的 Entity / Component（EC）表达稳定身份与可渐进补充的事实。作者初始化的地点、AI 在叙事中发现的地点，以及后续修订，都进入同一套 State 合同；The World 不再额外维护一份 localStorage 地图数据库，也不把世界书或 Setting 当作运行时权威。

地点不要求一次性完整。一个地点可以先只有稳定 ID、名称和简短描述，之后再增加父级、连接、位置、已知事实、图片或音频引用。结构化、需要查询或频繁变化的内容进入 State；长篇文化、历史和氛围描述继续由 Setting / Prompt Resource 提供。Setting 的作者工作台和展示方式尚未冻结，因此不能把详细文本复制进 State 作为临时替代。

The World 自带的地图和日历应定位为**数据调试台**：帮助作者与开发者检查地点关系、当前世界时间、日历换算、缺失引用和最近变更。它不应强行成为玩家最终看到的地图或日历，也不应要求所有作者采用同一种渲染表。作者可以用自定义 Renderer 制作手机 App、导航界面、桌面日历或完全不同的叙事 UI；这些界面从 The World 的 State 读取数据。

时间是世界内时间，不默认跟随操作系统时钟。日历需要区分“当前日期如何存储”和“历法如何推进／换算”；首版支持的历法范围、时区、节日和时间推进规则仍待收口。The World 可以提供规范化时间数据与计算能力，作者自行决定如何展示。

地图、日历和地点表现之间的关系是：

```text
State / EC（权威世界事实）
       ├── The World 调试台：地图、日历、关系和诊断
       └── 作者 Renderer：手机、卡片、HUD、应用式界面等最终体验
```

## 建议的迁移归属

| 能力 | 建议迁移方式 | 需要保留的边界 |
|---|---|---|
| 时间、天气、地点及世界事实 | Timeline State 与明确初始化贡献 | 作者初始数据和游玩变化分开；不使用全局浏览器对象充当权威 |
| 地点、NPC、当前位置与连接 | State / EC + State Mutation | 跨分支隔离；稳定身份与渐进补充，不默认所有长文本都塞进 State |
| 地图调试台 | The World 自带的简单 Renderer | 用于检查数据与关系，不作为作者最终展示台，不强迫作者使用通用渲染表 |
| 世界时间与日历 | State 中的规范化时间数据与计算能力 | 不绑定系统时钟；历法、推进、时区和节日范围待定 |
| 作者自定义地图／日历界面 | 作者自己的 Renderer | 只消费 The World State，不依赖调试台内部组件 |
| Atlas / Locator | 从权威数据生成提示词投影 | 不反复写世界书再解析回状态；完整结构不能假定用标量宏展开即可 |
| 天气、地点插画与其他表现 | 作者 Renderer 或可选官方简单 Renderer | The World 不强读展示；只提供结构化引用与数据 |
| 环境音与音效 | 独立于面板显示的播放生命周期 | 历史浏览、重新渲染不能重播一次性动作；用户可关闭 |
| 旧标签与 tw 宏 | 后续可选兼容层 | 明确支持清单；解析不直接产生副作用，不能宣称旧卡开箱兼容 |
| ST DOM、CSS 注入与 API 接线 | 替换为正式宿主能力 | 不保留私有宿主选择器作为稳定依赖 |

预留 Client / Server 目录不代表必须拆成更多包。Manifest 只有真实实现后才声明模块与贡献；Official 不绕过权限与启用流程。

## 作者资源与提示词资源

角色卡内的地图、插画和音频应作为卡片 Asset 被宿主管理。The World 不直接读取磁盘路径或任意 URL；它通过稳定的资源身份／受控 Asset URL 读取作者已声明的资源，并把资源引用写入地点或场景 State。AI 操作资源时应选择作者可理解的资源 ID、名称或地点关联，不直接拼接路径。

简单描述可随地点 State 一起读取，详细内容继续通过 Setting / Prompt Resource 注入。这样结构化查询不会依赖解析长文本，同时保留作者对世界观材料的自由度。提示词资源的作者 UI、来源展示和编辑体验仍由 Prompt Resource 相关计划决定，不在本扩展骨架中预先设计第二套编辑器。

## 收益与可能退步

Loom 可让地图与世界事实进入可追溯 Revision，通过同一权威来源生成界面和模型上下文，并利用 Host 管理重载与清理。现有 State 工具写入是独立提交，不能推导出删除或编辑正文会自动撤销工具结果；分支、撤销与旧消息重算必须单独约定。

ST 允许直接接管 UI、使用任意 CSS、文件名和旧指令，定制自由度更高。正式 Surface 会收窄稳定支持的改动范围；旧主题、世界书地图、宏和音频路径不会天然兼容。首版功能也可能少于现有 ST 版本，不以“原生”代替完整度证明。

## 前置关系与建议顺序

1. [官方背景与面板材质 Plan](../../../../docs/workbench/plans/ui/background-and-panel-materials-plan.md) 先完成背景与毛玻璃闭环。状态和地图技术上可先做，但本项目延期，不为抢跑重新引入全局样式逃生路径。
2. [Extension DX Plan](../../../../docs/workbench/plans/extension-developer-experience.md#3-扩展页面声明式设置与组件使用) 承接调试台页面、声明式设置和组件能力；迁移时优先复用。它不必成为所有数据业务的硬前置。
3. 冻结 Timeline / Branch 上下文、State / EC 运行时创建与修改、资源引用和更新通知合同，覆盖切换后的取消和过期响应丢弃；不靠服务端全局“当前聊天”或读取宿主内部 Store 推断。
4. 首个功能切片建议是规范化世界时间、地点 State / EC、简单地图与日历调试台、读取和受控更新入口；之后再做作者自定义 Renderer 的示例、提示词投影、天气与音频。

以上是建议顺序，不是排期承诺或已批准工作包。

## 实施前必须回答

- 作者地图、当前世界状态与跨世界共享资料分别归谁；已有 Timeline 如何显式接入，不能假定注册贡献会改写旧世界。
- EC 是否已经支持运行时新增地点、组件补充、稳定 ID 冲突和初始化贡献合并；不能把任意 JSON 写入误称为完整 EC 生命周期。
- The World 的最小公共地点与时间字段是什么；哪些字段只属于作者自定义 State，避免所有扩展争夺同一份巨型 Schema。
- 世界时间的历法、推进、时区、节日与回溯语义是什么；系统时间只作为可选外部输入，不能成为隐含权威。
- 地图修改、正文节点、分支和撤销的关联；重复指令、保存冲突及部分失败的语义。
- 原生工具与旧标签各支持多少；兼容提交的明确触发点、权限和幂等边界。
- The World 是否占用唯一背景来源；用户关闭、切换世界、停用模块后视觉及音频如何恢复。
- 哪些 UI 与特效算法可以复用，哪些依赖须重写；框架和打包方式根据届时组件合同决定。
- 导入导出是否包含地图、主题和媒体；范围未批准前不新增迁移器、自动复制或双写旧数据。

## 验证与停止条件

当前骨架只检查 Manifest 正式解析、包身份一致性及文档链接。没有实现，不跑空测试或构建。

实施时以“不串世界、不重复副作用、分支隔离、停用清理”为主要定向验证；视觉与性能按具体特效检查，人工观感由用户验收。开始实施前将已批准决策写成包内执行 Plan，明确文件边界和最小验证。平台合同未收口、需要新增依赖或数据迁移时先上报，不借延期讨论扩大实现范围。

## 当前结果

已建立独立仓库、Manifest、State / EC 合同、调试 Renderer、读写 RPC、Agent Tools、迁移解析与背景注册入口。完整地图交互、ST 导入 UI、天气视觉和 Web Audio 执行层仍属于后续工作；本文件的“当前迁移进度”是实现事实，提案会明确标注。

## 官方背景注册契约（2026-09-13）

The World 的背景引用由宿主外观状态统一持有。扩展只注册可用资源，不直接控制 DOM。注册项至少包含 `id`、`name`、`description`、`image` 与 `source`；资源失效或扩展卸载后，宿主撤销该项。背景状态可作为 State Component 挂入世界/场景实体，作者 Renderer 通过公开状态读取并自行展示。

## 当前迁移进度

- WP1 State / EC 合同与模块入口：已完成。
- WP2 客户端背景注册：已完成最小可运行链路；客户端模块激活时注册可撤销背景，宿主背景目录可读取并向设置页提供。
- WP2 服务端只读 State RPC：已完成 `official.the-world.readWorldState`，必须显式传入 `timelineId` 与 `branchId`，可选读取实体和组件。
- WP2 纯数据层：已完成快照校验、分支一致性 mutation、revision 冲突、地点查询和世界时间分钟推进。
- WP3 显式迁移解析：已完成 `<WorldState>` 与 `<MapUpdate>` 纯函数解析；解析器不访问世界书、localStorage 或 URL，目标分支由导入调用方显式提供。
- WP3 调试与媒体模型：已完成地图/地点/日历/背景调试投影、Locator 文本投影，以及天气标准化和环境音切换判定；浏览器视觉效果与 Web Audio 执行层仍待接入。
- WP4 客户端调试台：已完成 `official.the-world.debugger` 的官方 `shell.workspace-panel` Renderer 声明与最小可启用面板；当前显示模块和 workspace 状态，State 数据读取已接线，并显示 revision、实体数量、schema 与实体组件摘要。
- WP4 Agent Tool：已声明并注册 `official.the-world/read-world-state`，读取工具要求显式 Timeline / Branch，可选实体 ID，不根据宿主全局“当前聊天”猜测上下文。
- WP4 Agent Tool：`official.the-world/update-world-state` 已改为受限 JSON Patch；每次只允许修改 `/entities` 下的路径，写入前检查最新 Revision、目标分支和幂等键，场景不变时可只更新单个组件或字段。
- WP5 显式导入：已完成 `createLegacyWorldImport()`，把 ST 的 WorldState / MapUpdate 解析结果提升为带目标分支、时间戳和 revision 前置条件的 Loom mutation；导入函数本身无持久化副作用。
- WP5 旧格式兼容：已增加 `parseLegacyMap()`，支持旧式 `<Map>` 与 `[MOVEBLOCK:YES|NO]` 的只读解析；无法结构化的附加描述保留诊断，不会静默写入 State。
- WP5 日历模型：已增加日期格式化与自定义月份网格生成，日历长度和周起始日来自 Calendar Component，不默认绑定系统 Gregorian 规则。
- WP5 天气组件：已将 ST WorldState 的天气字段纳入 `WeatherComponent`，支持结构化类型、标签、强度与起始时间，并可通过专用 JSON Patch 更新。
- WP5 Atlas 投影：已增加 `buildAtlasText()`，从地点实体和连接生成短的结构化提示词总览，替代 ST 依赖世界书 Atlas 条目的运行时双写。
- WP5 JSON Patch 验收：已用 fake State Host 验证局部字段更新会保留未修改实体，并通过 revision / branch 校验。
- WP6 分支调试入口：调试台已增加 Timeline / Branch 输入和 `readWorldState` 查询按钮，可直接检查指定分支的 State。
- WP6 State Contribution：服务端模块已声明 `official.the-world.state`，绑定 `theWorld` 根的版本化初始结构，首次启用可获得空实体集合，不再依赖人工先写入 JSON。
- 尚未完成：完整地图关系交互、Timeline / Branch 选择器、ST 导入 UI、天气视觉和 Web Audio 执行层。这些按执行计划继续推进。

## The World 迁移执行计划（2026-09-13）

> **状态**：Approved / Ready for implementation
>
> **目标**：把 The World 迁移为 Loom 官方扩展，首版提供可追溯的世界状态、地点关系、世界时间与日历调试台，并通过正式背景注册 API 让作者资源可被读取；作者最终界面由 Renderer 自主决定。

### 已确认决策

- 权威数据放在 Loom State / EC；不再以 localStorage 或世界书作为运行时真相。
- 地点与场景保存稳定 ID、名称、简述、关系、当前位置和结构化资源引用；详细世界观文本继续由 Setting / Prompt Resource 提供。
- 当前背景是 State Component 的一部分；背景资源通过 `context.backgrounds.register()` 注册，扩展卸载自动撤销。
- The World 自带地图和日历只做调试台；作者可以读取 State 自行制作手机、HUD、卡片或 App 式界面。
- 音频播放作为独立、可关闭的表现能力迁移，不与 Renderer 重渲染绑定。

### 非目标

- 不复制 ST 的 DOM、jQuery、CSS 注入、世界书双写和旧 localStorage 数据库。
- 不在首版强制统一作者地图 UI，不承诺旧卡无改动兼容。
- 不新增外部依赖，除非现有运行时无法满足明确需求。

### 工作包

1. **数据合同与 State / EC**：定义 `WorldEntity`、`PlaceComponent`、`SceneComponent`、`WorldTimeComponent`、`CalendarComponent` 和资源引用；实现读取、受控更新、分支隔离与修订追踪。
2. **扩展模块与工具**：在 `official/extensions/the-world/src/client` 和 `src/server` 建立模块入口；提供地点、当前位置、时间、日历和背景选择工具，所有写入幂等且可诊断。
3. **调试台 Renderer**：提供简单地图关系视图、地点列表、当前时间和日历检查；只消费 State，不成为作者 UI 的唯一入口。
4. **背景与媒体接入**：用正式背景注册 API 消费卡片 Asset / 受控 Asset URL；实现失效引用诊断、背景切换和用户关闭后的清理；音频动作具备独立生命周期和关闭开关。
5. **迁移与兼容边界**：实现显式导入入口和旧字段映射报告；不自动双写世界书，不宣称旧 The World 卡片开箱兼容。
6. **文档与验收**：补充 Manifest、作者 API 示例、State 字段说明、Renderer 接入说明和迁移限制。

### 文件边界

- 官方扩展：`official/extensions/the-world/**`
- SDK 与运行时：仅修改背景注册契约、State 工具和扩展模块加载所需的现有公共入口。
- The World 不直接修改 Studio 业务组件；调试台通过 Renderer / Surface 接入。

### 完成条件

- The World 可被宿主发现、启用和停用；停用后注册背景、工具和 Renderer 均清理。
- 地点、场景、时间和日历可在 State 中读取与更新，并保持 Timeline / Branch 隔离。
- 背景注册能显示在宿主背景目录，资源卸载后不再显示并留下可诊断状态。
- 调试台能展示最小世界关系和时间数据；作者 Renderer 可通过公开 State API读取同一数据。
- 迁移文档明确 ST 差异、兼容限制和未迁移能力。

### 验证预算

优先运行扩展 Manifest 解析、SDK 类型检查、The World 定向单元检查和客户端构建；重点验证停用清理、分支隔离、幂等更新、背景资源失效和音频不重复播放。视觉由哥哥人工验收。

### 停止条件

若 State / EC 无法支持运行时实体创建、背景注册契约需要改变权限边界、或迁移需要自动写入旧世界书 / 不可逆复制数据，则暂停受影响工作包并回报事实与选项。
