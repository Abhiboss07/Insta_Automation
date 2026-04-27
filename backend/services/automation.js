const { v4: uuidv4 } = require('uuid');
const manychat = require('./manychat');
const store = require('../store');

// Lazy-load Meta service only when keys are available
function getMetaService() {
  if (process.env.META_ACCESS_TOKEN && process.env.META_INSTAGRAM_ACCOUNT_ID) {
    return require('./meta');
  }
  return null;
}

/**
 * Send a DM using ManyChat (primary) with Meta as optional fallback.
 * Returns { sent, provider, error }
 */
async function sendDMWithProviders(username, messageText) {
  const meta = getMetaService();
  let sent = false;
  let provider = null;
  let error = null;

  // ── PRIMARY: ManyChat ─────────────────────────────────────────
  try {
    // Look up subscriber by IG username
    const subscriber = await manychat.findSubscriberByIgUsername(username);
    if (subscriber && subscriber.id) {
      await manychat.sendMessage(subscriber.id, messageText);
      sent = true;
      provider = 'manychat';
    } else {
      throw new Error(`Subscriber "${username}" not found in ManyChat. They need to interact with your bot first.`);
    }
  } catch (mcErr) {
    console.warn(`[ManyChat] DM failed for ${username}: ${mcErr.message}`);

    // ── FALLBACK: Meta (only if configured) ───────────────────
    if (meta) {
      try {
        await meta.sendDM(username, messageText);
        sent = true;
        provider = 'meta';
      } catch (metaErr) {
        error = `ManyChat: ${mcErr.message} | Meta: ${metaErr.message}`;
        console.error(`[Automation] Both providers failed for ${username}: ${error}`);
      }
    } else {
      error = `ManyChat: ${mcErr.message}`;
      console.error(`[Automation] ManyChat failed, Meta not available: ${error}`);
    }
  }

  return { sent, provider, error };
}

/**
 * Core function: given a comment event, find a matching trigger and send DM
 */
async function handleCommentEvent(event) {
  const { commentId, commentText, commenterId, commenterUsername, mediaId, mediaType } = event;

  // Find matching trigger
  const trigger = findMatchingTrigger(commentText, 'comment');
  if (!trigger) {
    logActivity({
      type: 'comment',
      username: commenterUsername,
      userId: commenterId,
      commentText,
      mediaId,
      status: 'no_trigger',
      message: 'No trigger matched'
    });
    return { matched: false };
  }

  // Get template
  const template = store.templates.find(t => t.id === trigger.templateId);
  if (!template) {
    console.warn(`[Automation] Trigger ${trigger.id} has no valid template`);
    store.stats.failedSends++;
    logActivity({
      type: 'comment',
      username: commenterUsername,
      userId: commenterId,
      commentText,
      mediaId,
      triggerKeyword: trigger.keyword,
      status: 'failed',
      error: 'Orphaned trigger — template deleted'
    });
    return { matched: true, sent: false, error: 'Template not found' };
  }

  // Send DM — ManyChat primary, Meta fallback
  const { sent, provider, error } = await sendDMWithProviders(commenterUsername, template.message);

  // Update stats
  if (sent) {
    store.stats.totalSent++;
    store.stats.commentTriggered++;
    trigger.totalFired++;
  } else {
    store.stats.failedSends++;
  }

  // Log activity
  logActivity({
    type: 'comment',
    username: commenterUsername,
    userId: commenterId,
    commentText,
    mediaId,
    mediaType,
    triggerKeyword: trigger.keyword,
    templateName: template.name,
    status: sent ? 'sent' : 'failed',
    provider,
    error
  });

  return { matched: true, sent, provider, error };
}

/**
 * Handle incoming DM events — matches triggers and auto-replies
 */
async function handleDMEvent(event) {
  const { senderId, senderUsername, messageText } = event;

  const trigger = findMatchingTrigger(messageText, 'dm');
  if (!trigger) {
    logActivity({
      type: 'dm',
      username: senderUsername,
      userId: senderId,
      commentText: messageText,
      status: 'no_trigger',
      message: 'No trigger matched'
    });
    return { matched: false };
  }

  const template = store.templates.find(t => t.id === trigger.templateId);
  if (!template) {
    console.warn(`[Automation] Trigger ${trigger.id} has no valid template`);
    store.stats.failedSends++;
    logActivity({
      type: 'dm',
      username: senderUsername,
      userId: senderId,
      commentText: messageText,
      triggerKeyword: trigger.keyword,
      status: 'failed',
      error: 'Orphaned trigger — template deleted'
    });
    return { matched: true, sent: false, error: 'Template not found' };
  }

  // Send DM — ManyChat primary, Meta fallback
  const { sent, provider, error } = await sendDMWithProviders(senderUsername, template.message);

  if (sent) {
    store.stats.totalSent++;
    store.stats.dmAutoReplied++;
    trigger.totalFired++;
  } else {
    store.stats.failedSends++;
  }

  logActivity({
    type: 'dm',
    username: senderUsername,
    userId: senderId,
    commentText: messageText,
    triggerKeyword: trigger.keyword,
    templateName: template.name,
    status: sent ? 'sent' : 'failed',
    provider,
    error
  });

  return { matched: true, sent, provider, error };
}

/**
 * Match comment/message text against active triggers
 */
function findMatchingTrigger(text, eventType) {
  if (!text) return null;
  const upperText = text.trim().toUpperCase();

  return store.triggers.find(t => {
    if (!t.active) return false;
    if (t.triggerOn !== eventType && t.triggerOn !== 'both') return false;

    const keyword = t.keyword.toUpperCase();
    if (t.matchType === 'exact') return upperText === keyword;
    if (t.matchType === 'contains') return upperText.includes(keyword);
    return false;
  }) || null;
}

/**
 * Add entry to activity log (keep last 500)
 */
function logActivity(data) {
  store.activity.unshift({
    id: uuidv4(),
    ...data,
    timestamp: new Date().toISOString()
  });
  if (store.activity.length > 500) store.activity.length = 500;
}

module.exports = { handleCommentEvent, handleDMEvent };
