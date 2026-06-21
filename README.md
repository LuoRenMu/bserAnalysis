# 项目结构文档

## 概览
bserAnalysis 是一个基于 Tauri + React 的永恒轮回(EternalReturn)游戏数据分析工具，提供玩家数据查询、角色分析、排行榜等功能 **所有API都来自dak.gg**。

## 技术栈

### 前端
- **React 19** - UI 框架
- **TypeScript** - 类型安全
- **Jotai** - 状态管理
- **React Router** - 路由管理
- **Tailwind CSS** - 样式系统
- **Vite** - 构建工具

### 后端
- **Rust** - 核心逻辑
- **Tauri** - 桌面应用框架
- **Tokio** - 异步运行时
- **Reqwest** - HTTP 客户端
- **Serde** - 序列化/反序列化

## 目录结构

```
bserAnalysis/
├── src/                          # 前端源码
│   ├── pages/                    # 页面组件
│   │   ├── Search.tsx           # 玩家搜索页
│   │   ├── Characters.tsx       # 角色列表页
│   │   ├── CharacterDetail.tsx  # 角色详情页
│   │   ├── CharacterLeaderboard.tsx  # 角色排行榜
│   │   └── Leaderboard.tsx      # 全局排行榜
│   ├── components/              # 可复用组件
│   │   ├── match/              # 对局相关组件
│   │   └── InfoTooltip.tsx     # 提示组件
│   ├── store/                   # 状态管理（按功能拆分）
│   │   ├── index.ts            # 统一导出
│   │   ├── overlayStore.ts     # 覆盖层状态
│   │   ├── characterStore.ts   # 角色数据状态
│   │   ├── searchStore.ts      # 搜索状态
│   │   ├── leaderboardStore.ts # 排行榜状态
│   │   └── characterLeaderboardStore.ts  # 角色排行榜状态
│   ├── utils/                   # 工具函数
│   │   ├── character.ts        # 角色相关工具
│   │   ├── navigation.ts       # 导航辅助函数
│   │   ├── pagination.ts       # 分页计算
│   │   ├── format.ts           # 格式化工具
│   │   ├── convert.ts          # 数据转换
│   │   ├── gameData.ts         # 游戏数据查询
│   │   └── settings.ts         # 设置管理
│   ├── types/                   # TypeScript 类型定义
│   │   ├── bser.ts             # 游戏核心类型
│   │   ├── search.ts           # 搜索相关类型
│   │   ├── match.ts            # 对局相关类型
│   │   └── leaderboard.ts      # 排行榜类型
│   ├── App.tsx                  # 应用根组件
│   └── main.tsx                 # 应用入口
│
├── src-tauri/                   # Rust 后端
│   ├── src/
│   │   ├── command/            # Tauri 命令处理层（薄封装）
│   │   │   ├── bser_request.rs # API 命令处理
│   │   │   └── bser_client.rs  # 客户端注入命令
│   │   ├── service/            # 业务逻辑层（数据组装）
│   │   │   ├── player_render.rs      # 玩家数据渲染
│   │   │   ├── leaderboard_render.rs # 排行榜数据渲染
│   │   │   └── match_render.rs       # 对局数据渲染
│   │   ├── request/            # HTTP 请求层
│   │   │   ├── dakgg_api.rs    # dak.gg API 客户端
│   │   │   ├── manager.rs      # 请求管理器（缓存）
│   │   │   ├── error.rs        # 错误类型定义
│   │   │   ├── types.rs        # API 类型定义
│   │   │   └── models.rs       # 数据模型
│   │   ├── core/               # 核心功能（Windows 集成）
│   │   │   ├── dll.rs          # DLL 加载
│   │   │   └── ipc.rs          # 进程间通信
│   │   ├── config.rs           # 配置管理
│   │   └── lib.rs              # 模块导出
│   └── Cargo.toml
│
└── PROJECT_STRUCTURE.md         # 本文档
```

## 架构设计

### 前端架构

#### 状态管理（Jotai）
所有状态按功能模块拆分到独立文件，通过 `store/index.ts` 统一导出：

- **overlayStore** - 游戏内覆盖层显示状态
- **characterStore** - 角色基础数据（全局共享）
- **searchStore** - 搜索页面状态（查询、分页、结果）
- **leaderboardStore** - 排行榜状态（服务器、队伍模式）
- **characterLeaderboardStore** - 角色排行榜状态

