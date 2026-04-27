const axios = require('axios');

const BASE = 'https://api.manychat.com';

// Create client lazily so env vars are read after dotenv.config()
function getClient() {
  const KEY = process.env.MANYCHAT_API_KEY;
  if (!KEY) throw new Error('MANYCHAT_API_KEY is not configured');

  return axios.create({
    baseURL: BASE,
    headers: {
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json'
    }
  });
}

/**
 * Get page/bot info to verify API key is working
 */
async function getPageInfo() {
  const res = await getClient().get('/fb/page/getInfo');
  return res.data;
}

/**
 * Find a ManyChat subscriber by their display name.
 * ManyChat's findBySystemField only supports email/phone.
 * findByName searches across subscriber names (first_name, last_name, ig_username).
 */
async function findSubscriberByName(name) {
  const res = await getClient().get('/fb/subscriber/findByName', {
    params: { name }
  });
  return res.data;
}

/**
 * Find a ManyChat subscriber by email
 */
async function findSubscriberByEmail(email) {
  const res = await getClient().get('/fb/subscriber/findBySystemField', {
    params: { email }
  });
  return res.data;
}

/**
 * Find a ManyChat subscriber by phone number
 */
async function findSubscriberByPhone(phone) {
  const res = await getClient().get('/fb/subscriber/findBySystemField', {
    params: { phone }
  });
  return res.data;
}

/**
 * Get subscriber info by their ManyChat subscriber ID
 */
async function getSubscriberInfo(subscriberId) {
  const res = await getClient().get('/fb/subscriber/getInfo', {
    params: { subscriber_id: subscriberId }
  });
  return res.data;
}

/**
 * Find subscriber by IG username.
 * Strategy: use findByName to search, then filter results by ig_username field.
 * Returns the subscriber object or null.
 */
async function findSubscriberByIgUsername(igUsername) {
  const result = await findSubscriberByName(igUsername);
  if (result.status === 'success' && result.data && result.data.length > 0) {
    // Filter by exact ig_username match if available
    const exact = result.data.find(sub => sub.ig_username === igUsername);
    return exact || result.data[0]; // Return exact match or first result
  }
  return null;
}

/**
 * Send a text message to a subscriber via ManyChat
 */
async function sendMessage(subscriberId, messageText) {
  const res = await getClient().post('/fb/sending/sendContent', {
    subscriber_id: subscriberId,
    data: {
      version: 'v2',
      content: {
        messages: [{ type: 'text', text: messageText }]
      }
    },
    message_tag: 'ACCOUNT_UPDATE'
  });
  return res.data;
}

/**
 * Trigger a ManyChat flow by namespace for a subscriber
 */
async function triggerFlow(subscriberId, flowNs) {
  const res = await getClient().post('/fb/sending/sendFlow', {
    subscriber_id: subscriberId,
    flow_ns: flowNs
  });
  return res.data;
}

/**
 * Create a new subscriber in ManyChat (requires at least one of: phone, email, whatsapp_phone)
 */
async function createSubscriber(data) {
  const res = await getClient().post('/fb/subscriber/createSubscriber', data);
  return res.data;
}

module.exports = {
  getPageInfo,
  findSubscriberByName,
  findSubscriberByEmail,
  findSubscriberByPhone,
  findSubscriberByIgUsername,
  getSubscriberInfo,
  sendMessage,
  triggerFlow,
  createSubscriber
};
