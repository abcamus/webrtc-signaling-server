# WebRTC 信令服务器

这是一个基于WebSocket的WebRTC信令服务器，用于处理WebRTC连接的信令交换。

## 功能特性

- 支持多房间
- 实时房间状态监控
- 自动清理断开连接
- 心跳检测机制
- 支持多种信令消息类型

## 部署要求

- Node.js (建议 v14.0.0 或更高版本)
- npm 或 yarn
- TypeScript

## 部署方式

### 方式一：本地部署

1. 克隆仓库：
```bash
git clone git@github.com:abcamus/webrtc-signaling-server.git
cd webrtc-signaling-server
```
2. 安装依赖：
```bash
npm install
```
3. 编译 TypeScript 代码：
```bash
npm run build
```
4. 启动服务器：
```bash
npm start
```

### 方式二：Docker部署
1. 构建镜像：
```bash
$ npm run docker:build
```
2. 运行容器：
```bash
$ npm run docker:run
```

## 配置说明
服务器支持以下环境变量配置：

- PORT: 服务器端口号（默认：1234）
- HOST: 监听地址（默认：0.0.0.0）
- HEARTBEAT_INTERVAL: WebSocket 心跳间隔，单位毫秒（默认：30000）

Docker 环境下自定义配置示例：
```bash
docker run -d -p 8080:1234 \
  -e PORT=1234 \
  -e HOST=0.0.0.0 \
  -e HEARTBEAT_INTERVAL=30000 \
  webrtc-signaling-server
```


## macOS防火墙配置
如果在macOS系统上运行，需要配置防火墙规则：

1. 通过终端添加防火墙规则：
```bash
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add $(which node)
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblock $(which node)
```
2. 重启防火墙：
```bash
sudo pkill socketfilterfw
```

## 状态监控
服务器运行后，可以通过浏览器访问以下地址查看服务器状态：

- 本地访问： http://localhost:3000
- 局域网访问： http://YOUR_IP:3000

状态页面显示：

- 当前活跃房间数
- 每个房间的参与者信息
- 参与者的连接状态
- 加入/离开时间

## 注意事项
1. 确保服务器所在机器的防火墙允许3000端口的入站连接
2. 在生产环境中建议配置SSL证书以支持HTTPS和WSS
3. 定期检查服务器日志以监控异常情况
## 故障排除
1. 无法通过IP地址访问：
   
   - 检查防火墙设置
   - 确认服务器正确绑定到0.0.0.0
   - 验证端口未被其他程序占用
2. WebSocket连接失败：
   
   - 检查客户端连接URL是否正确
   - 确认网络连接稳定
   - 查看服务器日志是否有错误信息