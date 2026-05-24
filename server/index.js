require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const http = require('http');
const { WebSocketServer } = require('ws');
const { v4: uuid } = require('uuid');

const filesRoutes = require('./routes/files.routes');
const astRoutes = require('./routes/ast.routes');
const aiRoutes = require('./routes/ai.routes');
const { WatcherService } = require('./services/watcher.service');

const app = express();
const PORT = process.env.SERVER_PORT || 3001;

app.use(cors({ origin: (process.env.ALLOWED_ORIGINS || '').split(',') }));
app.use(express.json({ limit: '50mb' }));

app.use('/api/files', filesRoutes);
app.use('/api/ast', astRoutes);
app.use('/api/ai', aiRoutes);
app.get('/api/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

app.use((err, _req, res, _next) => {
  console.error('[Server Error]', err.message);
  res.status(err.status || 500).json({ error: err.message });
});

const server = http.createServer(app);

// WebSocket
const wss = new WebSocketServer({ server, path: '/ws' });
const clients = new Map();

wss.on('connection', (ws) => {
  const id = uuid();
  clients.set(id, ws);
  ws.on('close', () => clients.delete(id));
  ws.on('error', () => clients.delete(id));
});

function broadcast(type, data, excludeId) {
  const msg = JSON.stringify({ type, ...data, timestamp: Date.now() });
  clients.forEach((ws, id) => {
    if (id !== excludeId && ws.readyState === 1) ws.send(msg);
  });
}

// File watcher
const watcher = new WatcherService((filePath) => {
  broadcast('FILE_CHANGED', { path: filePath });
});

app.locals.broadcast = broadcast;
app.locals.watcher = watcher;

server.listen(PORT, () => console.log(`[UILens Server] http://localhost:${PORT}`));

process.on('SIGTERM', () => { watcher.stop(); server.close(); });
process.on('SIGINT', () => { watcher.stop(); server.close(); process.exit(0); });
