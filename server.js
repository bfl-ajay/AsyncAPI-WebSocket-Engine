import { handleMessage } from './generated/index.js';
import dotenv from 'dotenv';
import { WebSocketServer } from 'ws';
dotenv.config();

const PORT = process.env.PORT || 3000;
const wss = new WebSocketServer({ port: PORT });

console.log(`✅ WebSocket Server running on ws://localhost:${PORT}`);

wss.on('connection', ws => {
  ws.on('message', async message => {
    try {
      const { channel, payload } = JSON.parse(message);
      const result = await handleMessage(channel, payload);
      ws.send(JSON.stringify({ success: true, result }));
    } catch (err) {
      ws.send(JSON.stringify({ error: err.message }));
    }
  });
});
