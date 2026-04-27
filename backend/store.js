// Simple in-memory store — swap with MongoDB/SQLite for production
const { v4: uuidv4 } = require('uuid');

const store = {
  // Message templates
  templates: [
    {
      id: uuidv4(),
      name: 'Product Link',
      message: 'Hey! 👋 Here\'s the link you asked for: https://yoursite.com/product\n\nLet me know if you have any questions!',
      type: 'text',
      createdAt: new Date().toISOString()
    },
    {
      id: uuidv4(),
      name: 'Free Guide PDF',
      message: 'Hey! Thanks for your interest 🙌 Here\'s your free guide: https://yoursite.com/free-guide\n\nEnjoy!',
      type: 'text',
      createdAt: new Date().toISOString()
    }
  ],

  // Triggers — keyword → template mapping
  triggers: [
    {
      id: uuidv4(),
      keyword: 'LINK',
      matchType: 'exact',       // 'exact' | 'contains'
      triggerOn: 'comment',     // 'comment' | 'dm' | 'both'
      templateId: null,         // will be set after templates init
      active: true,
      totalFired: 412,
      createdAt: new Date().toISOString()
    },
    {
      id: uuidv4(),
      keyword: 'FREE',
      matchType: 'exact',
      triggerOn: 'comment',
      templateId: null,
      active: true,
      totalFired: 198,
      createdAt: new Date().toISOString()
    }
  ],

  // Activity log
  activity: [],

  // Stats
  stats: {
    totalSent: 1284,
    commentTriggered: 847,
    dmAutoReplied: 312,
    failedSends: 3
  }
};

// Link default templates to triggers
store.triggers[0].templateId = store.templates[0].id;
store.triggers[1].templateId = store.templates[1].id;

module.exports = store;
