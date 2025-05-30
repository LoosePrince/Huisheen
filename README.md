# 回声 (Huisheen)

<div align="center">

![回声Logo](https://img.shields.io/badge/回声-Huisheen-blue?style=for-the-badge)

[![GitHub stars](https://img.shields.io/github/stars/LoosePrince/Huisheen?style=social)](https://github.com/LoosePrince/Huisheen/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/LoosePrince/Huisheen?style=social)](https://github.com/LoosePrince/Huisheen/network/members)
[![GitHub issues](https://img.shields.io/github/issues/LoosePrince/Huisheen)](https://github.com/LoosePrince/Huisheen/issues)

[![Node.js](https://img.shields.io/badge/Node.js->=16.0.0-green?style=flat-square&logo=node.js)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Database-green?style=flat-square&logo=mongodb)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)
[![GitHub](https://img.shields.io/badge/GitHub-LoosePrince/Huisheen-black?style=flat-square&logo=github)](https://github.com/LoosePrince/Huisheen)

**专注于通知接收的现代化服务平台**

[官网](https://your-demo-url.com) • [文档](docs/) • [API参考](#api-文档) • [部署指南](#部署)

</div>

## 📋 目录

- [项目简介](#项目简介)
- [核心特性](#核心特性)
- [技术栈](#技术栈)
- [快速开始](#快速开始)
- [部署](#部署)
- [API文档](#api-文档)
- [配置说明](#配置说明)
- [贡献指南](#贡献指南)
- [许可证](#许可证)

## 🎯 项目简介

回声（Huisheen）是一个通知接收服务平台。它提供了灵活的通知接收方式，支持第三方应用通过多种模式推送和获取通知，同时提供了完整的用户管理和安全验证机制。

### 核心理念

- **简单易用**：提供直观的用户界面和简洁的API接口
- **安全可靠**：完善的身份验证和权限管理机制
- **灵活集成**：支持多种集成模式，适应不同应用场景
- **现代架构**：基于现代Web技术，易于扩展和维护

## ✨ 核心特性

### 🔄 通知接收模式

- **主动模式**：第三方应用直接推送通知到回声平台
- **被动模式**：回声平台轮询第三方应用获取通知
- **混合模式**：同一服务支持多种模式并存

### 🛡️ 安全与认证

- **JWT身份验证**：安全的用户认证机制
- **通知标识码**：唯一的用户标识和验证码系统
- **域名验证**：智能的域名匹配和环境识别
- **API限流**：防止恶意请求和滥用

### 📊 通知管理

- **实时通知**：即时接收和显示通知
- **分类筛选**：按类型、优先级、来源等维度筛选
- **批量操作**：支持批量标记已读、删除等操作
- **统计分析**：详细的通知统计和分析功能

### 🔌 外部API

- **RESTful API**：标准的REST API接口
- **第三方集成**：简化的第三方应用集成流程
- **回调支持**：支持通知回调链接
- **数据导出**：支持通知数据的导出和同步

## 🛠️ 技术栈

### 后端技术

- **Node.js** - 服务端运行环境
- **Express.js** - Web应用框架
- **MongoDB** - NoSQL文档数据库
- **Mongoose** - MongoDB对象模型库
- **JWT** - 身份认证
- **Helmet** - 安全中间件
- **CORS** - 跨域资源共享
- **Express Rate Limit** - API限流

### 前端技术

- **Vue.js 3** - 响应式前端框架（CDN版本）
- **Tailwind CSS** - 实用优先的CSS框架（CDN版本）
- **Axios** - HTTP客户端
- **Font Awesome** - 图标库

### 开发工具

- **Nodemon** - 开发时自动重启
- **Jest** - 单元测试框架
- **ESLint** - 代码质量检查

## 🚀 快速开始

### 前置要求

- Node.js >= 16.0.0
- MongoDB >= 4.4
- npm 或 yarn

### 1. 克隆项目

```bash
git clone https://github.com/LoosePrince/Huisheen.git
cd Huisheen
```

### 2. 安装依赖

```bash
npm install
```

### 3. 环境配置

```bash
# 自动生成 .env 文件（推荐）
npm run setup

# 或手动配置
cp config.env.example .env
# 编辑 .env 文件，配置数据库连接等信息
```

### 4. 启动应用

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

### 5. 访问应用

- **主应用**：http://localhost:3000
- **API文档**：http://localhost:3000/docs
- **健康检查**：http://localhost:3000/health

## 🌐 部署

### Railway 一键部署

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/deploy?template=https://github.com/LoosePrince/Huisheen)

点击上方按钮一键部署到Railway平台。

#### Railway部署步骤

1. 点击部署按钮
2. 连接你的GitHub账户
3. 配置环境变量：
   - `MONGODB_URI`：MongoDB连接字符串
   - `JWT_SECRET`：JWT密钥（自动生成）
   - `WEBSITE_DOMAIN`：你的应用域名
4. 等待部署完成

### Docker 部署

```bash
# 构建镜像
docker build -t huisheen .

# 运行容器
docker run -d \
  --name huisheen \
  -p 3000:3000 \
  -e MONGODB_URI="mongodb://your-mongo-uri" \
  -e JWT_SECRET="your-jwt-secret" \
  -e WEBSITE_DOMAIN="your-domain.com" \
  huisheen
```

### Docker Compose

```yaml
version: '3.8'
services:
  huisheen:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/huisheen
      - JWT_SECRET=your_jwt_secret
      - WEBSITE_DOMAIN=your-domain.com
    depends_on:
      - mongo
    
  mongo:
    image: mongo:4.4
    restart: always
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password123
    volumes:
      - mongodb_data:/data/db
    ports:
      - "27017:27017"

volumes:
  mongodb_data:
```

### 传统服务器部署

1. **准备服务器环境**
   ```bash
   # 安装 Node.js 和 MongoDB
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs mongodb
   ```

2. **部署应用**
   ```bash
   # 克隆代码
   git clone https://github.com/LoosePrince/Huisheen.git
   cd Huisheen
   
   # 安装依赖
   npm install --production
   
   # 配置环境
   npm run setup
   
   # 编辑环境配置
   nano .env
   ```

## 📚 API 文档

### 认证相关

#### 用户注册
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "用户名",
  "password": "密码"
}
```

#### 用户登录
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "用户名",
  "password": "密码"
}
```

#### 生成通知标识码
```http
POST /api/auth/generate-notify-code
Authorization: Bearer <token>
```

### 订阅管理

#### 创建主动订阅
```http
POST /api/subscriptions/active/verify
Content-Type: application/json

{
  "notifyCode": "notify:user:xxxx-xxxx-xxxx:xxxxxx@domain.com",
  "thirdPartyName": "第三方服务名称",
  "thirdPartyUrl": "https://third-party.com"
}
```

#### 创建被动订阅
```http
POST /api/subscriptions/passive
Authorization: Bearer <token>
Content-Type: application/json

{
  "apiUrl": "https://third-party.com/api/notifications"
}
```

### 通知管理

#### 接收通知（主动模式）
```http
POST /api/notifications/receive
Content-Type: application/json

{
  "notifyId": "用户通知ID",
  "token": "订阅Token",
  "title": "通知标题",
  "content": "通知内容",
  "type": "info|warning|error|success",
  "priority": "low|normal|high|urgent"
}
```

#### 获取通知列表
```http
GET /api/notifications?page=1&limit=20&type=info&isRead=false
Authorization: Bearer <token>
```

### 外部API

#### 获取访问Token
```http
POST /api/external/auth
Content-Type: application/json

{
  "notifyCode": "notify:user:xxxx-xxxx-xxxx:xxxxxx@domain.com",
  "thirdPartyName": "应用名称",
  "thirdPartyUrl": "https://myapp.com"
}
```

#### 获取未读通知
```http
GET /api/external/notifications?limit=20&type=warning
Authorization: Bearer <external_token>
```

更多API详情请查看 [API文档](docs/API.md)

## ⚙️ 配置说明

### 环境变量

| 变量名 | 必需 | 默认值 | 说明 |
|--------|------|--------|------|
| `NODE_ENV` | 否 | `development` | 运行环境 |
| `PORT` | 否 | `3000` | 服务端口 |
| `MONGODB_URI` | **是** | - | MongoDB连接字符串 |
| `JWT_SECRET` | **是** | - | JWT密钥 |
| `JWT_EXPIRES_IN` | 否 | `24h` | JWT过期时间 |
| `WEBSITE_DOMAIN` | 否 | `localhost:3000` | 网站域名 |
| `RATE_LIMIT_WINDOW_MS` | 否 | `900000` | 限流时间窗口（毫秒） |
| `RATE_LIMIT_MAX_REQUESTS` | 否 | `100` | 限流最大请求数 |

### 数据库配置示例

```env
# 本地MongoDB（无认证）
MONGODB_URI=mongodb://localhost:27017/huisheen

# 本地MongoDB（有认证）
MONGODB_URI=mongodb://username:password@localhost:27017/huisheen

# MongoDB Atlas（云数据库）
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/huisheen

# Railway MongoDB
MONGODB_URI=${{MONGO_URL}}
```

### 生产环境安全配置

1. **使用强JWT密钥**
   ```bash
   # 生成安全的JWT密钥
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

2. **配置正确的域名**
   ```env
   WEBSITE_DOMAIN=your-production-domain.com
   ```

3. **启用MongoDB认证**
   ```env
   MONGODB_URI=mongodb://admin:strong_password@your-mongo-server:27017/huisheen?authSource=admin
   ```

## 🤝 贡献指南

我们欢迎所有形式的贡献！请遵循以下步骤：

### 开发环境设置

1. Fork 项目
2. 创建功能分支：`git checkout -b feature/amazing-feature`
3. 安装依赖：`npm install`
4. 设置环境：`npm run setup`
5. 启动开发服务器：`npm run dev`

### 代码规范

- 使用ES6+语法
- 遵循eslint配置
- 编写必要的测试用例
- 更新相关文档

### 提交规范

```bash
# 功能添加
git commit -m "feat: 添加用户通知偏好设置"

# 问题修复
git commit -m "fix: 修复通知标记已读的问题"

# 文档更新
git commit -m "docs: 更新API文档"
```

### 测试

```bash
# 运行所有测试
npm test

# 运行特定测试
npm test -- --grep "通知管理"

# 生成测试覆盖率报告
npm run test:coverage
```

## 📖 文档

- [贡献指南](CONTRIBUTING.md)
- [开发者指南](docs/developer-guide.md)
- [API参考](docs/API.md)
- [部署指南](DEPLOYMENT.md)
- [常见问题](docs/FAQ.md)

## 🐛 问题反馈

如果你发现了bug或有功能建议，请：

1. 查看 [已知问题](https://github.com/LoosePrince/Huisheen/issues)
2. 创建新的 [Issue](https://github.com/LoosePrince/Huisheen/issues/new)
3. 提供详细的问题描述和复现步骤

## 📈 路线图

- [ ] 支持WebSocket实时推送
- [ ] 添加通知模板系统
- [ ] 支持多语言国际化
- [ ] 添加通知统计图表
- [ ] 支持插件系统
- [ ] 移动端PWA支持

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者！

特别感谢以下开源项目：
- [Express.js](https://expressjs.com/)
- [Vue.js](https://vuejs.org/)
- [MongoDB](https://www.mongodb.com/)
- [Tailwind CSS](https://tailwindcss.com/)

## 📄 许可证

本项目基于 [MIT License](LICENSE) 开源。

---

<div align="center">

**Made with ❤️ by the Huisheen Team**

[⬆ 回到顶部](#回声-huisheen)

</div>
