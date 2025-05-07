const axios = require('axios');
const { OpenAI } = require('openai');
require('dotenv').config();

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
const shapesUsername = process.env.SHAPESINC_SHAPE_USERNAME || process.env.SHAPES_USERNAME || 'tenshi';

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

// Gemini API configuration
const geminiApiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const geminiApiKey = process.env.GEMINI_API_KEY;

// Track which API is primary
let primaryApi = 'shapes'; // 'shapes' or 'gemini'
// Track which client to use with Shapes API
let shapesClient = 'openai'; // Default to openai if available, otherwise axios

// Check if OpenAI SDK is available and set default client
if (!isOpenAiSdkAvailable) {
  shapesClient = 'axios';
}

// Tenshi persona for Gemini - Load from environment or use default
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

/**
 * Set the primary API to use
 * @param {string} api - Either 'shapes' or 'gemini'
 * @returns {string} Confirmation message
 */
function setPrimaryApi(api) {
  if (api !== 'shapes' && api !== 'gemini') {
    return 'Invalid API choice. Use "shapes" or "gemini".';
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
 * Generate AI response using the configured API
 * @param {string} channelId - Discord channel ID
 * @param {string} prompt - User message
 * @param {string} userId - User ID for context tracking
 * @returns {Promise<string>} AI response
 */
async function generateResponse(channelId, prompt, userId) {
  try {
    // Local tracking only
    if (!messageContexts.has(channelId)) {
      messageContexts.set(channelId, []);
    }
    
    const context = messageContexts.get(channelId);
    context.push({
      role: 'user',
      content: prompt,
      userId: userId
    });
    
    // Keep local context to a reasonable size
    while (context.length > 10) {
      context.shift();
    }
    
    // Try primary API first, then fallback if needed
    try {
      if (primaryApi === 'shapes') {
        // Format IDs for better tracking in Shapes
        const formattedUserId = `discord-user-${userId}`;
        const formattedChannelId = `discord-channel-${channelId}`;
        
        return await generateShapesResponse(formattedChannelId, prompt, formattedUserId, context);
      } else {
        return await generateGeminiResponse(context);
      }
    } catch (primaryError) {
      // Only log error if logging is enabled
      if (isLoggingEnabled()) {
        console.error(`Error with primary API (${primaryApi}):`, primaryError.message);
      }
      
      // Fallback to the other API
      try {
        if (primaryApi === 'shapes') {
          return await generateGeminiResponse(context);
        } else {
          // Format IDs for better tracking in Shapes
          const formattedUserId = `discord-user-${userId}`;
          const formattedChannelId = `discord-channel-${channelId}`;
          
          return await generateShapesResponse(formattedChannelId, prompt, formattedUserId, context);
        }
      } catch (fallbackError) {
        // Always log fallback errors as they are critical
        console.error('Error with fallback API:', fallbackError.message);
        throw fallbackError;
      }
    }
  } catch (error) {
    // Always log critical errors
    console.error('Error generating AI response:', error.message);
    
    // Check if it's an API error with more details
    if (error.response) {
      console.error('API Error Details:', error.response.data);
    }
    
    return 'Something went wrong and tenshi is cooked';
  }
}

/**
 * Generate response using Shapes Inc API
 * @param {string} channelId - Discord channel ID
 * @param {string} prompt - User message
 * @param {string} userId - User ID
 * @param {Array} context - Message context
 * @returns {Promise<string>} AI response
 */
async function generateShapesResponse(channelId, prompt, userId, context) {
  let aiMessage;
  
  // Check which client implementation to use
  if (shapesClient === 'openai' && isOpenAiSdkAvailable) {
    // OpenAI SDK implementation (recommended)
    try {
      const response = await shapes.chat.completions.create({
        model: `shapesinc/${shapesUsername}`,
        messages: [
          { role: "user", content: prompt }
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
        aiMessage = await useAxiosImplementation(channelId, prompt, userId);
      } else {
        throw error; // Re-throw authorization errors
      }
    }
  } else {
    // Axios implementation (original or fallback)
    aiMessage = await useAxiosImplementation(channelId, prompt, userId);
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
 * @param {string} prompt - User message
 * @param {string} userId - User ID
 * @returns {Promise<string>} AI response
 */
async function useAxiosImplementation(channelId, prompt, userId) {
  try {
    // Using the axios client with proper headers
    const response = await shapesApi.post('/chat/completions', {
      content: prompt,
      platform: "discord",
      platform_user_id: userId,
      channel_id: channelId
    });
    
    return response.data.content;
  } catch (error) {
    // Only log error if logging is enabled
    if (isLoggingEnabled()) {
      console.error('Axios implementation error:', error.message);
    }
    throw error; // Re-throw the error to be handled by the caller
  }
}

/**
 * Generate response using Gemini API
 * @param {Array} context - Message context
 * @returns {Promise<string>} AI response
 */
async function generateGeminiResponse(context) {
  // Check if Gemini API key is available
  if (!geminiApiKey) {
    throw new Error('Gemini API key not available');
  }
  
  // Prepare context for Gemini API
  const recentMessages = context.slice(-5).map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));
  
  // Add system prompt at the beginning
  recentMessages.unshift({
    role: 'user',
    parts: [{ text: tenshiSystemPrompt }]
  });
  
  recentMessages.unshift({
    role: 'model',
    parts: [{ text: 'I understand and will respond as Tenshi with those guidelines.' }]
  });
  
  // Call Gemini API
  const geminiResponse = await axios.post(
    `${geminiApiUrl}?key=${geminiApiKey}`,
    {
      contents: recentMessages,
      generationConfig: {
        temperature: 0.9,
        maxOutputTokens: 200,
      }
    }
  );
  
  // Process Gemini response
  if (geminiResponse.data && 
      geminiResponse.data.candidates && 
      geminiResponse.data.candidates.length > 0 &&
      geminiResponse.data.candidates[0].content &&
      geminiResponse.data.candidates[0].content.parts &&
      geminiResponse.data.candidates[0].content.parts.length > 0) {
    
    const aiMessage = geminiResponse.data.candidates[0].content.parts[0].text;
    
    // Add to local context
    context.push({
      role: 'assistant',
      content: aiMessage
    });
    
    return aiMessage;
  }
  
  throw new Error('No valid response from Gemini API');
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

module.exports = {
  generateResponse,
  clearMessageContext,
  shouldRespondRandomly,
  setPrimaryApi,
  getPrimaryApi,
  setShapesClient,
  getShapesClient,
  isOpenAiSdkAvailable
}; 