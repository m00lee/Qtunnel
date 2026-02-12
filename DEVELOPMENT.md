# QTunnel 开发指南

本文档提供详细的开发和贡献指南。

## 目录

- [开发环境设置](#开发环境设置)
- [项目结构详解](#项目结构详解)
- [前端开发](#前端开发)
- [后端开发](#后端开发)
- [集成开发](#集成开发)
- [测试指南](#测试指南)
- [性能优化](#性能优化)
- [常见问题](#常见问题)

## 开发环境设置

### 1. 系统要求

```bash
# macOS/Linux
brew install rust node

# Ubuntu
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
```

### 2. 验证安装

```bash
rustc --version
cargo --version
node --version
npm --version
```

### 3. 初始化项目

```bash
git clone https://github.com/yourusername/qtunnel.git
cd qtunnel
npm install
cargo build  # 编译Rust后端
```

## 项目结构详解

### 前端结构 (`src/`)

```
src/
├── app/
│   ├── layout.tsx           # 根布局，包含全局提供者
│   ├── page.tsx             # 主页面入口
│   └── globals.css          # 全局样式、主题定义、Google Fonts
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx      # 左侧导航栏
│   │   ├── TopBar.tsx       # 顶部工具栏
│   │   └── Navigation.tsx    # 导航菜单
│   ├── dashboard/
│   │   ├── DashboardContent.tsx  # 仪表板主容器
│   │   └── index.tsx
│   ├── pages/
│   │   ├── TunnelsPage.tsx       # 隧道管理页面
│   │   ├── ServicesPage.tsx      # 本地服务页面
│   │   ├── SecurityPage.tsx      # 安全防护页面
│   │   └── SettingsPage.tsx      # 设置页面
│   ├── cards/
│   │   ├── TunnelCard.tsx        # 隧道卡片
│   │   └── ServiceCard.tsx       # 服务卡片
│   ├── modals/
│   │   ├── CreateTunnelModal.tsx # 创建隧道模态框
│   │   └── BindServiceModal.tsx  # 绑定服务模态框
│   ├── security/
│   │   ├── WafRules.tsx          # WAF规则管理
│   │   ├── IpRules.tsx           # IP规则管理
│   │   ├── DdosProtection.tsx    # DDoS防护配置
│   │   └── CertificateManagement.tsx  # 证书管理
│   └── ui/
│       ├── Button.tsx            # 按钮组件
│       ├── Card.tsx              # 卡片组件
│       ├── Input.tsx             # 输入框组件
│       ├── Label.tsx             # 标签组件
│       └── Tabs.tsx              # 标签卡组件
└── lib/
    └── store.ts                 # Zustand 状态管理
```

### 后端结构 (`src-tauri/src/`)

```
src-tauri/src/
├── api.rs                   # Cloudflare API 客户端
├── cache.rs                 # LRU缓存实现
├── config.rs                # 配置管理
├── db.rs                    # SQLite数据库初始化
├── error.rs                 # 自定义错误类型
├── models/
│   ├── mod.rs              # 模型导出
│   ├── tunnel.rs           # 隧道数据模型
│   ├── route.rs            # 路由模型
│   ├── security.rs         # 安全规则模型
│   └── certificate.rs      # 证书模型
├── services/
│   ├── mod.rs              # 服务导出
│   ├── tunnel.rs           # 隧道命令处理
│   ├── routing.rs          # 路由命令处理
│   ├── security.rs         # 安全命令处理
│   ├── cache.rs            # 缓存命令处理
│   └── config.rs           # 配置命令处理
└── main.rs                 # Tauri应用主入口
```

## 前端开发

### 组件开发规范

#### 1. 创建新UI组件

在 `src/components/ui/` 中创建新组件：

```typescript
// src/components/ui/MyComponent.tsx
import clsx from 'clsx'

interface MyComponentProps {
  title: string
  variant?: 'primary' | 'secondary'
  disabled?: boolean
  className?: string
}

export function MyComponent({
  title,
  variant = 'primary',
  disabled = false,
  className,
}: MyComponentProps) {
  return (
    <div
      className={clsx(
        'rounded-lg border p-4',
        variant === 'primary' && 'border-primary bg-primary/10',
        variant === 'secondary' && 'border-gray-300 bg-gray-50',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {title}
    </div>
  )
}
```

#### 2. 样式编写规范

- 优先使用 Tailwind CSS 类名
- 使用 `clsx` 管理条件样式
- 遵循深色主题支持（使用 `dark:` 前缀）
- 使用 CSS custom properties 定义主题色

```typescript
// 好的做法
className={clsx(
  'px-4 py-2 rounded-lg',
  'bg-primary text-white',
  'dark:bg-primary/90 dark:text-gray-100',
  'hover:bg-primary/90',
  'disabled:opacity-50 disabled:cursor-not-allowed'
)}

// 避免的做法
className="px-4 py-2 bg-blue-500 text-white hover:bg-blue-600"
```

#### 3. 类型定义规范

为所有Props定义TypeScript接口：

```typescript
interface PageProps {
  params?: { id: string }
  searchParams?: { [key: string]: string | string[] }
}

interface ComponentProps {
  // 必需属性在上方
  title: string
  items: Item[]
  
  // 可选属性在下方
  variant?: 'default' | 'compact'
  onSelect?: (item: Item) => void
  className?: string
}
```

### 页面开发流程

#### 1. 创建新页面

```typescript
// src/components/pages/MyPage.tsx
import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export function MyPage() {
  const [loading, setLoading] = useState(false)

  const handleAction = async () => {
    setLoading(true)
    try {
      // 调用Tauri命令
      // const result = await invoke('my_command', { /* params */ })
    } catch (error) {
      console.error('Action failed:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">My Page</h2>
        <Button onClick={handleAction} disabled={loading}>
          {loading ? 'Loading...' : 'Click me'}
        </Button>
      </Card>
    </div>
  )
}
```

#### 2. 注册页面

在 `src/components/dashboard/DashboardContent.tsx` 中添加页面路由逻辑。

### 调用后端API

使用 `@tauri-apps/api` 调用Rust命令：

```typescript
import { invoke } from '@tauri-apps/api/tauri'

// 调用隧道列表
async function fetchTunnels() {
  try {
    const tunnels = await invoke<Tunnel[]>('tunnel_list')
    console.log('Tunnels:', tunnels)
  } catch (error) {
    console.error('Failed to fetch tunnels:', error)
  }
}

// 调用创建隧道（带参数）
async function createTunnel(name: string) {
  try {
    const result = await invoke<{ id: string }>('tunnel_create', {
      name,
    })
    console.log('Created tunnel:', result.id)
  } catch (error) {
    console.error('Failed to create tunnel:', error)
  }
}
```

### 状态管理

使用 Zustand 管理全局状态：

```typescript
// src/lib/store.ts
import { create } from 'zustand'

interface AppStore {
  activeTab: string
  setActiveTab: (tab: string) => void
  theme: 'light' | 'dark'
  setTheme: (theme: 'light' | 'dark') => void
}

export const useAppStore = create<AppStore>((set) => ({
  activeTab: 'tunnels',
  setActiveTab: (tab) => set({ activeTab: tab }),
  theme: 'light',
  setTheme: (theme) => set({ theme }),
}))
```

在组件中使用：

```typescript
import { useAppStore } from '@/lib/store'

export function MyComponent() {
  const { activeTab, setActiveTab } = useAppStore()

  return (
    <button onClick={() => setActiveTab('services')}>
      {activeTab === 'services' ? 'Services (active)' : 'Services'}
    </button>
  )
}
```

## 后端开发

### 添加新命令

#### 1. 定义数据模型

```rust
// src-tauri/src/models/my_model.rs
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct MyData {
    pub id: String,
    pub name: String,
    pub status: String,
}

#[derive(Deserialize)]
pub struct CreateMyDataRequest {
    pub name: String,
}
```

#### 2. 创建服务模块

```rust
// src-tauri/src/services/my_service.rs
use crate::models::my_model::MyData;
use crate::error::ApiError;

#[tauri::command]
pub async fn my_list() -> Result<Vec<MyData>, String> {
    // 实现列表逻辑
    Ok(vec![])
}

#[tauri::command]
pub async fn my_create(name: String) -> Result<MyData, String> {
    if name.is_empty() {
        return Err("Name cannot be empty".to_string())
    }
    
    // 实现创建逻辑
    Ok(MyData {
        id: uuid::Uuid::new_v4().to_string(),
        name,
        status: "active".to_string(),
    })
}
```

#### 3. 注册命令

在 `src-tauri/src/main.rs` 中：

```rust
mod models;
mod services;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            services::my_service::my_list,
            services::my_service::my_create,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### 错误处理

定义统一的错误类型：

```rust
// src-tauri/src/error.rs
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct ApiError {
    pub code: i32,
    pub message: String,
}

impl ApiError {
    pub fn new(code: i32, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
        }
    }

    pub fn invalid_param(msg: impl Into<String>) -> Self {
        Self::new(400, msg)
    }

    pub fn not_found() -> Self {
        Self::new(404, "Resource not found")
    }

    pub fn internal_error(msg: impl Into<String>) -> Self {
        Self::new(500, msg)
    }
}

impl From<ApiError> for String {
    fn from(err: ApiError) -> Self {
        serde_json::to_string(&err).unwrap_or_else(|_| err.message)
    }
}
```

### 数据库操作

使用 SQLx 进行数据库操作：

```rust
use sqlx::SqlitePool;

#[tauri::command]
pub async fn get_data(
    id: String,
    state: tauri::State<'_, MyAppState>,
) -> Result<MyData, String> {
    let pool = &state.db;
    
    let result = sqlx::query_as::<_, MyData>(
        "SELECT id, name, status FROM my_table WHERE id = ?"
    )
    .bind(&id)
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("Database error: {}", e))?;

    result.ok_or_else(|| "Not found".to_string())
}
```

## 集成开发

### 前后端集成步骤

#### 1. 确保后端命令已注册

验证 `src-tauri/src/main.rs` 中的命令被正确导出。

#### 2. 在前端调用命令

```typescript
import { invoke } from '@tauri-apps/api/tauri'

async function loadData() {
  try {
    const data = await invoke('my_list')
    console.log('Data:', data)
  } catch (error) {
    console.error('Error:', error)
  }
}
```

#### 3. 添加加载和错误状态

```typescript
interface LoadingState {
  isLoading: boolean
  error: string | null
}

const [state, setState] = useState<LoadingState>({
  isLoading: false,
  error: null,
})

const handleFetch = async () => {
  setState({ isLoading: true, error: null })
  try {
    const data = await invoke('my_list')
    // 处理数据
  } catch (error) {
    setState({ 
      isLoading: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  } finally {
    setState(prev => ({ ...prev, isLoading: false }))
  }
}
```

## 测试指南

### 前端单元测试

```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom
```

创建测试文件：

```typescript
// src/components/ui/Button.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './Button'

describe('Button Component', () => {
  it('renders button with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('calls onClick handler when clicked', async () => {
    const onClick = vitest.fn()
    render(<Button onClick={onClick}>Click me</Button>)
    
    await userEvent.click(screen.getByText('Click me'))
    expect(onClick).toHaveBeenCalled()
  })

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>)
    expect(screen.getByText('Click me')).toBeDisabled()
  })
})
```

运行测试：

```bash
npm run test
```

### 后端单元测试

```rust
// src-tauri/src/services/my_service.rs#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_my_create_empty_name() {
        let result = my_create("".to_string());
        assert!(result.is_err());
    }

    #[test]
    fn test_my_create_success() {
        let result = my_create("test".to_string());
        assert!(result.is_ok());
        
        let data = result.unwrap();
        assert_eq!(data.name, "test");
        assert_eq!(data.status, "active");
    }
}
```

运行Rust测试：

```bash
cd src-tauri
cargo test
```

### 集成测试

```bash
npm run tauri:dev
# 手动测试应用功能
```

## 性能优化

### 前端优化

#### 1. 代码分割

```typescript
import dynamic from 'next/dynamic'

// 只在需要时加载组件
const ModuleComponent = dynamic(() => import('./Module'), {
  loading: () => <div>Loading...</div>,
})
```

#### 2. 缓存策略

```typescript
// 缓存API响应
const cache = new Map()

async function fetchWithCache(key, fn) {
  if (cache.has(key)) {
    return cache.get(key)
  }
  
  const result = await fn()
  cache.set(key, result)
  
  // 10分钟后清除缓存
  setTimeout(() => cache.delete(key), 600000)
  
  return result
}
```

#### 3. 避免过度渲染

```typescript
import { memo } from 'react'

// 使用memo防止不必要的重新渲染
const MemoizedComponent = memo(({ prop1, prop2 }) => {
  return <div>{prop1} {prop2}</div>
}, (prevProps, nextProps) => {
  return prevProps.prop1 === nextProps.prop1 && 
         prevProps.prop2 === nextProps.prop2
})
```

### 后端优化

#### 1. 连接池

```rust
let pool = SqlitePool::connect(&database_url).await?;

// 使用连接池进行并发数据库操作
let result = pool.acquire().await?;
```

#### 2. 缓存策略

```rust
use lru::LruCache;
use std::num::NonZeroUsize;

let mut cache = LruCache::new(NonZeroUsize::new(100).unwrap());
cache.put("key", "value");
```

#### 3. 异步处理

```rust
use tokio::task;

#[tauri::command]
pub async fn long_running_task() -> Result<String, String> {
    let result = task::spawn_blocking(|| {
        // 长时间运行的同步操作
        std::thread::sleep(std::time::Duration::from_secs(5));
        "Done".to_string()
    })
    .await
    .map_err(|e| e.to_string())?;
    
    Ok(result)
}
```

## 常见问题

### Q: 如何调试Tauri应用？

A: 使用主机console和DevTools：

```bash
# 打开DevTools快捷键（取决于操作系统）
# macOS: Cmd+Opt+I
# Windows/Linux: Ctrl+Shift+I

# 或在代码中打开
#[tauri::command]
pub fn open_devtools(window: tauri::Window) {
    window.open_devtools();
}
```

### Q: 如何在前端访问文件系统？

A: 使用Tauri的filesystem API：

```typescript
import { readDir, readTextFile } from '@tauri-apps/api/fs'

async function readFiles() {
  const files = await readDir('.', { recursive: true })
  
  for (const file of files) {
    if (file.name?.endsWith('.txt')) {
      const content = await readTextFile(file.path)
      console.log(content)
    }
  }
}
```

### Q: 如何打包发布应用？

A: 构建安装程序：

```bash
npm run tauri:build
```

生成的安装程序位于 `src-tauri/target/release/bundle/`

### Q: 如何处理环境变量？

A: 创建 `.env.local` 文件：

```
VITE_API_URL=http://localhost:8000
TAURI_API_TOKEN=your_token
```

在代码中使用：

```typescript
const apiUrl = import.meta.env.VITE_API_URL
```

### Q: 样式不生效怎么办？

A: 检查以下事项：

1. 确认Tailwind CSS已安装（`npm install -D tailwindcss`）
2. 检查 `tailwind.config.js` 的 `content` 配置
3. 在组件中导入全局样式
4. 清除 `.next` 和 `node_modules/.vite` 缓存

```bash
rm -rf .next node_modules/.vite
npm run dev
```

### Q: 如何添加新的Google字体？

A: 编辑 `src/app/globals.css`：

```css
@import url('https://fonts.googleapis.com/css2?family=Your+Font:wght@400;700&display=swap');

:root {
  --font-your-font: 'Your Font', sans-serif;
}
```

## 相关资源

- [Next.js文档](https://nextjs.org/docs)
- [Tauri文档](https://tauri.app/v1/docs/)
- [Rust Book](https://doc.rust-lang.org/book/)
- [Tailwind CSS文档](https://tailwindcss.com/docs)
- [React文档](https://react.dev)

---

更新时间: 2024年
