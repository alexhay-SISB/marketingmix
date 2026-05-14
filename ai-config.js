/* ==========================================================================
   AI GRADING CONFIG — Claude API
   --------------------------------------------------------------------------
   Live AI-grading of student answers via Anthropic's Claude Haiku 4.5.
   ========================================================================== */

const aiConfig = {
  provider: "claude",
  claudeApiKey: "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",
  // Claude Haiku 4.5 — fastest + cheapest model. Perfect for short rubric grading.
  claudeModel: "claude-haiku-4-5-20251001",
  // If true and the API fails, silently fall back to smart rules
  fallbackToRules: true
};
