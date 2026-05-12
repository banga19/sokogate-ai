/**
 * Web Product Search Module for Sokogate AI
 * 
 * Fetches real-time product data from sokogate.com website
 * Uses cheerio for HTML parsing with fallback to JSON-LD structured data
 */

import * as cheerio from 'cheerio';

// Configuration from environment variables
const SITE_BASE = process.env.SOKOGATE_SITE_URL?.replace(/\/$/, '') || 'https://sokogate.com';
const SEARCH_PATHS = [
  '/search?q={query}',
  '/products?search={query}',
  '/shop?q={query}',
  '/search?keyword={query}',
];
const DEFAULT_SEARCH_PATH = SEARCH_PATHS[0];

const CACHE_TTL_MS = parseInt(process.env.SCRAPER_CACHE_TTL || '600000'); // 10 minutes default

// CSS selectors for common e-commerce themes - ordered by commonality
const SELECTORS = {
  // Container for each product on the listing page
  productCard: process.env.PRODUCT_CARD_SELECTOR || 
    '.product-card, .product-item, .product, .item, [data-product], .product-grid-item, .product-list-item, article.product, li.product',
  // Name of the product
  productName: process.env.PRODUCT_NAME_SELECTOR || 
    '.product-name, .product-title, .title, h2, h3, .name, [itemprop="name"]',
  // Price element
  productPrice: process.env.PRODUCT_PRICE_SELECTOR || 
    '.price, .product-price, .current-price, .price-current, [itemprop="price"]',
  // Link to product detail page
  productLink: process.env.PRODUCT_LINK_SELECTOR || 
    'a[href*="/products/"], a[href*="/product/"], a.product-link, a[href*="/item/"]',
  // Image
  productImage: process.env.PRODUCT_IMAGE_SELECTOR || 
    '.product-image img, img.product-img, img[src*="product"]',
  // SKU or product code
  productSku: process.env.PRODUCT_SKU_SELECTOR || 
    '.sku, .product-sku, .product-code, [itemprop="sku"]',
  // Stock/availability indicator
  productStock: process.env.PRODUCT_STOCK_SELECTOR || 
    '.stock, .availability, .in-stock, .out-of-stock, [itemprop="availability"]',
  // Description on listing page (if visible)
  productDesc: process.env.PRODUCT_DESC_SELECTOR || 
    '.description, .product-description, .short-description, [itemprop="description"]',
};

// Request headers to mimic a real browser
const REQUEST_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; SokogateAI/1.0; +https://sokogate.com/bot)',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Accept-Encoding': 'gzip, deflate',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'DNT': '1',
};

/**
 * Simple in-memory cache with TTL
 */
class SimpleCache {
  constructor(ttlMs = CACHE_TTL_MS) {
    this.cache = new Map();
    this.ttl = ttlMs;
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key, value) {
    this.cache.set(key, { value, timestamp: Date.now() });
  }

  clear() {
    this.cache.clear();
  }
}

const searchCache = new SimpleCache();

/**
 * Fetch URL with retry and timeout
 */
