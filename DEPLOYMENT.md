# 回声(Huisheen) 部署指南

本文档详细介绍了回声平台的各种部署方式。

## 目录

- [Railway一键部署](#railway一键部署)
- [Docker部署](#docker部署)
- [Docker Compose部署](#docker-compose部署)
- [传统服务器部署](#传统服务器部署)
- [云平台部署](#云平台部署)

## Railway一键部署

### 快速部署

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/deploy?template=https://github.com/LoosePrince/Huisheen)

### 手动部署步骤

1. **注册Railway账户**
   - 访问 [Railway](https://railway.app/)
   - 使用GitHub账户登录

2. **创建新项目**
   ```bash
   # 安装Railway CLI
   npm install -g @railway/cli
   
   # 登录
   railway login
   
   # 初始化项目
   railway init
   ```

3. **配置环境变量**
   ```bash
   # 设置MongoDB连接（Railway会自动提供）
   railway variables set MONGODB_URI=${{MONGO_URL}}
   
   # 设置JWT密钥
   railway variables set JWT_SECRET=$(openssl rand -hex 64)
   
   # 设置网站域名
   railway variables set WEBSITE_DOMAIN=your-app.railway.app
   ```

4. **部署应用**
   ```bash
   railway up
   ```

### Railway环境变量配置

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `MONGODB_URI` | MongoDB连接字符串 | `${{MONGO_URL}}` |
| `JWT_SECRET` | JWT密钥 | 自动生成的64位hex字符串 |
| `WEBSITE_DOMAIN` | 应用域名 | `your-app.railway.app` |
| `NODE_ENV` | 运行环境 | `production` |

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