const db = require('../database/database');
const aiService = require('./aiService');
const authService = require('./authService');
const loggingCommand = require('../commands/logging');
const { ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');

// Configurable trigger word (defaults to 'gpt 5' and 'gpt5')
let triggerWordPrimary = 'gpt 5';
let triggerWordSecondary = 'gpt5';

function setTriggerWord(word) {
  // Support both requested variants always; set primary to custom word, keep secondary as plain variant
  triggerWordPrimary = word.toLowerCase();
  triggerWordSecondary = word.toLowerCase().replace(/\s+/g, '');
}

function getTriggerWord() {
  return `${triggerWordPrimary} | ${triggerWordSecondary}`;
}

/**
 * Show authentication wall with button to authenticate
 * @param {Object} message - Discord message object
 * @param {number} messageCount - Current user message count
 */
async function showAuthWall(message, messageCount) {
  const authButton = new ButtonBuilder()
    .setCustomId('auth_wall_login')
    .setLabel('🔐 Authenticate with Shapes')
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder().addComponents(authButton);

  const authWallMessage = `**Connect with Shapes Inc for Unlimited Access**

You've reached the limit for anonymous usage. **Good news**: this bot is completely **free** for authorized users!

**Join the Shapes ecosystem and unlock:**

**Massive Character Library**
> Talk to millions of unique AI characters, each with their own personality and expertise

**Create Your Own Characters** 
> Build and customize your own AI personas for free at [shapes.inc](https://shapes.inc)

**Personalize Your Experience**
> Update your display name, set your persona, and customize how GPT-5 sees you at [shapes.inc/openaigpt5](https://shapes.inc/openaigpt5)

**Join Our Community**
> Connect with creators and explore countless Shapes on our platform [talk.shapes.inc](https://talk.shapes.inc)
> Create private rooms, discover new conversations, and more

**This Discord bot remains completely free once you authorize with Shapes Inc.**

Click the button below to get started:`;

  await message.reply({
    content: authWallMessage,
    components: [row],
    allowedMentions: { repliedUser: false }
  });
}

/**
 * Handles incoming messages and determines if the bot should respond
 * @param {Object} message - Discord message object
 * @param {Object} client - Discord client instance
 * @returns {Promise<void>}
 */
async function handleMessage(message, client) {
  try {
    // Ignore messages from bots
    if (message.author.bot) return;
    
    // Check if user is blacklisted
    const isUserBlacklisted = await db.isUserBlacklisted(message.author.id);
    if (isUserBlacklisted) return;
    
    // Check if channel is blacklisted
    const isChannelBlacklisted = await db.isChannelBlacklisted(message.channel.id);
    if (isChannelBlacklisted) return;
    
    // Variables to determine if we should respond
    let shouldRespond = false;
    let reason = '';
    let content = message.content;

    // Check for DisplayName:content format
    const member = message.member;
    if (member) {
      const displayName = member.displayName;
      if (content.startsWith(`${displayName}:`)) {
        // Extract the actual message content without the display name prefix
        content = content.slice(displayName.length + 1).trim();
        shouldRespond = true;
        reason = 'display_name';
      }
    }
    
    // If not already responding, check other triggers
    if (!shouldRespond) {
      // Check if the message contains the trigger word or mentions the bot
      const mentionsBot = message.mentions.users.has(client.user.id);
      const lower = content.toLowerCase();
      const containsTrigger = lower.includes(triggerWordPrimary) || lower.includes(triggerWordSecondary);
      
      if (mentionsBot) {
        shouldRespond = true;
        reason = 'mentioned';
      } else if (containsTrigger) {
        shouldRespond = true;
        reason = 'contains_keyword';
      } else {
        // Check if channel is in active mode
        const isChannelActive = await db.isChannelActive(message.channel.id);
        if (isChannelActive) {
          shouldRespond = true;
          reason = 'active_channel';
        } else {
          // Random response chance
          shouldRespond = aiService.shouldRespondRandomly();
          if (shouldRespond) {
            reason = 'random';
          }
        }
      }
    }
    
    // If we should respond, handle freemium authentication flow
    if (shouldRespond) {
      try {
        // Show typing indicator
        await message.channel.sendTyping();
        
        // Build multimodal content array for Shapes Inc API
        const userContent = [];
        
        // Get user's display name for context
        const displayName = message.member?.displayName || message.author.displayName || message.author.username;
        
        // Add text content if present, prefixed with display name
        if (content && content.trim() !== '') {
          const formattedText = `${displayName}: ${content.trim()}`;
          userContent.push({ type: 'text', text: formattedText });
        }
        
        // Check for image and audio attachments
        if (message.attachments.size > 0) {
          for (const [id, attachment] of message.attachments) {
            const contentType = attachment.contentType || '';
            
            // Handle image attachments
            if (contentType.startsWith('image/')) {
              userContent.push({
                type: 'image_url',
                image_url: { url: attachment.url }
              });
            }
            // Handle audio attachments (mp3, wav, ogg)
            else if (contentType.startsWith('audio/') || 
                     contentType.includes('mp3') || 
                     contentType.includes('wav') || 
                     contentType.includes('ogg')) {
              userContent.push({
                type: 'audio_url',
                audio_url: { url: attachment.url }
              });
            }
          }
        }
        
        // If we have no content (unlikely but possible), add a default text prompt with display name
        if (userContent.length === 0) {
          const defaultText = content || 'Hello';
          const formattedText = `${displayName}: ${defaultText}`;
          userContent.push({ type: 'text', text: formattedText });
        }
        
        // Check user authentication status
        const authStatus = await authService.checkUserAuthStatus(message.author.id);
        
        if (authStatus.isAuthenticated) {
          // User is authenticated - unlimited access with their personal token
          const authInfo = await db.getUserAuthInfo(message.author.id);
          const response = await aiService.generateResponse(
            message.channel.id, 
            userContent,
            message.author.id,
            authInfo.authToken // Use their personal auth token
          );
          
          await message.reply({
            content: response,
            allowedMentions: { repliedUser: false }
          });
          
          // Update last used timestamp
          await db.updateAuthTokenLastUsed(message.author.id);
          
        } else if (authStatus.needsAuth) {
          // User hit the 5 message limit - show auth wall
          await showAuthWall(message, authStatus.messageCount);
          
        } else {
          // User is in free tier (under 5 messages) - use bot's API key
          const newCount = await db.incrementUserMessageCount(message.author.id);
          
          const response = await aiService.generateResponse(
            message.channel.id, 
            userContent,
            message.author.id,
            null // Use bot's default API key
          );
          
          // No warnings shown - just respond normally
          await message.reply({
            content: response,
            allowedMentions: { repliedUser: false }
          });
        }
        
        // Only log minimal info for monitoring if logging is enabled
        if (loggingCommand.isLoggingEnabled()) {
          const channelName = message.channel.name || message.channel.id;
          const authStr = authStatus.isAuthenticated ? 'auth' : `free(${authStatus.messageCount})`;
          console.log(`Msg (${reason}|${authStr}): ${channelName}`);
        }
      } catch (error) {
        // Always log errors regardless of logging setting
        console.error('Error generating response:', error);
      }
    }
  } catch (error) {
    // Always log errors regardless of logging setting
    console.error('Error in message handler:', error);
  }
}

module.exports = {
  handleMessage,
  setTriggerWord,
  getTriggerWord
}; 