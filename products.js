/* ==========================================================================
   MARKETING MASTERS — game data
   Edit these lists freely to suit your class/syllabus.
   ========================================================================== */

// =============================================================================
// PRODUCTS — each has a list of synonyms students can use in their justification
// to satisfy the "must mention the product" quality gate.
// =============================================================================
const PRODUCTS = [
  { name: "Foldable electric scooter", synonyms: ["scooter", "e-scooter", "electric scooter", "foldable scooter"] },
  { name: "Smart water bottle",        synonyms: ["bottle", "water bottle", "smart bottle", "hydration"] },
  { name: "Retro-style sneakers",      synonyms: ["sneaker", "sneakers", "shoe", "shoes", "trainer", "trainers", "footwear", "retro shoe"] },
  { name: "Wireless earbuds",          synonyms: ["earbud", "earbuds", "headphones", "earphones", "buds"] },
  { name: "Fitness tracker watch",     synonyms: ["watch", "tracker", "fitness tracker", "wearable", "smartwatch"] },
  { name: "Plant-based burger",        synonyms: ["burger", "patty", "meat alternative", "vegan burger", "plant burger"] },
  { name: "Robot vacuum cleaner",      synonyms: ["vacuum", "vacuum cleaner", "robot vacuum", "cleaner", "hoover"] },
  { name: "Streaming subscription",    synonyms: ["streaming", "subscription", "service", "platform", "stream"] },
  { name: "Monthly snack box",         synonyms: ["snack", "snacks", "snack box", "box", "subscription box"] },
  { name: "Smart video doorbell",      synonyms: ["doorbell", "video doorbell", "smart doorbell", "door"] },
  { name: "Eco-friendly toothbrush",   synonyms: ["toothbrush", "brush", "eco toothbrush", "bamboo toothbrush"] },
  { name: "Pro gaming chair",          synonyms: ["chair", "gaming chair", "seat", "gamer chair"] },
  { name: "Mobile puzzle game app",    synonyms: ["app", "game", "mobile game", "puzzle", "puzzle game"] },
  { name: "Reusable coffee cup",       synonyms: ["cup", "coffee cup", "mug", "tumbler", "reusable cup"] },
  { name: "Beginner camera drone",     synonyms: ["drone", "quadcopter", "camera drone", "flyer", "uav"] },
  { name: "Action sports camera",      synonyms: ["camera", "action camera", "sports camera", "gopro"] },
  { name: "Smart colour-changing lights", synonyms: ["lights", "light", "lamp", "bulb", "bulbs", "smart lights", "lighting"] },
  { name: "Energy drink",              synonyms: ["drink", "energy drink", "beverage", "can"] },
  { name: "Sustainable backpack",      synonyms: ["backpack", "bag", "rucksack", "pack"] },
  { name: "Online tutoring service",   synonyms: ["tutoring", "tutor", "service", "tuition", "lesson"] },
  { name: "Air fryer",                 synonyms: ["fryer", "air fryer", "appliance", "cooker"] },
  { name: "Bubble tea brand",          synonyms: ["bubble tea", "tea", "boba", "drink", "beverage"] },
  { name: "Teen skincare line",        synonyms: ["skincare", "cream", "cleanser", "serum", "lotion", "skincare line"] },
  { name: "Bluetooth party speaker",   synonyms: ["speaker", "bluetooth speaker", "sound system", "audio"] },
  { name: "Electric toothbrush",       synonyms: ["toothbrush", "brush", "electric toothbrush"] },
  { name: "Meal kit delivery",         synonyms: ["meal kit", "meal", "kit", "delivery", "ingredients"] },
  { name: "Vinyl record player",       synonyms: ["record player", "turntable", "vinyl", "player"] },
  { name: "VR headset",                synonyms: ["headset", "vr", "vr headset", "goggles", "virtual reality"] },
  { name: "Pet camera with treat dispenser", synonyms: ["pet camera", "camera", "pet", "treat dispenser", "pet tech"] },
  { name: "Solar-powered phone charger", synonyms: ["charger", "phone charger", "solar charger", "power bank"] },
  { name: "Stainless steel reusable straws", synonyms: ["straw", "straws", "reusable straws", "metal straws"] },
  { name: "Stand-up desk",             synonyms: ["desk", "stand-up desk", "standing desk", "workstation"] },
  { name: "Gourmet popcorn brand",     synonyms: ["popcorn", "snack", "gourmet popcorn"] },
  { name: "Subscription language app", synonyms: ["language app", "app", "language", "learning app"] },
  { name: "Organic baby food line",    synonyms: ["baby food", "food", "organic food", "baby"] },
  { name: "Reusable shopping bag",     synonyms: ["bag", "shopping bag", "tote", "reusable bag"] },
  { name: "Electric toothbrush head refill", synonyms: ["refill", "brush head", "toothbrush head"] },
  { name: "Designer hoodie",           synonyms: ["hoodie", "jumper", "sweatshirt", "top", "clothing"] },
  { name: "Premium yoga mat",          synonyms: ["yoga mat", "mat", "exercise mat", "fitness mat"] },
  { name: "Smart home thermostat",     synonyms: ["thermostat", "smart thermostat", "heating", "climate control"] },
  { name: "Portable blender",          synonyms: ["blender", "smoothie maker", "portable blender", "mixer"] },
  { name: "Eco-friendly cleaning kit", synonyms: ["cleaning kit", "kit", "cleaning products", "eco kit"] },
  { name: "Designer phone case",       synonyms: ["phone case", "case", "cover", "phone cover"] },
  { name: "Mountain bike",             synonyms: ["bike", "bicycle", "mountain bike", "mtb"] },
  { name: "Disposable contact lenses", synonyms: ["contacts", "contact lenses", "lenses"] },
  { name: "Smart pet feeder",          synonyms: ["pet feeder", "feeder", "pet dispenser", "auto feeder"] },
  { name: "Bluetooth keyboard",        synonyms: ["keyboard", "bluetooth keyboard", "wireless keyboard"] },
  { name: "Travel pillow",             synonyms: ["pillow", "travel pillow", "neck pillow"] },
  { name: "Hair styling tool",         synonyms: ["styling tool", "hair tool", "curler", "straightener"] },
  { name: "Protein powder",            synonyms: ["protein", "protein powder", "supplement", "shake mix"] },
  { name: "Indoor herb garden kit",    synonyms: ["herb garden", "garden kit", "indoor garden", "growing kit"] },
  { name: "Reading e-book device",     synonyms: ["e-book", "ebook reader", "kindle", "e-reader"] },
  { name: "Wireless mouse",            synonyms: ["mouse", "wireless mouse", "computer mouse"] },
  { name: "Personalised T-shirt",      synonyms: ["t-shirt", "shirt", "tee", "top", "clothing"] },
  { name: "Camping tent",              synonyms: ["tent", "camping tent", "shelter"] },
  { name: "Organic chocolate bar",     synonyms: ["chocolate", "chocolate bar", "bar", "treat"] },
  { name: "Smart pen for tablets",     synonyms: ["pen", "stylus", "smart pen", "tablet pen"] },
  { name: "Sleep tracking ring",       synonyms: ["ring", "sleep ring", "tracker", "wearable"] },
  { name: "Frozen pizza brand",        synonyms: ["pizza", "frozen pizza", "meal"] },
  { name: "Designer sunglasses",       synonyms: ["sunglasses", "shades", "glasses"] },
  { name: "Robotic lawn mower",        synonyms: ["lawn mower", "mower", "robot mower", "garden robot"] },
  { name: "Air purifier",              synonyms: ["purifier", "air purifier", "air cleaner"] },
  { name: "Sports drink brand",        synonyms: ["sports drink", "drink", "beverage", "isotonic"] },
  { name: "Kids' coding kit",          synonyms: ["coding kit", "kit", "tech toy", "learning toy"] },
  { name: "Compact electric car",      synonyms: ["car", "electric car", "ev", "vehicle"] },
  { name: "Vegan ice cream",           synonyms: ["ice cream", "vegan ice cream", "dessert", "treat"] },
  { name: "Noise-cancelling headphones", synonyms: ["headphones", "noise-cancelling headphones", "headset"] },
  { name: "Smart luggage with tracker", synonyms: ["luggage", "suitcase", "bag", "smart luggage"] },
  { name: "Sustainable swimwear",      synonyms: ["swimwear", "swimsuit", "bikini", "trunks", "clothing"] },
  { name: "Craft beer brand",          synonyms: ["beer", "craft beer", "drink"] },
  { name: "Photography lighting kit",  synonyms: ["lighting kit", "lights", "studio lights", "photo lights"] },
  { name: "Smart fitness mirror",      synonyms: ["mirror", "fitness mirror", "smart mirror"] },
  { name: "Pet grooming kit",          synonyms: ["grooming kit", "pet grooming", "groomer", "kit"] },
  { name: "Premium coffee beans",      synonyms: ["coffee", "coffee beans", "beans"] },
  { name: "Indoor cycling bike",       synonyms: ["bike", "exercise bike", "indoor bike", "spin bike"] }
];

