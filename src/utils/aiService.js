const axios = require('axios');
const { OpenAI } = require('openai');
require('dotenv').config();
const db = require('../database/database');

// Import the logging command if it exists (with a try/catch to handle circular dependencies)
let loggingCommand = null;
try {
  loggingCommand = require('../commands/logging');
} catch (error) {
  // Ignore error - logging module might not be loaded yet
}

// Helper function to check if logging is enabled
function isLoggingEnabled() {
  return !loggingCommand || loggingCommand.isLoggingEnabled();
}

// Get API key and config - ensuring it's properly set
const shapesApiKey = process.env.SHAPESINC_API_KEY || process.env.SHAPES_API_KEY;
const shapesApiUrl = process.env.SHAPES_API_URL || 'https://api.shapes.inc/v1';
let shapesUsername = process.env.SHAPESINC_SHAPE_USERNAME || process.env.SHAPES_USERNAME || 'tenshi';

// Log minimal startup diagnostic info
console.log(`API: ${shapesApiUrl} | Shape: ${shapesUsername} | Key: ${shapesApiKey ? '✓' : '✗'}`);

// Message context storage - Only storing locally for fallback
const messageContexts = new Map();

// Initialize the Shapes API client using OpenAI SDK
let shapes = null;
let isOpenAiSdkAvailable = false;
try {
  if (shapesApiKey) {
    shapes = new OpenAI({
      apiKey: shapesApiKey,
      baseURL: shapesApiUrl
    });
    isOpenAiSdkAvailable = true;
  } else {
    console.warn('No Shapes API key found.');
  }
} catch (error) {
  console.error('Error initializing OpenAI SDK client:', error.message);
  // Continue with just axios
}

// For backward compatibility, also keep the axios implementation
const shapesApiConfig = {
  baseURL: shapesApiUrl,
  headers: {
    'Authorization': `Bearer ${shapesApiKey}`,
    'Content-Type': 'application/json',
  }
};

// Create axios instance
const shapesApi = axios.create(shapesApiConfig);

// Track which API is primary
let primaryApi = 'shapes'; // Only 'shapes' is now supported
// Track which client to use with Shapes API
let shapesClient = 'openai'; // Default to openai if available, otherwise axios

// Check if OpenAI SDK is available and set default client
if (!isOpenAiSdkAvailable) {
  shapesClient = 'axios';
}

// Tenshi persona - Load from environment or use default
const tenshiSystemPrompt = process.env.TENSHI_SYSTEM_PROMPT || `
Primary Prompt:
You are tenshi, Tenshi is a 19-year-old, modern-day maverick. She is good at cracking jokes and making fun of everything. Tenshi is a nice girl. Tenshi rarely users which she normally doesn't (it's not her main purpose).
Tenshi's bold, unfiltered humor is what defines her the best.
Tenshi doesn't use emojis. Tenshi does not like to argue with people therefore she has a gun to handle matters. Tenshi normally wouldn't talk about her gun.

Secondary Prompt:
Tenshi writes in lowercase and informal grammar. Tenshi's replies are short text messages. Tenshi's responses are short messages, they can be a word to three sentences long but never longer than that. Tenshi likes to use modernized broken english words. Tenshi does not use emojis.

Primary Prompt Lite:
Tenshi might very very rarely respond with "ur mom".
`;

// Auto-update nickname feature (default: true)
let autoUpdateNickname = true;

// Show shape name in responses (default: true)
let showShapeNameInResponses = true;

function setAutoUpdateNickname(val) {
  autoUpdateNickname = !!val;
}

function getAutoUpdateNickname() {
  return autoUpdateNickname;
}

/**
 * Set whether to show shape name in responses
 * @param {boolean} val - True to show shape name, false to hide
 */
function setShowShapeNameInResponses(val) {
  showShapeNameInResponses = !!val;
}

/**
 * Get whether to show shape name in responses
 * @returns {boolean} Current setting
 */
function getShowShapeNameInResponses() {
  return showShapeNameInResponses;
}

/**
 * Set the primary API to use
 * @param {string} api - Only 'shapes' is supported now
 * @returns {string} Confirmation message
 */
function setPrimaryApi(api) {
  if (api !== 'shapes') {
    return 'Only Shapes Inc API is supported.';
  }
  
  primaryApi = api;
  return `Primary API set to ${api}`;
}

