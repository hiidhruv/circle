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
        
        // Get response from AI
        const response = await aiService.generateResponse(
          message.channel.id, 
          message.content,
          message.author.id
        );
        
        // Send response as a reply but without pinging the user
        await message.reply({
          content: response,
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