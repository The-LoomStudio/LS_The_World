# Client module

`src/client/index.js` 是构建前的客户端激活入口，面板组件位于 `src/client/panel-view.tsx`，通过 esbuild 生成 `dist/client.js`。模块绑定宿主提供的当前 Timeline / Branch，通过 `context.state.subscribe()` 持续读取世界状态，并注册 `official.the-world.debugger` 运行面板 Renderer。Renderer 挂载到 Host 管理的 `shell.focus-surface` 独立运行层，使用 `shadow` 适配器隔离扩展样式；地图沿用地点卡片与父级分组，显示所有层级的合法地点。正式作者界面仍应通过自己的 Renderer 消费公开 State。

当前故事有有效时间、天气且开启天气效果时，客户端通过实验性宿主 DOM 接口显示天色、天气粒子和云层；同类天气的密度、速度及风力变化会更新现有效果。暂停、切换目标或卸载时清理旧实例的效果与订阅；读取失败时撤下天气表现，并在仍拥有背景值时恢复先前背景。这不是正式 Background 资源的完整呈现合同。

## 动态天色接入

作者 Renderer 读取到 `WorldTimeComponent` 后，可以调用 `skyPaletteAt(hour, minute)` 生成调色板，再将 `skyCss(palette)` 作为背景渐变叠层。示例：

```js
const palette = skyPaletteAt(worldTime.value.hour, worldTime.value.minute)
root.style.setProperty('--the-world-sky', skyCss(palette))
```

The World 只负责时间到天色的纯计算；全局背景、图片层、毛玻璃和可读性遮罩由宿主或作者 Renderer 决定。

天气视觉可以通过 `createWeatherEffectController(root)` 接入作者 Renderer；控制器只管理覆盖层状态，不接管宿主布局。
