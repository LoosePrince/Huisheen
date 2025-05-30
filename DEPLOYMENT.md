# 回声(Huisheen) 部署指南

本文档详细介绍了回声平台的各种部署方式。

## 目录

- [Railway一键部署](#railway一键部署)
- [Docker部署](#docker部署)
- [Docker Compose部署](#docker-compose部署)
- [传统服务器部署](#传统服务器部署)
- [云平台部署](#云平台部署)

## Railway部署

Railway是一个现代化的应用部署平台，支持自动部署、数据库集成和环境管理。

### 手动部署步骤

1. **注册Railway账户**
   - 访问 [Railway](https://railway.app/)
   - 使用GitHub账户登录

2. **创建新项目**
   - 在Railway仪表板中点击 "New Project"
   - 选择 "Deploy from GitHub repo"
   - 授权Railway访问您的GitHub账户
   - 选择 `LoosePrince/Huisheen` 仓库（如果是fork的话选择您的fork）

3. **添加MongoDB数据库**
   - 在项目画布中点击 "New"
   - 选择 "Database"
   - 选择 "Add MongoDB"
   - Railway会自动创建并连接MongoDB实例

4. **配置环境变量**
   - 点击您的应用服务
   - 进入 "Variables" 标签
   - 添加以下环境变量：
   
   ```env
   MONGODB_URI=${{MONGO_URL}}
   JWT_SECRET=your_strong_jwt_secret_here_64_characters_long
   WEBSITE_DOMAIN=your-app-name.railway.app
   NODE_ENV=production
   ```

5. **配置部署设置**
   - 在 "Settings" 标签中确认：
   - **Start Command**: `npm start`
   - **Build Command**: `npm install --production`
   - **Healthcheck Path**: `/health`

6. **部署应用**
   - Railway会自动检测到这是Node.js应用
   - 推送代码或点击 "Deploy" 触发部署
   - 等待部署完成（通常2-3分钟）

### 使用Railway CLI部署

如果您喜欢命令行工具：

```bash
# 安装Railway CLI
npm install -g @railway/cli

# 登录Railway
railway login

# 在项目目录中初始化
git clone https://github.com/LoosePrince/Huisheen.git
cd Huisheen

# 创建新的Railway项目
railway init

# 添加MongoDB服务
railway add --database mongodb

# 设置环境变量
railway variables set MONGODB_URI='${{MONGO_URL}}'
railway variables set JWT_SECRET='your_jwt_secret_here'
railway variables set WEBSITE_DOMAIN='your-app.railway.app'
railway variables set NODE_ENV='production'

# 部署应用
railway up
```

### Railway环境变量配置

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `MONGODB_URI` | MongoDB连接字符串 | `${{MONGO_URL}}` (Railway自动提供) |
| `JWT_SECRET` | JWT密钥 | 64位随机字符串 |
| `WEBSITE_DOMAIN` | 应用域名 | `your-app.railway.app` |
| `NODE_ENV` | 运行环境 | `production` |

### 高级配置

#### 自定义域名

1. 在Railway中进入您的应用设置
2. 点击 "Networking" 标签
3. 添加自定义域名
4. 更新 `WEBSITE_DOMAIN` 环境变量为您的自定义域名
5. 重新部署应用

#### 监控和日志

- **实时日志**: 在Railway控制台的 "Deployments" 标签查看
- **指标监控**: Railway提供CPU、内存、网络使用情况监控
- **健康检查**: 自动使用 `/health` 端点进行健康检查

#### 自动部署

Railway默认启用自动部署：
- 每次推送到主分支都会触发新的部署
- 可以在 "Settings" → "Environment" 中配置部署分支
- 支持Preview Deployments用于PR预览

### 故障排除

#### 常见问题

1. **MongoDB连接失败**
   ```bash
   # 检查环境变量是否正确设置
   railway variables
   
   # 确保MONGODB_URI指向正确的数据库
   ```

2. **应用启动失败**
   ```bash
   # 查看部署日志
   railway logs
   
   # 检查package.json中的start脚本
   ```

3. **环境变量未生效**
   - 修改环境变量后需要重新部署
   - 确保变量名拼写正确（区分大小写）

#### 调试命令

```bash
# 查看所有环境变量
railway variables

# 查看部署状态
railway status

# 查看实时日志
railway logs --follow

# 连接到应用shell
railway shell
```

### 成本优化

- Railway提供免费额度，适合开发和小型应用
- 按使用量计费，应用睡眠时不产生费用
- 可以设置使用限制防止意外超支

更多Railway相关信息请查看 [Railway官方文档](https://docs.railway.app/)。

## Docker部署

### 单容器部署

1. **构建镜像**
   ```bash
   docker build -t huisheen .
   ```

2. **运行容器**
   ```bash
   docker run -d \
     --name huisheen \
     -p 3000:3000 \
     -e MONGODB_URI="mongodb://your-mongo-host:27017/huisheen" \
     -e JWT_SECRET="your-jwt-secret" \
     -e WEBSITE_DOMAIN="your-domain.com" \
     huisheen
   ```

3. **查看日志**
   ```bash
   docker logs -f huisheen
   ```

### 使用npm脚本

```bash
# 构建镜像
npm run docker:build

# 运行容器
npm run docker:run

# 停止并删除容器
npm run docker:stop
```

## Docker Compose部署

### 快速启动

1. **准备环境配置**
   ```bash
   # 复制环境配置模板
   cp docker.env.example .env
   
   # 编辑配置文件
   nano .env
   ```

2. **启动服务**
   ```bash
   # 使用npm脚本
   npm run docker:compose:up
   
   # 或直接使用docker-compose
   docker-compose up -d
   ```

3. **查看服务状态**
   ```bash
   docker-compose ps
   npm run docker:compose:logs
   ```

### 环境配置说明

编辑 `.env` 文件：

```env
# 应用配置
PORT=3000
NODE_ENV=production
WEBSITE_DOMAIN=localhost:3000

# JWT密钥（生产环境必须更改）
JWT_SECRET=请_更改_为_安全_的_密钥

# MongoDB配置
MONGO_PORT=27017
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=请_更改_为_安全_的_密码
```

### 生产环境优化

1. **使用外部MongoDB**
   ```yaml
   # docker-compose.override.yml
   version: '3.8'
   services:
     huisheen:
       environment:
         - MONGODB_URI=mongodb://user:pass@external-host:27017/huisheen
   ```

2. **配置反向代理**
   ```yaml
   # 添加nginx服务
   nginx:
     image: nginx:alpine
     ports:
       - "80:80"
       - "443:443"
     volumes:
       - ./nginx.conf:/etc/nginx/nginx.conf
       - ./ssl:/etc/nginx/ssl
   ```

## 传统服务器部署

### Ubuntu/Debian服务器

1. **安装依赖**
   ```bash
   # 更新包管理器
   sudo apt update
   
   # 安装Node.js 18
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # 安装MongoDB
   sudo apt-get install -y mongodb
   
   # 安装PM2进程管理器
   sudo npm install -g pm2
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

3. **配置生产环境**
   ```bash
   # 启动MongoDB服务
   sudo systemctl start mongodb
   sudo systemctl enable mongodb
   
   # 使用PM2启动应用
   pm2 start src/server.js --name huisheen
   
   # 配置PM2开机启动
   pm2 startup
   pm2 save
   ```

### CentOS/RHEL服务器

1. **安装依赖**
   ```bash
   # 安装Node.js
   curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
   sudo yum install -y nodejs
   
   # 安装MongoDB
   sudo yum install -y mongodb-server
   
   # 安装PM2
   sudo npm install -g pm2
   ```

2. **配置防火墙**
   ```bash
   # 开放端口
   sudo firewall-cmd --permanent --add-port=3000/tcp
   sudo firewall-cmd --reload
   ```

## 云平台部署

### Heroku部署

1. **安装Heroku CLI**
   ```bash
   # 安装CLI工具
   npm install -g heroku
   
   # 登录
   heroku login
   ```

2. **创建应用**
   ```bash
   # 创建Heroku应用
   heroku create your-app-name
   
   # 添加MongoDB插件
   heroku addons:create mongolab:sandbox
   
   # 设置环境变量
   heroku config:set JWT_SECRET=$(openssl rand -hex 64)
   heroku config:set WEBSITE_DOMAIN=your-app-name.herokuapp.com
   ```

3. **部署代码**
   ```bash
   git push heroku main
   ```

### Vercel部署

1. **安装Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **配置vercel.json**
   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "src/server.js",
         "use": "@vercel/node"
       }
     ],
     "routes": [
       {
         "src": "/(.*)",
         "dest": "src/server.js"
       }
     ],
     "env": {
       "NODE_ENV": "production"
     }
   }
   ```

3. **部署**
   ```bash
   vercel --prod
   ```

## 性能优化建议

### 生产环境配置

1. **启用GZIP压缩**
   ```javascript
   // 在server.js中添加
   const compression = require('compression');
   app.use(compression());
   ```

2. **配置缓存**
   ```javascript
   // 静态文件缓存
   app.use(express.static('public', {
     maxAge: '1d'
   }));
   ```

3. **数据库连接池**
   ```javascript
   // 在database.js中配置
   mongoose.connect(mongoURI, {
     maxPoolSize: 10,
     serverSelectionTimeoutMS: 5000,
     socketTimeoutMS: 45000,
   });
   ```

### 监控和日志

1. **PM2监控**
   ```bash
   # 查看应用状态
   pm2 status
   
   # 查看日志
   pm2 logs huisheen
   
   # 重启应用
   pm2 restart huisheen
   ```

2. **健康检查**
   ```bash
   # 测试健康检查端点
   curl http://localhost:3000/health
   ```

## 故障排除

### 常见问题

1. **MongoDB连接失败**
   ```bash
   # 检查MongoDB状态
   sudo systemctl status mongodb
   
   # 查看MongoDB日志
   sudo tail -f /var/log/mongodb/mongod.log
   ```

2. **端口被占用**
   ```bash
   # 查找占用端口的进程
   sudo lsof -i :3000
   
   # 终止进程
   sudo kill -9 <PID>
   ```

3. **环境变量未加载**
   ```bash
   # 检查.env文件是否存在
   ls -la .env
   
   # 验证环境变量
   node -e "require('dotenv').config(); console.log(process.env.MONGODB_URI)"
   ```

## 安全建议

1. **定期更新依赖**
   ```bash
   npm audit
   npm update
   ```

2. **使用HTTPS**
   - 配置SSL证书
   - 使用Let's Encrypt免费证书

3. **设置防火墙**
   ```bash
   # 只开放必要端口
   sudo ufw allow 22    # SSH
   sudo ufw allow 80    # HTTP
   sudo ufw allow 443   # HTTPS
   sudo ufw enable
   ```

4. **定期备份数据库**
   ```bash
   # MongoDB备份
   mongodump --db huisheen --out backup/$(date +%Y%m%d)
   ```

更多详细信息请参考项目的README.md文件。 