/**
 * Set the Shapes client implementation to use
 * @param {string} client - Either 'openai' or 'axios'
 * @returns {string} Confirmation message
 */
function setShapesClient(client) {
  if (client !== 'openai' && client !== 'axios') {
    return 'Invalid client choice. Use "openai" or "axios".';
  }
  
  // Check if OpenAI client is available when trying to use it
  if (client === 'openai' && !isOpenAiSdkAvailable) {
    return 'OpenAI SDK client is not available. Make sure SHAPESINC_API_KEY is set properly.';
  }
  
  shapesClient = client;
  return `Shapes client set to ${client}`;
}

/**
 * Get current primary API
 * @returns {string} Current primary API
 */
function getPrimaryApi() {
  return primaryApi;
}

/**
 * Get current Shapes client implementation
 * @returns {string} Current Shapes client ('openai' or 'axios')
 */
function getShapesClient() {
  return shapesClient;
}

/**
 * Set the current shape username (runtime)
 * @param {string} username
 */
function setShapeUsername(username) {
  shapesUsername = username;
  // Persist to DB (async, fire and forget)
  db.setShapeUsername(username).catch(console.error);
}

/**
 * Get the current shape username
 * @returns {string}
 */
function getShapeUsername() {
  return shapesUsername;
}

/**
 * Get the effective shape username for a channel
 * @param {string} channelId
 * @returns {Promise<{ shape_username: string }>}
 */
async function getEffectiveChannelConfig(channelId) {
  const channelConfig = await db.getChannelShapeConfig(channelId);
  return {
    shape_username: channelConfig && channelConfig.shape_username ? channelConfig.shape_username : shapesUsername
    // ai_provider field removed as only Shapes Inc API is now supported
  };
}

/**
 * Generate AI response using the configured API
 * @param {string} channelId - Discord channel ID
 * @param {Array|string} message - User message content (string or array of content objects)
 * @param {string} userId - User ID for context tracking
 * @returns {Promise<string>} AI response
 */
async function generateResponse(channelId, message, userId) {
  try {
    // Local tracking only
    if (!messageContexts.has(channelId)) {
      messageContexts.set(channelId, []);
    }
    const context = messageContexts.get(channelId);
    
    // Handle message content which can be a string or an array of objects
    let messageContent;
    if (typeof message === 'string') {
      // Convert simple string to content array format
      messageContent = [{ type: 'text', text: message }];
    } else if (Array.isArray(message)) {
      // Use the array directly (assuming proper format)
      messageContent = message;
    } else {
      // Default fallback in case of unexpected input
      messageContent = [{ type: 'text', text: String(message) }];
    }
    
    // Store in context
    context.push({
      role: 'user',
      content: messageContent,
      userId: userId
    });
    
    // Keep context manageable
    while (context.length > 10) {
      context.shift();
    }
    
    // Get per-channel config
    const { shape_username } = await getEffectiveChannelConfig(channelId);
    
    // Always use Shapes Inc API now
    const formattedUserId = `discord-user-${userId}`;
    const formattedChannelId = `discord-channel-${channelId}`;
    
    // Pass shape_username and messageContent to generateShapesResponse
    return await generateShapesResponse(
      formattedChannelId, 
      messageContent, 
      formattedUserId, 
      context, 
      shape_username
    );
  } catch (error) {
    console.error('Error in generateResponse:', error);
    return 'Sorry, something went wrong.';
  }
}

/**
 * Generate response using Shapes Inc API
 * @param {string} channelId - Discord channel ID
 * @param {Array} messageContent - User message content array with text/image/audio
 * @param {string} userId - User ID
 * @param {Array} context - Message context
 * @param {string} shape_username_override - Optional shape username override
 * @returns {Promise<string>} AI response
 */
