/**
 * Personalization utilities for Sokogate AI chatbot
 * Handles user identity retrieval from cookies, localStorage, and CRM integrations
 */

/**
 * Get a cookie value by name (simple implementation)
 */
function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const cookies = document.cookie.split(';');
  for (let c of cookies) {
    const [key, ...rest] = c.trim().split('=');
    if (key === name) {
      return decodeURIComponent(rest.join('='));
    }
  }
  return null;
}

/**
 * Set a cookie with optional expiry in days
 */
function setCookie(name, value, days) {
  if (typeof document === 'undefined') return;
  let expires = '';
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = '; expires=' + date.toUTCString();
  }
  document.cookie = name + '=' + encodeURIComponent(value) + expires + '; path=/';
}

/**
 * Remove a cookie
 */
function removeCookie(name) {
  if (typeof document === 'undefined') return;
  document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT;';
}

/**
 * Retrieve user identity from various sources
 * Priority: CRM > localStorage > cookies > extracted from conversation
 */
export const getUserIdentity = () => {
  if (typeof window === 'undefined') return {};

  // Try to get from CRM integration (if available)
  const crmData = window.SokogateCRM?.getUserData?.();
  if (crmData && (crmData.name || crmData.company)) {
    return {
      name: crmData.name || null,
      company: crmData.company || null,
      email: crmData.email || null,
      source: 'crm'
    };
  }

  // Try to get from localStorage
  const storageData = localStorage.getItem('sokogate_user');
  if (storageData) {
    try {
      const parsed = JSON.parse(storageData);
      if (parsed.name || parsed.company) {
        return {
          name: parsed.name || null,
          company: parsed.company || null,
          email: parsed.email || null,
          source: 'localStorage'
        };
      }
    } catch (e) {
      console.warn('Failed to parse user data from localStorage:', e);
    }
  }

  // Try to get from cookies
  const cookieName = getCookie('sokogate_user_name');
  const cookieCompany = getCookie('sogogate_user_company');
  const cookieEmail = getCookie('sokogate_user_email');

  if (cookieName || cookieCompany) {
    return {
      name: cookieName || null,
      company: cookieCompany || null,
      email: cookieEmail || null,
      source: 'cookies'
    };
  }

  // Return empty object if no data found
  return {
    name: null,
    company: null,
    email: null,
    source: 'none'
  };
};

/**
 * Save user identity to localStorage and cookies for persistence
 */
export const saveUserIdentity = ({ name, company, email }) => {
  if (typeof window === 'undefined') return;

  // Save to localStorage
  try {
    localStorage.setItem('sokogate_user', JSON.stringify({
      name,
      company,
      email,
      timestamp: Date.now()
    }));
  } catch (e) {
    console.warn('Failed to save user data to localStorage:', e);
  }

  // Save to cookies (expire in 30 days)
  try {
    if (name) setCookie('sokogate_user_name', name, 30);
    if (company) setCookie('sokogate_user_company', company, 30);
    if (email) setCookie('sokogate_user_email', email, 30);
  } catch (e) {
    console.warn('Failed to save user data to cookies:', e);
  }
};

/**
 * Clear user identity data (for logout/privacy)
 */
export const clearUserIdentity = () => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem('sokogate_user');
  } catch (e) {
    console.warn('Failed to clear user data from localStorage:', e);
  }

  try {
    removeCookie('sokogate_user_name');
    removeCookie('sokogate_user_company');
    removeCookie('sokogate_user_email');
  } catch (e) {
    console.warn('Failed to clear user data from cookies:', e);
  }
};

/**
 * Extract user identity from conversation text (fallback method)
 * This enhances the existing extractNameFromText and extractCompanyFromText functions
 */
export const extractIdentityFromText = (text) => {
  if (!text || typeof text !== 'string') return {};

  const namePatterns = [
    /\b(my name is|i am|i'm|this is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /\b(name's?|called)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:is my name|here)\b/i
  ];

  const companyPatterns = [
    /(?:from|at|working at|company|organization|firm)\s+([A-Z][A-Za-z0-9\s&]+?)(?:\.|,|;|$)/i,
    /([A-Z][A-Za-z0-9\s&]+?(?:Inc|Ltd|LLC|Ltd\.|Corp|Co|Company))/i,
    /\b([A-Z][A-Za-z0-9\s&]+)\s+(?:Ltd|Inc|Corp|Company)\b/i
  ];

  let name = null;
  let company = null;

  // Extract name
  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match && match[2]) {
      name = match[2].trim();
      break;
    }
    // Handle alternative pattern where name is first group
    if (match && match[1]) {
      name = match[1].trim();
      break;
    }
  }

  // Extract company
  for (const pattern of companyPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      company = match[1].trim();
      break;
    }
  }

  return { name, company };
};
