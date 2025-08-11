const axios = require('axios');
const db = require('../database/database');

const AUTH_BASE_URL = 'https://api.shapes.inc/auth';

/**
 * Authenticate user with Shapes Inc using one-time code
 * @param {string} oneTimeCode - One-time authentication code from Shapes site
 * @param {string} userId - Discord user ID
 * @returns {Promise<{success: boolean, message: string, authToken?: string}>}
 */
async function authenticateUser(oneTimeCode, userId) {
  try {
    // Get app_id from environment (try both variable names)
    const appId = process.env.APP_ID || process.env.SHAPESINC_APP_ID;
    
    // Validate inputs
    if (!appId) {
      return { 
        success: false, 
        message: 'Bot configuration error: APP_ID or SHAPESINC_APP_ID not set in environment' 
      };
    }
    
    if (!oneTimeCode || !userId) {
      return { 
        success: false, 
        message: 'Missing required parameters: oneTimeCode or userId' 
      };
    }

    // Call Shapes auth endpoint with bot's app_id and user's one-time code
    const response = await axios.post(`${AUTH_BASE_URL}/nonce`, {
      app_id: appId,
      code: oneTimeCode
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000 // 10 second timeout
    });

    const data = response.data;

    if (response.status === 200 && data.auth_token) {
      // Store the auth token in database
      await db.storeUserAuthToken(userId, data.auth_token, appId);
      
      return {
        success: true,
        message: '🎉 Authentication successful! You now have unlimited access.',
        authToken: data.auth_token
      };
    } else {
      return {
        success: false,
        message: data.message || 'Failed to exchange code for token.'
      };
    }
  } catch (error) {
    console.error('Error during Shapes authentication:', error);
    
    // Handle specific error types
    if (error.response) {
      // API responded with error status
      const status = error.response.status;
      const message = error.response.data?.message || 'Authentication failed';
      
      if (status === 400) {
        return { success: false, message: '❌ Invalid app ID or one-time code.' };
      } else if (status === 401) {
        return { success: false, message: '❌ Unauthorized. Please check your credentials.' };
      } else if (status === 429) {
        return { success: false, message: '❌ Too many attempts. Please try again later.' };
      } else {
        return { success: false, message: `❌ Authentication failed: ${message}` };
      }
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return { success: false, message: '❌ Unable to connect to Shapes API. Please try again.' };
    } else if (error.code === 'ECONNABORTED') {
      return { success: false, message: '❌ Authentication timeout. Please try again.' };
    } else {
      return { 
        success: false, 
        message: '❌ An unexpected error occurred during authentication.' 
      };
    }
  }
}

/**
 * Check if user has reached message limit and needs authentication
 * @param {string} userId - Discord user ID
 * @returns {Promise<{needsAuth: boolean, messageCount: number, isAuthenticated: boolean}>}
 */
async function checkUserAuthStatus(userId) {
  const isAuthenticated = await db.isUserAuthenticated(userId);
  const messageCount = await db.getUserMessageCount(userId);
  
  return {
    needsAuth: !isAuthenticated && messageCount >= 5,
    messageCount,
    isAuthenticated
  };
}

/**
 * Validate if a stored auth token is still valid
 * @param {string} userId - Discord user ID
 * @returns {Promise<boolean>}
 */
async function validateUserAuthToken(userId) {
  try {
    const authInfo = await db.getUserAuthInfo(userId);
    if (!authInfo) return false;

    // For now, assume tokens are valid if they exist
    // In production, you might want to test the token with a lightweight API call
    await db.updateAuthTokenLastUsed(userId);
    return true;
  } catch (error) {
    console.error('Error validating auth token:', error);
    return false;
  }
}

/**
 * Get user's authentication status summary
 * @param {string} userId - Discord user ID
 * @returns {Promise<{status: string, messageCount: number, authInfo?: object}>}
 */
async function getUserAuthSummary(userId) {
  const isAuthenticated = await db.isUserAuthenticated(userId);
  const messageCount = await db.getUserMessageCount(userId);
  
  if (isAuthenticated) {
    const authInfo = await db.getUserAuthInfo(userId);
    return {
      status: 'authenticated',
      messageCount,
      authInfo: {
        appId: authInfo?.appId,
        authenticatedAt: 'stored' // Don't expose exact timestamp
      }
    };
  } else if (messageCount >= 5) {
    return {
      status: 'auth_required',
      messageCount
    };
  } else {
    return {
      status: 'free_tier',
      messageCount,
      remainingFreeMessages: 5 - messageCount
    };
  }
}

/**
 * Revoke user authentication (logout)
 * @param {string} userId - Discord user ID
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function revokeUserAuth(userId) {
  try {
    await db.revokeUserAuthToken(userId);
    return {
      success: true,
      message: '✅ Authentication revoked. You can authenticate again anytime.'
    };
  } catch (error) {
    console.error('Error revoking auth:', error);
    return {
      success: false,
      message: '❌ Failed to revoke authentication.'
    };
  }
}

module.exports = {
  authenticateUser,
  checkUserAuthStatus,
  validateUserAuthToken,
  getUserAuthSummary,
  revokeUserAuth
};
