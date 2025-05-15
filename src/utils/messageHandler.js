const db = require('../database/database');
const aiService = require('./aiService');
const loggingCommand = require('../commands/logging');

// Configurable trigger word (default: 'tenshi')
let triggerWord = 'tenshi';

function setTriggerWord(word) {
  triggerWord = word.toLowerCase();
}

function getTriggerWord() {
  return triggerWord;
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
    
    // Check if the message contains the trigger word or mentions the bot
    const mentionsBot = message.mentions.users.has(client.user.id);
    const containsTrigger = message.content.toLowerCase().includes(triggerWord);
    
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
    
    // If we should respond, generate a response
    if (shouldRespond) {
      try {
        // Show typing indicator
        await message.channel.sendTyping();
        
        // Build multimodal content array for Shapes Inc API
        const userContent = [];
        
        // Add text content if present
        if (message.content && message.content.trim() !== '') {
          userContent.push({ type: 'text', text: message.content.trim() });
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
        
        // If we have no content (unlikely but possible), add a default text prompt
        if (userContent.length === 0) {
          userContent.push({ type: 'text', text: message.content || 'Hello' });
        }
        
        // Get response from AI using multimodal content
        const response = await aiService.generateResponse(
          message.channel.id, 
          userContent,
          message.author.id
        );
        
        // Get the current shape for this channel
        const { shape_username } = await aiService.getEffectiveChannelConfig(message.channel.id);
        
        // Send response as a reply but without pinging the user
        // Only include shape name prefix if the setting is enabled
        let responseContent = response;
        if (aiService.getShowShapeNameInResponses()) {
          responseContent = `**[${shape_username}]** ${response}`;
        }
        
        await message.reply({
          content: responseContent,
          allowedMentions: { repliedUser: false }
        });
        
        // Only log minimal info for monitoring if logging is enabled
        if (loggingCommand.isLoggingEnabled()) {
          const channelName = message.channel.name || message.channel.id;
          console.log(`Msg (${reason}): ${channelName}`);
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