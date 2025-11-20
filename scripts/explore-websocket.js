/**
 * WebSocket Explorer для Launch.Meme
 * 
 * Этот скрипт подключается к WebSocket и исследует доступные каналы и данные
 * Запуск: node scripts/explore-websocket.js
 */

const WebSocket = require('ws');

const WS_URL = 'wss://launch.meme/connection/websocket';
const WS_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJpYXQiOjE3NTcxNjY4ODh9.VEvlNmvIFS3ARM5R0jlNN4fwDDRz94WnKv8LDmtipNE';
const WS_PREFIX = 'pumpfun';

// Centrifuge протокол - упрощенная версия для исследования
class CentrifugeExplorer {
  constructor(url, token) {
    this.url = url;
    this.token = token;
    this.ws = null;
    this.messageId = 0;
    this.subscriptions = new Map();
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);
      
      this.ws.on('open', () => {
        console.log('✅ WebSocket connected');
        // Отправляем connect сообщение
        this.send({
          id: this.nextId(),
          method: 'connect',
          params: {
            token: this.token
          }
        });
        resolve();
      });

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (err) {
          console.error('Error parsing message:', err);
        }
      });

      this.ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
        reject(error);
      });

      this.ws.on('close', () => {
        console.log('🔌 WebSocket closed');
      });
    });
  }

  nextId() {
    return ++this.messageId;
  }

  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const json = JSON.stringify(message);
      console.log('📤 Sending:', json);
      this.ws.send(json);
    }
  }

  handleMessage(message) {
    console.log('\n📥 Received:', JSON.stringify(message, null, 2));

    if (message.method === 'connect') {
      if (message.result) {
        console.log('✅ Connected successfully');
        this.exploreChannels();
      }
    } else if (message.method === 'subscribe') {
      console.log('📡 Subscription result:', message.result);
    } else if (message.method === 'publish') {
      console.log('📢 Publication received on channel:', message.channel);
      console.log('📊 Data:', JSON.stringify(message.data, null, 2));
    }
  }

  exploreChannels() {
    console.log('\n🔍 Exploring available channels...\n');

    // Попробуем подписаться на известные каналы
    const channelsToTry = [
      'tokenUpdates',
      'mintTokens',
      'txs', // общий канал для транзакций
      'orderbook', // возможно есть общий orderbook
      'market', // общий рыночный канал
      'pulse', // pulse feed
      'stats', // статистика
      'leaderboard', // лидерборд
    ];

    channelsToTry.forEach((channel, index) => {
      setTimeout(() => {
        const channelName = `${WS_PREFIX}-${channel}`;
        console.log(`\n📡 Subscribing to: ${channelName}`);
        this.subscribe(channelName);
      }, index * 1000);
    });

    // Также попробуем подписаться на каналы без префикса
    setTimeout(() => {
      console.log('\n📡 Trying channels without prefix...');
      ['tokenUpdates', 'mintTokens'].forEach((channel) => {
        this.subscribe(channel);
      });
    }, channelsToTry.length * 1000 + 1000);
  }

  subscribe(channel) {
    const subId = this.nextId();
    this.send({
      id: subId,
      method: 'subscribe',
      params: {
        channel: channel
      }
    });
    this.subscriptions.set(subId, channel);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Запуск исследования
async function main() {
  console.log('🚀 Starting WebSocket exploration...\n');
  console.log(`URL: ${WS_URL}`);
  console.log(`Token: ${WS_TOKEN.substring(0, 20)}...`);
  console.log(`Prefix: ${WS_PREFIX}\n`);

  const explorer = new CentrifugeExplorer(WS_URL, WS_TOKEN);
  
  try {
    await explorer.connect();
    
    // Держим соединение открытым 30 секунд для сбора данных
    setTimeout(() => {
      console.log('\n⏱️  Exploration complete. Closing connection...');
      explorer.disconnect();
      process.exit(0);
    }, 30000);
  } catch (error) {
    console.error('Failed to explore:', error);
    process.exit(1);
  }
}

main();

