const express = require('express');
const router = express.Router();
const { getAiInsight, analyzeLeadSentiment } = require('../controllers/ai.controller');
const { protect } = require('../middleware/auth.middleware');

// AI Endpoints
router.get('/insight', protect, getAiInsight);
router.post('/analyze-lead', protect, analyzeLeadSentiment);

module.exports = router;
