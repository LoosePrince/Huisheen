# 回声 (Huisheen) 开发者文档

本文档为开发者提供了与回声平台集成的技术指南，包括API接口、数据格式和实践建议。

## <i class="fas fa-building text-blue-500"></i> 系统架构

回声采用Web技术栈构建：

### 前端技术
- **Vue.js 3** - 响应式前端框架（CDN版本）
- **Tailwind CSS** - 实用优先的CSS框架（CDN版本）
- **Axios** - HTTP客户端
- **Font Awesome** - 图标库

### 后端技术
- **Node.js** - 服务端运行环境
- **Express.js** - Web应用框架
- **MongoDB** - NoSQL文档数据库
- **Mongoose** - MongoDB对象模型库
- **JWT** - 身份认证
- **Helmet** - 安全中间件
- **CORS** - 跨域资源共享
- **Express Rate Limit** - API限流

## <i class="fas fa-plug text-green-500"></i> API 接口

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

## <i class="fas fa-wrench text-orange-500"></i> 自部署指南

### 环境要求

- Node.js 16+
- MongoDB 4.4+
- 域名和SSL证书（推荐）

### 部署步骤

1. **克隆代码**
```bash
git clone https://github.com/LoosePrince/Huisheen.git
cd huisheen
```

2. **安装依赖**
```bash
npm install
```

3. **配置环境变量**
```bash
cp .env.example .env
```

> 编辑.env文件设置MongoDB连接和JWT密钥

4. **启动MongoDB服务**

> 确保MongoDB服务运行
> Windows: 启动MongoDB服务
> Linux/Mac: `sudo systemctl start mongod`

5. **启动服务**
```bash
npm start
```

### Docker 部署

```dockerfile
FROM node:16-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
EXPOSE 3000

CMD ["npm", "start"]
```

> docker-compose.yml

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

## <i class="fas fa-comments text-green-500"></i> 社区和支持

- **GitHub仓库**: [https://github.com/LoosePrince/Huisheen/issues](https://github.com/LoosePrince/Huisheen/issues)
- **问题反馈**: 在GitHub Issues中报告问题
- **功能请求**: 提交Pull Request或创建Feature Request
- **文档贡献**: 欢迎改进文档和示例

感谢您为回声项目做出贡献！ 