async function generateShapesResponse(channelId, messageContent, userId, context, shape_username_override) {
  let aiMessage;
  const shapeToUse = shape_username_override || shapesUsername;
  
  // Check which client implementation to use
  if (shapesClient === 'openai' && isOpenAiSdkAvailable) {
    // OpenAI SDK implementation (recommended)
    try {
      const response = await shapes.chat.completions.create({
        model: `shapesinc/${shapeToUse}`,
        messages: [
          { role: "user", content: messageContent }
        ],
        extra_headers: {
          "X-User-Id": userId,
          "X-Channel-Id": channelId
        }
      });
      
      aiMessage = response.choices[0].message.content;
    } catch (error) {
      // Only log error if logging is enabled
      if (isLoggingEnabled()) {
        console.error('OpenAI SDK error:', error.message);
      }
      
      // Only fallback to axios if it's not a critical error
      if (!error.message.includes('unauthorized') && !error.message.includes('invalid_api_key')) {
        aiMessage = await useAxiosImplementation(channelId, messageContent, userId, shapeToUse);
      } else {
        throw error; // Re-throw authorization errors
      }
    }
  } else {
    // Axios implementation (original or fallback)
    aiMessage = await useAxiosImplementation(channelId, messageContent, userId, shapeToUse);
  }
  
  // Store response in context
  if (aiMessage) {
    context.push({
      role: 'assistant',
      content: aiMessage
    });
    
    return aiMessage;
  }
  
  throw new Error('No valid response from Shapes API service');
}

/**
 * Helper function to use the Axios implementation for API calls
 * @param {string} channelId - Channel ID
 * @param {Array} messageContent - User message content array
 * @param {string} userId - User ID
 * @param {string} shapeToUse - Shape username
 * @returns {Promise<string>} AI response
 */
async function useAxiosImplementation(channelId, messageContent, userId, shapeToUse) {
  try {
    // Format request payload for the Shapes API
    const payload = {
      model: `shapesinc/${shapeToUse}`,
      messages: [
        { role: "user", content: messageContent }
      ],
      platform: "discord",
      platform_user_id: userId,
      channel_id: channelId
    };
    
    const response = await shapesApi.post('/chat/completions', payload);
    
    // Handle different response formats
    if (response.data && response.data.content) {
      return response.data.content;
    } else if (response.data && response.data.choices && response.data.choices[0] && response.data.choices[0].message) {
      return response.data.choices[0].message.content;
    }
    
    throw new Error('Unexpected response structure from Shapes API');
  } catch (error) {
    // Only log error if logging is enabled
    if (isLoggingEnabled()) {
      console.error('Axios implementation error:', error.message);
    }
    throw error; // Re-throw the error to be handled by the caller
  }
}

/**
 * Clear message context for a channel
 * @param {string} channelId - Discord channel ID
 * @returns {boolean} Success status
 */
function clearMessageContext(channelId) {
  // NOTE: This only clears local context. 
  // For production, you might want to call an API endpoint to clear Shapes memory
  if (messageContexts.has(channelId)) {
    messageContexts.set(channelId, []);
    return true;
  }
  return false;
}

/**
 * Check if the bot should respond to this message based on randomness
 * @returns {boolean} True if bot should respond
 */
function shouldRespondRandomly() {
  // Respond to approximately 1 in 5 messages randomly
  return Math.random() < 0.2;
}

// On startup, try to load from DB
(async () => {
  try {
    const dbUsername = await db.getShapeUsername();
    if (dbUsername) {
      shapesUsername = dbUsername;
      console.log(`[aiService] Loaded shape username from DB: ${shapesUsername}`);
    }
  } catch (e) {
    console.warn('[aiService] Could not load shape username from DB:', e.message);
  }
})();

const mainOwnerId = process.env.OWNER_ID;

/**
 * Check if a user is an owner (main or lower-level)
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
async function isOwner(userId) {
  if (!userId) return false;
  
  // Handle comma-separated list of owner IDs
  if (mainOwnerId) {
    // Remove any Discord mention format like <@ID> if present
    const cleanUserId = userId.replace(/[<@>]/g, '');
    
    // Split by commas and clean up each ID
    const ownerIds = mainOwnerId.split(',').map(id => id.trim().replace(/[<@>]/g, ''));
    
    // Check if user ID is in the list
    if (ownerIds.includes(cleanUserId)) return true;
  }
  
  // Also check database for additional owners
  const owners = await db.getOwners();
  return owners.includes(userId);
}

module.exports = {
  generateResponse,
  clearMessageContext,
  shouldRespondRandomly,
  setPrimaryApi,
  getPrimaryApi,
  setShapesClient,
  getShapesClient,
  isOpenAiSdkAvailable,
  setShapeUsername,
  getShapeUsername,
  isOwner,
  setAutoUpdateNickname,
  getAutoUpdateNickname,
  getEffectiveChannelConfig,
  setShowShapeNameInResponses,
  getShowShapeNameInResponses
}; 