async function fetchURL(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const response = await fetch(url, {
      ...options,
      headers: { ...REQUEST_HEADERS, ...options.headers },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }
    return await response.text();
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

/**
 * Extract JSON-LD Product data from a page
 * @returns {Array|null} Array of product objects from JSON-LD or null
 */
function extractJSONLDProducts($) {
  const products = [];
  $('script[type="application/ld+json"]').each((i, el) => {
    try {
      const text = $(el).html();
      if (!text) return;
      const data = JSON.parse(text);
      
      // Handle single product or array
      const items = Array.isArray(data) ? data : [data];
      
      items.forEach(item => {
        // Check if it's a Product type
        if (item['@type'] === 'Product' || (item['@graph'] && item['@graph'].some(g => g['@type'] === 'Product'))) {
          // Unpack from @graph if present
          let product = item;
          if (item['@graph']) {
            product = item['@graph'].find(g => g['@type'] === 'Product');
          }
          if (product) {
            products.push({
              name: product.name || null,
              description: product.description || null,
              price: product.offers?.price ? parseFloat(product.offers.price) : null,
              currency: product.offers?.priceCurrency || null,
              sku: product.sku || null,
              availability: product.offers?.availability || null,
              image: product.image || null,
              url: product.url || product['@id'] || null,
            });
          }
        }
      });
    } catch (e) {
      // Ignore malformed JSON
    }
  });
  return products.length ? products : null;
}

/**
 * Parse a price string to numeric value
 */
function parsePrice(priceStr, currency = 'USD') {
  if (!priceStr) return null;
  // Remove non-numeric except decimal point and thousands separators
  const cleaned = priceStr.replace(/[^0-9.,]/g, '').replace(',', '.');
  const match = cleaned.match(/[\d.]+/);
  if (match) {
    const num = parseFloat(match[0]);
    return isFinite(num) ? num : null;
  }
  return null;
}

/**
 * Extract products from a search results page HTML
 */
function extractProductsFromHTML($, limit = 5) {
  const products = [];

  // Try JSON-LD first (most reliable)
  const jsonldProducts = extractJSONLDProducts($);
  if (jsonldProducts) {
    return jsonldProducts.slice(0, limit).map(p => ({
      name: p.name,
      description: p.description,
      price: p.price,
      currency: p.currency || 'USD',
      stock_quantity: p.availability?.includes('InStock') ? 100 : 0, // approximate
      sku: p.sku,
      specifications: {},
      is_active: true,
      url: p.url || null,
    }));
  }

  // Fallback: remove scripts to simplify selector parsing
  $('script').remove();

  // Parse via selectors
  const cards = $(SELECTORS.productCard);
  if (cards.length === 0) {
    // If no cards found with specific selectors, look for repeating product patterns
    // Heuristic: find elements with both a price and a link to a product page
    const allLinks = $('a[href*="/products/"], a[href*="/product/"]');
    if (allLinks.length > 0) {
      cards.push(...allLinks.slice(0, limit * 2));
    } else {
      return [];
    }
  }

  cards.each((i, card) => {
    if (products.length >= limit) return false; // break

    const $card = $(card);
    
    // Find name within card
    let name = null;
    $card.find(SELECTORS.productName).each((j, el) => {
      const txt = $(el).text().trim();
      if (txt && txt.length > 2 && txt.length < 200) {
        name = txt;
        return false; // break inner loop
      }
    });
    if (!name) {
      // Try title attribute or alt text
      name = $card.attr('title') || $card.find('img').attr('alt') || null;
    }

    // Find price
    let priceText = null;
    $card.find(SELECTORS.productPrice).each((j, el) => {
      const txt = $(el).text().trim();
      if (txt && /\d/.test(txt)) {
        priceText = txt;
        return false;
      }
    });
    const price = parsePrice(priceText);

    // Find link to product page
    let productUrl = null;
    $card.find(SELECTORS.productLink).each((j, el) => {
      const href = $(el).attr('href');
      if (href) {
        productUrl = href.startsWith('http') ? href : new URL(href, SITE_BASE).href;
        return false;
      }
    });
    // If no link found, maybe the card itself is a link
    if (!productUrl) {
      const href = $card.attr('href');
      if (href) productUrl = href.startsWith('http') ? href : new URL(href, SITE_BASE).href;
    }

    // Try to get SKU if visible
    let sku = null;
    $card.find(SELECTORS.productSku).each((j, el) => {
      const txt = $(el).text().trim();
      if (txt) {
        sku = txt;
        return false;
      }
    });

    // Stock/availability
    let stockText = null;
    $card.find(SELECTORS.productStock).each((j, el) => {
      const txt = $(el).text().trim();
      if (txt) {
        stockText = txt.toLowerCase();
        return false;
      }
    });
    const stock_quantity = stockText?.includes('out') || stockText?.includes('0') ? 0 : 100;

    // Description
    let description = null;
    $card.find(SELECTORS.productDesc).each((j, el) => {
      const txt = $(el).text().trim();
      if (txt && txt.length > 10) {
        description = txt;
        return false;
      }
    });

    if (name) {
      products.push({
        name,
        description: description || `${name} - Available on sokogate.com`,
        price,
        currency: 'USD',
        stock_quantity,
        sku: sku || `WEB-${Date.now()}-${Math.random().toString(36).substr(2,5)}`,
        specifications: {},
        is_active: true,
        url: productUrl,
        price_text: priceText,
      });
    }
  });

  return products;
}

/**
 * Build search URL(s) to try
 */
function buildSearchURLs(query) {
  const encoded = encodeURIComponent(query);
  const urls = [];
  
  // Try configured search paths
  const pathsToTry = process.env.SOKOGATE_SEARCH_PATHS ? 
    process.env.SOKOGATE_SEARCH_PATHS.split(',').map(p => p.trim()) : 
    SEARCH_PATHS;
  
  pathsToTry.forEach(path => {
    const url = `${SITE_BASE}${path.replace('{query}', encoded)}`;
    urls.push(url);
  });
  
  // Also try category + query if a category is detected in query
  const CATEGORY_PATHS = {
    electronics: '/electronics?search=',
    apparel: '/apparel?search=',
    agriculture: '/agriculture?search=',
    machinery: '/machinery?search=',
    'health & beauty': '/health-beauty?search=',
    'home & construction': '/home-construction?search=',
    'auto parts': '/auto-parts?search=',
    'sports & toys': '/sports-toys?search=',
  };
  
  const q = query.toLowerCase();
  for (const [cat, path] of Object.entries(CATEGORY_PATHS)) {
    if (q.includes(cat.split('&')[0])) { // partial match
      urls.push(`${SITE_BASE}${path}${encoded}`);
    }
  }
  
  return urls;
}

/**
 * Search for products on sokogate.com website
 * @param {string} query - Search query
 * @param {number} limit - Max results
 * @returns {Promise<Array>} Array of product objects
 */
export async function searchProducts(query, limit = 5) {
  if (!query || typeof query !== 'string' || query.trim().length < 3) {
    return [];
  }

  const cacheKey = `${query.toLowerCase().trim()}:${limit}`;
  const cached = searchCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const searchURLs = buildSearchURLs(query);
  let lastError = null;

   for (const url of searchURLs) {
     try {
       const html = await fetchURL(url);
       const $ = cheerio.load(html);

       // Do NOT remove script tags here — JSON-LD extraction needs them
       const products = extractProductsFromHTML($, limit);

       if (products.length > 0) {
         // Cache results
         searchCache.set(cacheKey, products);
         return products;
       }
     } catch (err) {
       console.warn(`Web search attempt failed for ${url}:`, err.message);
       lastError = err;
       // Continue to next URL
     }
   }

  // All attempts failed
  console.error('All web search attempts failed:', lastError?.message);
  return [];
}

/**
 * Fetch detailed info for a single product by URL
 * Called when we need to refresh price/stock for a specific product
 */
export async function fetchProductDetails(productUrl) {
  if (!productUrl) return null;
  
  const cacheKey = `detail:${productUrl}`;
  const cached = searchCache.get(cacheKey);
  if (cached) return cached;

   try {
     const html = await fetchURL(productUrl);
     const $ = cheerio.load(html);

     // Try JSON-LD on product page (most reliable)
     const jsonldProducts = extractJSONLDProducts($);
     if (jsonldProducts && jsonldProducts[0]) {
       const p = jsonldProducts[0];
       const result = {
         name: p.name,
         description: p.description,
         price: p.price,
         currency: p.currency || 'USD',
         stock_quantity: p.availability?.includes('InStock') ? 100 : 0,
         sku: p.sku,
         specifications: {},
         url: productUrl,
       };
       searchCache.set(cacheKey, result);
       return result;
     }

     // Fallback selectors on product detail page
     // (Could add detailed extraction here)
     return null;
   } catch (err) {
    console.warn(`Failed to fetch product details ${productUrl}:`, err.message);
    return null;
  }
}

/**
 * Refresh cache (for admin use)
 */
export function clearCache() {
  searchCache.clear();
}
