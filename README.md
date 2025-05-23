# Circle Bot

A modern Discord bot powered by the Shapes Inc API, with basic moderation, AI chat(image gen too), and a clean shape interchanging system

---

## Features

- **AI Chat**: Responds to messages using Shapes Inc API via OpenAI SDK.
- **Contextual Replies**: Replies to users as Discord replies (no ping).
- **Owner System**: Only bot owners can use sensitive commands (see below). Main owners are set in `.env` (comma-separated), can add/remove lower-level owners via `/owner` command.
- **Moderation**: Slash commands for blacklisting, whitelisting, purging, kicking, and banning users.
- **Channel Modes**: Activate or deactivate channels for full-message AI response.
- **Logging Control**: Toggle message response logging with `/logging on` and `/logging off`.
- **Custom Status**: Shows as "Watching ur mom" and always online. (edit the code to update)
- **MongoDB Database**: Uses MongoDB Atlas for persistent, production-ready storage.

---

## Setup

### Prerequisites

- Node.js v16.x or higher
- NPM v7.x or higher
- A Discord bot token ([Discord Developer Portal](https://discord.com/developers/applications))
- A Shapes Inc API key ([Shapes Inc](https://shapes.inc))
- A MongoDB Atlas cluster (free tier is fine)

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

   # Owner system
   OWNER_ID=your_discord_user_id   # Main owner ID or comma-separated IDs
   ```

5. **Run the bot:**
   ```sh
   npm run dev   # For development (hot reload)
   npm start     # For production
   ```

6. **Invite the bot to your server** using the OAuth2 URL from the Discord Developer Portal.

---

## Owner System & Restricted Commands

- The main owners are set via `OWNER_ID` in your `.env` file (comma-separated for multiple owners).
- Only owners can use sensitive commands:
  - `/blacklist`, `/whitelist`, `/bchannel`, `/wchannel`, `/api`, `/trigger`, `/shape`, `/owner`
- The main owners can add or remove lower-level owners with the `/owner` command.
- All owners (main + lower-level) can use restricted commands.

### Owner Management Commands
- `/owner add <user>` — Main owner can add a new owner
- `/owner remove <user>` — Main owner can remove an owner
- `/owner list` — List all current owners

---

## Commands

- `/api status` — Show current API settings (**owners only**)
- `/api debug` — Show API key status (**server owner only**)
- `/wack` — Clear message context for the current channel
- `/blacklist <user>` — Blacklist a user from using the AI (**owners only**)
- `/whitelist <user>` — Remove a user from the blacklist (**owners only**)
- `/bchannel <channel>` — Blacklist a channel from using the AI (**manage messages permission**)
- `/wchannel <channel>` — Remove a channel from the blacklist (**manage messages permission**)
- `/activate` — Make the bot respond to all messages in the current channel (**manage messages permission**)
- `/deactivate` — Make the bot follow normal response rules (**manage messages permission**)
- `/logging <on|off>` — Toggle message response logging in the console
- `/purge <count>` — Delete a number of messages
- `/kick <user> [reason]` — Kick a user
- `/ban <user> [reason]` — Ban a user
- `/shape set <username>` — Change the active Shape username (**owners only**)
- `/shape get` — Show the current Shape username (**owners only**)
- `/shape showname <on|off>` — Toggle showing shape name in responses (**owners only**)
- `/trigger set <word>` — Change the bot's trigger word (**owners only**)
- `/trigger get` — Show the current trigger word (**owners only**)
- `/owner add <user>` — Add a lower-level owner (**main owner only**)
- `/owner remove <user>` — Remove a lower-level owner (**main owner only**)
- `/owner list` — List all owners

---

## License

[MIT](LICENSE)

# Have fun!
