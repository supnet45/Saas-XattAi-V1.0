// services/whatsappService.js
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');

const SESSIONS_DIR = path.join(__dirname, '../whatsapp-sessions');
if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true });

class WhatsAppService {
  constructor() {
    this.clients = {};   // map userId → Client
    this.sockets = {};   // map userId → socket
  }

  initialize(socket, userId) {
    const uid = String(userId);
    this.sockets[uid] = socket;

    // destruir cliente anterior si existe
    if (this.clients[uid]) {
      this.clients[uid].destroy().catch(console.error);
      delete this.clients[uid];
    }

    const client = new Client({
      authStrategy: new LocalAuth({ clientId: `user-${uid}`, dataPath: SESSIONS_DIR }),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox','--disable-setuid-sandbox'],
        executablePath: process.platform==='win32'
          ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
          : undefined
      }
    });

    // marcamos "ready" cuando venga el evento
    client.ready = false;
    client.on('ready', () => {
      client.ready = true;
      socket.emit('whatsapp_connected', {
        phone: client.info.wid.user,
        name: client.info.pushname||'Usuario WhatsApp',
        timestamp: new Date().toISOString()
      });
    });

    client.on('qr', async qr => {
      const dataUrl = await qrcode.toDataURL(qr);
      socket.emit('whatsapp_qr', { qr: dataUrl });
    });

    client.on('authenticated', () => {
      socket.emit('whatsapp_authenticated');
    });

    client.on('disconnected', reason => {
      socket.emit('whatsapp_disconnected', { reason });
      client.destroy().catch(()=>{});
      delete this.clients[uid];
    });

    client.on('message', msg => {
      socket.emit('whatsapp_message', {
        id: msg.id._serialized,
        chatId: msg.from,
        body: msg.body,
        fromMe: msg.fromMe,
        timestamp: msg.timestamp
      });
    });

    this.clients[uid] = client;
    client.initialize().catch(err => {
      socket.emit('whatsapp_error', { message: err.message });
    });
  }

  async getStatus(userId) {
    const uid = String(userId);
    const client = this.clients[uid];
    if (client && client.ready) {
      return { connected: true, message: 'Cliente WhatsApp conectado' };
    }
    return { connected: false, message: 'No hay cliente activo' };
  }

  disconnect(userId) {
    const uid = String(userId);
    const client = this.clients[uid];
    if (client) {
      client.destroy().catch(console.error);
      delete this.clients[uid];
      delete this.sockets[uid];
    }
  }

  // ... también puedes dejar aquí getChats, sendMessage, etc.
}

module.exports = new WhatsAppService();