const FINAL_BOSS_PRODUCTS = [
  "A toothbrush that talks to you",
  "Self-tying shoelaces",
  "A chair that gives you compliments",
  "Glow-in-the-dark pyjamas",
  "An umbrella that predicts the weather",
  "Edible coffee cups",
  "A smart pillow that wakes you with smells",
  "AI-powered homework helper",
  "Bicycle for two with a built-in fridge"
];

// =============================================================================
// PRICING / PROMOTION OPTIONS
// =============================================================================
const PRICING_STRATEGIES = [
  { value: "penetration",   label: "Penetration pricing (low price to gain market share)" },
  { value: "skimming",      label: "Price skimming (high launch price)" },
  { value: "cost-plus",     label: "Cost-plus pricing (cost + mark-up)" },
  { value: "competitive",   label: "Competitive pricing (match rivals)" },
  { value: "psychological", label: "Psychological pricing (£9.99)" },
  { value: "promotional",   label: "Promotional pricing (temporary discounts)" },
  { value: "premium",       label: "Premium pricing (signal quality)" },
  { value: "loss-leader",   label: "Loss leader (sell cheap, profit elsewhere)" }
];

const PROMOTION_TYPES = [
  { value: "tv",          label: "TV advertising" },
  { value: "social",      label: "Social media ads" },
  { value: "influencer",  label: "Influencer marketing" },
  { value: "sales-promo", label: "Sales promotions (BOGOF / discounts)" },
  { value: "pr",          label: "Public relations / PR stunts" },
  { value: "email",       label: "Direct marketing (email)" },
  { value: "sponsorship", label: "Sponsorship" },
  { value: "in-store",    label: "In-store displays / point-of-sale" },
  { value: "search",      label: "Search engine ads (Google etc.)" },
  { value: "loyalty",     label: "Loyalty programmes" }
];

