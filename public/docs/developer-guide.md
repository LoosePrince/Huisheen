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

- **基础URL**: `https://huisheen.xzt.plus/api`
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

**参数说明**:

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `notifyCode` | string | ✅ | 用户通知标识码 (格式: notify:user:xxxx-xxxx-xxxx:xxxx@huisheen.com) |
| `thirdPartyName` | string | ✅ | 第三方应用名称 (2-50字符) |
| `thirdPartyUrl` | string | ✅ | 第三方应用URL (必须是有效的HTTPS URL) |

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

**响应参数说明**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `message` | string | 操作结果描述 |
| `token` | string | JWT格式的访问令牌，用于后续API调用验证 |
| `userInfo` | object | 用户信息对象 |
| `userInfo.notifyId` | string | 用户通知ID，用于推送通知 |
| `userInfo.username` | string | 用户名称 |
| `expiresIn` | string | Token有效期 |

#### 2. 订阅Token认证

用于第三方应用主动推送通知，基于订阅验证机制。

**Token有效期**: 90天
**更新机制**: 订阅Token可通过`/api/subscriptions/refresh`接口更新

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

**参数说明**:

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `notifyCode` | string | ✅ | 用户通知标识码 (格式: notify:user:xxxx-xxxx-xxxx:xxxx@huisheen.com) |
| `thirdPartyName` | string | ✅ | 第三方服务名称 (2-50字符) |
| `thirdPartyUrl` | string | ✅ | 第三方服务URL (必须是有效的HTTPS URL) |
| `description` | string | ❌ | 服务描述 (最多200字符) |
| `iconUrl` | string | ❌ | 服务图标URL (必须是有效的图片URL) |

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

**响应参数说明**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `message` | string | 操作结果描述 |
| `token` | string | 订阅Token，用于推送通知时的身份验证 |
| `subscription` | object | 订阅信息对象 |
| `subscription.id` | string | 订阅唯一标识 |
| `subscription.thirdPartyName` | string | 第三方服务名称 |
| `subscription.mode` | string | 订阅模式，值为"active"表示主动推送模式 |
| `subscription.subscribedAt` | string | ISO8601格式的订阅创建时间 |

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
| `type` | string | ❌ | 通知类型: `info`(默认)/`success`/`warning`/`error` |
| `priority` | string | ❌ | 优先级: `low`/`normal`(默认)/`high`/`urgent` |
| `source` | object | ❌ | 来源信息 (见下表) |
| `metadata` | object | ❌ | 额外元数据 (键值对，最多10个键) |
| `externalId` | string | ❌ | 外部唯一ID (最多100字符，用于防重复推送) |
| `callbackUrl` | string | ❌ | 回调链接 (必须是有效的HTTPS URL) |
| `imageUrl` | string | ❌ | 通知附带图片URL (必须是有效的图片URL) |
| `actions` | array | ❌ | 可点击操作按钮 (最多3个) |

**source对象参数**:

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `name` | string | ✅ | 来源名称 (1-50字符) |
| `url` | string | ❌ | 来源URL (必须是有效的HTTPS URL) |
| `icon` | string | ❌ | 来源图标URL (必须是有效的图片URL) |

**actions数组项参数**:

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `label` | string | ✅ | 按钮文本 (1-20字符) |
| `url` | string | ✅ | 点击跳转URL (必须是有效的HTTPS URL) |
| `type` | string | ❌ | 按钮类型: `primary`(默认)/`secondary`/`danger` |

**限流规则**: 每个订阅每分钟最多发送30条通知，每天最多1000条

**响应**:
```json
{
  "message": "通知接收成功",
  "notificationId": "507f1f77bcf86cd799439014"
}
```

**响应参数说明**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `message` | string | 操作结果描述 |
| `notificationId` | string | 创建的通知唯一ID |
| `receivedAt` | string | ISO8601格式的通知接收时间（可选） |

#### 被动推送模式 (轮询)

回声平台定期从第三方服务API获取通知。

##### 创建被动推送订阅

用户需要在回声平台网站上创建被动订阅：

1. 登录回声平台
2. 进入"订阅管理"页面
3. 点击"添加被动订阅"
4. 输入第三方服务的API地址: `https://huisheen.xzt.plus/api/notifications`
5. 系统会自动获取服务信息并创建订阅

