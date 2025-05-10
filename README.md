# Circle Bot

A modern Discord bot powered by the Shapes Inc API, with robust moderation, AI chat, and a clean, production-ready codebase.

---

## Features

- **AI Chat**: Responds to messages using Shapes Inc (OpenAI SDK or Axios fallback) and optionally Google Gemini.
- **Contextual Replies**: Replies to users as Discord replies (no ping).
- **Moderation**: Slash commands for blacklisting, whitelisting, purging, kicking, and banning users.
- **Channel Modes**: Activate or deactivate channels for full-message AI response.
- **Logging Control**: Toggle message response logging with `/logging on` and `/logging off`.
- **Custom Status**: Shows as "Watching ur mom" and always online.
- **Secure**: No secrets or node_modules in the repo; uses `.env` for all sensitive config.
- **MongoDB Database**: Uses MongoDB Atlas for persistent, production-ready storage.

---

## Setup

### Prerequisites

- Node.js v16.x or higher
- NPM v7.x or higher
- A Discord bot token ([Discord Developer Portal](https://discord.com/developers/applications))
- A Shapes Inc API key ([Shapes Inc](https://shapes.inc))
- A MongoDB Atlas cluster (free tier is fine)
- (Optional) Google Gemini API key

### Installation

1. **Clone the repository:**
   ```sh
   git clone https://github.com/hiidhruv/circle.git
   cd circle
   ```

2. **Install dependencies:**
   ```sh
   npm install
   ```

3. **Create a MongoDB Atlas cluster:**
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Create a free cluster
   - Add a database user and password
   - Allow access from your server's IP or 0.0.0.0/0 for development
   - Click "Connect" > "Drivers" > select Node.js and copy the connection string
   - Replace `<username>` and `<password>` in the URI with your credentials

4. **Create a `.env` file in the root directory:**
   ```env
   # Discord
   DISCORD_TOKEN=your_discord_bot_token

   # Shapes Inc
   SHAPESINC_API_KEY=your_shapes_api_key
   SHAPESINC_SHAPE_USERNAME=your_shape_username
   SHAPES_API_URL=https://api.shapes.inc/v1

   # MongoDB
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority

   # Optional
   OWNER_ID=your_discord_user_id
   GEMINI_API_KEY=your_gemini_api_key
   CIRCLE_SYSTEM_PROMPT=custom_system_prompt
   ```

5. **Run the bot:**
   ```sh
   npm run dev   # For development (hot reload)
   npm start     # For production
   ```

6. **Invite the bot to your server** using the OAuth2 URL from the Discord Developer Portal.

---

## Commands

- `/api set <shapes|gemini>` — Set the primary AI service
- `/api client <openai|axios>` — Set the Shapes API client implementation
- `/api status` — Show current API settings
- `/wack` — Clear message context for the current channel
- `/blacklist user <user>` — Blacklist a user
- `/blacklist channel` — Blacklist the current channel
- `/whitelist user <user>` — Remove a user from the blacklist
- `/whitelist channel` — Remove a channel from the blacklist
- `/activatechannel` — Make the bot respond to all messages in the channel
- `/deactivatechannel` — Make the bot follow normal response rules
- `/logging <on|off>` — Toggle message response logging in the console
- `/purge <count>` — Delete a number of messages
- `/kick <user> [reason]` — Kick a user
- `/ban <user> [reason]` — Ban a user

---

## License

[MIT](LICENSE)

# Have fun!
