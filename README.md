# QTunnel - Cloudflare Tunnel管理工具

一个高效、功能丰富的Cloudflare Tunnel管理桌面应用，使用Tauri框架开发，前端采用Next.js + Tailwind CSS，提供现代化UI和强大的功能。

## 功能特性

### 🌐 隧道管理
- 查看所有Cloudflare隧道
- 快速创建新隧道
- 删除和编辑隧道配置
- 实时隧道状态监控

### 🔗 本地服务绑定
- 一键绑定本地服务到隧道
- 自动生成次级域名（DDNS功能）
- 配置服务路由规则
- 获取服务运行统计数据

### 🛡️ 安全防护
- **WAF规则管理**：添加和管理Web应用防火墙规则
- **IP黑白名单**：配置IP访问控制
- **DDoS防护**：启用和配置DDoS防护
- **SSL/TLS证书**：申请和管理SSL证书

### ⚡ 性能优化
- LRU缓存机制，减少API调用
- 可配置的缓存大小和TTL
- 智能的并发控制
- SQLite数据库存储本地配置

### 🎨 现代化UI设计
- 基于Tailwind CSS的响应式设计
- Lucide React图标库
- 多种开源字体（Geist、Inter、Noto Sans SC等）
- 深色/浅色主题支持
- 流畅的动画和交互

## 技术栈

- **前端**：Next.js 14 + React 18 + TypeScript + Tailwind CSS
- **桌面框架**：Tauri 1.5
- **后端**：Rust + Tokio（异步）
- **数据库**：SQLite + SQLx
- **API客户端**：Reqwest
- **状态管理**：Zustand
- **图标**：Lucide React
- **字体**：Geist、Inter、JetBrains Mono、Noto Sans SC

## 系统要求

- **Rust**: 1.70+
- **Node.js**: 16+
- **npm/yarn**: 最新版本

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run tauri:dev
```

这会同时运行：
- Next.js 开发服务器 (localhost:3000)
- Tauri 应用程序

### 编译构建

```bash
npm run tauri:build
```

## 项目结构

```
qtunnel/
├── src/                          # Next.js应用源代码
│   ├── app/                     # Next.js App Router
│   │   ├── layout.tsx           # 根Layout
│   │   ├── page.tsx             # 主页面
│   │   └── globals.css          # 全局样式
│   ├── components/
│   │   ├── layout/              # 布局组件(Sidebar, TopBar)
│   │   ├── dashboard/           # 仪表板组件
│   │   ├── pages/               # 页面组件
│   │   ├── cards/               # 卡片组件
│   │   ├── modals/              # 模态框组件
│   │   ├── security/            # 安全相关组件
│   │   └── ui/                  # UI基础组件
│   ├── lib/
│   │   └── store.ts             # Zustand状态管理
│   └── styles/                  # 样式文件
├── src-tauri/                    # Rust后端
│   ├── src/
│   │   ├── api.rs              # Cloudflare API调用
│   │   ├── cache.rs            # 缓存管理
│   │   ├── config.rs           # 配置管理
│   │   ├── db.rs               # 数据库管理
│   │   ├── error.rs            # 错误处理
│   │   ├── models/             # 数据模型
│   │   ├── services/           # 业务逻辑
│   │   └── main.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
├── public/                       # 静态资源
├── next.config.js               # Next.js配置
├── tailwind.config.js           # Tailwind配置
├── postcss.config.js            # PostCSS配置
├── package.json
├── Cargo.toml
└── README.md
```

## 配置API令牌

1. 进入应用的 **Settings（设置）** 页面
2. 输入你的 Cloudflare API Token 和 Account ID
3. 点击 **保存设置**

> 获取API Token：https://dash.cloudflare.com/profile/api-tokens

## 字体说明

项目集成了多种开源字体，通过 Google Fonts 加载：
- **Geist**：现代无衬线字体（显示用）
- **Inter**：高可读性无衬线字体（正文用）
- **JetBrains Mono**：编程用等宽字体
- **Noto Sans SC**：优秀的中文字体

所有字体都从 Google Fonts CDN 加载，确保最佳性能。

## UI组件库

项目包含精心设计的UI组件库：
- **Button**：支持多种变体和大小
- **Card**：卡片容器组件
- **Input**：支持图标和验证的输入框
- **Label**：标签组件
- **Tabs**：选项卡组件

所有组件均使用 Tailwind CSS 开发，支持主题切换和响应式设计。

## 主要特性

| 特性 | 状态 | 说明 |
|------|------|------|
| 隧道CRUD操作 | ✅ | 完整实现 |
| 本地服务绑定 | ✅ | 包含DDNS功能 |
| WAF规则管理 | ✅ | 表达式编辑 |
| IP访问控制 | ✅ | 黑白名单 |
| DDoS防护配置 | ✅ | 敏感度调整 |
| SSL证书管理 | ✅ | 续期提醒 |
| 缓存管理 | ✅ | LRU + TTL |
| 数据库存储 | ✅ | SQLite |
| 实时监控 | ✅ | 服务状态 |
| 现代化UI | ✅ | 响应式设计 |

## 开发指南

### 添加新页面

1. 在 `src/components/pages/` 创建新页面组件
2. 在 `src/components/dashboard/DashboardContent.tsx` 中引入
3. 在 `src/components/layout/Navigation.tsx` 中添加导航项

### 添加新UI组件

1. 在 `src/components/ui/` 创建组件文件
2. 使用 Tailwind CSS 类名和 clsx 管理条件样式
3. 支持TypeScript类型定义

### 调用后端API

使用 `@tauri-apps/api` 调用 Rust 命令：

```typescript
import { invoke } from '@tauri-apps/api/tauri'

const result = await invoke('tunnel_list', {
  // 参数
})
```

## 性能优化建议

1. **缓存策略**：
   - 设置适当的缓存大小（1000-5000）
   - 根据使用频率调整TTL（300-600秒）

2. **数据库优化**：
   - 定期清理过期日志
   - 建议启用SQLite WAL模式

3. **网络优化**：
   - API请求自动重试机制
   - 智能的并发控制

## 故障排查

### 连接Cloudflare失败
- 检查API令牌有效性
- 验证账户ID正确性
- 检查网络连接

### 应用启动失败
- 确保 Node.js 版本 ≥ 16
- 确保 Rust 版本 ≥ 1.70
- 尝试删除 `node_modules` 和 `target` 后重新构建

### UI显示异常
- 清除浏览器缓存
- 在开发工具中检查控制台错误
- 确保 Tailwind CSS 正常编译

## 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 贡献指南

欢迎提交Issue和Pull Request！步骤：
1. Fork 本项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeat`)
3. 提交更改 (`git commit -m 'Add AmazingFeat'`)
4. 推送到分支 (`git push origin feature/AmazingFeat`)
5. 开启 Pull Request

## 更新日志

### v0.1.0 (初始版本)
- ✨ Tauri + Next.js 架构
- 🌐 隧道管理功能
- 📌 本地服务绑定
- 🛡️ WAF和IP规则
- 🎨 现代化UI设计
- ⚡ 缓存管理系统

## 联系方式

如有问题或建议，欢迎提交Issue或联系开发者。

---

**QTunnel** - 高效管理Cloudflare隧道，让网络代理更简单！
