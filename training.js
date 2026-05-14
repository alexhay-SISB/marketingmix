/* ==========================================================================
   AI GRADING — TRAINING MATERIAL
   --------------------------------------------------------------------------
   Pricing strategy theory + worked model answers (HIGH and LOW band).
   These are sent to Claude with every grade request so it marks to YOUR
   standards. Edit freely — the next student submission will use the new
   material immediately.
   ========================================================================== */

// =============================================================================
// PRICING STRATEGY THEORY — when each strategy is GOOD vs POOR, and which PLC
// stages it suits. Keys MUST match the `value` field in PRICING_STRATEGIES
// (see products.js).
// =============================================================================
const PRICING_THEORY = {
  penetration:
    "PENETRATION PRICING is good for mass-market products that are cheap to produce. " +
    "It is bad for products with high R&D costs. " +
    "It is also poor for products in mature and highly competitive markets when used by smaller brands. " +
    "Best in INTRODUCTION and GROWTH stages. Worst for MATURITY and DECLINE.",

  skimming:
    "PRICE SKIMMING is good for niche-market products with little or no competition. " +
    "Good for high-technology products, especially new versions. " +
    "Good for products with high R&D costs that are desirable in the current market. " +
    "Poor for mass-market competitive products. " +
    "Best in INTRODUCTION and GROWTH stages. Worst for MATURITY and DECLINE.",

  "cost-plus":
    "COST-PLUS PRICING is good for any food/beverage products. " +
    "Good for simple or everyday products. " +
    "Poor for highly fashionable products or products in highly competitive markets. " +
    "Good at any stage of the product life cycle EXCEPT decline.",

  competitive:
    "COMPETITIVE PRICING is perfect for highly competitive markets and mass-market products from big companies. " +
    "Bad for small brands or more niche products. " +
    "Good at any stage of the product life cycle.",

  promotional:
    "PROMOTIONAL PRICING is good for older stock products (e.g. fashion) or perishable products. " +
    "Also good for brand-new products to the market. " +
    "Best for products in the DECLINE stage. " +
    "Also acceptable in INTRODUCTION and GROWTH depending on how competitive the market is. " +
    "VERY POOR for the MATURITY stage.",

  premium:
    "PREMIUM PRICING is only good for luxury products. " +
    "Can be used in any stage of the product life cycle.",

  "loss-leader":
    "LOSS LEADER pricing is good for products that are cheap to produce and are everyday items. " +
    "The brand or shop should sell many other items in order to profit from the related sales " +
    "(e.g. a games console is sold cheap so games can be sold at full price). " +
    "Good at any stage of the lifecycle, BEST at MATURITY.",

  psychological:
    "PSYCHOLOGICAL PRICING (e.g. £9.99) works well for everyday consumer goods sold to the mass market. " +
    "Encourages impulse buying. Less effective for premium / luxury products where buyers are less price-sensitive. " +
    "Acceptable in any stage except DECLINE."
};

