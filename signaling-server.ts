import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';

const port = 1234;
const host = '0.0.0.0';
const rooms = new Map<string, Set<WebSocket>>();
const peerRooms = new Map<WebSocket, string>();
const peerIds = new Map<WebSocket, string>();
const peerJoinTimes = new Map<string, number>();
const peerLeaveTimes = new Map<string, number>();

const server = http.createServer((request, response) => {
    if (request.url === '/') {
        // 返回状态页面
        response.writeHead(200, { 'Content-Type': 'text/html' });
        const roomsInfo = Array.from(rooms.entries()).map(([roomId, peers]) => ({
            roomId,
            peers: Array.from(peers).map(peer => {
                const peerId = peerIds.get(peer);
                return {
                    id: peerId,
                    state: peer.readyState === WebSocket.OPEN ? 'connected' : 'disconnected',
                    joinTime: peerId ? peerJoinTimes.get(peerId) : undefined,
                    leaveTime: peerId ? peerLeaveTimes.get(peerId) : undefined
                };
            })
        }));

        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>WebRTC Signaling Server Status</title>
            <meta charset="utf-8">
            <style>
                body { 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    margin: 0;
                    padding: 20px;
                    background: #f5f5f7;
                    color: #1d1d1f;
                }
                h1 {
                    text-align: center;
                    color: #1d1d1f;
                    margin-bottom: 30px;
                }
                .stats {
                    background: white;
                    padding: 15px 20px;
                    border-radius: 10px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    margin-bottom: 20px;
                }
                .room { 
                    background: white;
                    margin: 15px 0;
                    padding: 20px;
                    border-radius: 10px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    transition: all 0.3s ease;
                }
                .room:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                }
                .room h3 {
                    margin: 0 0 15px 0;
                    color: #1d1d1f;
                    border-bottom: 1px solid #e5e5e5;
                    padding-bottom: 10px;
                }
                .peer { 
                    margin: 8px 0;
                    padding: 10px 15px;
                    background: #f8f8f8;
                    border-radius: 6px;
                    display: flex;
                    align-items: center;
                }
                .peer-status {
                    display: inline-block;
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    margin-right: 10px;
                }
                .connected .peer-status { 
                    background: #34c759;
                    box-shadow: 0 0 0 2px rgba(52, 199, 89, 0.2);
                }
                .disconnected .peer-status { 
                    background: #ff3b30;
                    box-shadow: 0 0 0 2px rgba(255, 59, 48, 0.2);
                }
                .container {
                    max-width: 800px;
                    margin: 0 auto;
                }
                .peer-time {
                    font-size: 0.8em;
                    color: #666;
                    margin-top: 4px;
                }
                .peer {
                    flex-direction: column;
                    align-items: flex-start;
                }
                .peer-status {
                    margin-bottom: 8px;
                }
            </style>
            <script>
                function refreshPage() {
                    location.reload();
                }
                setInterval(refreshPage, 5000);
            </script>
        </head>
        <body>
            <div class="container">
                <h1>WebRTC Signaling Server Status</h1>
                <div class="stats">
                    <p>当前活跃房间数: ${rooms.size}</p>
                </div>
                <div id="rooms">
                    ${roomsInfo.map(room => `
                        <div class="room">
                            <h3>房间: ${room.roomId}</h3>
                            <div class="peers">
                                ${room.peers.map(peer => `
                                    <div class="peer ${peer.state}">
                                        <span class="peer-status"></span>
                                        <div>
                                            <div>Peer ID: ${peer.id || 'Unknown'}</div>
                                            <div class="peer-time">
                                                <small>加入时间: ${peer.joinTime ? new Date(peer.joinTime).toLocaleString() : 'N/A'}</small>
                                                ${peer.state === 'disconnected' && peer.leaveTime ?
                `<br><small>离开时间: ${new Date(peer.leaveTime).toLocaleString()}</small>`
                : ''}
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </body>
        </html>
        `;
        response.end(html);
    } else {
        response.writeHead(200, { 'Content-Type': 'text/plain' });
        response.end('WebRTC signaling server running');
    }
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws: WebSocket) => {
    let roomId: string = '';

    ws.on('message', (message: string) => {
        console.log(`Received message: ${message}`);
        try {
            const data = JSON.parse(message);
            // 需要处理更多的消息类型
            if (data.type === 'join') {
                const roomId = data.room;
                const peerId = data.peerId;

                peerJoinTimes.set(peerId, Date.now());

                // 保存peer信息
                peerIds.set(ws, peerId);
                peerRooms.set(ws, roomId);

                // 创建或加入房间
                if (!rooms.has(roomId)) {
                    rooms.set(roomId, new Set());
                }
                rooms.get(roomId)!.add(ws);

                // 发送房间信息给新加入的peer
                const roomPeers = Array.from(rooms.get(roomId)!)
                    .map(client => peerIds.get(client))
                    .filter(id => id && id !== peerId);

                ws.send(JSON.stringify({
                    type: 'room-info',
                    peers: roomPeers
                }));

                // 通知房间内其他peers
                rooms.get(roomId)!.forEach(client => {
                    if (client !== ws) {
                        client.send(JSON.stringify({
                            type: 'peer-joined',
                            peerId: peerId
                        }));
                    }
                });
            } else if (data.type === 'leave') {
                const peerId = peerIds.get(ws);
                const roomId = peerRooms.get(ws);

                if (peerId) {
                    peerLeaveTimes.set(peerId, Date.now());
                }

                if (roomId && rooms.has(roomId)) {
                    // 通知房间内其他成员
                    rooms.get(roomId)!.forEach(client => {
                        if (client !== ws && client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({
                                type: 'peer-left',
                                peerId: peerId
                            }));
                        }
                    });

                    // 清理该连接的信息
                    rooms.get(roomId)!.delete(ws);
                    if (rooms.get(roomId)!.size === 0) {
                        rooms.delete(roomId);
                    }
                    peerIds.delete(ws);
                    peerRooms.delete(ws);

                    console.log(`Peer ${peerId} left room ${roomId}`);
                }
            } else if (data.type === 'signal') {
                // 转发信令数据
                const roomId = peerRooms.get(ws);
                if (roomId) {
                    rooms.get(roomId)!.forEach(client => {
                        const clientId = peerIds.get(client);
                        if (clientId === data.peerId) {
                            client.send(JSON.stringify({
                                type: 'signal',
                                peerId: peerIds.get(ws),
                                signal: data.signal
                            }));
                        }
                    });
                }
            } else if (data.type === 'sync') {
                // 处理同步请求
                if (roomId && rooms.has(roomId)) {
                    rooms.get(roomId)!.forEach(client => {
                        if (client !== ws && client.readyState === WebSocket.OPEN) {
                            client.send(message);
                        }
                    });
                }
            } else if (data.type === 'awareness') {
                // 处理感知状态更新
                if (roomId && rooms.has(roomId)) {
                    rooms.get(roomId)!.forEach(client => {
                        if (client !== ws && client.readyState === WebSocket.OPEN) {
                            client.send(message);
                        }
                    });
                }
            } else if (data.type === 'update') {
                // 处理文档更新
                if (roomId && rooms.has(roomId)) {
                    rooms.get(roomId)!.forEach(client => {
                        if (client !== ws && client.readyState === WebSocket.OPEN) {
                            client.send(message);
                        }
                    });
                }
            } else if (roomId) {
                // 转发其他消息
                rooms.get(roomId)!.forEach(client => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(message);
                    }
                });
            }
        } catch (error) {
            console.error('Error handling message:', error);
        }
    });

    let heartbeatInterval: NodeJS.Timeout;

    // 设置心跳检测
    heartbeatInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.ping();
        }
    }, 30000);

    ws.on('close', () => {
        const peerId = peerIds.get(ws);
        if (peerId) {
            peerLeaveTimes.set(peerId, Date.now());
        }
        clearInterval(heartbeatInterval);
        if (roomId && rooms.has(roomId)) {
            rooms.get(roomId)!.delete(ws);
            if (rooms.get(roomId)!.size === 0) {
                rooms.delete(roomId);
            }
            console.log(`Client left room: ${roomId}`);
        }
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        if (roomId && rooms.has(roomId)) {
            rooms.get(roomId)!.delete(ws);
        }
    });
});

server.listen(port, host, () => {
    console.log(`Signaling server running at http://${host}:${port}`);
}).on('error', (err) => {
    console.error('Server error:', err);
});