创建成功后，回声平台将定期轮询您的API端点获取新通知。

##### 第三方服务API要求

您的服务需要提供以下接口：

**通知数据接口** - **GET** `/api/notifications`

**响应格式**:
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

**响应字段说明**:

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `id` | string | ✅ | 通知唯一ID (最多100字符) |
| `title` | string | ✅ | 通知标题 (1-200字符) |
| `content` | string | ✅ | 通知内容 (1-2000字符) |
| `type` | string | ❌ | 通知类型: `info`(默认)/`success`/`warning`/`error` |
| `priority` | string | ❌ | 优先级: `low`/`normal`(默认)/`high`/`urgent` |
| `timestamp` | string | ✅ | ISO8601格式的时间戳 |
| `callback_url` | string | ❌ | 详情链接 (必须是有效的HTTPS URL) |
| `metadata` | object | ❌ | 额外元数据 (键值对，最多10个键) |
| `image_url` | string | ❌ | 通知附带图片URL (必须是有效的图片URL) |

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

**响应参数说明**:

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `name` | string | ✅ | 服务名称 |
| `description` | string | ❌ | 服务描述 |
| `version` | string | ❌ | 服务版本号 |
| `provider` | string | ❌ | 服务提供商名称 |
| `polling_interval` | number | ❌ | 建议的轮询间隔（分钟） |
| `api_endpoint` | string | ✅ | 通知数据获取接口完整URL |
| `icon_url` | string | ❌ | 服务图标URL |

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

| 参数 | 类型 | 必需 | 说明 | 实现状态 |
|------|------|------|------|---------|
| `limit` | number | ❌ | 返回数量 (1-100，默认20) | ✅ 已实现 |
| `type` | string | ❌ | 通知类型筛选: `info`/`success`/`warning`/`error` | ✅ 已实现 |
| `priority` | string | ❌ | 优先级筛选: `low`/`normal`/`high`/`urgent` | ✅ 已实现 |
| `since` | string | ❌ | ISO8601格式时间，获取指定时间之后的通知 | ✅ 已实现 |
| `offset` | number | ❌ | 分页偏移量 (默认0) | ⚠️ 计划实现 |
| `search` | string | ❌ | 搜索关键词 (最少2字符) | ⚠️ 计划实现 |
| `readStatus` | string | ❌ | 读取状态: `read`/`unread`/`all`(默认unread) | ⚠️ 计划实现，当前仅返回未读通知 |
| `sortBy` | string | ❌ | 排序字段: `receivedAt`/`priority` (默认receivedAt) | ⚠️ 计划实现，当前按接收时间倒序排列 |
| `sortOrder` | string | ❌ | 排序方式: `asc`/`desc` (默认desc) | ⚠️ 计划实现，当前固定为desc |

> 注意：当前实现默认只返回未读通知，未来将支持通过`readStatus`参数控制。

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

**响应参数说明**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `success` | boolean | 请求是否成功 |
| `data` | object | 返回数据对象 |
| `data.notifications` | array | 通知列表 |
| `data.notifications[].id` | string | 通知唯一ID |
| `data.notifications[].title` | string | 通知标题 |
| `data.notifications[].content` | string | 通知内容 |
| `data.notifications[].type` | string | 通知类型 |
| `data.notifications[].priority` | string | 通知优先级 |
| `data.notifications[].receivedAt` | string | ISO8601格式的接收时间 |
| `data.notifications[].source` | string | 通知来源名称 |
| `data.notifications[].callbackUrl` | string | 通知详情链接 |
| `data.notifications[].metadata` | object | 通知元数据 |
| `data.notifications[].subscription` | object | 关联的订阅信息 |
| `data.pagination` | object | 分页信息 |
| `data.pagination.returned` | number | 本次返回的通知数量 |
| `data.pagination.totalUnread` | number | 未读通知总数 |
| `data.pagination.limit` | number | 请求的每页限制 |

#### 标记通知已读

**PATCH** `/api/external/notifications/:id/read`
```bash
Authorization: Bearer <外部API Token>
```

