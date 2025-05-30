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

### 🔗 快速开始

- **基础URL**: `https://your-domain.com/api`
- **详细文档**: [开发者指南](docs/developer-guide.md)
- **Demo演示**: [集成示例](demo/)

### 🔄 主要功能

#### 主动推送模式
第三方应用直接向回声推送通知：
```bash
POST /api/notifications/receive
{
  "notifyId": "用户通知ID",
  "token": "订阅Token", 
  "title": "通知标题",
  "content": "通知内容"
}
```

#### 被动推送模式  
回声平台定期从第三方服务获取通知：
- 提供 `/api/notifications` 接口
- 返回标准JSON格式通知数据
- 支持自动服务发现

#### 外部API接口
第三方应用获取和管理用户通知：
```bash
GET /api/external/notifications
Authorization: Bearer <外部API Token>
```

### 🔐 认证方式

1. **外部API Token** - 用于第三方应用访问用户通知数据
2. **订阅Token** - 用于第三方应用主动推送通知

### 📖 完整文档

详细的API文档、代码示例和集成指南，请查看：
- [开发者指南](docs/developer-guide.md) - 完整API参考
- [用户指南](docs/user-guide.md) - 使用说明  
- [演示应用](demo/) - 集成示例代码

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
