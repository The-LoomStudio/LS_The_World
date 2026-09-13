# Client module

`src/client/index.js` 是 The World 的官方客户端入口。模块激活时通过 `context.backgrounds.register()` 注册一个可撤销的示例背景，并注册 `official.the-world.debugger` 调试台 Renderer。Renderer 读取 Global State 并显示当前 `theWorld` 摘要；正式作者界面仍应通过自己的 Renderer 消费公开 State。