// =============================================================================
// MODEL ANSWERS — pairs of HIGH-band and LOW-band exemplars that show Claude
// what an excellent student answer looks like vs a weak one for THIS class.
// Add more freely — Claude will see all of them with every grade request.
// =============================================================================
const MODEL_ANSWERS = [
  {
    title: "New Sneakers — Introduction stage",
    product: "New Sneakers",
    stage: "Introduction",
    pricing: "Penetration",
    promotion: "Social Media",
    high: `BOX 1 (pricing pros/cons): Penetration price would lead to a higher market share as it would encourage customers to buy more sneakers as they are cheaper than their competitors. However, it would also mean less profits for the shoe company and this could lead to not being able to spend on new features for sneakers later on.

BOX 2 (promotion pros/cons): Social media is excellent because the market segment of sneakers is young people and they use social media a lot, so this would lead to high uptake and therefore higher sales. However, this is only one market segment and this might miss out on other, more wealthy demographics, such as middle-age runners, therefore limiting exposure.

BOX 3 (comparison): A combination of penetration pricing and social media is better than skimming + TV advertising because young sneaker buyers are price-sensitive and live online; TV would waste budget on demographics who aren't the target.`,
    low: `BOX 1 (pricing pros/cons): Penetration price is good because they can sell more sneakers because it cheaper. But it is not so good because it makes less profit.

BOX 2 (promotion pros/cons): Social media is good because many people will see the advert for sneakers. But some people do not pay attention to adverts so the sneakers might not sell very well.

BOX 3 (comparison): It is better than other things because it works.`
  },
  {
    title: "Baby Food — Maturity stage",
    product: "Baby Food",
    stage: "Maturity",
    pricing: "Promotional",
    promotion: "In-store display",
    high: `BOX 1 (pricing pros/cons): Having promotional prices might make customers purchase the baby food as it might be cheaper than competitors enticing customers to choose this brand, this would lead to higher sales. However, it would reduce the revenue and lead to a loss in profits overall.

BOX 2 (promotion pros/cons): In-store displays allow potential customers to easily see the baby food, this increases exposure and could increase interest and therefore sales. This would however increase costs and customers might still prefer competitors due to better branding, price or product quality.

BOX 3 (comparison): A promotional price + in-store display works better than premium pricing + TV advertising for baby food at maturity because parents are price-sensitive grocery shoppers who decide at the shelf, not in front of the TV.`,
    low: `BOX 1 (pricing pros/cons): Promotional price is good because it makes people buy more baby food as the price is cheap. But then they do not make as much profit.

BOX 2 (promotion pros/cons): In-store displays will make people see the baby food and then people might buy more and sales increase. However, they might not see the display and then no one will buy the baby food.

BOX 3 (comparison): It's better than other ways because more people see it.`
  },
  {
    title: "Music Streaming Service — Growth stage",
    product: "Music Streaming Service",
    stage: "Growth",
    pricing: "Price Skimming",
    promotion: "Sponsorship",
    high: `BOX 1 (pricing pros/cons): By charging a higher price in the growth stage when the music service is popular will mean the R&D costs of making the service are covered and that the business will make higher revenues. This should lead to more profits. However, it might also slow uptake of new customers as this is a competitive market with an established market leader. This means the music service might struggle to get large numbers of subscribers.

BOX 2 (promotion pros/cons): Using sponsorship will help the music service become known to the right target market. They could sponsor famous musicians and then the fans would subscribe to that service, increasing awareness and brand loyalty. However, other people who don't follow that musician would not be targeted as well as other options, such as TV advertising, leading to fewer subscribers.

BOX 3 (comparison): Skimming + sponsorship is better than competitive pricing + email marketing because the music service still needs to recover R&D costs, and sponsorship targets passionate fans who become loyal subscribers — emails would mostly hit cold leads and have low conversion.`,
    low: `BOX 1 (pricing pros/cons): The music service can make more profits from skimming as it is more expensive. However, some people might not buy the service because others are cheaper.

BOX 2 (promotion pros/cons): Sponsorship is good because people see someone famous using the music service and then want to copy the music star so many people will subscribe and make more profit. However, some people do not like that music star and so won't buy the app and it lose potential revenue.

BOX 3 (comparison): It is better than another one because it makes more money.`
  }
];

// =============================================================================
// CORE PRINCIPLES — sent verbatim to Claude as universal grading rules.
// Edit freely as your marking standards evolve.
// =============================================================================
const GRADING_PRINCIPLES = [
  "The student MUST mention the product name (or a recognised synonym) somewhere in their answer. If the product is not mentioned at all, score 0.",
  "Reward BALANCED reasoning — both an advantage AND a disadvantage in boxes 1 and 2.",
  "Reward LINKED reasoning using words like \"because\", \"therefore\", \"this means\", \"this would lead to\".",
  "Reward correct, stage-specific business vocabulary (e.g. \"awareness\" in Introduction, \"saturated\" in Maturity).",
  "Reward strategies that match the stage as set out in PRICING THEORY. Penalise strategies that contradict the theory.",
  "In box 3 (comparison), reward students who name a credible alternative AND explain why their choice is better — vague or generic comparisons score lower."
];
