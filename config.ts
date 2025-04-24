export default {
    port: process.env.PORT ? parseInt(process.env.PORT) : 1234,
    host: process.env.HOST || '0.0.0.0',
    heartbeatInterval: process.env.HEARTBEAT_INTERVAL ? parseInt(process.env.HEARTBEAT_INTERVAL) : 30000
};