# HLTV MCP Service

一个面向 HLTV 数据查询的 MCP 服务骨架。

当前提供的 tools：

- `resolve_team`
- `resolve_player`
- `hltv_team_recent`
- `hltv_player_recent`
- `hltv_results_recent`
- `hltv_matches_upcoming`
- `hltv_news_digest`

上游默认依赖你自部署的 `hltv-scraper-api`：

- `HLTV_API_BASE_URL=http://127.0.0.1:8000`

---

## 当前传输方式支持情况

### 已实现
- `stdio`

### 可扩展但当前仓库未实现
- `Streamable HTTP`
- `SSE`

也就是说：

> 现在这份代码可以直接作为 **本地 stdio MCP server** 接给 OpenCode。  
> 如果你后续要接其他支持 HTTP / SSE 的客户端，需要再补对应 transport 启动入口。

---

## 快速开始

```bash
npm install
npm run build
```

本地直接运行：

```bash
npm run start
```

> 说明：这是一个 MCP stdio server，通常由 MCP 客户端拉起，而不是手动长期运行。

---

## 必要环境变量

参考 `.env.example`，最常用的是：

```env
HLTV_API_BASE_URL=http://127.0.0.1:8000
HLTV_API_TIMEOUT_MS=8000
DEFAULT_TIMEZONE=Asia/Shanghai
DEFAULT_RESULT_LIMIT=5
SUMMARY_MODE=template
```

---

## 与 OpenCode 对接

## 重要说明

本仓库：

- **不会自动帮你连接 OpenCode**
- **不会自动写入你的 OpenCode 配置**
- **不会自动执行 `opencode mcp add`**

你需要自己手动接入。

---

## OpenCode 接入步骤

### 1. 先构建项目

```bash
npm install
npm run build
```

确保以下文件存在：

```text
dist/index.js
```

### 2. 在 OpenCode 中配置 local MCP

推荐手工编辑 `opencode.json` / `opencode.jsonc`。

模板如下：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "hltv_local": {
      "type": "local",
      "command": [
        "node",
        "C:/ABSOLUTE/PATH/TO/hltv-mcp-service/dist/index.js"
      ],
      "enabled": true,
      "timeout": 10000,
      "environment": {
        "HLTV_API_BASE_URL": "http://127.0.0.1:8000",
        "HLTV_API_TIMEOUT_MS": "8000",
        "DEFAULT_TIMEZONE": "Asia/Shanghai",
        "DEFAULT_RESULT_LIMIT": "5",
        "SUMMARY_MODE": "template"
      }
    }
  }
}
```

### 3. 验证是否接入成功

```bash
opencode mcp list
```

或者：

```bash
opencode mcp ls
```

如果配置正确，你应该能看到：

- `hltv_local`

### 4. 在 OpenCode 中使用

你可以尝试：

```text
调用 hltv_team_recent，查询 Team Spirit 最近 5 场比赛并用中文总结
```

或者先测试解析工具：

```text
调用 resolve_team，搜索 Spirit
```

---

## 也可以用 OpenCode CLI 向导手动添加

```bash
opencode mcp add
```

推荐填写：

- 类型：`local`
- 名称：`hltv_local`
- command：`node`
- args：`C:/ABSOLUTE/PATH/TO/hltv-mcp-service/dist/index.js`
- timeout：`10000`
- environment：与上面模板一致

---

## 其他客户端对接模板

下面给的是 **模板**。不同 MCP 客户端字段名可能不同，但核心思路一致。

---

## 1) stdio 模板

### 适用场景
- 本地客户端拉起 MCP 进程
- 桌面端 / CLI / IDE 类 MCP 客户端

### 当前仓库支持情况
- **已实现，可直接使用**

### 通用模板

```json
{
  "transport": "stdio",
  "command": "node",
  "args": [
    "/absolute/path/to/hltv-mcp-service/dist/index.js"
  ],
  "env": {
    "HLTV_API_BASE_URL": "http://127.0.0.1:8000",
    "HLTV_API_TIMEOUT_MS": "8000",
    "DEFAULT_TIMEZONE": "Asia/Shanghai",
    "DEFAULT_RESULT_LIMIT": "5",
    "SUMMARY_MODE": "template"
  }
}
```

### 核心点
- 客户端负责启动 `node dist/index.js`
- 通过 stdin/stdout 与 MCP server 通信
- 当前项目就是这种模式

---

## 2) Streamable HTTP 模板

### 适用场景
- 远程部署 MCP 服务
- 多客户端共用一个 MCP endpoint
- 更适合服务化部署

### 当前仓库支持情况
- **SDK 支持，但本仓库当前未实现该传输入口**

如果你后续要支持这一模式，需要在代码中额外接入：

- `StreamableHTTPServerTransport`

### 通用客户端配置模板

```json
{
  "transport": "streamable-http",
  "url": "https://your-domain.example.com/mcp",
  "headers": {
    "Authorization": "Bearer YOUR_TOKEN"
  }
}
```

### 说明
- 这是客户端侧模板
- 你还需要在服务端真正暴露一个 HTTP MCP endpoint
- 当前仓库默认**没有**这个 endpoint

---

## 3) SSE 模板

### 适用场景
- 某些仍使用 SSE 方式接 MCP 的客户端

### 当前仓库支持情况
- **SDK 可支持，但本仓库当前未实现该传输入口**
- **并且 SSE 已不如 Streamable HTTP 推荐**

如果你后续要支持这一模式，需要在代码中额外接入：

- `SSEServerTransport`

### 通用客户端配置模板

```json
{
  "transport": "sse",
  "url": "https://your-domain.example.com/sse"
}
```

### 说明
- 这是兼容性模板
- 新项目更建议优先做 `Streamable HTTP`
- 当前仓库默认**没有**这个 SSE endpoint

---

## 你现在应该怎么选

### 如果你要接 OpenCode
直接用：

- `local`
- `stdio`

这是当前仓库**已经可用**的方式。

### 如果你要接其他本地 MCP 客户端
优先用：

- `stdio`

### 如果你要做远程服务化部署
建议后续扩展：

- `Streamable HTTP`

### 如果某个旧客户端只支持 SSE
再补：

- `SSE`

---

## 最后总结

当前仓库的最稳妥接法是：

1. `npm install`
2. `npm run build`
3. 你手动把 `node dist/index.js` 注册到 OpenCode 的 `local MCP`
4. 通过 `opencode mcp list` 检查
5. 在 OpenCode 中调用工具

如果你未来要接其他渠道：

- **stdio：现在就能用**
- **Streamable HTTP：可以做，但当前仓库未实现**
- **SSE：可以做，但当前仓库未实现，且不如 Streamable HTTP 推荐**
