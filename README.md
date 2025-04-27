# Discord Bot

An interactive Discord bot that can chat with server members, play games, and allow you to send messages through the bot.

## Features

### Chat Features

- Responds to mentions with friendly greetings
- Engages in natural conversations with server members
- Supports multiple languages with optional Google Gemini AI integration (FREE)
- Responds to various keywords and phrases
- Ends conversations with a special "Say thanks to my goat" message (only when a conversation ends or times out)
- Tracks conversations and responds appropriately

### Games

- Rock Paper Scissors (`!rps`)
- Number Guessing game (`!guess`)
- Trivia game with multiple-choice questions (`!trivia`)
- Coin flip (`!flip`)
- Dice roll (`!roll`)

### Admin Features

- Allows the bot owner to send messages through the bot using the `!say` command
- Allows the bot owner to reply to specific messages using the `!reply` command

## Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (v16.9.0 or higher)
- A Discord account
- A Discord server where you have permission to add bots

### Step 1: Create a Discord Bot Application

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click on "New Application" and give it a name
3. Go to the "Bot" tab and click "Add Bot"
4. Under the "Privileged Gateway Intents" section, enable:
   - SERVER MEMBERS INTENT
   - MESSAGE CONTENT INTENT
5. Click "Reset Token" and copy your bot token (you'll need this later)

### Step 2: Configure the Bot

1. Open the `.env` file in this project
2. Replace `your_discord_bot_token_here` with your actual bot token
3. Replace `your_discord_user_id_here` with your Discord user ID (to find your user ID, enable Developer Mode in Discord settings, then right-click on your username and select "Copy ID")
4. OPTIONAL: Configure Google Gemini AI for multilingual support (100% FREE):
   - Get a free API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Add your API key to the `GEMINI_API_KEY` field in the `.env` file
   - Change `AI_PROVIDER` from `none` to `gemini`

### Step 3: Invite the Bot to Your Server

1. Go back to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application
3. Go to the "OAuth2" tab and then "URL Generator"
4. Select the following scopes:
   - bot
   - applications.commands
5. Select the following bot permissions:
   - Read Messages/View Channels
   - Send Messages
   - Send Messages in Threads
   - Manage Messages (to delete command messages)
   - Read Message History
   - Mention Everyone
   - Add Reactions
6. Copy the generated URL and open it in your browser
7. Select the server you want to add the bot to and click "Authorize"

### Step 4: Run the Bot

1. Open a terminal in the project directory
2. Run `npm install` to install dependencies (if you haven't already)
3. Run `npm start` to start the bot
4. You should see "Logged in as [Bot Name]!" in the console

## Usage

### Chat with the Bot

- Mention the bot to get a greeting
- Simply talk to the bot in the channel - it will respond to common phrases and questions
- Chat in any language when using AI integration (OpenAI or Gemini)
- The bot will add "Say thanks to my goat" only when a conversation ends or after 5 minutes of inactivity

### Play Games with the Bot

- `!rps` - Start a Rock Paper Scissors game, then type rock, paper, or scissors
- `!guess` - Start a Number Guessing game where you try to guess a number between 1-100
- `!trivia` - Play a trivia game with multiple-choice questions
- `!flip` - Flip a coin (heads or tails)
- `!roll [sides]` - Roll a dice with the specified number of sides (default: 6)

### Admin Commands (Bot Owner Only)

- `!say [message]` - Make the bot send a message
- `!reply [message_id] [message]` - Make the bot reply to a specific message

To get a message ID, enable Developer Mode in Discord settings, then right-click on a message and select "Copy ID".

### Help Command

- `!help` - Display a list of all available commands

## Customization

You can customize the bot's behavior by editing the `index.js` file:

### Chat Responses

- Add more keyword responses in the `chatResponses` object
- Modify existing responses or add new categories
- Change the "Say thanks to my goat" message

### Games

- Add more trivia questions to the `triviaQuestions` array
- Create new games by adding new command handlers
- Modify existing game rules

### AI Integration

- Choose between OpenAI and Google Gemini for AI responses
- Adjust AI parameters in the code for different response styles
- Configure system prompts to change the bot's personality

### Other Customizations

- Change the command prefix (currently `!`)
- Adjust the conversation timeout (currently 5 minutes)
- Add more commands

## Troubleshooting

- If the bot doesn't respond, check that you've correctly set up the `.env` file with your bot token
- Make sure the bot has the necessary permissions in your Discord server
- Check the console for any error messages
