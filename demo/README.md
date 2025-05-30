# 第三方演示服务 - 回声(Huisheen)集成

这是一个Python Flask示例应用，演示如何与回声(Huisheen)通知平台集成，支持被动和主动两种通知模式。

## 功能特性

### 🔄 被动模式
- 提供REST API供回声平台轮询
- 支持时间戳过滤获取增量通知
- 标准化的JSON响应格式

### 📤 主动模式  
- 主动向回声平台推送通知
- 支持多种通知类型和优先级
- 实时通知传递

### 🛠️ 管理功能
- 创建和管理本地通知
- 生成示例数据
- 清理数据库

## 快速开始

### 1. 安装依赖

```bash
# 进入demo目录
cd demo

# 安装Python依赖
pip install -r requirements.txt
```

### 2. 启动服务

```bash
# 启动Flask应用
python app.py
```

服务将在 `http://localhost:5000` 启动。

### 3. 配置环境变量（可选）

创建 `.env` 文件：

```bash
HUISHEEN_BASE_URL=http://localhost:3000
DEMO_BASE_URL=http://localhost:5000
```

## API 端点

### 被动模式 API

#### 获取通知列表
```http
GET /api/notifications
```

**查询参数：**
- `since` (可选): 时间戳，获取此时间之后的通知
- `limit` (可选): 限制返回数量，默认10

**响应示例：**
```json
{
  "success": true,
  "notifications": [
    {
      "id": "uuid",
      "title": "通知标题",
      "content": "通知内容",
      "type": "info",
      "priority": "normal",
      "timestamp": "2023-12-01T12:00:00Z",
      "source": "系统管理",
      "metadata": {}
    }
  ],
  "total": 1,
  "timestamp": "2023-12-01T12:00:00Z"
}
```

#### 获取单个通知
```http
GET /api/notifications/{id}
```

### 主动模式 API

#### 发送通知到回声平台
```http
POST /api/send-notification
```

**请求体：**
```json
{
  "notify_code": "notify:user:xxxx-xxxx-xxxx:xxxxxx@huisheen.com",
  "title": "通知标题",
  "content": "通知内容",
  "type": "info",
  "priority": "normal",
  "source": "第三方演示服务"
}
```

### 管理 API

#### 创建本地通知
```http
POST /admin/create-notification
```

#### 生成示例通知
```http
POST /admin/generate-sample
```

#### 清空所有通知
```http
POST /admin/clear-notifications
```

### 工具 API

#### 健康检查
```http
GET /health
```

#### API信息
```http
GET /api/info
```

## 与回声平台集成

### 被动模式集成

1. 在回声平台创建被动订阅
2. 第三方服务名称：`第三方演示服务`
3. 第三方服务URL：`http://localhost:5000`
4. API端点：`http://localhost:5000/api/notifications`
5. 设置轮询间隔（建议5-10分钟）

回声平台将定期调用您的API端点获取新通知。

### 主动模式集成

1. 在回声平台登录账户
2. 生成通知标识码（格式：`notify:user:xxxx-xxxx-xxxx:xxxxxx@huisheen.com`）
3. 在演示服务的"主动推送"页面填入标识码
4. 编写通知内容并发送
5. 通知将立即推送到用户的回声账户

## 通知数据结构

### 通知类型 (type)
- `info`: 信息通知
- `success`: 成功通知  
- `warning`: 警告通知
- `error`: 错误通知

### 优先级 (priority)
- `low`: 低优先级
- `normal`: 普通优先级
- `high`: 高优先级
- `urgent`: 紧急优先级

## 目录结构

```
demo/
├── app.py              # Flask应用主文件
├── templates/
│   └── index.html      # 前端界面
├── requirements.txt    # Python依赖
└── README.md          # 文档
```

## 开发说明

### 数据存储
当前使用内存存储（lists），生产环境建议使用数据库如SQLite、PostgreSQL等。

### 安全考虑
- 示例中使用的secret_key仅用于演示，生产环境请使用安全的密钥
- 建议添加身份验证和授权机制
- 考虑添加请求限制和日志记录

### 扩展功能
- 数据持久化
- 用户认证
- 通知去重
- 批量操作
- 数据统计

## 常见问题

### Q: 回声平台无法连接到演示服务？
A: 确保两个服务都在运行，并检查端口和防火墙设置。

### Q: 主动推送失败？
A: 检查通知标识码是否正确，且未过期（5分钟有效期）。

### Q: 被动轮询没有获取到新通知？
A: 确认API端点URL正确，并检查演示服务的通知列表中是否有数据。

## 技术支持

如有问题，请检查：
1. 回声平台和演示服务的运行状态
2. 网络连接和端口配置
3. API端点URL的正确性
4. 通知标识码的有效性

---

**注意：** 此演示服务仅用于测试和开发目的，请勿在生产环境中直接使用。 