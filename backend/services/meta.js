const axios = require('axios');

const BASE = 'https://graph.facebook.com/v21.0';
const TOKEN = process.env.META_ACCESS_TOKEN;
const IG_ACCOUNT_ID = process.env.META_INSTAGRAM_ACCOUNT_ID;

/**
 * Send a DM to an Instagram user via the Instagram Messaging API
 * Requires: Instagram Business Account with instagram_manage_messages permission
 *
 * Note: For outbound messages (e.g. after a comment trigger), the user must have
 * interacted with the account within the 24h standard messaging window, OR
 * you must have human_agent tag permission from Meta.
 */
async function sendDM(recipientIgScopedId, messageText) {
  if (!IG_ACCOUNT_ID) {
    throw new Error('META_INSTAGRAM_ACCOUNT_ID not configured');
  }
  if (!TOKEN) {
    throw new Error('META_ACCESS_TOKEN not configured');
  }

  const url = `${BASE}/${IG_ACCOUNT_ID}/messages`;
  const payload = {
    recipient: { id: recipientIgScopedId },
    message: { text: messageText },
    messaging_type: 'RESPONSE'
  };

  const res = await axios.post(url, payload, {
    params: { access_token: TOKEN }
  });
  return res.data;
}

/**
 * Reply publicly to a comment on a post/reel
 */
async function replyToComment(commentId, replyText) {
  const url = `${BASE}/${commentId}/replies`;
  const res = await axios.post(url, { message: replyText }, {
    params: { access_token: TOKEN }
  });
  return res.data;
}

/**
 * Get all comments on a specific media (post/reel)
 */
async function getMediaComments(mediaId) {
  const url = `${BASE}/${mediaId}/comments`;
  const res = await axios.get(url, {
    params: {
      fields: 'id,text,username,timestamp,from',
      access_token: TOKEN
    }
  });
  return res.data;
}

/**
 * Verify the webhook token from Meta
 */
function verifyWebhook(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    console.log('[Meta] Webhook verified ✓');
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
}

module.exports = { sendDM, replyToComment, getMediaComments, verifyWebhook };
