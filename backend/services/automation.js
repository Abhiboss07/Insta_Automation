const { v4: uuidv4 } = require('uuid');
const meta = require('./meta');
const manychat = require('./manychat');
const store = require('../store');

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

  // Try sending via Meta first, fall back to ManyChat
  let sent = false;
  let provider = null;
  let error = null;

  try {
    await meta.sendDM(commenterId, template.message);
    sent = true;
    provider = 'meta';
  } catch (metaErr) {
    console.warn(`[Meta] DM failed for ${commenterUsername}: ${metaErr.message}. Trying ManyChat...`);
    try {
      const subscriber = await manychat.findSubscriber(commenterUsername);
      await manychat.sendMessage(subscriber.data.id, template.message);
      sent = true;
      provider = 'manychat';
    } catch (mcErr) {
      error = `Meta: ${metaErr.message} | ManyChat: ${mcErr.message}`;
      console.error(`[Automation] Both providers failed for ${commenterUsername}: ${error}`);
    }
  }

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
 * Now includes ManyChat fallback (previously missing)
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

  let sent = false;
  let provider = null;
  let error = null;

  // Try Meta first, then fall back to ManyChat
  try {
    await meta.sendDM(senderId, template.message);
    sent = true;
    provider = 'meta';
  } catch (metaErr) {
    console.warn(`[Meta] DM reply failed for ${senderUsername}: ${metaErr.message}. Trying ManyChat...`);
    try {
      const subscriber = await manychat.findSubscriber(senderUsername);
      await manychat.sendMessage(subscriber.data.id, template.message);
      sent = true;
      provider = 'manychat';
    } catch (mcErr) {
      error = `Meta: ${metaErr.message} | ManyChat: ${mcErr.message}`;
      console.error(`[Automation] Both providers failed for ${senderUsername}: ${error}`);
    }
  }

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
