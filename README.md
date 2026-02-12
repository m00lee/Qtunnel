# QTunnel

A feature-rich desktop application for managing Cloudflare Tunnels, built with Tauri 2 + Next.js 14 + Tailwind CSS. Provides a modern macOS-style UI for tunnel operations, zone management, and security configuration.

## Features

### Tunnel Management
- List, create, edit, and delete Cloudflare Tunnels
- Real-time tunnel status monitoring
- Quick-bind local services to tunnels with automatic DNS record creation
- Tunnel topology visualization

### Zone Management
- Traffic analytics via Cloudflare GraphQL API
- SSL/TLS configuration
- Cache purge controls
- Rulesets (redirect, rewrite, header modification, etc.)

### Security
- **WAF Rules** — manage Web Application Firewall rules
- **IP Access Rules** — allowlist / blocklist control
- **DDoS Protection** — sensitivity tuning
- **SSL Certificates** — certificate listing and renewal alerts

### Scripting
- Lua script editor for custom request/response logic
- Script CRUD with integrated code editor

### Design
- macOS HIG-inspired design system with CSS custom properties
- Light / dark theme support
- Toast notification system
- Fully responsive layout

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS 3.4 |
| Desktop | Tauri 2 |
| Backend | Rust, Tokio, Reqwest, Serde |
| Database | SQLite via SQLx |
| State | Zustand |
| Icons | Lucide React |

## Requirements

- **Rust** ≥ 1.70
- **Node.js** ≥ 18
- **npm** ≥ 9

## Quick Start

```bash
# Install dependencies
npm install

# Development (starts Next.js dev server + Tauri app)
npm run tauri:dev

# Production build
npm run tauri:build
```

## Project Structure

```
qtunnel/
├── src/                        # Next.js frontend
│   ├── app/                    # App Router (layout, page, globals.css)
│   ├── components/
│   │   ├── cards/              # TunnelCard
│   │   ├── dashboard/          # DashboardContent (page router)
│   │   ├── layout/             # TitleBar, Sidebar, ThemeProvider
│   │   ├── modals/             # Create / Config / Detail / QuickBind / ScriptEditor
│   │   ├── pages/              # Tunnels, Services, Security, Settings, Scripts, Zones
│   │   ├── security/           # WAF, IP Rules, DDoS, Certificates
│   │   ├── ui/                 # Button, Card, Input, Select, Tabs, Badge, Modal, Switch, Toast
│   │   ├── visualization/      # TunnelTopology
│   │   └── zones/              # ZoneAnalytics, ZoneCache, ZoneRules, ZoneSettings
│   └── lib/                    # api.ts, store.ts, toast.ts, defaults.ts
├── src-tauri/                  # Rust backend
│   └── src/
│       ├── api/                # Cloudflare API client (tunnel, zone, dns, security, token)
│       ├── models/             # Data models (tunnel, zone, route, certificate, security, script)
│       ├── services/           # Business logic (tunnel, zone, routing, dns, security, scripting, cache, config)
│       ├── main.rs             # Tauri command registration
│       ├── config.rs           # App configuration
│       ├── db.rs               # SQLite management
│       ├── cache.rs            # LRU cache
│       └── error.rs            # Error types
├── package.json
├── Cargo.toml
├── tailwind.config.js
└── tsconfig.json
```

## API Token Setup

1. Go to [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Create a token with the following permissions:

| Scope | Permission | Access |
|-------|-----------|--------|
| Account | Cloudflare Tunnel | Edit |
| Zone | Zone | Read |
| Zone | Zone Settings | Edit |
| Zone | DNS | Edit |
| Zone | Firewall Services | Edit |
| Zone | Zone WAF | Edit |
| Zone | Cache Purge | Purge |
| Zone | Dynamic URL Redirect | Edit |

3. Open the app **Settings** page and enter your API Token and Account ID.

## Development Guide

### Adding a new page

1. Create a page component in `src/components/pages/`
2. Import it in `src/components/dashboard/DashboardContent.tsx`
3. Add a navigation entry in `src/components/layout/Sidebar.tsx`

### Calling Rust commands from the frontend

```typescript
import { invoke } from '@tauri-apps/api/core'

const tunnels = await invoke('tunnel_list', { accountId: '...' })
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Cannot connect to Cloudflare | Verify API token validity and Account ID |
| App fails to start | Ensure Rust ≥ 1.70 and Node.js ≥ 18; try deleting `node_modules/` and `target/` then rebuild |
| UI rendering issues | Clear browser cache; check DevTools console for errors |

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m '[feat] add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