**路径参数**:

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `id` | string | ✅ | 通知ID |

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

**响应参数说明**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `success` | boolean | 请求是否成功 |
| `message` | string | 操作结果描述 |
| `notification` | object | 已更新的通知对象 |
| `notification.id` | string | 通知唯一ID |
| `notification.isRead` | boolean | 通知的已读状态，值为true |
| `notification.readAt` | string | ISO8601格式的标记已读时间 |

#### 批量标记已读

**PATCH** `/api/external/notifications/batch/read`
```bash
Authorization: Bearer <外部API Token>
```

**请求体参数**:

| 参数 | 类型 | 必需 | 说明 | 实现状态 |
|------|------|------|------|---------|
| `notificationIds` | array | ✅ | 通知ID数组 (最多100个ID) | ✅ 已实现 |
| `markAll` | boolean | ❌ | 是否标记所有通知为已读 (设为true时忽略notificationIds) | ⚠️ 计划实现 |
| `beforeDate` | string | ❌ | ISO8601格式时间，标记此时间之前的所有通知为已读 | ⚠️ 计划实现 |

> 注意：当前仅支持通过`notificationIds`数组指定要标记的通知，`markAll`和`beforeDate`功能尚未实现。

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

**响应参数说明**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `success` | boolean | 请求是否成功 |
| `message` | string | 操作结果描述 |
| `modifiedCount` | number | 实际标记为已读的通知数量 |
| `totalRequested` | number | 请求标记的通知总数 |
| `failedIds` | array | 操作失败的通知ID列表（可选） |

#### 获取统计信息

**GET** `/api/external/stats`
```bash
Authorization: Bearer <外部API Token>
```

**查询参数**:

| 参数 | 类型 | 必需 | 说明 | 实现状态 |
|------|------|------|------|---------|
| `period` | string | ❌ | 统计周期: `today`/`week`/`month`/`all`(默认all) | ⚠️ 计划实现，当前返回全部统计 |
| `detailed` | boolean | ❌ | 是否返回详细统计 (默认false) | ⚠️ 计划实现，当前返回基础统计 |

> 注意：当前实现不支持查询参数，统一返回所有时间段的基础统计数据。

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

**响应参数说明**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `success` | boolean | 请求是否成功 |
| `data` | object | 统计数据对象 |
| `data.total` | number | 通知总数 |
| `data.unread` | number | 未读通知数量 |
| `data.read` | number | 已读通知数量 |
| `data.today` | number | 今日收到的通知数量 |
| `data.unreadByType` | object | 各类型未读通知的统计 |
| `data.unreadByType.info` | number | 信息类型未读通知数量 |
| `data.unreadByType.warning` | number | 警告类型未读通知数量 |
| `data.unreadByType.error` | number | 错误类型未读通知数量 |
| `data.unreadByType.success` | number | 成功类型未读通知数量 |
| `data.unreadByPriority` | object | 各优先级未读通知的统计（详细模式） |
| `data.timeDistribution` | object | 时间分布统计（详细模式） |

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

> 注意：当前实现通常只返回简化版的错误响应，包含`error`字段。完整的错误详情格式将在后续版本中实现。

**错误响应参数说明**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `error` | string | 错误描述信息 |
| `code` | string | 错误代码，用于客户端识别错误类型 |
| `details` | object/array | 详细错误信息，可能是对象或数组 |
| `details.field` | string | 出错的字段名称（验证错误时） |
| `details.message` | string | 该字段的具体错误信息 |
| `timestamp` | string | 错误发生的时间戳（可选） |
| `path` | string | 发生错误的API路径（可选） |

**常见错误代码**:

| 错误代码 | 说明 |
|---------|------|
| `INVALID_PARAMETERS` | 请求参数验证失败 |
| `AUTHENTICATION_FAILED` | 认证失败 |
| `INVALID_TOKEN` | 无效的Token |
| `TOKEN_EXPIRED` | Token已过期 |
| `RESOURCE_NOT_FOUND` | 请求的资源不存在 |
| `PERMISSION_DENIED` | 权限不足 |
| `RATE_LIMIT_EXCEEDED` | 超出请求频率限制 |
| `INTERNAL_ERROR` | 服务器内部错误 |

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