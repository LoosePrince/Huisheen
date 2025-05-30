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

**通知接收与管理服务平台**

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

回声（Huisheen）是一个通知接收与管理服务平台。它提供了灵活的通知接收方式，支持第三方应用通过多种模式推送和获取通知，同时提供了用户管理和安全验证机制。

### 设计理念

- **简单易用**：提供直观的用户界面和简洁的API接口
- **安全可靠**：身份验证和权限管理机制
- **灵活集成**：支持多种集成模式，适应不同应用场景
- **可扩展架构**：基于Web技术，易于扩展和维护

## ✨ 核心特性

### 🔄 通知接收模式

- **主动模式**：第三方应用直接推送通知到回声平台
- **被动模式**：回声平台轮询第三方应用获取通知
- **混合模式**：同一服务支持多种模式并存

### 🛡️ 安全与认证

#### 1. 外部API Token认证

用于第三方应用访问用户通知数据，基于通知标识码验证。

**步骤1**: 用户在回声平台生成通知标识码
- 用户登录回声平台
- 点击"生成通知标识码"按钮
- 获得5分钟有效的标识码

**步骤2**: 使用标识码获取外部API Token
```bash
POST /api/external/auth
Content-Type: application/json

{
  "notifyCode": "notify:user:1234-5678-9abc:ABC123@huisheen.com",
  "thirdPartyName": "我的应用",
  "thirdPartyUrl": "https://myapp.com"
}
```

**响应**:
```json
{
  "message": "认证成功",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userInfo": {
    "notifyId": "1234-5678-9abc",
    "username": "user123"
  },
  "expiresIn": "30天"
}
```

#### 2. 订阅Token认证

用于第三方应用主动推送通知，基于订阅验证机制。

### 📊 通知管理

- **实时通知**：即时接收和显示通知
- **分类筛选**：按类型、优先级、来源等维度筛选
- **批量操作**：支持批量标记已读、删除等操作
- **统计分析**：通知统计和分析功能

### 🔌 外部API

- **RESTful API**：标准的REST API接口
- **第三方集成**：第三方应用集成流程
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

### Railway 部署

Railway是一个云平台，可以部署Node.js应用。

#### 快速部署方式

由于Railway的模板系统需要先在平台上注册，请按照以下步骤手动部署：

