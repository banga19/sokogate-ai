/**
 * Lead capture utilities for Sokogate AI chatbot
 * Handles WhatsApp deep-linking, email capture, and GDPR-compliant data collection
 */

/**
 * Generate WhatsApp deep link with pre-filled message
 * @param {string} phoneNumber - Phone number in international format (e.g., "+254758947124")
 * @param {string} message - Pre-filled message text
 * @returns {string} WhatsApp deep link URL
 */
export const generateWhatsAppLink = (phoneNumber, message) => {
  if (!phoneNumber) return '';
  
  // Clean phone number (remove non-digits)
  const clean = phoneNumber.replace(/\D/g, '');
  
  // Encode message for URL
  const encoded = encodeURIComponent(message);
  
  return `https://wa.me/${clean}?text=${encoded}`;
};

/**
 * Extract and validate email from text
 * @param {string} text - Text to extract email from
 * @returns {Object} Object with email and validation status
 */
export const extractAndValidateEmail = (text) => {
  if (!text || typeof text !== 'string') return { email: null, valid: false };
  
  // Email regex pattern
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i);
  
  if (match) {
    const email = match[0];
    const valid = emailRegex.test(email);
    return { email: valid ? email : null, valid };
  }
  
  return { email: null, valid: false };
};

/**
 * Generate GDPR-compliant privacy notice
 * @returns {string} Privacy notice text
 */
export const getPrivacyNotice = () => {
  return `We respect your privacy. By sharing your information, you consent to us storing and using it to provide our services. We never sell your data to third parties. You can request deletion of your data at any time.`;
};

/**
 * Check if user has given consent for data collection
 * @returns {boolean} True if consent has been given
 */
export const hasDataConsent = () => {
  if (typeof window === 'undefined') return false;
  
  const consent = localStorage.getItem('sokogate_privacy_consent');
  return consent === 'true';
};

/**
 * Record user consent for data collection
 * @param {boolean} consent - Whether user has given consent
 */
export const setDataConsent = (consent) => {
  if (typeof window === 'undefined') return;
  
  if (consent) {
    localStorage.setItem('sokogate_privacy_consent', 'true');
  } else {
    localStorage.removeItem('sokogate_privacy_consent');
  }
};

/**
 * Generate email capture prompt for chat summary
 * @param {string} visitorId - Visitor ID
 * @param {string} businessName - Business name
 * @returns {string} Email capture prompt
 */
export const getEmailCapturePrompt = (visitorId, businessName) => {
  return `Would you like me to email you a summary of this conversation for your records? 

Please provide your email address and I'll send you a transcript of our chat along with any product information we discussed.

${getPrivacyNotice()}`;
};

/**
 * Format lead data for email transmission
 * @param {Object} leadData - Lead data object
 * @returns {string} Formatted email content
 */
export const formatLeadEmail = (leadData) => {
  const { name, company, email, phone, whatsapp, message, score, intent_summary, category } = leadData;
  
  return `
SOKOGATE LEAD SUMMARY
====================

Visitor Information:
- Name: ${name || 'Not provided'}
- Company: ${company || 'Not provided'}
- Email: ${email || 'Not provided'}
- Phone/WhatsApp: ${whatsapp || phone || 'Not provided'}

Inquiry Details:
- Message: ${message || 'Not provided'}
- Category: ${category || 'Not detected'}
- Lead Score: ${score || 'Not scored'}
- Intent Summary: ${intent_summary || 'Not provided'}

Conversation Timestamp: ${new Date().toLocaleString()}

This lead was generated through the Sokogate AI chatbot.
  `.trim();
};