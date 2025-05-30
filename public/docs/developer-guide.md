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

### 基础信息

- **基础URL**: `/api`
- **内容类型**: `application/json`
- **字符编码**: `UTF-8`

### 通用响应格式

```json
{
  "message": "操作成功",
  "data": {},
  "timestamp": "2025-01-01T00:00:00Z"
}
```

错误响应：
```json
{
  "error": "错误信息",
  "timestamp": "2025-01-01T00:00:00Z"
}
```

## <i class="fas fa-user text-blue-500"></i> 用户认证API

> 适用于：回声平台的用户注册、登录和个人信息管理  
> 认证方式：用户名/邮箱 + 密码

### 注册用户

**POST** `/api/auth/register`

```json
{
  "username": "用户名",
  "email": "邮箱地址", 
  "password": "密码"
}
```

响应：
```json
{
  "message": "注册成功",
  "token": "JWT_TOKEN",
  "user": {
    "id": "user_id",
    "username": "用户名",
    "email": "邮箱地址",
    "notifyId": "1234-5678-9abc",
    "createdAt": "2025-01-01T00:00:00Z"
  }
}
```

### 用户登录

**POST** `/api/auth/login`

```json
{
  "email": "邮箱地址",
  "password": "密码"
}
```

响应格式与注册相同。

### 获取用户信息

**GET** `/api/auth/me`

需要认证Header：
```
Authorization: Bearer YOUR_JWT_TOKEN
```

### 生成通知标识码

**POST** `/api/auth/generate-notify-code`

需要JWT认证。生成5分钟有效的通知标识码，供第三方服务使用。

响应：
```json
{
  "message": "通知标识码生成成功",
  "notifyCode": "notify:user:1234-5678-9abc:ABC123@huisheen.com",
  "expiresIn": "5分钟"
}
```

## <i class="fas fa-satellite-dish text-orange-500"></i> 第三方推送API

> 适用于：第三方网站/服务向回声推送通知  
> 认证方式：通知ID + Token（由订阅生成）

### 主动推送通知

**POST** `/api/notifications/receive`

使用订阅生成的Token验证，无需JWT认证。

```json
{
  "notifyId": "1234-5678-9abc",
  "token": "SUBSCRIPTION_TOKEN",
  "title": "通知标题",
  "content": "通知内容",
  "type": "info|success|warning|error",
  "priority": "low|normal|high|urgent",
  "callbackUrl": "https://example.com/callback",
  "source": {
    "name": "服务来源名称"
  },
  "metadata": {},
  "externalId": "unique_external_id"
}
```

#### 参数说明

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| notifyId | string | 是 | 用户的通知ID |
| token | string | 是 | 订阅生成的Token |
| title | string | 是 | 通知标题，1-200字符 |
| content | string | 是 | 通知内容，1-2000字符 |
| type | string | 否 | 通知类型，默认info |
| priority | string | 否 | 优先级，默认normal |
| callbackUrl | string | 否 | 回调链接 |
| source | object | 否 | 来源信息 |
| metadata | object | 否 | 额外元数据 |
| externalId | string | 否 | 外部唯一ID（防重复） |

#### 示例代码

**cURL**
```bash
curl -X POST /api/notifications/receive \
  -H "Content-Type: application/json" \
  -d '{
    "notifyId": "1234-5678-9abc",
    "token": "SUBSCRIPTION_TOKEN",
    "title": "服务器警告",
    "content": "CPU使用率达到85%",
    "type": "warning",
    "priority": "high",
    "callbackUrl": "https://monitor.example.com/cpu-alert",
    "source": {
      "name": "监控系统"
    }
  }'
```

**JavaScript**
```javascript
const response = await fetch('/api/notifications/receive', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    notifyId: '1234-5678-9abc',
    token: 'SUBSCRIPTION_TOKEN',
    title: '部署完成',
    content: '应用版本 v1.2.3 已成功部署到生产环境',
    type: 'success',
    priority: 'normal',
    source: {
      name: 'CI/CD系统'
    }
  })
});

const result = await response.json();
console.log(result);
```

