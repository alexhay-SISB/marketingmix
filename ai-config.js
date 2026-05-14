/* ==========================================================================
   AI GRADING CONFIG — Claude API
   --------------------------------------------------------------------------
   IMPORTANT: the Claude API key is NO LONGER stored in this file.
   It is entered by the teacher on their dashboard and saved to that
   browser's localStorage only. This way:

     - The key is never in public code (so GitHub doesn't auto-revoke it)
     - Only the teacher's device has the key
     - Students never see it or need it

   The teacher's device is the one that calls Claude — student submissions
   are written to Firebase with a "pendingAi" flag, and the teacher's
   browser picks them up, grades them, and writes the grade back.
   ========================================================================== */

const aiConfig = {
  provider: "claude",
  claudeApiKey: "",  // intentionally empty — entered on the teacher dashboard
  claudeModel: "claude-haiku-4-5-20251001",
  fallbackToRules: true
};