// =============================================================================
// EXTENSION STRATEGIES — user-specified 8
// =============================================================================
const EXTENSION_STRATEGIES = [
  { value: "reduce-price-20",  label: "Reduce the price by 20%" },
  { value: "new-ad-campaign",  label: "Use a new advertising campaign" },
  { value: "new-version",      label: "Create a new version of the product" },
  { value: "add-features",     label: "Add features to the product" },
  { value: "new-retail-shop",  label: "Sell through a new retail shop" },
  { value: "e-commerce",       label: "Sell direct via e-commerce" },
  { value: "new-segment",      label: "Sell to a new market segment" },
  { value: "international",    label: "Sell to a new market (internationally)" }
];

// =============================================================================
// STAGE ORDER  — Intro → Growth → Maturity → EXTENSION → Decline → (FinalBoss)
//   `suggestedPricing`/`suggestedPromotion`: choices that earn the "consistency"
//   bonus on the rules scorer (and are referenced in the Gemini prompt).
// =============================================================================
const STAGES = [
  {
    key: "introduction",
    name: "INTRODUCTION",
    description: "Product is new on the market. Sales are low, costs are high. Goal: build awareness.",
    suggestedPricing: ["penetration", "skimming"],
    suggestedPromotion: ["tv", "social", "influencer", "pr"],
    durationMs: 240000
  },
  {
    key: "growth",
    name: "GROWTH",
    description: "Sales rising fast. Competitors enter the market. Goal: capture market share.",
    suggestedPricing: ["competitive", "psychological", "premium"],
    suggestedPromotion: ["social", "influencer", "sponsorship", "search"],
    durationMs: 240000
  },
  {
    key: "maturity",
    name: "MATURITY",
    description: "Sales peak. Market is saturated. Goal: retain customers and differentiate.",
    suggestedPricing: ["competitive", "promotional", "loyalty"],
    suggestedPromotion: ["sales-promo", "loyalty", "in-store", "email"],
    durationMs: 240000
  },
  {
    key: "extension",                  // ⬅️ now part of the main lifecycle, sits between Maturity and Decline
    name: "EXTENSION",
    description: "Sales beginning to slow. Choose an extension strategy to keep the product alive.",
    isExtension: true,                 // ⬅️ flag so the UI shows the extension form
    durationMs: 240000
  },
  {
    key: "decline",
    name: "DECLINE",
    description: "Sales fall. Either harvest the brand profitably or discontinue the product.",
    suggestedPricing: ["promotional", "loss-leader", "competitive"],
    suggestedPromotion: ["sales-promo", "in-store", "email"],
    durationMs: 240000
  }
];