1. **访问Railway并登录**
   - 前往 [Railway](https://railway.app/)
   - 使用GitHub账户登录

2. **创建新项目**
   - 点击 "New Project"
   - 选择 "Deploy from GitHub repo"
   - 选择您fork的 `Huisheen` 仓库

3. **添加数据库**
   - 在项目中点击 "New"
   - 选择 "Database" → "Add MongoDB"

4. **配置环境变量**
   ```
   MONGODB_URI=${{MONGO_URL}}  # Railway会自动提供
   JWT_SECRET=your_strong_jwt_secret_here
   WEBSITE_DOMAIN=your-app-name.railway.app
   NODE_ENV=production
   ```

5. **部署完成**
   - Railway会自动检测Node.js应用并部署
   - 应用将在几分钟内可用

#### 使用Railway CLI部署

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

回声平台提供了完整的REST API，支持用户认证、通知管理和第三方服务集成。

### 📱 基础信息

- **基础URL**: `https://your-domain.com/api`
- **API版本**: v1
- **内容类型**: `application/json`
- **字符编码**: UTF-8

### 🔐 认证机制

#### 1. 外部API Token认证

用于第三方应用访问用户通知数据，基于通知标识码验证。

**步骤1**: 用户在回声平台生成通知标识码
- 用户登录回声平台
- 点击"生成通知标识码"按钮
- 获得5分钟有效的标识码

**步骤2**: 使用标识码获取外部API Token
```bash
POST /api/external/auth
Content-Type: application/json

{
  "notifyCode": "notify:user:1234-5678-9abc:ABC123@huisheen.com",
  "thirdPartyName": "我的应用",
  "thirdPartyUrl": "https://myapp.com"
}
```

**响应**:
```json
{
  "message": "认证成功",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userInfo": {
    "notifyId": "1234-5678-9abc",
    "username": "user123"
  },
  "expiresIn": "30天"
}
```

#### 2. 订阅Token认证

用于第三方应用主动推送通知，基于订阅验证机制。

### 🔄 通知推送模式

#### 主动推送模式

第三方应用直接向回声平台推送通知。

##### 创建主动推送订阅

**POST** `/api/subscriptions/active/verify`

```json
{
  "notifyCode": "notify:user:1234-5678-9abc:ABC123@huisheen.com",
  "thirdPartyName": "我的监控服务",
  "thirdPartyUrl": "https://monitor.example.com"
}
```

**响应**:
```json
{
  "message": "主动模式订阅验证成功",
  "token": "subscription_token_here",
  "subscription": {
    "id": "507f1f77bcf86cd799439013",
    "thirdPartyName": "我的监控服务",
    "mode": "active",
    "subscribedAt": "2023-12-01T10:00:00.000Z"
  }
}
```

##### 推送通知接口

**POST** `/api/notifications/receive`

```json
{
  "notifyId": "1234-5678-9abc",
  "token": "subscription_token",
  "title": "服务器警告",
  "content": "CPU使用率达到85%，请及时处理",
  "type": "warning",
  "priority": "high",
  "source": {
    "name": "监控系统",
    "url": "https://monitor.example.com",
    "icon": "https://monitor.example.com/icon.png"
  },
  "metadata": {
    "server": "web-01",
    "cpu_usage": "85%",
    "memory_usage": "76%"
  },
  "externalId": "alert_12345",
  "callbackUrl": "https://monitor.example.com/alerts/12345"
}
```

**参数说明**:

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `notifyId` | string | ✅ | 用户通知ID (格式: xxxx-xxxx-xxxx) |
| `token` | string | ✅ | 订阅Token |
| `title` | string | ✅ | 通知标题 (1-200字符) |
| `content` | string | ✅ | 通知内容 (1-2000字符) |
| `type` | string | ❌ | 通知类型: `info`/`success`/`warning`/`error` |
| `priority` | string | ❌ | 优先级: `low`/`normal`/`high`/`urgent` |
| `source` | object | ❌ | 来源信息 |
| `metadata` | object | ❌ | 额外元数据 |
| `externalId` | string | ❌ | 外部唯一ID (防重复推送) |
| `callbackUrl` | string | ❌ | 回调链接 |

**响应**:
```json
{
  "message": "通知接收成功",
  "notificationId": "507f1f77bcf86cd799439014"
}
```

#### 被动推送模式 (轮询)

回声平台定期从第三方服务API获取通知。

##### 创建被动推送订阅

用户需要在回声平台网站上创建被动订阅：

1. 登录回声平台
2. 进入"订阅管理"页面
3. 点击"添加被动订阅"
4. 输入第三方服务的API地址: `https://myservice.com/api/notifications`
5. 系统会自动获取服务信息并创建订阅

创建成功后，回声平台将定期轮询您的API端点获取新通知。

##### 第三方服务API要求

您的服务需要提供以下接口：

**通知数据接口** - **GET** `/api/notifications`
```json
{
  "notifications": [
    {
      "id": "unique_notification_id",
      "title": "通知标题",
      "content": "通知内容",
      "type": "info",
      "priority": "normal",
      "timestamp": "2023-12-01T10:00:00Z",
      "callback_url": "https://myservice.com/details/123",
      "metadata": {
        "category": "system",
        "severity": "medium"
      }
    }
  ]
}
```

**服务信息接口** - **GET** `/api/service-info` (可选)
```json
{
  "name": "我的服务",
  "description": "服务描述",
  "version": "1.0.0",
  "provider": "My Company",
  "polling_interval": 5,
  "api_endpoint": "https://myservice.com/api/notifications"
}
```

##### 手动触发轮询

用户可以在回声平台的订阅管理页面手动触发轮询，立即获取最新通知。

### 📖 外部API接口

用于第三方应用获取用户通知数据。

#### 获取未读通知

**GET** `/api/external/notifications`
```bash
Authorization: Bearer <外部API Token>
```

**查询参数**:
- `limit`: 返回数量 (1-100，默认20)
- `type`: 通知类型筛选
- `priority`: 优先级筛选  
- `since`: 获取指定时间之后的通知

**响应**:
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "507f1f77bcf86cd799439016",
        "title": "部署完成",
        "content": "应用版本 v1.2.3 已成功部署",
        "type": "success",
        "priority": "normal",
        "receivedAt": "2023-12-01T10:00:00.000Z",
        "source": "CI/CD系统",
        "callbackUrl": "https://ci.example.com/deploy/123",
        "metadata": {
          "version": "v1.2.3",
          "environment": "production"
        },
        "subscription": {
          "name": "CI/CD系统",
          "mode": "active"
        }
      }
    ],
    "pagination": {
      "returned": 5,
      "totalUnread": 12,
      "limit": 20
    }
  }
}
```

#### 标记通知已读

**PATCH** `/api/external/notifications/:id/read`
```bash
Authorization: Bearer <外部API Token>
```

**响应**:
```json
{
  "success": true,
  "message": "通知已标记为已读",
  "notification": {
    "id": "507f1f77bcf86cd799439016",
    "isRead": true,
    "readAt": "2023-12-01T10:30:00.000Z"
  }
}
```

#### 批量标记已读

**PATCH** `/api/external/notifications/batch/read`
```bash
Authorization: Bearer <外部API Token>
```

```json
{
  "notificationIds": [
    "507f1f77bcf86cd799439016",
    "507f1f77bcf86cd799439017"
  ]
}
```

**响应**:
```json
{
  "success": true,
  "message": "已标记 2 条通知为已读",
  "modifiedCount": 2,
  "totalRequested": 2
}
```

#### 获取统计信息

**GET** `/api/external/stats`
```bash
Authorization: Bearer <外部API Token>
```

**响应**:
```json
{
  "success": true,
  "data": {
    "total": 150,
    "unread": 12,
    "read": 138,
    "today": 8,
    "unreadByType": {
      "info": 5,
      "warning": 4,
      "error": 2,
      "success": 1
    }
  }
}
```

### 🔧 集成示例

#### JavaScript/Node.js

```javascript
class HuisheenClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.token = null;
  }

  // 获取外部API访问Token
  async authenticate(notifyCode, appName, appUrl) {
    const response = await fetch(`${this.baseUrl}/api/external/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notifyCode,
        thirdPartyName: appName,
        thirdPartyUrl: appUrl
      })
    });
    
    const result = await response.json();
    this.token = result.token;
    return result;
  }

  // 获取通知
  async getNotifications(options = {}) {
    const params = new URLSearchParams(options);
    const response = await fetch(`${this.baseUrl}/api/external/notifications?${params}`, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
    return response.json();
  }

  // 标记已读
  async markAsRead(notificationId) {
    const response = await fetch(`${this.baseUrl}/api/external/notifications/${notificationId}/read`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
    return response.json();
  }
}

// 使用示例
const client = new HuisheenClient('https://huisheen.com');
await client.authenticate('notify:user:1234-5678-9abc:ABC123@huisheen.com', '我的应用', 'https://myapp.com');
const notifications = await client.getNotifications({ limit: 10, type: 'warning' });
```

#### Python

```python
import requests
import json

class HuisheenClient:
    def __init__(self, base_url):
        self.base_url = base_url
        self.token = None
    
    def authenticate(self, notify_code, app_name, app_url):
        response = requests.post(f"{self.base_url}/api/external/auth", 
            json={
                "notifyCode": notify_code,
                "thirdPartyName": app_name,
                "thirdPartyUrl": app_url
            }
        )
        result = response.json()
        self.token = result["token"]
        return result
    
    def get_notifications(self, **options):
        headers = {"Authorization": f"Bearer {self.token}"}
        response = requests.get(f"{self.base_url}/api/external/notifications", 
            headers=headers, params=options)
        return response.json()
    
    def mark_as_read(self, notification_id):
        headers = {"Authorization": f"Bearer {self.token}"}
        response = requests.patch(f"{self.base_url}/api/external/notifications/{notification_id}/read", 
            headers=headers)
        return response.json()

# 使用示例
client = HuisheenClient("https://huisheen.com")
client.authenticate("notify:user:1234-5678-9abc:ABC123@huisheen.com", "我的应用", "https://myapp.com")
notifications = client.get_notifications(limit=10, type="warning")
```

#### cURL示例

```bash
# 1. 获取外部API Token
curl -X POST https://huisheen.com/api/external/auth \
  -H "Content-Type: application/json" \
  -d '{
    "notifyCode": "notify:user:1234-5678-9abc:ABC123@huisheen.com",
    "thirdPartyName": "我的应用",
    "thirdPartyUrl": "https://myapp.com"
  }'

# 2. 获取通知
curl -X GET "https://huisheen.com/api/external/notifications?limit=10&type=warning" \
  -H "Authorization: Bearer your_token_here"

# 3. 主动推送通知
curl -X POST https://huisheen.com/api/notifications/receive \
  -H "Content-Type: application/json" \
  -d '{
    "notifyId": "1234-5678-9abc",
    "token": "subscription_token",
    "title": "服务器警告",
    "content": "磁盘空间不足",
    "type": "warning",
    "priority": "high"
  }'
```

### 📋 状态码说明

| 状态码 | 说明 |
|-------|------|
| 200 | 请求成功 |
| 201 | 资源创建成功 |
| 400 | 请求参数错误 |
| 401 | 认证失败或Token无效 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 429 | 请求频率限制 |
| 500 | 服务器内部错误 |

### 🚨 错误响应格式

```json
{
  "error": "错误描述信息",
  "code": "ERROR_CODE",
  "details": {
    "field": "具体错误字段",
    "message": "详细错误信息"
  }
}
```

### ⚡ 使用建议

1. **Token管理**: 外部API Token有效期30天，建议定期刷新
2. **错误重试**: 网络错误建议使用指数退避重试策略
3. **防重复**: 使用`externalId`参数防止通知重复推送
4. **速率限制**: 遵守API限流规则，避免请求过于频繁
5. **安全性**: 妥善保管Token，避免泄露给第三方

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

1. **使用安全的JWT密钥**
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
   MONGODB_URI=mongodb://admin:secure_password@your-mongo-server:27017/huisheen?authSource=admin
   ```

## 🤝 贡献指南

我们欢迎各种形式的贡献！请遵循以下步骤：

### 开发环境设置

1. Fork 项目
2. 创建功能分支：`git checkout -b feature/amazing-feature`
3. 安装依赖：`npm install`
4. 设置环境：`npm run setup`
5. 启动开发服务器：`npm run dev`
6. 编辑代码
7. 提交代码：`git commit -m "feat: 添加新功能"`
8. 推送到远程：`git push origin feature/amazing-feature`
9. 创建Pull Request

## 🐛 问题反馈

如果您发现了问题或有功能建议，请：

1. 查看 [已知问题](https://github.com/LoosePrince/Huisheen/issues)
2. 创建新的 [Issue](https://github.com/LoosePrince/Huisheen/issues/new)
3. 提供详细的问题描述和复现步骤

## 📈 路线图

- [ ] 支持WebSocket实时推送
- [ ] 添加通知模板系统
- [x] 支持多语言国际化
- [ ] 添加通知统计图表
- [ ] 支持插件系统
- [ ] 移动端PWA支持

很久以后...

- [ ] Windows电脑端应用
- [ ] Android手机端应用（上架要求？那就无咯~）
- [ ] iOS & Mac 通知（会做吗？谁知道呢？）

## 🙏 致谢

感谢所有为这个项目贡献力量的开发者！

特别感谢以下开源项目：
- [Express.js](https://expressjs.com/)
- [Vue.js](https://vuejs.org/)
- [MongoDB](https://www.mongodb.com/)
- [Tailwind CSS](https://tailwindcss.com/)

## 📄 许可证

本项目基于 [MIT License](LICENSE) 开源。

---

<div align="center">

**Made with ❤️ by the LoosePrince**

[⬆ 回到顶部](#回声-huisheen)

</div>
