/* ==========================================================================
   MARKETING MASTERS — main game script (rebuild)
   --------------------------------------------------------------------------
   Sections:
      1. Firebase init
      2. AI grading (Claude) + smart-rules fallback scorer
      3. View routing + utility functions
      4. Sound (Web Audio synth) + toasts
      5. Landing flow
      6. Teacher flow (host, dashboard, stage progression, star override)
      7. Group flow (join + spin reveal + per-stage UI)
      8. Power-ups (hint, freeze, sabotage, example)
      9. Final boss + voting
     10. Print summary
   ========================================================================== */

(() => {
  "use strict";

  // ---------------------------------------------------------------------
  // 1. FIREBASE INIT
  // ---------------------------------------------------------------------
  let db = null;
  let firebaseReady = false;
  try {
    if (typeof firebaseConfig !== "undefined" && firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith("PASTE")) {
      firebase.initializeApp(firebaseConfig);
      db = firebase.database();
      firebaseReady = true;
    } else {
      console.warn("Firebase config not set — running in offline preview mode.");
    }
  } catch (err) {
    console.error("Firebase init failed:", err);
  }

  // -------- API key handling (LOCAL TO THIS BROWSER, never uploaded) --------
  // The key lives in localStorage only on the teacher's device. Students
  // don't need it because grading is done by the teacher's browser.
  const CLAUDE_KEY_STORAGE = "mm_claude_key";

  function getClaudeKey() {
    try {
      const k = localStorage.getItem(CLAUDE_KEY_STORAGE);
      if (k && k.startsWith("sk-ant-")) return k;
    } catch (e) {}
    // Backwards-compat fallback: if someone HAS put a key in the file, use it.
    if (typeof aiConfig !== "undefined" && aiConfig.claudeApiKey &&
        aiConfig.claudeApiKey.startsWith("sk-ant-")) return aiConfig.claudeApiKey;
    return "";
  }
  function setClaudeKey(k) {
    try { localStorage.setItem(CLAUDE_KEY_STORAGE, k); } catch (e) {}
  }
  function clearClaudeKey() {
    try { localStorage.removeItem(CLAUDE_KEY_STORAGE); } catch (e) {}
  }
  function aiReady() { return !!getClaudeKey(); }

  function roomRef(code) { return db.ref("rooms/" + code); }
  function groupRef(code, gid) { return db.ref(`rooms/${code}/groups/${gid}`); }

  function makeRoomCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let c = "";
    for (let i = 0; i < 4; i++) c += chars.charAt(Math.floor(Math.random() * chars.length));
    return c;
  }

  function uid() { return "g_" + Math.random().toString(36).slice(2, 10); }
  function getOrMakeGroupId(roomCode) {
    const key = "mm_gid_" + roomCode;
    let gid = sessionStorage.getItem(key);
    if (!gid) { gid = uid(); sessionStorage.setItem(key, gid); }
    return gid;
  }

  // ---------------------------------------------------------------------
  // 2. SCORING — strict rules + Claude AI
  // ---------------------------------------------------------------------

  // 2a. Check whether the justification mentions the product or a synonym.
  function mentionsProduct(text, productName) {
    if (!text || !productName) return false;
    const haystack = text.toLowerCase();
    const product = PRODUCTS.find(p => p.name === productName);
    const candidates = product ? [product.name, ...product.synonyms] : [productName];
    return candidates.some(c => {
      // Word-boundary-ish match (escape regex specials)
      const pattern = new RegExp("\\b" + c.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b");
      return pattern.test(haystack);
    });
  }

  // 2b. Strict rules scorer — used as fallback if AI grading fails or is off.
  // Strategy-match is no longer scored here: AI judges whether the strategy
  // is appropriate based on the justification.
  function scoreWithRules({ pricing, promotion, pricingProsCons, promotionProsCons, comparison,
                            stageObj, stageStartTime, freezeUsed, sabotaged, productName }) {
    const breakdown = {
      speed: 0, quality: 0,
      mentionedProduct: false,
      boxesFilled: 0,
      completeness: 0,
      stageWords: 0,
      reasoningWords: 0,
      depth: 0,
      total: 0,
      feedback: ""
    };

    // ---- Speed (max 30 pts) ----
    const effectiveElapsed = (Date.now() - stageStartTime)
                             - (freezeUsed ? 30000 : 0)
                             + (sabotaged ? 30000 : 0);
    const speedFraction = Math.max(0, 1 - effectiveElapsed / stageObj.durationMs);
    breakdown.speed = Math.round(30 * speedFraction);

    // ---- Box completeness (max 30 pts) ----
    const boxes = [pricingProsCons || "", promotionProsCons || "", comparison || ""];
    breakdown.boxesFilled = boxes.filter(b => b.trim().length >= 20).length;
    breakdown.completeness = breakdown.boxesFilled * 10;

    // Combined text for product/keyword analysis
    const combined = boxes.join(" ").trim();

    // ---- Quality (gated by product mention) ----
    const mentioned = mentionsProduct(combined, productName);
    breakdown.mentionedProduct = mentioned;
    if (!mentioned) {
      breakdown.feedback = "You didn't mention the product anywhere. Reference \"" + productName + "\" (or a synonym) in at least one of the three boxes to score quality points.";
      breakdown.total = breakdown.speed + breakdown.completeness;
      return breakdown;
    }

    const lower = combined.toLowerCase();

    // Stage-specific words (max 40)
    const stageWords = (STAGE_KEYWORDS[stageObj.key] || []).filter(w => lower.includes(w));
    breakdown.stageWords = Math.min(40, stageWords.length * 12);

    // Reasoning words (max 30)
    const reasonHits = REASONING_WORDS.filter(w => lower.includes(w));
    breakdown.reasoningWords = Math.min(30, reasonHits.length * 12);

    // Depth (max 40)
    if (combined.length >= 80 && reasonHits.length >= 1) {
      let depth = 0;
      if (combined.length >= 80)  depth += 10;
      if (combined.length >= 200) depth += 10;
      if (combined.length >= 400) depth += 10;
      if (breakdown.boxesFilled >= 3) depth += 10;
      breakdown.depth = depth;
    }

    breakdown.quality = breakdown.stageWords + breakdown.reasoningWords + breakdown.depth + breakdown.completeness;
    breakdown.total = breakdown.speed + breakdown.quality;

    // Feedback
    const tips = [];
    if (breakdown.boxesFilled < 3)     tips.push("fill in all 3 boxes (one is missing or too short)");
    if (breakdown.stageWords < 24)     tips.push("use more " + stageObj.name.toLowerCase() + "-stage vocabulary");
    if (breakdown.reasoningWords < 24) tips.push("use linking words like \"because\", \"therefore\", \"this means\"");
    if (breakdown.depth < 25)          tips.push("develop your answers further (more specifics, more sentences)");
    if (tips.length === 0) breakdown.feedback = "Solid IGCSE-style answer.";
    else                   breakdown.feedback = "Good work — to push higher, " + tips.join("; ") + ".";

    return breakdown;
  }

  // 2c. Extension stage scorer (covers BOTH advantages and disadvantages)
  function scoreExtensionWithRules({ strategy, advantages, disadvantages, stageObj, stageStartTime, freezeUsed, sabotaged, productName }) {
    const breakdown = {
      speed: 0, quality: 0, match: 0,
      mentionedProduct: false,
      bothFilled: false,
      stageWords: 0,
      reasoningWords: 0,
      depth: 0,
      total: 0,
      feedback: ""
    };

    const effectiveElapsed = (Date.now() - stageStartTime)
                             - (freezeUsed ? 30000 : 0)
                             + (sabotaged ? 30000 : 0);
    breakdown.speed = Math.round(30 * Math.max(0, 1 - effectiveElapsed / stageObj.durationMs));

    // Both must be filled with at least basic content for full quality scoring
    breakdown.bothFilled = (advantages.length >= 20) && (disadvantages.length >= 20);

    // Combine for keyword/depth analysis
    const combined = (advantages + " " + disadvantages).trim();
    const mentioned = mentionsProduct(combined, productName);
    breakdown.mentionedProduct = mentioned;
    if (!mentioned) {
      breakdown.feedback = "Mention the product (e.g. \"" + productName + "\") in your advantages or disadvantages to earn quality points.";
      breakdown.total = breakdown.speed;
      return breakdown;
    }

    const lower = combined.toLowerCase();
    const stageWords = (STAGE_KEYWORDS.extension || []).filter(w => lower.includes(w));
    breakdown.stageWords = Math.min(40, stageWords.length * 12);

    const reasonHits = REASONING_WORDS.filter(w => lower.includes(w));
    breakdown.reasoningWords = Math.min(30, reasonHits.length * 12);

    if (combined.length >= 60 && reasonHits.length >= 1) {
      let depth = 0;
      if (combined.length >= 80)  depth += 10;
      if (combined.length >= 160) depth += 10;
      if (combined.length >= 280) depth += 10;
      if (breakdown.bothFilled)   depth += 10;  // bonus for actually filling both
      breakdown.depth = depth;
    }

    breakdown.quality = breakdown.stageWords + breakdown.reasoningWords + breakdown.depth;
    breakdown.match = 0; // extension doesn't use stage-suggested-list match
    breakdown.total = breakdown.speed + breakdown.quality;

    if (!breakdown.bothFilled) {
      breakdown.feedback = "Fill in BOTH advantages and disadvantages — IGCSE rewards balanced thinking.";
    } else {
      breakdown.feedback = breakdown.depth >= 30 && breakdown.reasoningWords >= 24
        ? "Strong, balanced extension reasoning."
        : "Develop both sides further with linked reasoning (because / therefore / this means).";
    }

    return breakdown;
  }

  // 2d. Claude AI grading (Haiku 4.5 — fast, cheap, accurate for short rubric grading)
  // Training material from training.js is injected so Claude grades to YOUR rubric.
  function buildTrainingBlock(pricingValue) {
    if (typeof PRICING_THEORY === "undefined") return "";
    const theoryLines = [];
    // Highlight the chosen pricing strategy first
    if (pricingValue && PRICING_THEORY[pricingValue]) {
      theoryLines.push("THEORY FOR THE STUDENT'S CHOSEN PRICING STRATEGY:");
      theoryLines.push(PRICING_THEORY[pricingValue]);
      theoryLines.push("");
    }
    theoryLines.push("FULL PRICING THEORY REFERENCE:");
    Object.values(PRICING_THEORY).forEach(t => theoryLines.push("- " + t));
    return theoryLines.join("\n");
  }

  function buildExemplarsBlock() {
    if (typeof MODEL_ANSWERS === "undefined" || !MODEL_ANSWERS.length) return "";
    const lines = ["TEACHER'S SAMPLE ANSWERS (use as calibration reference points alongside your own IGCSE judgement — " +
                   "an answer of similar quality to a HIGH sample should land around 4–5; similar to a LOW sample around 1–2):"];
    MODEL_ANSWERS.forEach(ex => {
      lines.push("");
      lines.push(`### Sample: ${ex.title} | Pricing: ${ex.pricing} | Promotion: ${ex.promotion}`);
      lines.push(`HIGH-BAND VERSION:\n${ex.high}`);
      lines.push(`LOW-BAND VERSION:\n${ex.low}`);
    });
    return lines.join("\n");
  }

  function buildPrinciplesBlock() {
    if (typeof GRADING_PRINCIPLES === "undefined") return "";
    return "TEACHER'S NON-NEGOTIABLE PRINCIPLES (apply alongside the standard IGCSE Business mark scheme):\n" +
           GRADING_PRINCIPLES.map(p => "- " + p).join("\n");
  }

  async function gradeWithClaude({ stageObj, pricing, promotion, pricingProsCons, promotionProsCons, comparison,
                                    productName, isExtension, strategy, advantages, disadvantages }) {
    const key = getClaudeKey();
    if (!key) return null;

    const principlesBlock = buildPrinciplesBlock();
    const exemplarsBlock  = buildExemplarsBlock();

    let prompt;
    if (isExtension) {
      const strategyLabel = labelFor(EXTENSION_STRATEGIES, strategy) || strategy;
      prompt = `You are an experienced IGCSE Business Studies examiner. Mark the student's answer below using the standard IGCSE Business mark scheme as your primary frame of reference. The class teacher has supplied additional context — apply your own IGCSE expertise as the foundation, then layer the teacher's principles on top to calibrate to their classroom standards.

${principlesBlock}

The student is playing a Product Life Cycle game and has reached the EXTENSION stage.

PRODUCT: ${productName}
STAGE: EXTENSION (sales are starting to slow; goal is to extend the lifecycle before the product declines)
STUDENT'S CHOSEN EXTENSION STRATEGY: ${strategyLabel}
STUDENT'S ADVANTAGES OF THIS STRATEGY: """${advantages}"""
STUDENT'S DISADVANTAGES OF THIS STRATEGY: """${disadvantages || "(blank)"}"""

Mark on a 0–5 IGCSE scale. IGCSE specifically rewards BALANCED reasoning — the student should give credible advantages AND credible disadvantages, both tied to the product. Use this rubric:
- 5 (excellent): explicitly references the product in both sides; gives 2+ specific advantages and 2+ specific disadvantages; correct business vocabulary; linked reasoning ("because", "therefore", "this means", "leads to") on both sides; consequences are realistic.
- 4 (good): references product; 1–2 advantages AND 1–2 disadvantages with some reasoning; mostly correct vocabulary.
- 3 (developed): product reference; one solid advantage and one solid disadvantage with basic reasoning.
- 2 (basic): partial product reference; one side weak or empty; little reasoning.
- 1 (limited): no real product reference; very weak or one-sided.
- 0 (off-task): blank, gibberish, or doesn't address the strategy.

Penalise heavily if either advantages or disadvantages is blank or trivial.

Respond ONLY with a JSON object, no markdown, no extra text:
{"score": <0-5>, "feedback": "<two short sentences of specific, kind feedback — what they did well, plus one concrete improvement>"}`;
    } else {
      const pricingLabel = labelFor(PRICING_STRATEGIES, pricing) || pricing;
      const promotionLabel = labelFor(PROMOTION_TYPES, promotion) || promotion;
      const theoryBlock = buildTrainingBlock(pricing);

      prompt = `You are an experienced IGCSE Business Studies examiner. Mark the student's answer below using the standard IGCSE Business mark scheme as your primary frame of reference — your own knowledge of pricing strategies, promotion methods, the Product Life Cycle and what counts as well-developed reasoning at IGCSE.

The class teacher has supplied additional context to calibrate the marking to their specific classroom standards. TREAT THIS CONTEXT AS A LAYER ON TOP OF (NOT A REPLACEMENT FOR) STANDARD IGCSE EXAMINATION STANDARDS. Where the teacher's notes give a stricter or more specific view than the generic mark scheme, follow the teacher's view.

${principlesBlock}

REFERENCE CONTEXT FROM THE TEACHER:

${theoryBlock}

${exemplarsBlock}

NOW GRADE THE STUDENT IN FRONT OF YOU, drawing on BOTH your standard IGCSE marking expertise AND the teacher's calibration above.

The student is playing a Product Life Cycle game.

PRODUCT: ${productName}
STAGE: ${stageObj.name} (${stageObj.description || ""})
STUDENT'S CHOSEN PRICING STRATEGY: ${pricingLabel}
STUDENT'S CHOSEN PROMOTION: ${promotionLabel}

The student wrote three short answer boxes:

BOX 1 — Advantage of the PRICING choice at this stage (what's good about it for the product):
"""${pricingProsCons || "(blank)"}"""

BOX 2 — Advantage of the PROMOTION choice at this stage (what's good about it for the product):
"""${promotionProsCons || "(blank)"}"""

BOX 3 — JUSTIFICATION. Box 3 must do TWO things:
  (a) explain WHY the pricing + promotion methods are beneficial for the product at this stage, AND
  (b) explain WHY they are BETTER than alternative methods the student could have chosen.
"""${comparison || "(blank)"}"""

IMPORTANT GRADING NOTES:
- The strategies the student picked are valid as long as the JUSTIFICATION supports those choices. Do NOT penalise unusual strategy choices if the student can defend them well.
- Box 3 SHOULD reach a higher band only when BOTH benefit AND comparison-to-alternatives are present. A box 3 that only explains benefit (without naming or rejecting an alternative) caps at band 3 for the comparison part.
- Look for comparison language in box 3 such as "better than", "rather than", "compared to", "whereas", "alternative", "would not work because…", or naming a specific other strategy/promotion.

Mark the WHOLE submission on a 0–5 IGCSE scale using this rubric:
- 5 (excellent): all three boxes are filled with substance; explicitly references the product by name or synonym in at least one box; uses correct business vocabulary specific to the ${stageObj.name} stage; the advantages given are concrete and well-explained with linked reasoning ("because", "therefore", "this means", "leads to"); the justification covers BOTH why the methods are beneficial AND why they are better than at least one named alternative.
- 4 (good): all three boxes filled, references product, decent vocabulary, some linked reasoning. Box 3 explains benefit clearly AND attempts a comparison (even if the alternative isn't fully developed).
- 3 (developed): all three boxes filled with basic content, product referenced, simple reasoning. Box 3 explains benefit but no real comparison to an alternative.
- 2 (basic): one or two boxes weak/short; partial product reference; little reasoning.
- 1 (limited): boxes mostly blank or off-topic; no real product reference.
- 0 (off-task): blank/gibberish/doesn't address the question.

Penalise if any box is blank or trivial.

Respond ONLY with a JSON object, no markdown, no extra text:
{"score": <0-5>, "feedback": "<two short sentences of specific, kind feedback — what they did well, plus one concrete improvement>"}`;
    }

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify({
          model: aiConfig.claudeModel || "claude-haiku-4-5-20251001",
          max_tokens: 400,
          messages: [{ role: "user", content: prompt }]
        })
      });
      if (!res.ok) {
        const errTxt = await res.text();
        console.warn("Claude API error:", res.status, errTxt);
        return null;
      }
      const data = await res.json();
      let text = data?.content?.[0]?.text;
      if (!text) return null;

      // Strip code fences if Claude wrapped the JSON
      text = text.trim();
      if (text.startsWith("```")) {
        text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
      }
      // Find first { ... } block in case Claude added preamble
      const m = text.match(/\{[\s\S]*\}/);
      if (m) text = m[0];

      const parsed = JSON.parse(text);
      if (typeof parsed.score !== "number") return null;
      const score = Math.max(0, Math.min(5, Math.round(parsed.score)));
      // Map 0-5 → quality points (max 170, same scale as star override)
      const aiQualityMap = [0, 20, 60, 100, 140, 170];
      return {
        aiScore: score,
        aiQuality: aiQualityMap[score],
        aiFeedback: String(parsed.feedback || "").slice(0, 500)
      };
    } catch (err) {
      console.warn("Claude grading exception:", err);
      return null;
    }
  }

  // ---------------------------------------------------------------------
  // 3. VIEW ROUTING + utilities
  // ---------------------------------------------------------------------
  function showView(name) {
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    document.getElementById("view-" + name).classList.add("active");
  }
  function showGroupState(state) {
    ["spin", "waiting", "playing", "finalboss", "voting", "done"].forEach(s => {
      document.getElementById("group-" + s).classList.toggle("hidden", s !== state);
    });
  }
  function formatTime(ms) {
    const total = Math.ceil(ms / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }
  function labelFor(list, value) {
    if (!value) return "";
    const item = list.find(x => x.value === value);
    return item ? item.label : value;
  }
  function escapeHtml(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ---------------------------------------------------------------------
  // 4. SOUND + TOASTS
  // ---------------------------------------------------------------------
  let audioCtx = null;
  let soundEnabled = true;
  function ensureAudio() {
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { audioCtx = null; }
    }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
  }
  function beep(freq, durMs, type = "sine", volume = 0.15) {
    if (!soundEnabled || !audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + durMs / 1000);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + durMs / 1000);
  }
  function playSequence(notes) {
    if (!soundEnabled || !audioCtx) return;
    let t = 0;
    notes.forEach(([freq, dur, type, vol]) => {
      setTimeout(() => beep(freq, dur, type || "square", vol || 0.12), t);
      t += dur;
    });
  }
  const sfx = {
    click:    () => beep(880, 60, "square", 0.08),
    submit:   () => playSequence([[523, 100], [659, 100], [784, 150]]),
    correct:  () => playSequence([[523, 80], [659, 80], [784, 80], [1046, 200]]),
    fanfare:  () => playSequence([[523, 100], [659, 100], [784, 100], [1046, 100], [1318, 300, "sawtooth", 0.1]]),
    tick:     () => beep(1200, 40, "square", 0.05),
    countdown:() => beep(440, 80, "sine", 0.1),
    bonus:    () => playSequence([[1318, 60], [1568, 60], [2093, 120]]),
    sabotage: () => playSequence([[200, 100, "sawtooth", 0.18], [150, 200, "sawtooth", 0.18], [100, 300, "sawtooth", 0.18]]),
    freeze:   () => playSequence([[2093, 60, "sine"], [1568, 60, "sine"], [1318, 200, "sine"]]),
    join:     () => beep(659, 100, "sine", 0.1),
    spin:     () => beep(880, 40, "square", 0.06),
    boss:     () => playSequence([[200, 200, "sawtooth", 0.1], [300, 200, "sawtooth", 0.1], [440, 400, "sawtooth", 0.12]])
  };
  function toggleSound() {
    soundEnabled = !soundEnabled;
    const btn = document.getElementById("btn-sound-toggle");
    if (btn) btn.textContent = soundEnabled ? "🔊" : "🔇";
  }
  function toast(msg, kind = "info") {
    const wrap = document.getElementById("toast-container");
    const t = document.createElement("div");
    t.className = "toast " + kind;
    t.textContent = msg;
    wrap.appendChild(t);
    setTimeout(() => t.remove(), 4500);
  }

  // ---------------------------------------------------------------------
  // 5. LANDING
  // ---------------------------------------------------------------------
  document.getElementById("btn-host").addEventListener("click", () => {
    ensureAudio(); sfx.click();
    if (!firebaseReady) { alert("Firebase isn't configured. Open firebase-config.js."); return; }
    startHosting();
    // Show / hide the key entry bar depending on whether the teacher has saved a key
    refreshKeyEntryBar();
  });

  // ---------- Claude API key entry handlers ----------
  function refreshKeyEntryBar() {
    const bar = document.getElementById("key-entry-bar");
    const input = document.getElementById("input-claude-key");
    const status = document.getElementById("key-entry-status");
    const hasKey = !!getClaudeKey();
    if (bar) bar.classList.remove("hidden");
    if (input) input.value = hasKey ? "•••••••••••••••••••••••••" : "";
    if (status) {
      status.className = "key-entry-status " + (hasKey ? "success" : "");
      status.textContent = hasKey
        ? "✓ Key saved in this browser. AI grading is on."
        : "No key saved — AI grading is off. Paste your sk-ant-… key and click SAVE.";
    }
  }
  const saveBtn = document.getElementById("btn-save-claude-key");
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      sfx.click();
      const input = document.getElementById("input-claude-key");
      const status = document.getElementById("key-entry-status");
      const v = (input.value || "").trim();
      if (!v.startsWith("sk-ant-")) {
        status.className = "key-entry-status error";
        status.textContent = "That doesn't look like a Claude key (should start with sk-ant-).";
        return;
      }
      setClaudeKey(v);
      refreshKeyEntryBar();
      // If a room is already hosted, kick the queue
      if (teacherRoomCode) {
        roomRef(teacherRoomCode).once("value").then(snap => processGradingQueue(snap.val()));
      }
    });
  }
  const forgetBtn = document.getElementById("btn-clear-claude-key");
  if (forgetBtn) {
    forgetBtn.addEventListener("click", () => {
      sfx.click();
      if (!confirm("Forget the Claude key saved in this browser?")) return;
      clearClaudeKey();
      refreshKeyEntryBar();
    });
  }
  document.getElementById("btn-join").addEventListener("click", () => {
    ensureAudio(); sfx.click();
    document.getElementById("join-form").classList.toggle("hidden");
  });
  document.getElementById("btn-join-room").addEventListener("click", () => {
    ensureAudio(); sfx.click();
    if (!firebaseReady) { alert("Firebase isn't configured. Ask your teacher."); return; }
    const code = (document.getElementById("input-room-code").value || "").trim().toUpperCase();
    const name = (document.getElementById("input-group-name").value || "").trim();
    if (!code || code.length !== 4) return showJoinError("Room code must be 4 letters.");
    if (!name) return showJoinError("Enter a group name.");
    joinRoom(code, name);
  });
  document.getElementById("input-room-code").addEventListener("input", e => { e.target.value = e.target.value.toUpperCase(); });
  function showJoinError(msg) {
    const el = document.getElementById("join-error");
    el.textContent = msg; el.classList.remove("hidden");
  }

  // ---------------------------------------------------------------------
  // 6. TEACHER
  // ---------------------------------------------------------------------
  let teacherRoomCode = null;
  let teacherTimerInterval = null;
  let teacherFinalRoomData = null;

  async function startHosting() {
    let code, exists = true, attempts = 0;
    while (exists && attempts < 10) {
      code = makeRoomCode();
      const snap = await roomRef(code).once("value");
      exists = snap.exists();
      attempts++;
    }
    teacherRoomCode = code;
    const initialState = {
      state: "waiting",
      stage: null,
      stageIndex: -1,
      stageStartTime: null,
      createdAt: firebase.database.ServerValue.TIMESTAMP,
      groups: {},
      productsLeft: shuffle(PRODUCTS.map(p => p.name))
    };
    await roomRef(code).set(initialState);
    roomRef(code).on("value", snap => {
      const room = snap.val();
      renderTeacher(room);
      processGradingQueue(room);
    });
    document.getElementById("teacher-room-code").textContent = code;
    showView("teacher");
    sfx.fanfare();
    toast(`Room ${code} created. Share the code with students!`, "success");
  }

  // ===== Teacher-side AI grading queue =====
  // Watches the room for answers with pendingAi=true and grades them
  // sequentially using the Claude API key stored in this teacher's
  // localStorage. Students never call Claude themselves.
  let isGrading = false;

  async function processGradingQueue(room) {
    if (!room || !teacherRoomCode) return;
    if (isGrading) return;          // already working through the queue
    if (!aiReady()) {
      updateGradingQueueBar(0, "no-key");
      return;
    }

    // Find all answers across all groups that need grading
    const pending = [];
    Object.entries(room.groups || {}).forEach(([gid, g]) => {
      Object.entries(g.answers || {}).forEach(([stageKey, ans]) => {
        if (ans && ans.pendingAi && (ans.aiAttempts || 0) < 3) {
          pending.push({ gid, stageKey, ans, group: g });
        }
      });
    });

    updateGradingQueueBar(pending.length);
    if (!pending.length) return;

    isGrading = true;
    try {
      // Grade one at a time so we don't slam the API
      for (const item of pending) {
        // Refresh snapshot first to avoid clobbering teacher-star overrides
        const fresh = await groupRef(teacherRoomCode, item.gid).once("value");
        const g = fresh.val() || item.group;
        const ans = (g.answers || {})[item.stageKey];
        if (!ans || !ans.pendingAi) continue;

        const stageObj = STAGES.find(s => s.key === item.stageKey);
        if (!stageObj) continue;

        // Mark attempt count
        const attempts = (ans.aiAttempts || 0) + 1;
        await groupRef(teacherRoomCode, item.gid).update({
          [`answers/${item.stageKey}/aiAttempts`]: attempts
        });

        let aiResult;
        if (stageObj.isExtension) {
          aiResult = await gradeWithClaude({
            stageObj, isExtension: true,
            strategy: ans.strategy, advantages: ans.advantages, disadvantages: ans.disadvantages,
            productName: g.product
          });
        } else {
          aiResult = await gradeWithClaude({
            stageObj, isExtension: false,
            pricing: ans.pricing, promotion: ans.promotion,
            pricingProsCons: ans.pricingProsCons,
            promotionProsCons: ans.promotionProsCons,
            comparison: ans.comparison,
            productName: g.product
          });
        }

        if (!aiResult) {
          // Failed — leave for retry (up to 3 attempts), bail out of the loop
          // so we don't burn through other answers on a broken key
          break;
        }

        // Apply the grade. AI quality replaces rules quality.
        const breakdown = { ...(ans.scoreBreakdown || {}) };
        const prevQuality = breakdown.quality || 0;
        const delta = aiResult.aiQuality - prevQuality;
        breakdown.qualityOverridden = aiResult.aiQuality;
        breakdown.total = (breakdown.total || 0) + delta;

        await groupRef(teacherRoomCode, item.gid).update({
          score: (g.score || 0) + delta,
          [`answers/${item.stageKey}/scoreBreakdown`]: breakdown,
          [`answers/${item.stageKey}/aiScore`]: aiResult.aiScore,
          [`answers/${item.stageKey}/aiQuality`]: aiResult.aiQuality,
          [`answers/${item.stageKey}/aiFeedback`]: aiResult.aiFeedback,
          [`answers/${item.stageKey}/pendingAi`]: null
        });
      }
    } finally {
      isGrading = false;
    }
  }

  function updateGradingQueueBar(pendingCount, mode) {
    const bar = document.getElementById("grading-queue-bar");
    if (!bar) return;
    if (mode === "no-key") {
      bar.classList.remove("hidden");
      bar.classList.add("warn");
      bar.innerHTML = "⚠️ AI grading paused — paste a Claude API key in the box above to start grading.";
      return;
    }
    bar.classList.remove("warn");
    if (pendingCount > 0) {
      bar.classList.remove("hidden");
      bar.innerHTML = `🤖 AI grading queue: <span id="grading-queue-count">${pendingCount}</span> pending`;
    } else {
      bar.classList.add("hidden");
    }
  }

  function renderTeacher(room) {
    if (!room) return;
    const groups = room.groups || {};
    const groupArr = Object.entries(groups).map(([id, g]) => ({ id, ...g }));
    groupArr.sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));

    // Group list
    const list = document.getElementById("groups-list");
    list.innerHTML = "";
    document.getElementById("group-count").textContent = groupArr.length;
    const stageKey = room.stage;
    groupArr.forEach(g => {
      const li = document.createElement("li");
      const submitted = stageKey && g.answers && g.answers[stageKey];
      if (submitted) li.classList.add("submitted");
      li.innerHTML = `<div><strong>${escapeHtml(g.name)}</strong>
        <span class="product">${escapeHtml(g.product || "—")}</span></div>
        <span class="status-dot">${submitted ? "✅" : "⏳"}</span>`;
      li.title = "Click to see all answers from this group";
      li.addEventListener("click", () => openTeamDetail(g.id));
      list.appendChild(li);
    });

    // Leaderboard
    const lb = document.getElementById("leaderboard");
    lb.innerHTML = "";
    [...groupArr]
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .forEach(g => {
        const li = document.createElement("li");
        li.innerHTML = `<span class="lb-name">${escapeHtml(g.name)}</span><span class="lb-score">${g.score || 0}</span>`;
        lb.appendChild(li);
      });

    // Stage controls
    const startBtn = document.getElementById("btn-start-game");
    const nextBtn  = document.getElementById("btn-next-stage");
    const endBtn   = document.getElementById("btn-end-game");
    const stageNameEl = document.getElementById("teacher-stage-name");

    if (room.state === "waiting") {
      stageNameEl.textContent = `Waiting… ${groupArr.length} group(s) joined`;
      document.getElementById("teacher-timer").textContent = "—:—";
      startBtn.classList.toggle("hidden", groupArr.length === 0);
      nextBtn.classList.add("hidden");
      endBtn.classList.add("hidden");
      stopTeacherTimer();
    } else if (room.state === "playing") {
      const stageObj = STAGES[room.stageIndex];
      stageNameEl.textContent = stageObj.name;
      startBtn.classList.add("hidden");
      nextBtn.classList.remove("hidden");
      nextBtn.textContent = computeNextLabel(room);
      endBtn.classList.add("hidden");
      startTeacherTimer(room);
      renderTeacherAnswers(room);
    } else if (room.state === "finalboss") {
      stageNameEl.textContent = "FINAL BOSS";
      startBtn.classList.add("hidden");
      nextBtn.classList.add("hidden");
      endBtn.classList.remove("hidden");
      stopTeacherTimer();
      document.getElementById("teacher-timer").textContent = "👑";
      handleFinalBossTeacher(room);
    } else if (room.state === "voting") {
      stageNameEl.textContent = "CLASS VOTE";
      handleVotingTeacher(room);
    } else if (room.state === "finished") {
      stageNameEl.textContent = "GAME OVER";
      stopTeacherTimer();
      document.getElementById("teacher-timer").textContent = "🎉";
      document.getElementById("end-overlay").classList.remove("hidden");
      renderEndScreen(room);
    }
  }

  function computeNextLabel(room) {
    const idx = room.stageIndex;
    if (idx < STAGES.length - 1) return `NEXT: ${STAGES[idx + 1].name} →`;
    return "→ FINAL BOSS 👑";
  }

  function startTeacherTimer(room) {
    stopTeacherTimer();
    const stageObj = STAGES[room.stageIndex];
    if (!stageObj) return;
    const dur = stageObj.durationMs;
    const start = room.stageStartTime;
    const el = document.getElementById("teacher-timer");
    function tick() {
      const remaining = Math.max(0, start + dur - Date.now());
      el.textContent = formatTime(remaining);
      el.classList.toggle("warning", remaining < 30000 && remaining > 0);
    }
    tick();
    teacherTimerInterval = setInterval(tick, 250);
  }
  function stopTeacherTimer() {
    if (teacherTimerInterval) { clearInterval(teacherTimerInterval); teacherTimerInterval = null; }
  }

  function renderTeacherAnswers(room) {
    const wrap = document.getElementById("teacher-answers");
    const stageKey = room.stage;
    if (!stageKey) { wrap.innerHTML = ""; return; }
    wrap.innerHTML = "";
    Object.entries(room.groups || {}).forEach(([gid, g]) => {
      const ans = g.answers && g.answers[stageKey];
      if (!ans) return;
      const tile = buildAnswerTile(gid, g, ans, stageKey);
      wrap.appendChild(tile);
    });
  }

  function buildAnswerTile(gid, group, ans, stageKey) {
    const stageObj = STAGES.find(s => s.key === stageKey);
    const score = ans.scoreBreakdown ? ans.scoreBreakdown.total : 0;
    const cls = score >= 200 ? "scored-good" : score >= 110 ? "scored-mid" : "scored-low";

    const tile = document.createElement("div");
    tile.className = "answer-tile " + cls;

    const isExt = stageObj && stageObj.isExtension;
    let body;
    if (isExt) {
      body = `
        <div class="a-row"><span class="a-key">Strategy:</span> <span class="a-val">${escapeHtml(labelFor(EXTENSION_STRATEGIES, ans.strategy))}</span></div>
        <div class="a-row"><span class="a-key">+ Adv:</span></div>
        <div class="a-just">${escapeHtml(ans.advantages || "")}</div>
        <div class="a-row" style="margin-top:6px;"><span class="a-key">− Dis:</span></div>
        <div class="a-just">${escapeHtml(ans.disadvantages || "(none)")}</div>
      `;
    } else {
      body = `
        <div class="a-row"><span class="a-key">Price:</span> <span class="a-val">${escapeHtml(labelFor(PRICING_STRATEGIES, ans.pricing))}</span></div>
        <div class="a-row"><span class="a-key">Promo:</span> <span class="a-val">${escapeHtml(labelFor(PROMOTION_TYPES, ans.promotion))}</span></div>
        <div class="a-row" style="margin-top:6px;"><span class="a-key">Pricing advantage:</span></div>
        <div class="a-just">${escapeHtml(ans.pricingProsCons || ans.justification || "—")}</div>
        <div class="a-row" style="margin-top:6px;"><span class="a-key">Promo advantage:</span></div>
        <div class="a-just">${escapeHtml(ans.promotionProsCons || "—")}</div>
        <div class="a-row" style="margin-top:6px;"><span class="a-key">Justification:</span></div>
        <div class="a-just">${escapeHtml(ans.comparison || "—")}</div>
      `;
    }

    const aiFeedbackHtml = ans.aiFeedback
      ? `<div class="a-ai-feedback"><strong>AI mark: ${ans.aiScore}/5</strong> — ${escapeHtml(ans.aiFeedback)}</div>` : "";

    const teacherStars = ans.teacherStars || 0;
    const starsHtml = `<div class="star-rating">
      <span class="star-label">Teacher rating:</span>
      ${[1,2,3,4,5].map(n => `<button class="star-btn ${teacherStars >= n ? "active" : ""}" data-stars="${n}" data-gid="${gid}" data-stage="${stageKey}">★</button>`).join("")}
    </div>`;

    tile.innerHTML = `
      <h4>${escapeHtml(group.name)} <span>+${score}</span></h4>
      <div class="product-tag">${escapeHtml(group.product || "")}</div>
      ${body}
      ${aiFeedbackHtml}
      ${starsHtml}
    `;

    // Hook up star buttons
    tile.querySelectorAll(".star-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        sfx.click();
        const stars = +btn.dataset.stars;
        const targetGid = btn.dataset.gid;
        const stage = btn.dataset.stage;
        await applyTeacherStars(targetGid, stage, stars);
      });
    });

    return tile;
  }

  // Map stars → quality bonus added to (overriding) the score.
  // 1=20, 2=50, 3=90, 4=130, 5=170  (same scale as AI quality map)
  const STAR_QUALITY = [0, 20, 50, 90, 130, 170];

  async function applyTeacherStars(gid, stageKey, stars) {
    const roomSnap = await roomRef(teacherRoomCode).once("value");
    const room = roomSnap.val();
    const g = (room.groups || {})[gid];
    if (!g || !g.answers || !g.answers[stageKey]) return;
    const ans = g.answers[stageKey];
    const previousStars = ans.teacherStars || 0;
    const previousQuality = previousStars > 0 ? STAR_QUALITY[previousStars] : (ans.aiQuality ?? ans.scoreBreakdown.quality);
    const newQuality = STAR_QUALITY[stars];
    const delta = newQuality - previousQuality;
    const newTotal = (ans.scoreBreakdown.total || 0) + delta;
    const newGroupScore = (g.score || 0) + delta;

    await groupRef(teacherRoomCode, gid).update({
      score: newGroupScore,
      [`answers/${stageKey}/teacherStars`]: stars,
      [`answers/${stageKey}/scoreBreakdown/total`]: newTotal,
      [`answers/${stageKey}/scoreBreakdown/qualityOverridden`]: newQuality
    });
    toast(`Set ${g.name}: ${stars}★ (${delta >= 0 ? "+" : ""}${delta} pts)`, "success");
  }

  document.getElementById("btn-start-game").addEventListener("click", async () => {
    sfx.fanfare();
    await advanceToStage(0);
  });
  document.getElementById("btn-next-stage").addEventListener("click", async () => {
    sfx.click();
    const snap = await roomRef(teacherRoomCode).once("value");
    const room = snap.val();
    const idx = (room.stageIndex ?? -1) + 1;
    if (idx < STAGES.length) await advanceToStage(idx);
    else await advanceToFinalBoss();
  });
  async function advanceToStage(idx) {
    const stage = STAGES[idx];
    await roomRef(teacherRoomCode).update({
      state: "playing",
      stage: stage.key,
      stageIndex: idx,
      stageStartTime: Date.now()
    });
    toast(`Stage ${idx + 1}/${STAGES.length}: ${stage.name}`, "fanfare");
    sfx.bonus();
  }
  async function advanceToFinalBoss() {
    const snap = await roomRef(teacherRoomCode).once("value");
    const room = snap.val();
    const groups = Object.entries(room.groups || {}).map(([id, g]) => ({ id, ...g }));
    groups.sort((a, b) => (b.score || 0) - (a.score || 0));
    const finalists = groups.slice(0, Math.min(3, groups.length)).map(g => g.id);
    if (finalists.length < 2) {
      await roomRef(teacherRoomCode).update({ state: "finished" });
      return;
    }
    const finalProduct = FINAL_BOSS_PRODUCTS[Math.floor(Math.random() * FINAL_BOSS_PRODUCTS.length)];
    await roomRef(teacherRoomCode).update({
      state: "finalboss",
      stage: "finalboss",
      finalProduct, finalists,
      stageStartTime: Date.now(),
      finalPitches: {}, finalVotes: {}
    });
    sfx.boss();
    toast("👑 FINAL BOSS round begins!", "fanfare");
  }

  function handleFinalBossTeacher(room) {
    document.getElementById("final-boss-overlay").classList.remove("hidden");
    document.getElementById("final-boss-product").textContent = room.finalProduct || "—";
    const wrap = document.getElementById("final-boss-pitches");
    const finalists = room.finalists || [];
    const pitches = room.finalPitches || {};
    wrap.innerHTML = "";
    finalists.forEach(fid => {
      const g = (room.groups || {})[fid];
      if (!g) return;
      const card = document.createElement("div");
      card.className = "pitch-card";
      card.innerHTML = `
        <div class="pitch-author">${escapeHtml(g.name)}</div>
        <div class="pitch-text">${escapeHtml(pitches[fid] || "(waiting for pitch…)")}</div>`;
      wrap.appendChild(card);
    });
    const allIn = finalists.every(fid => pitches[fid]);
    const elapsed = Date.now() - (room.stageStartTime || 0);
    const showVote = allIn || elapsed > FINAL_BOSS_DURATION_MS;
    document.getElementById("btn-start-vote").classList.toggle("hidden", !showVote);
    document.getElementById("btn-reveal-winner").classList.add("hidden");
  }
  document.getElementById("btn-start-vote").addEventListener("click", async () => {
    sfx.click();
    await roomRef(teacherRoomCode).update({ state: "voting", stageStartTime: Date.now() });
    toast("Class voting open!", "success");
  });
  function handleVotingTeacher(room) {
    document.getElementById("final-boss-overlay").classList.remove("hidden");
    const votes = room.finalVotes || {};
    const tally = {};
    Object.values(votes).forEach(v => { tally[v] = (tally[v] || 0) + 1; });
    const wrap = document.getElementById("final-boss-pitches");
    wrap.innerHTML = "";
    (room.finalists || []).forEach(fid => {
      const g = (room.groups || {})[fid];
      if (!g) return;
      const card = document.createElement("div");
      card.className = "pitch-card";
      card.innerHTML = `<div class="pitch-author">${escapeHtml(g.name)} <span class="vote-count">${tally[fid] || 0}</span></div>
        <div class="pitch-text">${escapeHtml((room.finalPitches || {})[fid] || "")}</div>`;
      wrap.appendChild(card);
    });
    const totalVotes = Object.keys(votes).length;
    document.getElementById("btn-start-vote").classList.add("hidden");
    document.getElementById("btn-reveal-winner").classList.toggle("hidden", totalVotes === 0);
  }
  document.getElementById("btn-reveal-winner").addEventListener("click", async () => {
    sfx.fanfare();
    const snap = await roomRef(teacherRoomCode).once("value");
    const room = snap.val();
    const votes = room.finalVotes || {};
    const tally = {};
    Object.values(votes).forEach(v => { tally[v] = (tally[v] || 0) + 1; });
    let winnerId = null, max = -1;
    Object.entries(tally).forEach(([id, c]) => { if (c > max) { max = c; winnerId = id; } });
    if (!winnerId && (room.finalists || []).length) winnerId = room.finalists[0];
    const winnerGroup = (room.groups || {})[winnerId];
    if (winnerGroup) {
      await groupRef(teacherRoomCode, winnerId).update({ score: (winnerGroup.score || 0) + 250 });
    }
    document.querySelectorAll(".pitch-card").forEach((card, i) => {
      const finalists = room.finalists || [];
      if (finalists[i] === winnerId) card.classList.add("winner");
    });
    const banner = document.getElementById("final-boss-winner");
    banner.classList.remove("hidden");
    banner.textContent = winnerGroup ? `🏆 ${winnerGroup.name} wins the Final Boss! +250 points` : "Game over!";
    setTimeout(async () => { await roomRef(teacherRoomCode).update({ state: "finished" }); }, 5000);
  });

  document.getElementById("btn-end-game").addEventListener("click", async () => {
    sfx.click();
    if (!confirm("End the game now?")) return;
    await roomRef(teacherRoomCode).update({ state: "finished" });
  });
  document.getElementById("btn-new-game").addEventListener("click", () => { location.reload(); });
  document.getElementById("btn-sound-toggle").addEventListener("click", toggleSound);
  document.getElementById("btn-print-summary").addEventListener("click", () => buildAndPrintSummary());

  function renderEndScreen(room) {
    const standings = document.getElementById("final-standings");
    standings.innerHTML = "";
    const groups = Object.values(room.groups || {});
    groups.sort((a, b) => (b.score || 0) - (a.score || 0));
    groups.forEach(g => {
      const li = document.createElement("li");
      li.innerHTML = `<span><strong>${escapeHtml(g.name)}</strong> — ${escapeHtml(g.product || "")}</span>
        <span style="margin-left:auto;font-family:'Bebas Neue';font-size:28px;color:var(--yellow)">${g.score || 0}</span>`;
      standings.appendChild(li);
    });
    teacherFinalRoomData = room;
  }

  // Rubric modal (shared)
  document.getElementById("btn-rubric").addEventListener("click", () => {
    sfx.click();
    document.getElementById("rubric-modal").classList.remove("hidden");
  });
  document.getElementById("btn-close-rubric").addEventListener("click", () => {
    document.getElementById("rubric-modal").classList.add("hidden");
  });

  // ---------------------------------------------------------------------
  // 7. GROUP / STUDENT
  // ---------------------------------------------------------------------
  let groupRoomCode = null;
  let groupId = null;
  let groupTimerInterval = null;
  let lastSeenStage = null;
  let lastSeenSabotageAt = 0;

  async function joinRoom(code, name) {
    const snap = await roomRef(code).once("value");
    if (!snap.exists()) return showJoinError("Room not found.");
    const room = snap.val();
    if (room.state === "finished") return showJoinError("That game is over.");

    groupRoomCode = code;
    groupId = getOrMakeGroupId(code);

    const productsLeft = (room.productsLeft && room.productsLeft.length)
      ? room.productsLeft : shuffle(PRODUCTS.map(p => p.name));
    const product = productsLeft[0];
    const remaining = productsLeft.slice(1);

    await groupRef(code, groupId).set({
      name, product, score: 0,
      joinedAt: firebase.database.ServerValue.TIMESTAMP,
      answers: {}, powerUps: {}
    });
    await roomRef(code).update({ productsLeft: remaining });

    document.getElementById("group-header-name").textContent = name;
    document.getElementById("group-product-mini").textContent = product;
    document.getElementById("group-product-big").textContent = product;

    showView("group");
    sfx.join();
    await playSpinReveal(product);

    // Now start listening for room state (after the spin)
    roomRef(code).on("value", snap => renderGroup(snap.val()));
  }

  // --- SLOT MACHINE PRODUCT REVEAL ----------------------------------------
  // Clean translateY positioning: item N visible = translate by -N * itemHeight.
  // The LAST item in the sequence is the assigned product and gets `.final`.
  async function playSpinReveal(finalProduct) {
    showGroupState("spin");
    const reel = document.getElementById("slot-reel");
    const statusEl = document.getElementById("spin-status");
    statusEl.classList.remove("done");
    statusEl.textContent = "🎰 Spinning…";

    const ITEM_HEIGHT = 100;
    const productNames = PRODUCTS.map(p => p.name);
    const otherProducts = shuffle(productNames.filter(p => p !== finalProduct));
    // Build a 25-ish item reel: many "decoys" + the final product locked at the end
    const sequence = [...otherProducts.slice(0, 14), ...otherProducts.slice(0, 10), finalProduct];

    reel.classList.remove("locked");
    reel.style.transform = "translateY(0)";
    reel.innerHTML = sequence
      .map((p, i) => {
        const isFinal = (i === sequence.length - 1);
        return `<div class="slot-item${isFinal ? " final" : ""}">${escapeHtml(p)}</div>`;
      })
      .join("");

    return new Promise(resolve => {
      let i = 0;
      let interval = 50;
      const totalItems = sequence.length;
      const finalIndex = totalItems - 1;

      function step() {
        reel.style.transform = `translateY(${-i * ITEM_HEIGHT}px)`;
        if (i > 0) sfx.spin();

        if (i >= finalIndex) {
          reel.classList.add("locked");
          statusEl.textContent = `🎉 Your product: ${finalProduct}`;
          statusEl.classList.add("done");
          sfx.fanfare();
          setTimeout(() => {
            showGroupState("waiting");
            resolve();
          }, 2200);
          return;
        }
        i++;
        // Ease-out: slow down toward the end
        if (i > finalIndex - 3) interval += 90;
        else if (i > finalIndex - 6) interval += 40;
        else if (i > finalIndex - 10) interval += 12;
        setTimeout(step, interval);
      }
      step();
    });
  }

  function renderGroup(room) {
    if (!room) return;
    const me = (room.groups || {})[groupId];
    if (!me) return;

    document.getElementById("group-score-mini").textContent = me.score || 0;

    // Detect new sabotage
    if (me.sabotagedAt && me.sabotagedAt > lastSeenSabotageAt) {
      lastSeenSabotageAt = me.sabotagedAt;
      if (Date.now() - me.sabotagedAt < 5000) {
        showSabotageFlash(me.sabotagedBy || "A rival group");
      }
    }

    const state = room.state;
    const stage = room.stage;

    if (state === "waiting") {
      // Stay on waiting (spin already done)
      // But make sure we're not stuck on spin
      if (document.getElementById("group-spin").classList.contains("hidden") === false &&
          document.getElementById("spin-status").classList.contains("done")) {
        showGroupState("waiting");
      }
      lastSeenStage = null;
    } else if (state === "playing") {
      const stageObj = STAGES[room.stageIndex];
      if (!stageObj) return;
      showGroupState("playing");
      if (lastSeenStage !== stage) {
        lastSeenStage = stage;
        loadStageUI(stageObj, me);
        sfx.bonus();
      }
      const submitted = me.answers && me.answers[stage];
      lockStageUI(stageObj, submitted);
      // Render breakdown if there's a submission
      if (submitted) {
        renderBreakdownForStudent(stageObj, submitted);
        // Update the inline status text once the AI grade arrives
        const stat = stageObj.isExtension
          ? document.getElementById("submit-status-ext")
          : document.getElementById("submit-status");
        if (stat) {
          if (submitted.aiScore != null) {
            stat.className = "status success";
            stat.textContent = `Final: ${submitted.scoreBreakdown.total} pts (AI graded ${submitted.aiScore}/5)`;
          } else if (submitted.pendingAi) {
            stat.className = "status grading";
            stat.textContent = `+${submitted.scoreBreakdown.total} pts (rules). Waiting for AI grade from teacher's device…`;
          }
        }
      }
      startGroupTimer(room, me);
    } else if (state === "finalboss") {
      const isFinalist = (room.finalists || []).includes(groupId);
      if (isFinalist) {
        showGroupState("finalboss");
        document.getElementById("group-finalboss-product").textContent = room.finalProduct || "—";
        const submitted = (room.finalPitches || {})[groupId];
        document.getElementById("answer-pitch").disabled = !!submitted;
        document.getElementById("btn-submit-pitch").disabled = !!submitted;
        startGroupFinalTimer(room);
      } else {
        showGroupState("waiting");
        document.getElementById("group-product-big").textContent = "Top groups are pitching… ⏳";
      }
    } else if (state === "voting") {
      const isFinalist = (room.finalists || []).includes(groupId);
      if (isFinalist) {
        showGroupState("waiting");
        document.getElementById("group-product-big").textContent = "Class is voting on your pitch…";
      } else {
        showGroupState("voting");
        renderVoteOptions(room);
      }
    } else if (state === "finished") {
      showGroupState("done");
      const groups = Object.values(room.groups || {});
      groups.sort((a, b) => (b.score || 0) - (a.score || 0));
      const rank = groups.findIndex(g => g.name === me.name) + 1;
      document.getElementById("group-final-score").textContent = me.score || 0;
      const rankText = rank === 1 ? "🥇 1ST PLACE!" : rank === 2 ? "🥈 2nd place" : rank === 3 ? "🥉 3rd place" : `Rank: ${rank} of ${groups.length}`;
      document.getElementById("group-final-rank").textContent = rankText;
      stopGroupTimer();
      sfx.fanfare();
    }

    // Power-up button states
    document.querySelectorAll(".powerup-btn").forEach(btn => {
      const cost = POWERUP_COSTS[btn.dataset.powerup];
      btn.disabled = (me.score || 0) < cost || state !== "playing";
    });

    // Frozen badge state
    const stageStart = room.stageStartTime || 0;
    const frozen = (me.freezeUntil || 0) > stageStart && Date.now() < (me.freezeUntil || 0);
    document.getElementById("frozen-badge").classList.toggle("hidden", !frozen);
    document.getElementById("group-timer").classList.toggle("frozen", frozen);
  }

  function loadStageUI(stageObj, me) {
    document.getElementById("group-stage-name").textContent = stageObj.name;
    document.getElementById("group-stage-description").textContent = stageObj.description || "";

    const normalCard = document.getElementById("answer-card-normal");
    const extCard = document.getElementById("answer-card-extension");

    if (stageObj.isExtension) {
      normalCard.classList.add("hidden");
      extCard.classList.remove("hidden");
      populateSelect("answer-extension", EXTENSION_STRATEGIES);
      document.getElementById("answer-extension").value = "";
      document.getElementById("answer-advantages").value = "";
      document.getElementById("answer-disadvantages").value = "";
      updateCounter("answer-advantages", "advantages-counter", 600);
      updateCounter("answer-disadvantages", "disadvantages-counter", 600);
      document.getElementById("submit-status-ext").textContent = "";
      document.getElementById("submit-status-ext").className = "status";
      document.getElementById("submit-breakdown-ext").classList.add("hidden");
    } else {
      normalCard.classList.remove("hidden");
      extCard.classList.add("hidden");
      populateSelect("answer-pricing", PRICING_STRATEGIES);
      populateSelect("answer-promotion", PROMOTION_TYPES);
      document.getElementById("answer-pricing").value = "";
      document.getElementById("answer-promotion").value = "";
      document.getElementById("answer-pricing-pc").value = "";
      document.getElementById("answer-promotion-pc").value = "";
      document.getElementById("answer-comparison").value = "";
      updateCounter("answer-pricing-pc",   "pricing-pc-counter",   600);
      updateCounter("answer-promotion-pc", "promotion-pc-counter", 600);
      updateCounter("answer-comparison",   "comparison-counter",   700);
      document.getElementById("submit-status").textContent = "";
      document.getElementById("submit-status").className = "status";
      document.getElementById("submit-breakdown").classList.add("hidden");
      renderHintChips();
    }
    document.getElementById("powerup-info").textContent = "";
    document.getElementById("powerup-info").className = "powerup-info";
  }

  function lockStageUI(stageObj, locked) {
    if (stageObj.isExtension) {
      ["answer-extension", "answer-advantages", "answer-disadvantages", "btn-submit-extension"].forEach(id => {
        document.getElementById(id).disabled = !!locked;
      });
    } else {
      ["answer-pricing", "answer-promotion", "answer-pricing-pc", "answer-promotion-pc", "answer-comparison", "btn-submit-answer"].forEach(id => {
        document.getElementById(id).disabled = !!locked;
      });
    }
  }

  // Render hint chips above each text box. Chips are clickable — clicking
  // appends the word into the matching textarea (so students can use them).
  function renderHintChips() {
    document.querySelectorAll(".hint-chips").forEach(wrap => {
      const kind = wrap.dataset.chipsFor;
      const words = (typeof HINT_CHIPS !== "undefined" && HINT_CHIPS[kind]) || [];
      // Find the textarea inside the same parent <label>
      const label = wrap.closest("label");
      const textarea = label && label.querySelector("textarea");
      wrap.innerHTML = `<span class="hint-chip-label">Try using:</span>` +
        words.map(w => `<button type="button" class="hint-chip" data-word="${escapeHtml(w)}">${escapeHtml(w)}</button>`).join("");
      wrap.querySelectorAll(".hint-chip").forEach(chip => {
        chip.addEventListener("click", e => {
          e.preventDefault();
          if (!textarea || textarea.disabled) return;
          const w = chip.dataset.word;
          // Insert at cursor or append, plus a trailing space
          const start = textarea.selectionStart || textarea.value.length;
          const end   = textarea.selectionEnd   || textarea.value.length;
          const sep = (start > 0 && textarea.value[start-1] && !/\s/.test(textarea.value[start-1])) ? " " : "";
          const insertion = sep + w + " ";
          textarea.value = textarea.value.slice(0, start) + insertion + textarea.value.slice(end);
          textarea.focus();
          const pos = start + insertion.length;
          textarea.setSelectionRange(pos, pos);
          // Fire input so the counter updates
          textarea.dispatchEvent(new Event("input", { bubbles: true }));
          sfx.click();
        });
      });
    });
  }

  function populateSelect(id, options) {
    const sel = document.getElementById(id);
    sel.innerHTML = '<option value="">— choose —</option>';
    options.forEach(opt => {
      const o = document.createElement("option");
      o.value = opt.value; o.textContent = opt.label;
      sel.appendChild(o);
    });
  }

  // Map textarea id → its counter id and max length
  const COUNTER_MAP = {
    "answer-pricing-pc":   ["pricing-pc-counter",   600],
    "answer-promotion-pc": ["promotion-pc-counter", 600],
    "answer-comparison":   ["comparison-counter",   700],
    "answer-advantages":   ["advantages-counter",   600],
    "answer-disadvantages":["disadvantages-counter",600]
  };
  Object.keys(COUNTER_MAP).forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const [counterId, max] = COUNTER_MAP[id];
    el.addEventListener("input", () => updateCounter(id, counterId, max));
  });
  function updateCounter(textareaId, counterId, max) {
    const v = document.getElementById(textareaId).value || "";
    document.getElementById(counterId).textContent = `${v.length} / ${max}`;
  }

  // Submit (non-extension stages — 3 boxes)
  document.getElementById("btn-submit-answer").addEventListener("click", async () => {
    const pricing = document.getElementById("answer-pricing").value;
    const promotion = document.getElementById("answer-promotion").value;
    const pricingProsCons = (document.getElementById("answer-pricing-pc").value || "").trim();
    const promotionProsCons = (document.getElementById("answer-promotion-pc").value || "").trim();
    const comparison = (document.getElementById("answer-comparison").value || "").trim();
    const stat = document.getElementById("submit-status");

    if (!pricing || !promotion) { stat.className = "status error"; stat.textContent = "Pick a pricing AND promotion strategy."; return; }
    if (pricingProsCons.length < 20) { stat.className = "status warning"; stat.textContent = "Box 1 needs more detail (advantage of the pricing — min 20 chars)."; return; }
    if (promotionProsCons.length < 20) { stat.className = "status warning"; stat.textContent = "Box 2 needs more detail (advantage of the promotion — min 20 chars)."; return; }
    if (comparison.length < 20) { stat.className = "status warning"; stat.textContent = "Box 3 needs more detail (justification — min 20 chars)."; return; }

    const snap = await roomRef(groupRoomCode).once("value");
    const room = snap.val();
    const stageKey = room.stage;
    const stageObj = STAGES.find(s => s.key === stageKey);
    const me = room.groups[groupId];

    const freezeUsed = (me.freezeUntil || 0) > room.stageStartTime;
    const sabotaged  = (me.sabotagedAt || 0) > room.stageStartTime;

    let breakdown = scoreWithRules({
      pricing, promotion, pricingProsCons, promotionProsCons, comparison,
      stageObj, stageStartTime: room.stageStartTime,
      freezeUsed, sabotaged, productName: me.product
    });

    // Save the rules score. The TEACHER's browser picks up `pendingAi: true`
    // and grades with Claude using its locally-stored API key.
    await groupRef(groupRoomCode, groupId).update({
      score: (me.score || 0) + breakdown.total,
      [`answers/${stageKey}`]: {
        pricing, promotion,
        pricingProsCons, promotionProsCons, comparison,
        scoreBreakdown: breakdown,
        submittedAt: Date.now(),
        pendingAi: true,
        aiAttempts: 0
      }
    });

    stat.className = "status grading";
    stat.textContent = `+${breakdown.total} pts (rules). Waiting for AI grade from teacher's device…`;
    renderBreakdownForStudent(stageObj, { pricing, promotion, pricingProsCons, promotionProsCons, comparison, scoreBreakdown: breakdown });
    sfx.submit();
    if (breakdown.total >= 200) sfx.fanfare();
  });

  // Submit (extension — now requires both advantages and disadvantages)
  document.getElementById("btn-submit-extension").addEventListener("click", async () => {
    const strategy = document.getElementById("answer-extension").value;
    const advantages = (document.getElementById("answer-advantages").value || "").trim();
    const disadvantages = (document.getElementById("answer-disadvantages").value || "").trim();
    const stat = document.getElementById("submit-status-ext");

    if (!strategy) { stat.className = "status error"; stat.textContent = "Choose an extension strategy."; return; }
    if (advantages.length < 20) { stat.className = "status warning"; stat.textContent = "Add advantages (min 20 chars)."; return; }
    if (disadvantages.length < 20) { stat.className = "status warning"; stat.textContent = "Add disadvantages too (min 20 chars). IGCSE rewards balanced thinking."; return; }

    const snap = await roomRef(groupRoomCode).once("value");
    const room = snap.val();
    const stageObj = STAGES.find(s => s.key === room.stage);
    const me = room.groups[groupId];

    const freezeUsed = (me.freezeUntil || 0) > room.stageStartTime;
    const sabotaged  = (me.sabotagedAt || 0) > room.stageStartTime;

    let breakdown = scoreExtensionWithRules({
      strategy, advantages, disadvantages, stageObj,
      stageStartTime: room.stageStartTime,
      freezeUsed, sabotaged, productName: me.product
    });

    await groupRef(groupRoomCode, groupId).update({
      score: (me.score || 0) + breakdown.total,
      [`answers/${stageObj.key}`]: {
        strategy, advantages, disadvantages,
        scoreBreakdown: breakdown,
        submittedAt: Date.now(),
        pendingAi: true,
        aiAttempts: 0
      }
    });
    stat.className = "status grading";
    stat.textContent = `+${breakdown.total} pts (rules). Waiting for AI grade from teacher's device…`;
    renderBreakdownForStudent(stageObj, { strategy, advantages, disadvantages, scoreBreakdown: breakdown });
    sfx.submit();
  });

  function renderBreakdownForStudent(stageObj, ans) {
    const b = ans.scoreBreakdown;
    if (!b) return;
    const containerId = stageObj.isExtension ? "submit-breakdown-ext" : "submit-breakdown";
    const el = document.getElementById(containerId);
    el.classList.remove("hidden");
    const cls = b.total >= 200 ? "" : b.total >= 110 ? "mid" : "bad";
    el.className = "breakdown " + cls;

    const qualityShown = b.qualityOverridden ?? b.quality;
    const rows = [];
    rows.push(`<li class="${b.mentionedProduct ? "good-row" : "bad-row"}"><span>Mentioned the product?</span><span class="b-val">${b.mentionedProduct ? "✓ Yes" : "✗ No (no quality points)"}</span></li>`);
    rows.push(`<li><span>Speed bonus</span><span class="b-val">${b.speed}</span></li>`);
    if (!stageObj.isExtension) {
      if (typeof b.boxesFilled === "number") {
        const allIn = b.boxesFilled >= 3;
        rows.push(`<li class="${allIn ? "good-row" : "bad-row"}"><span>Boxes filled (${b.boxesFilled}/3)</span><span class="b-val">${b.completeness ?? 0}</span></li>`);
      }
    }
    if (ans.aiScore != null) {
      rows.push(`<li class="good-row"><span>AI quality grade</span><span class="b-val">${ans.aiScore}/5 (${qualityShown} pts)</span></li>`);
    } else {
      rows.push(`<li><span>Stage-specific vocabulary</span><span class="b-val">${b.stageWords}</span></li>`);
      rows.push(`<li><span>Linked reasoning (because/therefore…)</span><span class="b-val">${b.reasoningWords}</span></li>`);
      rows.push(`<li><span>Depth (length + sentences)</span><span class="b-val">${b.depth}</span></li>`);
    }
    rows.push(`<li><strong>Total this stage</strong><span class="b-val"><strong>${b.total}</strong></span></li>`);

    el.innerHTML = `<h5>Score breakdown</h5><ul>${rows.join("")}</ul>` +
      ((ans.aiFeedback || b.feedback) ? `<div class="b-feedback">${escapeHtml(ans.aiFeedback || b.feedback)}</div>` : "");
  }

  function startGroupTimer(room, me) {
    stopGroupTimer();
    const stageObj = STAGES[room.stageIndex];
    if (!stageObj) return;
    const start = room.stageStartTime;
    const dur = stageObj.durationMs;
    const el = document.getElementById("group-timer");
    function tick() {
      let remaining = Math.max(0, start + dur - Date.now());
      // If frozen, the timer visually pauses at its current value
      const frozenUntil = me.freezeUntil || 0;
      if (frozenUntil > Date.now() && frozenUntil > start) {
        // Display frozen value (don't tick down)
        // remaining stays the same as previous tick
      }
      el.textContent = formatTime(remaining);
      el.classList.toggle("warning", remaining < 30000 && remaining > 0);
      if (remaining <= 5000 && remaining > 0 && Math.floor(remaining / 1000) !== Math.floor((remaining + 250) / 1000)) {
        sfx.countdown();
      }
    }
    tick();
    groupTimerInterval = setInterval(tick, 250);
  }
  function startGroupFinalTimer(room) {
    stopGroupTimer();
    const start = room.stageStartTime;
    const dur = FINAL_BOSS_DURATION_MS;
    const el = document.getElementById("group-timer-final");
    function tick() {
      const remaining = Math.max(0, start + dur - Date.now());
      el.textContent = formatTime(remaining);
      el.classList.toggle("warning", remaining < 15000 && remaining > 0);
    }
    tick();
    groupTimerInterval = setInterval(tick, 250);
  }
  function stopGroupTimer() {
    if (groupTimerInterval) { clearInterval(groupTimerInterval); groupTimerInterval = null; }
  }

  // Final boss pitch submit
  document.getElementById("btn-submit-pitch").addEventListener("click", async () => {
    const pitch = (document.getElementById("answer-pitch").value || "").trim();
    if (pitch.length < 10) { toast("Make your pitch a bit longer!", "warning"); return; }
    await roomRef(groupRoomCode).update({ [`finalPitches/${groupId}`]: pitch });
    document.getElementById("answer-pitch").disabled = true;
    document.getElementById("btn-submit-pitch").disabled = true;
    sfx.submit();
    toast("Pitch locked in!", "success");
  });

  function renderVoteOptions(room) {
    const wrap = document.getElementById("vote-options");
    wrap.innerHTML = "";
    const myVote = (room.finalVotes || {})[groupId];
    (room.finalists || []).forEach(fid => {
      const g = (room.groups || {})[fid];
      if (!g || fid === groupId) return;
      const pitch = (room.finalPitches || {})[fid] || "(no pitch)";
      const btn = document.createElement("button");
      btn.className = "vote-option" + (myVote === fid ? " voted" : "");
      btn.innerHTML = `<div class="vote-author">${escapeHtml(g.name)}</div><div>${escapeHtml(pitch)}</div>`;
      btn.addEventListener("click", async () => {
        sfx.click();
        await roomRef(groupRoomCode).update({ [`finalVotes/${groupId}`]: fid });
      });
      wrap.appendChild(btn);
    });
  }

  function showSabotageFlash(attackerName) {
    const flash = document.getElementById("sabotage-flash");
    document.getElementById("sabotage-attacker").textContent = `Hit by ${attackerName}!`;
    flash.classList.remove("hidden");
    sfx.sabotage();
    setTimeout(() => flash.classList.add("hidden"), 2200);
  }

  // ---------------------------------------------------------------------
  // 8. POWER-UPS
  // ---------------------------------------------------------------------
  document.querySelectorAll(".powerup-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const kind = btn.dataset.powerup;
      const cost = POWERUP_COSTS[kind];
      const snap = await roomRef(groupRoomCode).once("value");
      const room = snap.val();
      const me = room.groups[groupId];
      if ((me.score || 0) < cost) { toast("Not enough points!", "error"); return; }

      // Pre-charge the cost
      await groupRef(groupRoomCode, groupId).update({ score: (me.score || 0) - cost });
      sfx.click();

      const stageKey = room.stage;
      const stageObj = STAGES.find(s => s.key === stageKey);

      if (kind === "hint") {
        const info = document.getElementById("powerup-info");
        info.className = "powerup-info hint";
        info.textContent = "💡 " + (HINTS[stageKey] || "(no hint for this stage)");
        toast("Hint revealed.", "success");

      } else if (kind === "example") {
        const info = document.getElementById("powerup-info");
        info.className = "powerup-info example";
        const ex = EXAMPLE_ANSWERS[stageKey];
        if (!ex) {
          info.textContent = "(no example for this stage)";
        } else if (typeof ex === "string") {
          // Legacy single-string format
          info.innerHTML = "📖 <strong>Model IGCSE answer:</strong><br><br>" + escapeHtml(ex);
        } else {
          // New 3-box format
          info.innerHTML = `
            📖 <strong>Model IGCSE answer</strong>
            ${ex.contextStrategy ? `<div class="example-context">Based on: <em>${escapeHtml(ex.contextStrategy)}</em></div>` : ""}
            <div class="example-box">
              <span class="example-box-label">BOX 1 — Pricing advantage</span>
              ${escapeHtml(ex.pricingAdvantage || "—")}
            </div>
            <div class="example-box">
              <span class="example-box-label">BOX 2 — Promotion advantage</span>
              ${escapeHtml(ex.promotionAdvantage || "—")}
            </div>
            <div class="example-box">
              <span class="example-box-label">BOX 3 — Justification</span>
              ${escapeHtml(ex.justification || "—")}
            </div>
          `;
        }
        toast("Model answers revealed for all 3 boxes.", "fanfare");
        sfx.bonus();

      } else if (kind === "freeze") {
        const until = Date.now() + 30000;
        await groupRef(groupRoomCode, groupId).update({ freezeUntil: until });
        sfx.freeze();
        toast("❄️ Timer FROZEN for 30 seconds!", "success");

      } else if (kind === "sabotage") {
        const others = Object.entries(room.groups || {})
          .filter(([id]) => id !== groupId)
          .map(([id, g]) => ({ id, name: g.name }));
        if (!others.length) {
          toast("No-one to sabotage — refunding.", "warning");
          await groupRef(groupRoomCode, groupId).update({ score: me.score || 0 });
          return;
        }
        const target = others[Math.floor(Math.random() * others.length)];
        await groupRef(groupRoomCode, target.id).update({
          sabotagedAt: Date.now(),
          sabotagedBy: me.name
        });
        sfx.sabotage();
        toast(`💣 You sabotaged ${target.name}!`, "fanfare");
      }
    });
  });

  // ---------------------------------------------------------------------
  // 11. PRINT
  // ---------------------------------------------------------------------
  function buildAndPrintSummary() {
    const room = teacherFinalRoomData;
    if (!room) { alert("No game data to print."); return; }
    const wrap = document.getElementById("print-summary");
    wrap.innerHTML = "";
    const groups = Object.values(room.groups || {});
    groups.sort((a, b) => (b.score || 0) - (a.score || 0));
    groups.forEach(g => {
      const div = document.createElement("div");
      div.className = "print-group";
      const ans = g.answers || {};
      const rows = STAGES.map(s => {
        const a = ans[s.key] || {};
        if (s.isExtension) {
          const adv = a.advantages ? `<strong>+ Advantages:</strong> ${escapeHtml(a.advantages)}` : "—";
          const dis = a.disadvantages ? `<strong>− Disadvantages:</strong> ${escapeHtml(a.disadvantages)}` : "";
          return `<tr>
            <th>${escapeHtml(s.name)}</th>
            <td colspan="2">${escapeHtml(labelFor(EXTENSION_STRATEGIES, a.strategy) || "—")}</td>
            <td>${adv}${dis ? "<br><br>" + dis : ""}${a.aiFeedback ? "<br><br><em>AI: " + escapeHtml(a.aiFeedback) + "</em>" : ""}</td>
          </tr>`;
        }
        const pcCell = a.pricingProsCons
          ? `<strong>Pricing advantage:</strong> ${escapeHtml(a.pricingProsCons)}<br><br>` +
            `<strong>Promo advantage:</strong> ${escapeHtml(a.promotionProsCons || "—")}<br><br>` +
            `<strong>Justification:</strong> ${escapeHtml(a.comparison || "—")}` +
            (a.aiFeedback ? `<br><br><em>AI: ${escapeHtml(a.aiFeedback)}</em>` : "")
          : (a.justification ? escapeHtml(a.justification) : "—");
        return `<tr>
          <th>${escapeHtml(s.name)}</th>
          <td>${escapeHtml(labelFor(PRICING_STRATEGIES, a.pricing) || "—")}</td>
          <td>${escapeHtml(labelFor(PROMOTION_TYPES, a.promotion) || "—")}</td>
          <td>${pcCell}</td>
        </tr>`;
      }).join("");

      div.innerHTML = `
        <h2>${escapeHtml(g.name)} — Final Score: ${g.score || 0}</h2>
        <p class="product-line"><strong>Product:</strong> ${escapeHtml(g.product || "—")}</p>
        <table class="print-grid">
          <thead><tr><th>Stage</th><th>Pricing</th><th>Promotion</th><th>Reasoning &amp; Comparison</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>`;
      wrap.appendChild(div);
    });
    setTimeout(() => window.print(), 200);
  }

  // ---------------------------------------------------------------------
  // BACKGROUND MUSIC (teacher dashboard)
  // ---------------------------------------------------------------------
  // Sources for each music option. Files should live in audio/ next to
  // index.html. Download from the Pixabay URLs in the README.
  const MUSIC_SOURCES = {
    "upbeat-fun":        "audio/fun-upbeat.mp3",
    "cartoon-funny":     "audio/cartoon-funny.mp3",
    "minecraft-gaming":  "audio/game-music.mp3",
    "cartoon-animation": "audio/cartoons-music.mp3",
    "cheerful-playful":  "audio/joyful-music.mp3"
  };

  const musicSelectEl = document.getElementById("music-select");
  const musicVolumeEl = document.getElementById("music-volume");
  const musicAudioEl  = document.getElementById("music-audio");
  if (musicSelectEl && musicAudioEl) {
    musicAudioEl.volume = (parseInt(musicVolumeEl.value, 10) || 40) / 100;

    musicSelectEl.addEventListener("change", () => {
      sfx.click();
      const key = musicSelectEl.value;
      if (!key) {
        musicAudioEl.pause();
        musicAudioEl.removeAttribute("src");
        return;
      }
      const src = MUSIC_SOURCES[key];
      if (!src) return;
      musicAudioEl.src = src;
      musicAudioEl.play().catch(err => {
        console.warn("Music play failed (file missing or blocked):", err);
        toast("Couldn't load that music — see README for setup.", "warning");
      });
    });
    musicVolumeEl.addEventListener("input", () => {
      musicAudioEl.volume = (parseInt(musicVolumeEl.value, 10) || 0) / 100;
    });
  }

  // ---------------------------------------------------------------------
  // TEAM-DETAIL MODAL (teacher clicks a group → sees all answers)
  // ---------------------------------------------------------------------
  function openTeamDetail(gid) {
    roomRef(teacherRoomCode).once("value").then(snap => {
      const room = snap.val();
      const g = (room.groups || {})[gid];
      if (!g) return;
      sfx.click();

      document.getElementById("team-detail-name").textContent = g.name || "Team";

      const meta = document.getElementById("team-detail-meta");
      meta.innerHTML = `
        <div class="meta-pill">Product: <strong>${escapeHtml(g.product || "—")}</strong></div>
        <div class="meta-pill">Score: <strong>${g.score || 0}</strong></div>
        ${g.sabotagedAt ? `<div class="meta-pill" style="color:var(--red)">💣 Sabotaged once</div>` : ""}
      `;

      const body = document.getElementById("team-detail-body");
      body.innerHTML = "";
      const ans = g.answers || {};
      STAGES.forEach(stage => {
        const a = ans[stage.key];
        const block = document.createElement("div");
        block.className = "team-stage-block";
        const score = a && a.scoreBreakdown ? a.scoreBreakdown.total : 0;

        if (!a) {
          block.innerHTML = `<h4>${escapeHtml(stage.name)} <span class="stage-score">—</span></h4>
            <div class="empty-row">No answer submitted for this stage</div>`;
        } else if (stage.isExtension) {
          block.innerHTML = `
            <h4>${escapeHtml(stage.name)} <span class="stage-score">+${score}</span></h4>
            <div class="ts-row"><span class="ts-key">Strategy</span><span class="ts-val">${escapeHtml(labelFor(EXTENSION_STRATEGIES, a.strategy))}</span></div>
            <div class="ts-row"><span class="ts-key">+ Advantages</span><span class="ts-val">${escapeHtml(a.advantages || "—")}</span></div>
            <div class="ts-row"><span class="ts-key">− Disadvantages</span><span class="ts-val">${escapeHtml(a.disadvantages || "—")}</span></div>
            ${a.aiFeedback ? `<div class="ts-ai"><strong>AI mark: ${a.aiScore}/5</strong> — ${escapeHtml(a.aiFeedback)}</div>` : ""}
          `;
        } else {
          block.innerHTML = `
            <h4>${escapeHtml(stage.name)} <span class="stage-score">+${score}</span></h4>
            <div class="ts-row"><span class="ts-key">Pricing</span><span class="ts-val">${escapeHtml(labelFor(PRICING_STRATEGIES, a.pricing))}</span></div>
            <div class="ts-row"><span class="ts-key">Promotion</span><span class="ts-val">${escapeHtml(labelFor(PROMOTION_TYPES, a.promotion))}</span></div>
            <div class="ts-row"><span class="ts-key">Pricing advantage</span><span class="ts-val">${escapeHtml(a.pricingProsCons || a.justification || "—")}</span></div>
            <div class="ts-row"><span class="ts-key">Promo advantage</span><span class="ts-val">${escapeHtml(a.promotionProsCons || "—")}</span></div>
            <div class="ts-row"><span class="ts-key">Justification</span><span class="ts-val">${escapeHtml(a.comparison || "—")}</span></div>
            ${a.aiFeedback ? `<div class="ts-ai"><strong>AI mark: ${a.aiScore}/5</strong> — ${escapeHtml(a.aiFeedback)}</div>` : ""}
          `;
        }
        body.appendChild(block);
      });

      document.getElementById("team-detail-overlay").classList.remove("hidden");
    });
  }
  function closeTeamDetail() {
    document.getElementById("team-detail-overlay").classList.add("hidden");
  }
  const closeBtn1 = document.getElementById("btn-close-team-detail");
  const closeBtn2 = document.getElementById("btn-back-from-team");
  if (closeBtn1) closeBtn1.addEventListener("click", () => { sfx.click(); closeTeamDetail(); });
  if (closeBtn2) closeBtn2.addEventListener("click", () => { sfx.click(); closeTeamDetail(); });

  // ---------------------------------------------------------------------
  // OFFLINE NOTICE (when Firebase isn't configured)
  // ---------------------------------------------------------------------
  if (!firebaseReady) {
    const note = document.createElement("div");
    note.style.cssText = "background:rgba(255,59,59,0.15);border:2px solid var(--red);padding:16px;border-radius:12px;margin-top:24px;color:#fff;text-align:left;max-width:600px;margin-left:auto;margin-right:auto;font-size:14px;line-height:1.5;";
    note.innerHTML = `<strong style="color:var(--red)">⚠️ Firebase not configured</strong><br>
      The game won't run live until you paste your Firebase config into <code>firebase-config.js</code>.`;
    document.querySelector("#view-landing .hero").appendChild(note);
  }

})();