const FINAL_BOSS_DURATION_MS = 60000;
const VOTE_DURATION_MS = 45000;

// =============================================================================
// STAGE-SPECIFIC KEYWORDS — used by the rules scorer for stage relevance bonus.
// Used the wrong stage's word? No bonus.
// =============================================================================
const STAGE_KEYWORDS = {
  introduction: ["awareness", "launch", "new", "early adopter", "trial", "introduce", "build interest", "first-mover", "initial", "skimming", "penetration", "establish"],
  growth:       ["competitor", "competition", "market share", "demand", "loyalty", "rapid", "expand", "scale", "differentiate", "winning"],
  maturity:     ["saturated", "saturation", "differentiate", "retain", "loyal", "retention", "peak", "plateau", "stable", "steady", "maintain"],
  extension:    ["extend", "extension", "revitalise", "revitalize", "refresh", "relaunch", "delay decline", "new market", "new segment", "international"],
  decline:      ["decline", "obsolete", "outdated", "phase out", "harvest", "discontinue", "clear stock", "fading", "shrink"]
};

// Reasoning / linking words required for top-tier quality scores.
const REASONING_WORDS = [
  "because", "therefore", "so that", "as a result", "this means",
  "consequently", "in order to", "since", "due to", "this is why",
  "however", "although", "for example", "for instance", "such as",
  "leads to", "results in", "thus", "hence"
];

// Generic words that DON'T count toward keyword scoring (too weak / vague).
const STOPWORDS = ["good", "bad", "nice", "great", "people", "thing", "stuff", "ok", "okay", "fine", "cool"];

// =============================================================================
// VOCABULARY HINT CHIPS — shown above each box to nudge students toward
// correct IGCSE business vocabulary while they think.
// =============================================================================
const HINT_CHIPS = {
  pricing:       ["competition", "costs", "revenue", "profit margin", "demand", "market share", "consumers", "price elasticity"],
  promotion:     ["target market", "demographic", "consumers", "brand awareness", "reach", "cost-effective", "engagement"],
  justification: ["beneficial because", "better than", "rather than", "alternative", "whereas", "compared to", "stage of life cycle", "would not work"]
};

// =============================================================================
// POWER-UP COSTS
// =============================================================================
const POWERUP_COSTS = {
  hint:     30,
  freeze:   50,
  sabotage: 75,
  example: 100     // shows model answer for ALL 3 boxes
};

// =============================================================================
// HINTS (cheap nudges from the Hint power-up)
// =============================================================================
const HINTS = {
  introduction: "Awareness is everything in Introduction — pricing usually goes either low (penetration) to flood the market, or high (skimming) for early adopters. Promotion needs to *create* demand, not just describe the product.",
  growth:       "In Growth, competitors arrive. You need to defend your share — that often means competitive pricing, building brand loyalty, and broader/cheaper promotion that scales fast.",
  maturity:     "Maturity = saturated market. Differentiation matters more than awareness. Loyalty schemes, sales promotions, and reminding existing customers tend to win here.",
  extension:    "A good extension strategy attacks the *reason* sales are slowing — boring product? Add features. Stale image? Rebrand or new campaign. Wrong audience? Find a new segment or market.",
  decline:      "Sales are falling. You either harvest profits (cut costs and ride it down) or trigger heavy promotional pricing and clear-out promotions to shift remaining stock."
};

