# Client module

`src/client/index.js` 是 The World 的官方客户端入口。模块激活时通过 `context.backgrounds.register()` 注册一个可撤销的示例背景，并注册 `official.the-world.debugger` 调试台 Renderer。Renderer 读取 Global State 并显示当前 `theWorld` 摘要；正式作者界面仍应通过自己的 Renderer 消费公开 State。

## 动态天色接入

作者 Renderer 读取到 `WorldTimeComponent` 后，可以调用 `skyPaletteAt(hour, minute)` 生成调色板，再将 `skyCss(palette)` 作为背景渐变叠层。示例：

```js
const palette = skyPaletteAt(worldTime.value.hour, worldTime.value.minute)
root.style.setProperty('--the-world-sky', skyCss(palette))
```

The World 只负责时间到天色的纯计算；全局背景、图片层、毛玻璃和可读性遮罩由宿主或作者 Renderer 决定。

天气视觉可以通过 `createWeatherEffectController(root)` 接入作者 Renderer；控制器只管理覆盖层状态，不接管宿主布局。
