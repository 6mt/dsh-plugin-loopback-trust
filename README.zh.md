# dsh-plugin-loopback-trust

[English](README.md) | 中文

解除 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（`dsh`）
web 通过反向代理访问时设置页的 loopback 门禁。

## 问题

dsh 0.1.7 有意把设置页（尤其模型页）挂在一道 loopback 检查上：设置持久化只对
`127.0.0.1` / `localhost` / `::1` 打开的页面开放。

```js
// dsh-client-ui-settings
const persistence = ctx.remote.$host.isLoopback ? "host" : "memory";
```

`isLoopback` 由浏览器 hostname 判定。当 dsh 监听 `127.0.0.1:3080`、前面是
nginx（或任意反向代理）、你用域名打开界面时，页面被判定为非特权：设置静默降级
为内存模式，模型页报 *"settings are unavailable in this browser"*。

## 本插件做什么

把页面连接标记为 host-owning——与官方桌面端声明的同一事实——让设置页在
非 loopback origin 上保持 Host 持久化。聊天等其它功能本来就不受影响，行为
逐字节不变：插件只改变客户端连接状态里的一个布尔值。

- 挂在 boot 预取档，先于任何客户端插件 apply 执行
- 绝不覆盖真实（桌面端）transport；loopback 页面上不做任何事
- 零依赖、无宿主端代码，约 60 行客户端 JavaScript
- 需要 dsh **0.1.7 – 0.2.x**（`engines.dsh: ">=0.1.7 <0.3"`，已对 0.1.7 与 0.2.0-rc.2 验证）

## 安装

```sh
dsh plugin --profile web add 6mt/dsh-plugin-loopback-trust
```

重启 `dsh web`（新 bundle 需要重新启动），浏览器强刷。插件在每次页面加载时
生效，界面中不出现任何元素。

## 原理

`dsh-client-connection` 的客户端入口在插件启动时读
`globalThis.__DSH_TRANSPORT__`；带 `ownsHost: true` 的 transport 会使
`connection.isLoopback === true`。immediate 预取档的 bundle 脚本严格早于任何
插件 apply 执行，所以脚本顶层的赋值先于那次读取：

```js
globalThis.__DSH_TRANSPORT__ = { ownsHost: true };
```

假 transport 在其它所有地方都是惰性的：`rpc`/`fetch`/`openStream` 为
undefined 时回退 `globalThis.fetch`（与普通浏览器页面完全一致）；读
`streamBaseUrl` 的地方全部 `?.` + `document.baseURI` /
`window.location.origin` 兜底。插件 `apply` 里还有兜底：顺序漂移时直接补丁
活体的 `connection.isLoopback` 并失效 api-gateway 缓存的 `$host` 快照。

服务端 `/api` Host fence **未被触碰**。见[安全提示](#安全提示)。

## 验证

1. 通过域名打开 设置 → 模型页：正常加载，无 "settings are unavailable"；
2. 改一项设置后刷新页面：改动持久保留；
3. 浏览器 console 无 `[loopback-trust] could not patch` 警告。

## 安全提示

loopback 门禁是刻意设计：设置写入（模型 provider、API key）只对宿主能绑到
loopback 的页面开放。安装本插件等于为你的部署宣告“这个 origin 可信”：

- 确保你的反向代理在该域名前面执行你期望的访问控制——dsh 的 `/api` Host
  fence 仍按原规则工作，未被改动；
- 不要在无保护的情况下把域名暴露给不可信网络；
- 若日后 dsh 的 `--trusted-host` 覆盖了客户端判定，请改用官方途径并卸载本插件。

本插件不外传任何数据、无遥测、不含宿主端代码——全部载荷就是
[client.js](client.js)，一次就能审完。

## 兼容性

钩子点都是 dsh 0.1.7 的内部实现（`__DSH_TRANSPORT__.ownsHost` 语义、预取档
时序、`$host` 缓存），无兼容承诺。包声明了 `engines.dsh: ">=0.1.7 <0.3"`，
不兼容的宿主会拒绝安装而不是静默损坏。损坏时的表现很醒目（设置页回到
unavailable 状态）——对照你安装版本的
[dsh-client-connection](https://www.npmjs.com/package/@deepseek-ai/dsh-client-connection)
源码调整 `client.js` 即可。

## 卸载

```sh
dsh plugin --profile web remove dsh-plugin-loopback-trust
```

## 许可

[MIT](LICENSE)