// =============================================================================
// MODEL EXAMPLE ANSWERS (used by the Example power-up — costs 100 pts).
// One model answer per stage, broken into the three boxes students see:
//   pricingAdvantage — Box 1
//   promotionAdvantage — Box 2
//   justification — Box 3 (why beneficial AND why better than alternatives)
// Edit freely to suit your class.
// =============================================================================
const EXAMPLE_ANSWERS = {
  introduction: {
    contextStrategy: "Penetration pricing + Influencer marketing",
    pricingAdvantage: "Penetration pricing means the wireless earbuds launch at a low price, which encourages first-time buyers to try the product. This builds market share quickly because customers will switch from competitors to save money, which then helps the earbuds become recognised in the market.",
    promotionAdvantage: "Influencer marketing reaches our target market — 16–24 year olds — at low cost, because young consumers trust social recommendations more than traditional adverts. This means brand awareness for the earbuds spreads quickly and conversion rates are high.",
    justification: "These methods are beneficial because the product is new and we need rapid awareness; penetration price drives trial and influencer marketing drives reach. They are better than alternatives like skimming (which would slow adoption because no-one yet trusts the brand) and TV advertising (which is far more expensive and wastes spend on older demographics who aren't our target consumers)."
  },
  growth: {
    contextStrategy: "Competitive pricing + Search engine ads",
    pricingAdvantage: "Competitive pricing matches the wireless earbuds to rivals like Sony and Apple, keeping us in the consideration set. Going below would signal lower quality, going above would lose share, so matching protects our position as the market grows.",
    promotionAdvantage: "Search engine ads target consumers who are actively researching earbuds before buying — high-intent traffic. This is cost-effective because we pay only when someone clicks, and we capture the customer at the moment they're deciding which brand to buy.",
    justification: "These methods are beneficial during the growth stage because competition is intensifying and consumers are comparing options. They are better than alternatives like premium pricing (we don't have enough brand strength yet to justify a higher price than Sony) or TV advertising (mass-reach is wasteful when our buyers are already searching online with purchase intent)."
  },
  maturity: {
    contextStrategy: "Promotional pricing + Loyalty programme",
    pricingAdvantage: "Promotional pricing on the wireless earbuds (occasional sales) encourages existing customers to upgrade and tempts switchers from rival brands. In a saturated market this is essential because it's harder to grow naturally.",
    promotionAdvantage: "A loyalty programme retains existing earbud customers, which is far cheaper than acquiring new ones. Rewarding repeat purchases also encourages upselling of accessories, increasing the average revenue per customer.",
    justification: "These methods are beneficial because the market is saturated and growth has flattened, so retention and modest promotions matter most. They are better than alternatives like penetration pricing (we'd cannibalise our own margin in a market where consumers already know us) or TV advertising (the audience is already aware — what we need is to keep them, not introduce them)."
  },
  extension: {
    contextStrategy: "Sell to a new market segment (older professionals)",
    pricingAdvantage: "Holding the price steady while targeting older professionals working from home opens a new customer segment for the earbuds without devaluing the brand. This generates fresh revenue from a previously underserved market.",
    promotionAdvantage: "Targeted ads on LinkedIn and business publications reach this older professional segment directly. The promotion is cost-effective because the audience is well-defined and the messaging (productivity, noise cancellation for meetings) is specific.",
    justification: "These methods are beneficial because they delay decline by tapping demand we haven't yet reached. They are better than alternatives like reducing prices (which only harvests existing demand and erodes margin) or rebranding (which is expensive and could alienate our existing 16–24 audience)."
  },
  decline: {
    contextStrategy: "Promotional pricing + In-store displays",
    pricingAdvantage: "Promotional pricing on the wireless earbuds clears remaining stock before the product is discontinued, recovering inventory cost. Heavy discounts move units quickly even when demand is falling.",
    promotionAdvantage: "In-store displays at retail partners convert customers who are already shopping — no big ad budget needed. This is highly cost-effective in decline because the business doesn't want to spend on awareness for a fading product.",
    justification: "These methods are beneficial because the goal in decline is to harvest profit and exit cleanly, not to grow. They are better than alternatives like TV advertising (massive spend on a product being phased out makes no sense) or premium pricing (no-one will pay a high price for a product they know is being discontinued)."
  }
};
