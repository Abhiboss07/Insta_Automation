const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const router = express.Router();
const { verifyWebhook } = require('../services/meta');
const { handleCommentEvent, handleDMEvent } = require('../services/automation');

// ── Signature verification middleware (X-Hub-Signature-256) ──────
function verifySignature(req, res, next) {
  const signature = req.headers['x-hub-signature-256'];
  if (!signature) {
    console.warn('[Webhook] Missing X-Hub-Signature-256 header');
    return res.sendStatus(401);
  }

  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) {
    console.error('[Webhook] META_APP_SECRET not set — cannot verify signature');
    return res.sendStatus(500);
  }

  const expectedSig = 'sha256=' + crypto
    .createHmac('sha256', appSecret)
    .update(req.rawBody)
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
    console.warn('[Webhook] Invalid signature — rejecting payload');
    return res.sendStatus(401);
  }

  next();
}

// GET /webhook — Meta verification handshake
router.get('/', verifyWebhook);

// POST /webhook — Receive real-time events from Instagram
router.post('/', verifySignature, async (req, res) => {
  // Acknowledge immediately (Meta requires < 5s response)
  res.sendStatus(200);

  const body = req.body;
  if (body.object !== 'instagram') return;

  try {
    for (const entry of body.entry || []) {
      // ── Comment on Post/Reel ──────────────────────────────────
      for (const change of entry.changes || []) {
        if (change.field === 'comments') {
          const val = change.value;
          await handleCommentEvent({
            commentId: val.id,
            commentText: val.text,
            commenterId: val.from?.id,
            commenterUsername: val.from?.username,
            mediaId: val.media?.id,
            mediaType: val.media?.media_product_type // POST, REEL
          });
        }
      }

      // ── DM (messaging) ───────────────────────────────────────
      for (const msg of entry.messaging || []) {
        if (msg.message && !msg.message.is_echo) {
          // Meta DM webhooks do NOT include sender.username — resolve it
          let senderUsername = msg.sender?.username;
          if (!senderUsername && msg.sender?.id) {
            try {
              const userRes = await axios.get(
                `https://graph.facebook.com/v21.0/${msg.sender.id}`,
                { params: { fields: 'username', access_token: process.env.META_ACCESS_TOKEN } }
              );
              senderUsername = userRes.data.username;
            } catch (e) {
              console.warn('[Webhook] Could not resolve username for sender', msg.sender.id);
              senderUsername = 'unknown';
            }
          }

          await handleDMEvent({
            senderId: msg.sender?.id,
            senderUsername,
            messageText: msg.message?.text
          });
        }
      }
    }
  } catch (err) {
    console.error('[Webhook] Unhandled error processing event:', err);
  }
});

module.exports = router;
