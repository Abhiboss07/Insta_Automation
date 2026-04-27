// Simple in-memory store — swap with MongoDB/SQLite for production
const { v4: uuidv4 } = require('uuid');

const store = {
  // Message templates (start empty — user creates their own)
  templates: [],

  // Triggers — keyword → template mapping (start empty)
  triggers: [],

  // Activity log
  activity: [],

  // Stats (start from zero — real data only)
  stats: {
    totalSent: 0,
    commentTriggered: 0,
    dmAutoReplied: 0,
    failedSends: 0
  }
};

module.exports = store;
