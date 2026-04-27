const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const router = express.Router();
const { handleCommentEvent, handleDMEvent } = require('../services/automation');

// ── Check if Meta keys are configured ───────────────────────────
function isMetaConfigured() {
  return !!(process.env.META_APP_SECRET && process.env.META_ACCESS_TOKEN);
}

// ── Signature verification middleware (X-Hub-Signature-256) ──────
// Only enforced when META_APP_SECRET is configured
function verifySignature(req, res, next) {
  const appSecret = process.env.META_APP_SECRET;

  // If no app secret configured, skip signature check
  // (ManyChat-only mode — no Meta webhooks expected)
  if (!appSecret) {
    return next();
  }

  const signature = req.headers['x-hub-signature-256'];
  if (!signature) {
    console.warn('[Webhook] Missing X-Hub-Signature-256 header');
    return res.sendStatus(401);
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
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    console.log('[Meta] Webhook verified ✓');
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// POST /webhook — Receive real-time events from Instagram (Meta) or ManyChat
router.post('/', verifySignature, async (req, res) => {
  // Acknowledge immediately (Meta requires < 5s response)
  res.sendStatus(200);

  const body = req.body;

  try {
    // ── INSTAGRAM / META WEBHOOK FORMAT ─────────────────────────
    if (body.object === 'instagram') {
      for (const entry of body.entry || []) {
        // Comment on Post/Reel
        for (const change of entry.changes || []) {
          if (change.field === 'comments') {
            const val = change.value;
            await handleCommentEvent({
              commentId: val.id,
              commentText: val.text,
              commenterId: val.from?.id,
              commenterUsername: val.from?.username,
              mediaId: val.media?.id,
              mediaType: val.media?.media_product_type
            });
          }
        }

        // DM (messaging)
        for (const msg of entry.messaging || []) {
          if (msg.message && !msg.message.is_echo) {
            let senderUsername = msg.sender?.username;
            if (!senderUsername && msg.sender?.id && isMetaConfigured()) {
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
              senderUsername: senderUsername || 'unknown',
              messageText: msg.message?.text
            });
          }
        }
      }
    }

    // ── MANYCHAT WEBHOOK FORMAT ──────────────────────────────────
    // ManyChat can send webhooks to notify about subscriber events.
    // Format: { subscriber_id, ig_username, type, message_text, ... }
    if (body.subscriber_id && body.type) {
      const username = body.ig_username || body.name || 'unknown';
      if (body.type === 'comment') {
        await handleCommentEvent({
          commentId: `mc_${body.subscriber_id}_${Date.now()}`,
          commentText: body.message_text || body.text || '',
          commenterId: body.subscriber_id,
          commenterUsername: username,
          mediaId: body.media_id || 'unknown',
          mediaType: 'POST'
        });
      } else if (body.type === 'dm' || body.type === 'message') {
        await handleDMEvent({
          senderId: body.subscriber_id,
          senderUsername: username,
          messageText: body.message_text || body.text || ''
        });
      }
    }

  } catch (err) {
    console.error('[Webhook] Unhandled error processing event:', err);
  }
});

module.exports = router;
