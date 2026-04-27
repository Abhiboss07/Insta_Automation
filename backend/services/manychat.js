const axios = require('axios');

const BASE = 'https://api.manychat.com';
const KEY = process.env.MANYCHAT_API_KEY;

const client = axios.create({
  baseURL: BASE,
  headers: {
    Authorization: `Bearer ${KEY}`,
    'Content-Type': 'application/json'
  }
});

/**
 * Find a ManyChat subscriber by Instagram username
 * Uses findBySystemField with ig_username (not findByUserRef which expects a custom ref)
 */
async function findSubscriber(instagramUsername) {
  const res = await client.post('/fb/subscriber/findBySystemField', {
    field_name: 'ig_username',
    field_value: instagramUsername
  });
  return res.data;
}

/**
 * Send a text message to a subscriber via ManyChat
 */
async function sendMessage(subscriberId, messageText) {
  const res = await client.post('/fb/sending/sendContent', {
    subscriber_id: subscriberId,
    data: {
      version: 'v2',
      content: {
        messages: [{ type: 'text', text: messageText }]
      }
    }
  });
  return res.data;
}

/**
 * Trigger a ManyChat flow by name for a subscriber
 */
async function triggerFlow(subscriberId, flowNs) {
  const res = await client.post('/fb/sending/sendFlow', {
    subscriber_id: subscriberId,
    flow_ns: flowNs
  });
  return res.data;
}

module.exports = { findSubscriber, sendMessage, triggerFlow };
