/**
 * Test script for Sokogate AI Chatbot - Category Detection & Branching
 * Run with: node test-category-branches.js
 */

// Simulate improved detectCategory function from route.js (with scoring)
function detectCategory(text) {
  if (!text) return "Other";
  
  // Tokenize: split into words, lowercase, remove non-alphanumeric
  const rawTokens = text.toLowerCase().split(/\W+/).filter(Boolean);
  const tokenSet = new Set(rawTokens);
  
  // Add singular forms (strip trailing 's') to handle plurals
  rawTokens.forEach(t => {
    if (t.endsWith('s') && t.length > 1) {
      tokenSet.add(t.slice(0, -1));
    }
  });

  const map = {
    "Apparel & Fabrics": ["clothing","apparel","fabric","textile","garment","fashion","shirt","dress","jeans","uniform", "clothes", "garments", "apparel"],
    "Electronics": ["electronics","electronic","gadget","phone","computer","laptop","tv","camera","component","circuit", "pc", "laptop"],
    "Agriculture & Food": ["agriculture","food","farm","crop","grain","fruit","vegetable","meat","dairy","seafood", "produce", "agri"],
    "Auto Parts": ["auto","car","vehicle","part","tire","engine","brake","wheel","automotive", "automobile", "motorcycle"],
    "Health & Beauty": ["health","beauty","cosmetic","skincare","medicine","pharmaceutical","supplement", "cosmetics", "skin", "care", "pharma"],
    "Machinery & Parts": ["machinery","machine","equipment","tool","industrial","engine","motor", "machines", "tools", "heavy"],
    "Home & Construction": ["home","construction","furniture","building","material","decoration","interior", "furnishings", "fixtures"],
    "Sports & Toys": ["sports","toy","game","equipment","fitness","outdoor","play","recreation", "sport", "toys", "games", "sporting"]
  };

  // Score categories by number of matched keywords
  let bestCategory = "Other";
  let bestScore = 0;

  for (const [cat, keywords] of Object.entries(map)) {
    const score = keywords.reduce((sum, kw) => sum + (tokenSet.has(kw) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      bestCategory = cat;
    }
  }

  return bestScore > 0 ? bestCategory : "Other";
}

// Test cases for each category (buyer and supplier variations)
const testCases = [
  // Apparel & Fabrics
  { category: "Apparel & Fabrics", buyer: "I need clothing in bulk, shirts and dresses", supplier: "We are a garment manufacturer" },
  
  // Electronics
  { category: "Electronics", buyer: "I want to source phones and laptops in bulk", supplier: "We supply electronic components" },
  
  // Agriculture & Food
  { category: "Agriculture & Food", buyer: "Need agricultural products, grains and vegetables", supplier: "We are food exporters" },
  
  // Auto Parts
  { category: "Auto Parts", buyer: "Looking for car engines and tires", supplier: "We manufacture automotive parts" },
  
  // Health & Beauty
  { category: "Health & Beauty", buyer: "Need cosmetics and skincare products", supplier: "We produce supplements and medicines" },
  
  // Machinery & Parts
  { category: "Machinery & Parts", buyer: "Looking for industrial equipment and tools", supplier: "We supply heavy machinery" },
  
  // Home & Construction
  { category: "Home & Construction", buyer: "Need furniture and building materials", supplier: "We manufacture construction materials" },
  
  // Sports & Toys
  { category: "Sports & Toys", buyer: "Looking for sports equipment and toys", supplier: "We produce fitness equipment" },
  
  // Edge case: Other
  { category: "Other", buyer: "I need miscellaneous items", supplier: "We sell various products" }
];

console.log("=== CATEGORY DETECTION TEST ===\n");

let passed = 0;
let failed = 0;

testCases.forEach(({ category, buyer, supplier }) => {
  const buyerDetected = detectCategory(buyer);
  const supplierDetected = detectCategory(supplier);
  
  const buyerOk = buyerDetected === category;
  const supplierOk = supplierDetected === category;
  
  console.log(`Category: ${category.padEnd(25)}`);
  console.log(`  Buyer text: "${buyer}"`);
  console.log(`  Detected: ${buyerDetected} ${buyerOk ? '✅' : '❌'}`);
  console.log(`  Supplier text: "${supplier}"`);
  console.log(`  Detected: ${supplierDetected} ${supplierOk ? '✅' : '❌'}`);
  console.log();
  
  if (buyerOk && supplierOk) {
    passed++;
  } else {
    failed++;
  }
});

console.log(`=== SUMMARY ===`);
console.log(`Passed: ${passed}/${testCases.length}`);
console.log(`Failed: ${failed}/${testCases.length}`);

// Edge cases
console.log("\n=== EDGE CASES ===\n");

const edgeCases = [
  { text: "I need electronics for my store", expected: "Electronics" },
  { text: "Looking for clothes", expected: "Apparel & Fabrics" },
  { text: "Farm equipment needed", expected: "Machinery & Parts" }, // Now equipment dominates?
  { text: "Beauty products wholesale", expected: "Health & Beauty" },
  { text: "Construction materials for a project", expected: "Home & Construction" },
  { text: "Sports gear for a team", expected: "Sports & Toys" },
  { text: "Auto parts for repair", expected: "Auto Parts" },
  { text: "Food products import", expected: "Agriculture & Food" },
  { text: "Medical supplies needed", expected: "Health & Beauty" }
];

edgeCases.forEach(({ text, expected }) => {
  const detected = detectCategory(text);
  const ok = detected === expected;
  console.log(`"${text}" => ${detected} (expected: ${expected}) ${ok ? '✅' : '❌'}`);
});

console.log("\n=== TEST COMPLETE ===\n");