**优势：**
- 清晰的功能边界
- 避免单文件过大
- 便于测试和维护

#### 工具函数组织

**character.ts** - 角色查找和路径生成
```typescript
findCharacterByName()      // 按名称查找角色
findCharacterIdByName()    // 获取角色ID
getCharacterDetailPath()   // 生成详情页路径
```

**navigation.ts** - 导航辅助
```typescript
navigateToCharacterByName()           // 按名称导航
createCharacterNavigationHandler()    // 创建导航处理器
```

**pagination.ts** - 分页计算
```typescript
calculateVisiblePages()    // 计算可见页码
```

### 后端架构

#### 三层架构

1. **Command 层** (`command/`) - Tauri 命令处理
    - 接收前端请求
    - 参数验证和转换
    - 统一错误处理（`log_error` 辅助函数）

2. **Service 层** (`service/`) - 业务逻辑
    - 数据获取和组装
    - 复杂计算和聚合
    - 返回前端渲染结构

3. **Request 层** (`request/`) - HTTP 请求
    - dak.gg API 客户端封装
    - 请求缓存管理（TTL 机制）
    - 错误处理和重试

#### 核心模块

**RequestManager** (`request/manager.rs`)
- LRU 缓存实现
- TTL 过期管理
- 并发请求控制

**DakGgApi** (`request/dakgg_api.rs`)
- RESTful API 封装
- 类型安全的请求/响应
- 统一错误处理

**配置管理** (`config.rs`)
- DLL 插件路径配置
- 支持环境变量覆盖
- 默认值回退机制

## 代码规范

### TypeScript

1. **类型安全**
    - 所有导出函数必须有类型标注
    - 避免使用 `any`，优先 `unknown`
    - 使用 TypeScript 严格模式

2. **文档注释**
    - 导出函数必须有 JSDoc 注释
    - 包含参数说明和示例

3. **命名约定**
    - 文件名：camelCase
    - 组件：PascalCase
    - 函数/变量：camelCase
    - 常量：UPPER_SNAKE_CASE

### Rust

1. **错误处理**
    - 使用 `Result<T, E>` 返回类型
    - 自定义错误类型继承 `thiserror`
    - 统一日志记录格式

2. **异步编程**
    - 使用 `async/await` 语法
    - 并行请求用 `tokio::try_join!`
    - 避免阻塞操作

3. **命名约定**
    - 文件名：snake_case
    - 类型：PascalCase
    - 函数/变量：snake_case
    - 常量：UPPER_SNAKE_CASE

## 数据流

### 玩家搜索流程
```
用户输入 → Search.tsx
    ↓ invoke("search_player")
command::search_player()
    ↓ assemble_player_search()
service::player_render
    ↓ fetch_matches() / fetch_stats()
request::dakgg_api
    ↓ HTTP Request (with cache)
dak.gg API
    ↓ Response
渲染数据 ← PlayerSearchRender
```

### 角色排行榜流程
```
选择角色 → CharacterLeaderboard.tsx
    ↓ invoke("fetch_character_leaderboard")
command::fetch_character_leaderboard()
    ↓ assemble_character_leaderboard()
service::leaderboard_render
    ↓ fetch_character_ranking()
request::dakgg_api
    ↓ HTTP Request
dak.gg API
    ↓ Response
排行数据 ← CharacterLeaderboardRender
```


## 配置管理

### 环境变量
```bash
# DLL 插件路径（可选）
set DAKGG_PLUGIN_PATH=C:\path\to\dakgg-er-plugin.dll
```

## 部署

### 开发环境
```bash
npm run dev          # 启动开发服务器
npm run tauri dev    # 启动 Tauri 开发模式
```

### 生产构建
```bash
npm run build        # 构建前端
npm run tauri build  # 构建 Tauri 应用
```

## 依赖关系

### 关键依赖
- **前端**
    - react@19
    - jotai@2
    - react-router-dom@6
    - @tauri-apps/api@2

- **后端**
    - tauri@2
    - tokio@1
    - reqwest@0.11
    - serde@1


**最后更新：** 2026-06-21
**维护者：** LoMu