**Python**
```python
import requests

data = {
    'notifyId': '1234-5678-9abc',
    'token': 'SUBSCRIPTION_TOKEN',
    'title': '数据备份完成',
    'content': '今日数据备份已完成，大小: 2.5GB',
    'type': 'info',
    'priority': 'low',
    'source': {
        'name': '备份系统'
    }
}

response = requests.post(
    '/api/notifications/receive',
    json=data,
    headers={'Content-Type': 'application/json'}
)

print(response.json())
```

### 被动轮询订阅

#### 创建被动订阅

**POST** `/api/subscriptions`

需要JWT认证（用户Token）。

```json
{
  "mode": "passive",
  "thirdPartyName": "服务名称",
  "thirdPartyUrl": "https://your-service.com/api/notifications"
}
```

#### 第三方服务要求

您的服务需要提供以下接口：

**通知数据接口** - **GET** `/api/notifications`

响应格式：
```json
{
  "notifications": [
    {
      "id": "unique_notification_id",
      "title": "通知标题",
      "content": "通知内容", 
      "type": "info|success|warning|error",
      "priority": "low|normal|high|urgent",
      "timestamp": "2025-01-01T00:00:00Z",
      "callback_url": "https://example.com/details",
      "metadata": {}
    }
  ]
}
```

## <i class="fas fa-mobile-alt text-purple-500"></i> 第三方应用API

> 适用于：第三方应用获取和管理回声中的通知  
> 认证方式：通知标识码换取外部API Token

### 获取外部API访问Token

**POST** `/api/external/auth`

使用用户生成的通知标识码换取API访问Token。

```json
{
  "notifyCode": "notify:user:1234-5678-9abc:ABC123@huisheen.com",
  "thirdPartyName": "我的应用",
  "thirdPartyUrl": "https://myapp.com"
}
```

响应：
```json
{
  "message": "认证成功",
  "token": "EXTERNAL_API_TOKEN",
  "userInfo": {
    "notifyId": "1234-5678-9abc",
    "username": "testuser"
  },
  "expiresIn": "30天"
}
```

### 获取通知列表

**GET** `/api/external/notifications`

需要外部API Token认证：
```
Authorization: Bearer EXTERNAL_API_TOKEN
```

支持查询参数：

| 参数 | 类型 | 说明 |
|------|------|------|
| limit | number | 返回数量限制，1-100，默认20 |
| type | string | 按类型筛选 |
| priority | string | 按优先级筛选 |
| since | string | 获取指定时间之后的通知 (ISO8601格式) |

示例：
```
GET /api/external/notifications?type=error&priority=high&limit=20
```

### 标记通知已读

**PATCH** `/api/external/notifications/{id}/read`

需要外部API Token认证。

### 批量标记已读

**PATCH** `/api/external/notifications/mark-all-read`

需要外部API Token认证。

### 删除通知

**DELETE** `/api/external/notifications/{id}`

需要外部API Token认证。

### 获取统计信息

**GET** `/api/external/stats`

需要外部API Token认证。返回通知统计数据：

```json
{
  "success": true,
  "data": {
    "total": 150,
    "unread": 12,
    "today": 8,
    "byType": {
      "info": 80,
      "success": 30,
      "warning": 25,
      "error": 15
    },
    "byPriority": {
      "low": 60,
      "normal": 70,
      "high": 15,
      "urgent": 5
    }
  }
}
```

## <i class="fas fa-wrench text-orange-500"></i> 自部署指南

### 环境要求

- Node.js 16+
- MongoDB 4.4+
- 域名和SSL证书（推荐）

### 部署步骤

1. **克隆代码**
```bash
git clone https://github.com/your-repo/huisheen.git
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

- **GitHub仓库**: [github.com/your-repo/huisheen](https://github.com/your-repo/huisheen)
- **问题反馈**: 在GitHub Issues中报告问题
- **功能请求**: 提交Pull Request或创建Feature Request
- **文档贡献**: 欢迎改进文档和示例

感谢您为回声项目做出贡献！ 