// Require the necessary discord.js classes
const { Client, GatewayIntentBits, Partials, Collection, Events } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// Initialize AI providers based on configuration
const AI_PROVIDER = process.env.AI_PROVIDER || 'none';

// Initialize Gemini if configured (completely optional)
let geminiAI = null;
let geminiModel = null;
if (AI_PROVIDER === 'gemini' && process.env.GEMINI_API_KEY) {
    try {
        // Initialize with the API key
        geminiAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

        // Try to use a model that should be available with the free tier
        console.log('Attempting to initialize Gemini AI...');

        // Use a simpler approach - just try with the standard model name
        geminiModel = geminiAI.getGenerativeModel({
            model: "gemini-pro", // Standard model name
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 1024,
            }
        });

        console.log('Google Gemini AI initialized successfully!');
    } catch (error) {
        console.error('Failed to initialize Gemini AI:', error);
        // If Gemini fails to initialize, fall back to no AI
        AI_PROVIDER = 'none';
    }
}

// Create a new client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.DirectMessageReactions,
    ],
    partials: [Partials.Channel, Partials.Message, Partials.Reaction]
});

// Store commands in a collection
client.commands = new Collection();

// Store active games
const activeGames = new Map();

// Track user conversations to know when they end
const userConversations = new Map();

// Track users who have interacted with the bot before
const userFirstInteraction = new Map();

// Trivia questions for the trivia game
const triviaQuestions = [
    {
        question: "What is the capital of France?",
        answer: "paris",
        options: ["London", "Berlin", "Paris", "Madrid"]
    },
    {
        question: "Which planet is known as the Red Planet?",
        answer: "mars",
        options: ["Venus", "Mars", "Jupiter", "Saturn"]
    },
    {
        question: "What is the largest mammal in the world?",
        answer: "blue whale",
        options: ["Elephant", "Blue Whale", "Giraffe", "Polar Bear"]
    },
    {
        question: "Who wrote 'Romeo and Juliet'?",
        answer: "william shakespeare",
        options: ["Charles Dickens", "Jane Austen", "William Shakespeare", "Mark Twain"]
    },
    {
        question: "What is the chemical symbol for gold?",
        answer: "au",
        options: ["Go", "Gd", "Au", "Ag"]
    }
];

// When the client is ready, run this code (only once)
client.once(Events.ClientReady, () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

// AI functionality has been removed for now

// Listen for messages
client.on(Events.MessageCreate, async message => {
    // Debug logging
    console.log(`Received message: "${message.content}" from ${message.author.tag}`);

    // Ignore messages from bots
    if (message.author.bot) return;

    // Check if this is the user's first interaction with the bot
    if (!userFirstInteraction.has(message.author.id)) {
        // Send welcome message with information about games
        const welcomeMessage = `👋 Hi ${message.author.username}! I'm a chat bot that can talk with you and play games! Try these commands:
• Type \`!help\` to see all commands
• Type \`!rps\` to play Rock Paper Scissors
• Type \`!guess\` to play a number guessing game
• Type \`!trivia\` to play a trivia game
• Or just chat with me normally!`;

        // Send as a DM if possible, otherwise in the channel
        try {
            await message.author.send(welcomeMessage);
        } catch (error) {
            // If DM fails (e.g., user has DMs disabled), send in the channel
            message.channel.send(welcomeMessage);
        }

        // Mark user as having received the welcome message
        userFirstInteraction.set(message.author.id, true);
    }

    // Start tracking conversation for this user if not already tracked
    if (!userConversations.has(message.author.id)) {
        userConversations.set(message.author.id, {
            lastMessageTime: Date.now(),
            messageCount: 0
        });
    } else {
        // Update the conversation tracking
        const conversation = userConversations.get(message.author.id);
        conversation.lastMessageTime = Date.now();
        conversation.messageCount++;
    }

    // Check if the user is in an active game
    if (activeGames.has(message.author.id)) {
        const game = activeGames.get(message.author.id);

        // Handle rock paper scissors game
        if (game.type === 'rps') {
            const choices = ['rock', 'paper', 'scissors'];
            const userChoice = message.content.toLowerCase();

            if (!choices.includes(userChoice)) {
                return message.reply('Please choose rock, paper, or scissors!');
            }

            const botChoice = choices[Math.floor(Math.random() * choices.length)];
            let result;

            if (userChoice === botChoice) {
                result = "It's a tie!";
            } else if (
                (userChoice === 'rock' && botChoice === 'scissors') ||
                (userChoice === 'paper' && botChoice === 'rock') ||
                (userChoice === 'scissors' && botChoice === 'paper')
            ) {
                result = "You win!";
            } else {
                result = "I win!";
            }

            message.reply(`You chose ${userChoice}, I chose ${botChoice}. ${result} Say thanks to my goat!`);
            activeGames.delete(message.author.id);
            return;
        }

        // Handle number guessing game
        if (game.type === 'guess') {
            const guess = parseInt(message.content);

            if (isNaN(guess)) {
                return message.reply('Please enter a valid number!');
            }

            game.attempts++;

            if (guess === game.number) {
                message.reply(`Congratulations! You guessed the number ${game.number} in ${game.attempts} attempts! Say thanks to my goat!`);
                activeGames.delete(message.author.id);
            } else if (guess < game.number) {
                message.reply(`Too low! Try again. (Attempt ${game.attempts}/10)`);
            } else {
                message.reply(`Too high! Try again. (Attempt ${game.attempts}/10)`);
            }

            if (game.attempts >= 10) {
                message.reply(`Game over! The number was ${game.number}. Say thanks to my goat!`);
                activeGames.delete(message.author.id);
            }

            return;
        }

        // Handle trivia game
        if (game.type === 'trivia') {
            const answer = message.content.toLowerCase();

            if (answer === game.question.answer.toLowerCase()) {
                message.reply('Correct! Well done! 🎉 Say thanks to my goat!');
            } else {
                message.reply(`Sorry, that's incorrect. The correct answer is: ${game.question.answer}. Say thanks to my goat!`);
            }

            activeGames.delete(message.author.id);
            return;
        }

        // Handle hangman game
        if (game.type === 'hangman') {
            const guess = message.content.toLowerCase().trim();

            // Check if the guess is valid (a single letter)
            if (guess.length !== 1 || !guess.match(/[a-z]/i)) {
                return message.reply('Please guess a single letter (a-z).');
            }

            // Check if the letter has already been guessed
            if (game.guessedLetters.includes(guess)) {
                return message.reply(`You've already guessed the letter "${guess}". Try a different letter.`);
            }

            // Add the letter to guessed letters
            game.guessedLetters.push(guess);

            // Check if the guess is correct
            if (game.word.includes(guess)) {
                // Check if the player has won
                const allLettersGuessed = game.word.split('').every(letter => game.guessedLetters.includes(letter));

                if (allLettersGuessed) {
                    message.reply(`Congratulations! You've guessed the word: **${game.word}**! Say thanks to my goat!`);
                    activeGames.delete(message.author.id);
                    return;
                } else {
                    // Update the display word
                    const displayWord = game.word.split('').map(letter => game.guessedLetters.includes(letter) ? letter : '_').join(' ');
                    message.reply(`Good guess! The word now looks like this:\n\n${displayWord}\n\nGuessed letters: ${game.guessedLetters.join(', ')}`);
                }
            } else {
                // Incorrect guess
                game.attempts++;

                // Check if the player has lost
                if (game.attempts >= game.maxAttempts) {
                    message.reply(`Game over! You've used all ${game.maxAttempts} attempts. The word was: **${game.word}**. Say thanks to my goat!`);
                    activeGames.delete(message.author.id);
                    return;
                } else {
                    // Update the display word
                    const displayWord = game.word.split('').map(letter => game.guessedLetters.includes(letter) ? letter : '_').join(' ');
                    message.reply(`Oops! The letter "${guess}" is not in the word. You have ${game.maxAttempts - game.attempts} incorrect guesses left.\n\n${displayWord}\n\nGuessed letters: ${game.guessedLetters.join(', ')}`);
                }
            }

            return;
        }

        // Handle word scramble game
        if (game.type === 'scramble') {
            const guess = message.content.toLowerCase().trim();

            game.attempts++;

            if (guess === game.word) {
                message.reply(`Congratulations! You unscrambled the word **${game.word}** in ${game.attempts} attempts! Say thanks to my goat!`);
                activeGames.delete(message.author.id);
            } else {
                if (game.attempts >= 5) {
                    message.reply(`That's not correct. You've used all 5 attempts. The word was: **${game.word}**. Say thanks to my goat!`);
                    activeGames.delete(message.author.id);
                } else {
                    message.reply(`That's not correct. You have ${5 - game.attempts} attempts left. Keep trying!`);
                }
            }

            return;
        }

        // Handle riddle game
        if (game.type === 'riddle') {
            const answer = message.content.toLowerCase().trim();

            game.attempts++;

            if (answer === game.answer) {
                message.reply(`🎉 Correct! You solved the riddle in ${game.attempts} attempts! Say thanks to my goat!`);
                activeGames.delete(message.author.id);
            } else {
                if (game.attempts >= 3) {
                    message.reply(`That's not correct. The answer was: **${game.answer}**. Say thanks to my goat!`);
                    activeGames.delete(message.author.id);
                } else {
                    message.reply(`That's not correct. You have ${3 - game.attempts} attempts left. Keep trying!`);
                }
            }

            return;
        }

        // Handle Rock Paper Scissors Lizard Spock game
        if (game.type === 'rpsls') {
            const choices = ['rock', 'paper', 'scissors', 'lizard', 'spock'];
            const userChoice = message.content.toLowerCase();

            if (!choices.includes(userChoice)) {
                return message.reply('Please choose rock, paper, scissors, lizard, or spock!');
            }

            const botChoice = choices[Math.floor(Math.random() * choices.length)];

            // Define winning combinations: key beats all values in the array
            const winConditions = {
                rock: ['scissors', 'lizard'],
                paper: ['rock', 'spock'],
                scissors: ['paper', 'lizard'],
                lizard: ['paper', 'spock'],
                spock: ['scissors', 'rock']
            };

            let result;
            let explanation;

            if (userChoice === botChoice) {
                result = "It's a tie!";
                explanation = "We chose the same thing!";
            } else if (winConditions[userChoice].includes(botChoice)) {
                result = "You win!";

                // Explain why the user won
                if (userChoice === 'rock' && botChoice === 'scissors') explanation = "Rock crushes Scissors!";
                else if (userChoice === 'rock' && botChoice === 'lizard') explanation = "Rock crushes Lizard!";
                else if (userChoice === 'paper' && botChoice === 'rock') explanation = "Paper covers Rock!";
                else if (userChoice === 'paper' && botChoice === 'spock') explanation = "Paper disproves Spock!";
                else if (userChoice === 'scissors' && botChoice === 'paper') explanation = "Scissors cuts Paper!";
                else if (userChoice === 'scissors' && botChoice === 'lizard') explanation = "Scissors decapitates Lizard!";
                else if (userChoice === 'lizard' && botChoice === 'paper') explanation = "Lizard eats Paper!";
                else if (userChoice === 'lizard' && botChoice === 'spock') explanation = "Lizard poisons Spock!";
                else if (userChoice === 'spock' && botChoice === 'scissors') explanation = "Spock smashes Scissors!";
                else if (userChoice === 'spock' && botChoice === 'rock') explanation = "Spock vaporizes Rock!";
            } else {
                result = "I win!";

                // Explain why the bot won
                if (botChoice === 'rock' && userChoice === 'scissors') explanation = "Rock crushes Scissors!";
                else if (botChoice === 'rock' && userChoice === 'lizard') explanation = "Rock crushes Lizard!";
                else if (botChoice === 'paper' && userChoice === 'rock') explanation = "Paper covers Rock!";
                else if (botChoice === 'paper' && userChoice === 'spock') explanation = "Paper disproves Spock!";
                else if (botChoice === 'scissors' && userChoice === 'paper') explanation = "Scissors cuts Paper!";
                else if (botChoice === 'scissors' && userChoice === 'lizard') explanation = "Scissors decapitates Lizard!";
                else if (botChoice === 'lizard' && userChoice === 'paper') explanation = "Lizard eats Paper!";
                else if (botChoice === 'lizard' && userChoice === 'spock') explanation = "Lizard poisons Spock!";
                else if (botChoice === 'spock' && userChoice === 'scissors') explanation = "Spock smashes Scissors!";
                else if (botChoice === 'spock' && userChoice === 'rock') explanation = "Spock vaporizes Rock!";
            }

            message.reply(`You chose ${userChoice}, I chose ${botChoice}. ${result} ${explanation} Say thanks to my goat!`);
            activeGames.delete(message.author.id);
            return;
        }

        // Handle Dice War game
        if (game.type === 'dicewar') {
            const userInput = message.content.toLowerCase().trim();

            if (userInput !== 'roll') {
                return message.reply('Please type "roll" to roll your die!');
            }

            const userRoll = Math.floor(Math.random() * 6) + 1;
            const botRoll = game.botRoll;

            let result;
            if (userRoll > botRoll) {
                result = "You win!";
            } else if (botRoll > userRoll) {
                result = "I win!";
            } else {
                result = "It's a tie!";
            }

            message.reply(`🎲 You rolled: **${userRoll}**\n🎲 I rolled: **${botRoll}**\n\n${result} Say thanks to my goat!`);
            activeGames.delete(message.author.id);
            return;
        }

        // Handle Odd One Out game
        if (game.type === 'oddoneout') {
            const answer = message.content.trim();

            if (answer === game.answer) {
                message.reply(`🎉 Correct! ${game.answer} is the odd one out. ${game.reason} Say thanks to my goat!`);
            } else {
                message.reply(`That's not correct. The odd one out is ${game.answer}. ${game.reason} Say thanks to my goat!`);
            }

            activeGames.delete(message.author.id);
            return;
        }

        // Handle Anagram game
        if (game.type === 'anagram') {
            const guess = message.content.toLowerCase().trim();

            game.attempts++;

            if (guess === game.word) {
                message.reply(`Congratulations! You solved the anagram **${game.word}** in ${game.attempts} attempts! Say thanks to my goat!`);
                activeGames.delete(message.author.id);
            } else {
                if (game.attempts >= 5) {
                    message.reply(`That's not correct. You've used all 5 attempts. The word was: **${game.word}**. Say thanks to my goat!`);
                    activeGames.delete(message.author.id);
                } else {
                    message.reply(`That's not correct. You have ${5 - game.attempts} attempts left. Keep trying!`);
                }
            }

            return;
        }

        // Handle Countdown game
        if (game.type === 'countdown') {
            // This is a creative game, so we'll just acknowledge their solution
            message.reply(`Thanks for your solution! The target was ${game.target} using the numbers ${game.numbers.join(', ')}. Say thanks to my goat!`);
            activeGames.delete(message.author.id);
            return;
        }
    }

    // Check if the message is a command
    if (message.content.startsWith('!')) {
        const args = message.content.slice(1).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        // Handle the say command (allows the bot owner to speak through the bot)
        if (commandName === 'say' && message.author.id === process.env.OWNER_ID) {
            const text = args.join(' ');
            if (!text) return message.reply('Please provide a message for me to say!');

            // Delete the command message if possible
            if (message.guild) {
                try {
                    await message.delete();
                } catch (error) {
                    console.error('Failed to delete message:', error);
                }
            }

            // Send the message
            return message.channel.send(text);
        }

        // Handle the reply command (replies to a specific message)
        if (commandName === 'reply' && message.author.id === process.env.OWNER_ID) {
            // Check if there's a message ID to reply to
            if (!args[0]) return message.reply('Please provide a message ID to reply to!');

            const messageId = args[0];
            const replyText = args.slice(1).join(' ');

            if (!replyText) return message.reply('Please provide a message to reply with!');

            try {
                // Fetch the message to reply to
                const messageToReply = await message.channel.messages.fetch(messageId);
                await messageToReply.reply(replyText);

                // Delete the command message if possible
                if (message.guild) {
                    try {
                        await message.delete();
                    } catch (error) {
                        console.error('Failed to delete message:', error);
                    }
                }
            } catch (error) {
                console.error('Failed to reply to message:', error);
                message.reply('Failed to find that message. Make sure the ID is correct and the message is in this channel.');
            }
        }

        // Help command
        if (commandName === 'help') {
            const helpEmbed = {
                title: '🤖 Bot Commands',
                description: 'Here are all the commands you can use:',
                color: 0x3498db,
                fields: [
                    {
                        name: '💬 Chat Commands',
                        value: 'Just talk to me naturally or mention me! I respond to greetings, questions, and more.'
                    },
                    {
                        name: '🎮 Game Commands (1/3)',
                        value: '`!rps` - Rock Paper Scissors\n`!rpsls` - Rock Paper Scissors Lizard Spock\n`!guess` - Number Guessing game\n`!trivia` - Trivia game\n`!hangman` - Hangman (use `!hint` for help)\n`!scramble` - Unscramble a word\n`!anagram` - Solve an anagram\n`!riddle` - Solve a riddle'
                    },
                    {
                        name: '🎮 Game Commands (2/3)',
                        value: '`!wyr` - Would You Rather\n`!thisorthat` - This or That\n`!never` - Never Have I Ever\n`!2truths` - Two Truths and a Lie\n`!word` - Word Association\n`!emoji` - Guess the Emoji Story\n`!oddoneout` - Find the Odd One Out\n`!countdown` - Countdown Numbers Game'
                    },
                    {
                        name: '🎮 Game Commands (3/3)',
                        value: '`!flip` - Flip a coin\n`!roll` - Roll a dice\n`!dicewar` - Dice War\n`!8ball` - Magic 8-Ball\n`!joke` - Random Joke\n`!fact` - Random Fact\n`!quote` - Random Quote\n`!motivate` - Motivational Quote\n`!fortune` - Fortune Cookie\n`!compliment` - Get a Compliment\n`!roast` - Friendly Roast\n`!acronym` - Acronym Game\n`!quiz` - Personality Quiz'
                    },
                    {
                        name: '🛠️ Utility Commands',
                        value: '`!help` - Show this help message'
                    }
                ],
                footer: {
                    text: 'Mention me anytime you want to chat!'
                }
            };

            message.channel.send({ embeds: [helpEmbed] });
        }

        // Rock Paper Scissors game
        if (commandName === 'rps') {
            if (activeGames.has(message.author.id)) {
                return message.reply('You already have an active game! Finish that one first.');
            }

            activeGames.set(message.author.id, { type: 'rps' });
            message.reply('Let\'s play Rock Paper Scissors! Type rock, paper, or scissors to make your choice.');
        }

        // Number Guessing game
        if (commandName === 'guess') {
            if (activeGames.has(message.author.id)) {
                return message.reply('You already have an active game! Finish that one first.');
            }

            const randomNumber = Math.floor(Math.random() * 100) + 1;
            activeGames.set(message.author.id, { type: 'guess', number: randomNumber, attempts: 0 });
            message.reply('I\'m thinking of a number between 1 and 100. You have 10 attempts to guess it. What\'s your guess?');
        }

        // Trivia game
        if (commandName === 'trivia') {
            if (activeGames.has(message.author.id)) {
                return message.reply('You already have an active game! Finish that one first.');
            }

            const randomQuestion = triviaQuestions[Math.floor(Math.random() * triviaQuestions.length)];
            activeGames.set(message.author.id, { type: 'trivia', question: randomQuestion });

            const optionsText = randomQuestion.options.map((option, index) => `${index + 1}. ${option}`).join('\n');
            message.reply(`**Trivia Question:** ${randomQuestion.question}\n\n${optionsText}\n\nType your answer!`);
        }

        // Coin flip
        if (commandName === 'flip') {
            const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
            message.reply(`🪙 Coin flip result: **${result}**!`);
        }

        // Dice roll
        if (commandName === 'roll') {
            const sides = args[0] ? parseInt(args[0]) : 6;

            if (isNaN(sides) || sides < 1) {
                return message.reply('Please provide a valid number of sides for the dice!');
            }

            const result = Math.floor(Math.random() * sides) + 1;
            message.reply(`🎲 You rolled a ${sides}-sided dice and got: **${result}**!`);
        }

        // Simple ping command for testing
        if (commandName === 'ping') {
            message.reply('Pong! I am working correctly.');
        }

        // Hangman game
        if (commandName === 'hangman') {
            if (activeGames.has(message.author.id)) {
                return message.reply('You already have an active game! Finish that one first.');
            }

            const words = [
                'discord', 'javascript', 'programming', 'computer', 'keyboard',
                'monitor', 'internet', 'server', 'gaming', 'developer',
                'algorithm', 'database', 'network', 'software', 'hardware',
                'application', 'website', 'browser', 'security', 'interface'
            ];

            const word = words[Math.floor(Math.random() * words.length)];
            const guessedLetters = [];
            const maxAttempts = 6;

            activeGames.set(message.author.id, {
                type: 'hangman',
                word: word,
                guessedLetters: guessedLetters,
                attempts: 0,
                maxAttempts: maxAttempts
            });

            const displayWord = word.split('').map(letter => guessedLetters.includes(letter) ? letter : '_').join(' ');

            message.reply(`Let's play Hangman! I'm thinking of a ${word.length}-letter word.\n\n${displayWord}\n\nGuess a letter by typing a single letter. You have ${maxAttempts} incorrect guesses before you lose!`);
        }

        // Word Scramble game
        if (commandName === 'scramble') {
            if (activeGames.has(message.author.id)) {
                return message.reply('You already have an active game! Finish that one first.');
            }

            const words = [
                'discord', 'gaming', 'server', 'message', 'channel',
                'emoji', 'voice', 'friend', 'chat', 'online',
                'meme', 'stream', 'video', 'audio', 'text',
                'role', 'bot', 'admin', 'mod', 'user'
            ];

            const originalWord = words[Math.floor(Math.random() * words.length)];

            // Scramble the word
            const scrambledArray = originalWord.split('');
            for (let i = scrambledArray.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [scrambledArray[i], scrambledArray[j]] = [scrambledArray[j], scrambledArray[i]];
            }
            const scrambledWord = scrambledArray.join('');

            activeGames.set(message.author.id, {
                type: 'scramble',
                word: originalWord,
                attempts: 0
            });

            message.reply(`Let's play Word Scramble! Unscramble this word: **${scrambledWord}**\n\nType your answer!`);
        }

        // Would You Rather game
        if (commandName === 'wyr') {
            const questions = [
                // Original 10 questions
                'Would you rather be able to fly or be invisible?',
                'Would you rather have unlimited money or unlimited time?',
                'Would you rather be too hot or too cold?',
                'Would you rather be 10 years older or 10 years younger?',
                'Would you rather have super strength or super intelligence?',
                'Would you rather live in space or under the sea?',
                'Would you rather be a famous actor or a famous musician?',
                'Would you rather never use social media again or never watch TV again?',
                'Would you rather have a personal chef or a personal driver?',
                'Would you rather be able to talk to animals or speak all human languages?',

                // 90 more questions (for a total of 100)
                'Would you rather have the ability to see 10 minutes into the future or 150 years into the future?',
                'Would you rather have free Wi-Fi wherever you go or free coffee wherever you go?',
                'Would you rather be a master of every musical instrument or be fluent in every language?',
                'Would you rather be the best player on a losing team or the worst player on a winning team?',
                'Would you rather lose your sense of taste or your sense of smell?',
                'Would you rather always be 10 minutes late or always be 20 minutes early?',
                'Would you rather have a pause or a rewind button for your life?',
                'Would you rather be forced to sing along or dance to every song you hear?',
                'Would you rather have unlimited international first-class tickets or never have to pay for food at restaurants?',
                'Would you rather be able to teleport anywhere or be able to read minds?',
                'Would you rather have one real get-out-of-jail-free card or a key that opens any door?',
                'Would you rather have all traffic lights you approach be green or never have to stand in line again?',
                'Would you rather be able to see 1 year into your own future or 10 minutes into the future of anyone else?',
                'Would you rather be famous when you are alive and forgotten when you die or unknown when you are alive but famous after you die?',
                'Would you rather go back to the past and meet your ancestors or go to the future and meet your descendants?',
                'Would you rather have more time or more money?',
                'Would you rather have a flying car or a robot butler?',
                'Would you rather be able to control animals with your mind or electronics with your mind?',
                'Would you rather suddenly be elected a senator or suddenly become a CEO of a major company?',
                'Would you rather live in virtual reality where you are all powerful or live in the real world and be able to go anywhere but not be able to touch anything?',
                'Would you rather be born again in a totally different life or born again with all the knowledge you have now?',
                'Would you rather be stuck on a broken ski lift or in a broken elevator?',
                'Would you rather be able to take back anything you say or hear every conversation around you?',
                'Would you rather be without internet for a week or without your phone?',
                'Would you rather have every photo you take be blurry or have every song you listen to be slightly out of tune?',
                'Would you rather travel the world for a year on a shoestring budget or stay in only one country for a year but in luxury?',
                'Would you rather lose your left hand or right foot?',
                'Would you rather have a personal maid or a personal chef?',
                'Would you rather have skin that changes color based on your emotions or tattoos that change based on your thoughts?',
                'Would you rather never be able to eat warm food or never be able to eat cold food?',
                'Would you rather be in jail for a year or lose a year of your life?',
                'Would you rather give up bathing for a month or give up the internet for a month?',
                'Would you rather have amazingly fast typing/texting speed or be able to read ridiculously fast?',
                'Would you rather know the date of your death or the cause of your death?',
                'Would you rather be color blind or lose your sense of taste?',
                'Would you rather live in a house with see-through walls in a city or in a normal house in the middle of nowhere?',
                'Would you rather lose all of your memories from birth to now or lose your ability to make new memories?',
                'Would you rather be able to speak fluently to animals or be able to speak fluently in every language?',
                'Would you rather live without the internet or live without AC and heating?',
                'Would you rather have a completely automated home or a self-driving car?',
                'Would you rather never be able to leave your own country or never be able to return to your own country?',
                'Would you rather be locked in a room that is constantly dark for a week or a room that is constantly bright for a week?',
                'Would you rather be poor but help people or become incredibly rich by hurting people?',
                'Would you rather have a criminal justice system that actually works and is fair or an administrative government that is free of corruption?',
                'Would you rather have real political power but be relatively poor or be ridiculously rich but have no political power?',
                'Would you rather have the power to gently nudge anyone's decisions or have complete puppet master control of five people?',
                'Would you rather have everyone laugh at your jokes but not find anyone else's jokes funny or have no one laugh at your jokes but you find everyone else's jokes funny?',
                'Would you rather be the absolute best at something that no one takes seriously or be well above average but not anywhere near the best at something well respected?',
                'Would you rather lose the ability to read or lose the ability to speak?',
                'Would you rather live under a sky with no stars at night or live under a sky with no clouds during the day?',
                'Would you rather humans go to the moon again or go to Mars?',
                'Would you rather never get angry or never be envious?',
                'Would you rather have free unlimited Wi-Fi wherever you go or free unlimited drinks wherever you go?',
                'Would you rather be an average person in the present or a king 2500 years ago?',
                'Would you rather be able to control fire or water?',
                'Would you rather live on the beach or in a cabin in the woods?',
                'Would you rather lose your sense of touch or your sense of smell?',
                'Would you rather be constantly tired no matter how much you sleep or constantly hungry no matter how much you eat?',
                'Would you rather have to read aloud every word you read or sing everything you say out loud?',
                'Would you rather have hands that kept growing as you got older or feet that kept growing as you got older?',
                'Would you rather be unable to use search engines or unable to use social media?',
                'Would you rather give up all drinks except for water or give up eating anything that was cooked in an oven?',
                'Would you rather be able to see 10 minutes into your own future or 10 minutes into the future of anyone but yourself?',
                'Would you rather have a flying carpet or a car that can drive underwater?',
                'Would you rather be an amazing painter or a brilliant mathematician?',
                'Would you rather be teleported to a random place on Earth once a year or be teleported to a random place in the universe once in your lifetime?',
                'Would you rather never have to clean a bathroom again or never have to do dishes again?',
                'Would you rather relive the same day for 365 days or lose a year of your life?',
                'Would you rather have a third eye or a third arm?',
                'Would you rather be able to control dreams or be able to record them and watch them later?',
                'Would you rather be fluent in all languages or be a master of every musical instrument?',
                'Would you rather live a comfortable life in the woods or an uncomfortable life in a big city?',
                'Would you rather be completely invisible for one day or be able to fly for one day?',
                'Would you rather have unlimited sushi for life or unlimited tacos for life?',
                'Would you rather be a reverse centaur (human legs, horse torso and head) or a reverse mermaid/merman (fish head, human body and legs)?',
                'Would you rather have universal respect or unlimited power?',
                'Would you rather give up watching TV/movies for a year or give up playing games for a year?',
                'Would you rather live in a virtual reality where all your wishes are granted or in the real world?',
                'Would you rather be a character in an action-packed but dangerous fantasy world or a character in a soap opera?',
                'Would you rather be forced to dance every time you heard music or be forced to sing along to any song you heard?',
                'Would you rather have all your clothes fit perfectly or have the most comfortable pillow, blankets, and mattress?',
                'Would you rather wake up as a giraffe or wake up as a koala?',
                'Would you rather be a tree or have to live in a tree for the rest of your life?',
                'Would you rather never run out of battery power for your phone/tablet or never run out of gas for your car?',
                'Would you rather be covered in fur or covered in scales?',
                'Would you rather be in a zombie apocalypse or a robot apocalypse?',
                'Would you rather be an extra in an action movie or an extra in a comedy movie?',
                'Would you rather never age physically or never age mentally?',
                'Would you rather have a personal soundtrack that plays what you're feeling or a narrator that comments on your life?',
                'Would you rather be a superhero with a lame superpower or a villain with an awesome power?',
                'Would you rather have unlimited battery life on all your devices or have free Wi-Fi wherever you go?',
                'Would you rather have a photographic memory or an IQ of 200?',
                'Would you rather win $50,000 or let your best friend win $500,000?',
                'Would you rather have a personal comedian who follows you around to make you laugh or a personal chef who prepares all your meals?',
                'Would you rather be able to breathe underwater or be able to survive in space?',
                'Would you rather have all traffic lights you approach be green or never have to wait in line again?',
                'Would you rather have the ability to see through walls or have the ability to walk through walls?',
                'Would you rather be a famous director or a famous actor?',
                'Would you rather spend a week in the past or a week in the future?'
            ];

            const question = questions[Math.floor(Math.random() * questions.length)];
            message.reply(`🤔 **Would You Rather:** ${question}\n\nReply with your choice and why!`);
        }

        // 8 Ball game
        if (commandName === '8ball') {
            const responses = [
                'It is certain.',
                'It is decidedly so.',
                'Without a doubt.',
                'Yes, definitely.',
                'You may rely on it.',
                'As I see it, yes.',
                'Most likely.',
                'Outlook good.',
                'Yes.',
                'Signs point to yes.',
                'Reply hazy, try again.',
                'Ask again later.',
                'Better not tell you now.',
                'Cannot predict now.',
                'Concentrate and ask again.',
                'Don\'t count on it.',
                'My reply is no.',
                'My sources say no.',
                'Outlook not so good.',
                'Very doubtful.'
            ];

            // Check if a question was asked
            if (args.length === 0) {
                return message.reply('Please ask a question after the command. For example: `!8ball Will I win the lottery?`');
            }

            const response = responses[Math.floor(Math.random() * responses.length)];
            message.reply(`🎱 **Magic 8-Ball says:** ${response}`);
        }

        // Riddle game
        if (commandName === 'riddle') {
            const riddles = [
                // Original 10 riddles
                { question: "I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?", answer: "echo" },
                { question: "You see a boat filled with people. It has not sunk, but when you look again you don't see a single person on the boat. Why?", answer: "all the people were married" },
                { question: "What has keys but no locks, space but no room, and you can enter but not go in?", answer: "keyboard" },
                { question: "What gets wet while drying?", answer: "towel" },
                { question: "What can travel around the world while staying in a corner?", answer: "stamp" },
                { question: "What has a head and a tail, but no body?", answer: "coin" },
                { question: "What has many keys but can't open a single lock?", answer: "piano" },
                { question: "What is full of holes but still holds water?", answer: "sponge" },
                { question: "What question can you never answer yes to?", answer: "are you asleep" },
                { question: "What has one eye but can't see?", answer: "needle" },

                // 90 more riddles (for a total of 100)
                { question: "I'm tall when I'm young, and I'm short when I'm old. What am I?", answer: "candle" },
                { question: "What is always in front of you but can't be seen?", answer: "future" },
                { question: "What can you break, even if you never pick it up or touch it?", answer: "promise" },
                { question: "What goes up but never comes down?", answer: "age" },
                { question: "I have branches, but no fruit, trunk or leaves. What am I?", answer: "bank" },
                { question: "What can you keep after giving it to someone?", answer: "word" },
                { question: "What has many teeth, but can't bite?", answer: "comb" },
                { question: "What has words, but never speaks?", answer: "book" },
                { question: "What runs all around a backyard, yet never moves?", answer: "fence" },
                { question: "What can travel all around the world without leaving its corner?", answer: "stamp" },
                { question: "What has a thumb and four fingers, but is not alive?", answer: "glove" },
                { question: "What has legs, but doesn't walk?", answer: "table" },
                { question: "What has one head, one foot and four legs?", answer: "bed" },
                { question: "What has an eye but cannot see?", answer: "needle" },
                { question: "What can you catch, but not throw?", answer: "cold" },
                { question: "What kind of room has no doors or windows?", answer: "mushroom" },
                { question: "What kind of tree can you carry in your hand?", answer: "palm" },
                { question: "Which word in the dictionary is always spelled incorrectly?", answer: "incorrectly" },
                { question: "What gets bigger when more is taken away?", answer: "hole" },
                { question: "I'm light as a feather, but the strongest person can't hold me for more than a few minutes. What am I?", answer: "breath" },
                { question: "What starts with the letter 't', is filled with 't' and ends in 't'?", answer: "teapot" },
                { question: "What has 13 hearts, but no other organs?", answer: "deck of cards" },
                { question: "What building has the most stories?", answer: "library" },
                { question: "What tastes better than it smells?", answer: "tongue" },
                { question: "What has a neck but no head?", answer: "bottle" },
                { question: "What type of cheese is made backwards?", answer: "edam" },
                { question: "What gets wetter as it dries?", answer: "towel" },
                { question: "What can run but never walks, has a mouth but never talks, has a head but never weeps, has a bed but never sleeps?", answer: "river" },
                { question: "The more you take, the more you leave behind. What are they?", answer: "footsteps" },
                { question: "What has a bottom at the top?", answer: "legs" },
                { question: "What has 4 fingers and a thumb, but is not living?", answer: "glove" },
                { question: "What can fill a room but takes up no space?", answer: "light" },
                { question: "If you drop me I'm sure to crack, but give me a smile and I'll always smile back. What am I?", answer: "mirror" },
                { question: "What invention lets you look right through a wall?", answer: "window" },
                { question: "What can't talk but will reply when spoken to?", answer: "echo" },
                { question: "The more of this there is, the less you see. What is it?", answer: "darkness" },
                { question: "David's parents have three sons: Snap, Crackle, and what's the name of the third son?", answer: "david" },
                { question: "What has a face and two hands but no arms or legs?", answer: "clock" },
                { question: "What five-letter word becomes shorter when you add two letters to it?", answer: "short" },
                { question: "What word is pronounced the same if you take away four of its five letters?", answer: "queue" },
                { question: "I am an odd number. Take away a letter and I become even. What number am I?", answer: "seven" },
                { question: "What has keys that open no locks, space but no room, and you can enter but not go in?", answer: "keyboard" },
                { question: "What breaks yet never falls, and what falls yet never breaks?", answer: "day and night" },
                { question: "What goes through towns and over hills but never moves?", answer: "road" },
                { question: "What can you hold in your left hand but not in your right?", answer: "right elbow" },
                { question: "What is black when it's clean and white when it's dirty?", answer: "chalkboard" },
                { question: "What can you catch but not throw?", answer: "cold" },
                { question: "What is so fragile that saying its name breaks it?", answer: "silence" },
                { question: "What can one catch that is not thrown?", answer: "cold" },
                { question: "A man who was outside in the rain without an umbrella or hat didn't get a single hair on his head wet. Why?", answer: "he was bald" },
                { question: "What is seen in the middle of March and April that can't be seen at the beginning or end of either month?", answer: "letter r" },
                { question: "What word in the English language does the following: the first two letters signify a male, the first three letters signify a female, the first four letters signify a great, while the entire world signifies a great woman. What is the word?", answer: "heroine" },
                { question: "What is cut on a table, but is never eaten?", answer: "deck of cards" },
                { question: "What has a head, a tail, is brown, and has no legs?", answer: "penny" },
                { question: "What English word has three consecutive double letters?", answer: "bookkeeper" },
                { question: "What belongs to you, but other people use it more than you?", answer: "name" },
                { question: "What comes once in a minute, twice in a moment, but never in a thousand years?", answer: "letter m" },
                { question: "I am taken from a mine, and shut up in a wooden case, from which I am never released, and yet I am used by almost every person. What am I?", answer: "pencil lead" },
                { question: "What is it that after you take away the whole, some still remains?", answer: "wholesome" },
                { question: "What is it that no man wants, but no man wants to lose?", answer: "lawsuit" },
                { question: "What is put on a table, cut, but never eaten?", answer: "deck of cards" },
                { question: "What is as light as a feather, but even the world's strongest man couldn't hold it for more than a minute?", answer: "breath" },
                { question: "What is as big as an elephant, but weighs nothing at all?", answer: "shadow" },
                { question: "What two things can you never eat for breakfast?", answer: "lunch and dinner" },
                { question: "What word looks the same upside down and backwards?", answer: "swims" },
                { question: "What is it that given one, you'll have either two or none?", answer: "choice" },
                { question: "What is always coming but never arrives?", answer: "tomorrow" },
                { question: "What can be swallowed, but can also swallow you?", answer: "pride" },
                { question: "What is it that lives if it is fed, and dies if you give it a drink?", answer: "fire" },
                { question: "What is it that you will break even when you name it?", answer: "silence" },
                { question: "What is it that you must give before you can keep it?", answer: "word" },
                { question: "What is it that goes up and goes down but does not move?", answer: "temperature" },
                { question: "What is it that if you have, you want to share me, and if you share, you do not have?", answer: "secret" },
                { question: "What is the end of everything?", answer: "letter g" },
                { question: "What is it that's always coming but never arrives?", answer: "tomorrow" },
                { question: "What is it that you can keep after giving it to someone else?", answer: "word" },
                { question: "What is it that goes up but never comes down?", answer: "age" },
                { question: "What is it that has a bottom at the top?", answer: "legs" },
                { question: "What is it that, after you take away the whole, some still remains?", answer: "wholesome" },
                { question: "What is it that no one wants, but no one wants to lose?", answer: "lawsuit" },
                { question: "What is it that's always on its way but never arrives?", answer: "tomorrow" },
                { question: "What is it that you can't see, but is always before you?", answer: "future" },
                { question: "What is it that you break even when you name it?", answer: "silence" },
                { question: "What is it that you must keep after giving it to someone else?", answer: "word" },
                { question: "What is it that's full of holes but still holds water?", answer: "sponge" },
                { question: "What is it that's always in front of you but can't be seen?", answer: "future" },
                { question: "What is it that's black when it's clean and white when it's dirty?", answer: "chalkboard" },
                { question: "What is it that's bought by the yard and worn by the foot?", answer: "carpet" },
                { question: "What is it that's cut on a table, but is never eaten?", answer: "deck of cards" },
                { question: "What is it that's full of holes but still holds water?", answer: "sponge" },
                { question: "What is it that's taken before you get it?", answer: "photo" },
                { question: "What is it that's yours but others use it more than you do?", answer: "name" },
                { question: "What is the beginning of eternity, the end of time and space, the beginning of every end, and the end of every race?", answer: "letter e" },
                { question: "What is the center of gravity?", answer: "letter v" },
                { question: "What is the longest word in the dictionary?", answer: "smiles" },
                { question: "What is the only question you can't answer yes to?", answer: "are you asleep" },
                { question: "What is the only thing that can travel around the world while staying in a corner?", answer: "stamp" }
            ];

            if (activeGames.has(message.author.id)) {
                return message.reply('You already have an active game! Finish that one first.');
            }

            const riddle = riddles[Math.floor(Math.random() * riddles.length)];

            activeGames.set(message.author.id, {
                type: 'riddle',
                answer: riddle.answer,
                attempts: 0
            });

            message.reply(`🧩 **Riddle:** ${riddle.question}\n\nType your answer!`);
        }

        // Truth or Dare game
        if (commandName === 'truth') {
            const truths = [
                "What's the most embarrassing song you secretly like?",
                "What's the most childish thing you still do?",
                "What's the worst gift you've ever received?",
                "What's your biggest pet peeve?",
                "What's the most embarrassing thing you've done in front of a crush?",
                "What's your most irrational fear?",
                "What's the weirdest dream you've ever had?",
                "What's the worst fashion trend you've ever participated in?",
                "If you could swap lives with anyone in the server for a day, who would it be?",
                "What's the most embarrassing thing in your search history?",
                "What's the silliest thing you've ever done because you were bored?",
                "What's a weird food combination that you enjoy?",
                "What's the worst advice you've ever given?",
                "What's something you've done that you hope your parents never find out about?",
                "What's your most useless talent?"
            ];

            const truth = truths[Math.floor(Math.random() * truths.length)];
            message.reply(`🔮 **Truth:** ${truth}`);
        }

        if (commandName === 'dare') {
            const dares = [
                "Send a screenshot of your most recent emoji usage.",
                "Change your Discord profile picture to whatever the next person suggests for 1 hour.",
                "Type with your elbows for the next 5 messages.",
                "Send the last photo you took.",
                "Send a voice message of you singing your favorite song chorus.",
                "Write a haiku about another server member.",
                "Send a message in only emojis that describes your day.",
                "Draw something in MS Paint with your eyes closed and share it.",
                "Send a message in reverse.",
                "Use only song lyrics to communicate for the next 10 minutes.",
                "Tell a joke so bad it's good.",
                "Share your screen time report for today.",
                "Write a short poem about Discord.",
                "Send a message without using the letter 'e'.",
                "Create a meme about this server and share it."
            ];

            const dare = dares[Math.floor(Math.random() * dares.length)];
            message.reply(`🔥 **Dare:** ${dare}`);
        }

        // Fact game
        if (commandName === 'fact') {
            const facts = [
                "Honey never spoils. Archaeologists have found pots of honey in ancient Egyptian tombs that are over 3,000 years old and still perfectly good to eat.",
                "A day on Venus is longer than a year on Venus. It takes 243 Earth days to rotate once on its axis, but only 225 Earth days to go around the Sun.",
                "The shortest war in history was between Britain and Zanzibar on August 27, 1896. Zanzibar surrendered after 38 minutes.",
                "The average person will spend six months of their life waiting for red lights to turn green.",
                "A group of flamingos is called a 'flamboyance'.",
                "Cows have best friends and get stressed when they are separated.",
                "The fingerprints of koalas are so similar to humans that they have on occasion been confused at crime scenes.",
                "The Hawaiian alphabet has only 12 letters: A, E, I, O, U, H, K, L, M, N, P, and W.",
                "A bolt of lightning is five times hotter than the surface of the sun.",
                "Bananas are berries, but strawberries aren't.",
                "The Eiffel Tower can be 15 cm taller during the summer due to thermal expansion.",
                "Octopuses have three hearts, nine brains, and blue blood.",
                "A group of unicorns is called a blessing.",
                "The shortest commercial flight in the world is between the Scottish islands of Westray and Papa Westray, with a flight time of just under two minutes.",
                "Cats can't taste sweet things because they lack the specific taste receptor.",
                "The world's oldest known living tree is over 5,000 years old.",
                "A day on Mercury lasts about 176 Earth days.",
                "Humans share 50% of their DNA with bananas.",
                "The Great Wall of China is not visible from space with the naked eye, contrary to popular belief.",
                "A group of crows is called a murder."
            ];

            const fact = facts[Math.floor(Math.random() * facts.length)];
            message.reply(`📚 **Random Fact:** ${fact}`);
        }

        // Joke game
        if (commandName === 'joke') {
            const jokes = [
                "Why don't scientists trust atoms? Because they make up everything!",
                "I told my wife she was drawing her eyebrows too high. She looked surprised.",
                "What do you call a fake noodle? An impasta!",
                "Why did the scarecrow win an award? Because he was outstanding in his field!",
                "I'm reading a book about anti-gravity. It's impossible to put down!",
                "Did you hear about the mathematician who's afraid of negative numbers? He'll stop at nothing to avoid them!",
                "Why don't eggs tell jokes? They'd crack each other up!",
                "I used to be a baker, but I couldn't make enough dough.",
                "What's the best thing about Switzerland? I don't know, but the flag is a big plus.",
                "How do you organize a space party? You planet!",
                "Why did the bicycle fall over? Because it was two tired!",
                "What do you call a parade of rabbits hopping backwards? A receding hare-line.",
                "What's orange and sounds like a parrot? A carrot.",
                "Why can't you give Elsa a balloon? Because she will let it go.",
                "I'm on a seafood diet. Every time I see food, I eat it!",
                "What do you call a bear with no teeth? A gummy bear!",
                "What's a ninja's favorite type of shoes? Sneakers!",
                "Why did the tomato turn red? Because it saw the salad dressing!",
                "What did one wall say to the other wall? I'll meet you at the corner!",
                "Why did the golfer bring two pairs of pants? In case he got a hole in one!"
            ];

            const joke = jokes[Math.floor(Math.random() * jokes.length)];
            message.reply(`😂 **Joke:** ${joke}`);
        }

        // Quote game
        if (commandName === 'quote') {
            const quotes = [
                "\"Be yourself; everyone else is already taken.\" — Oscar Wilde",
                "\"Two things are infinite: the universe and human stupidity; and I'm not sure about the universe.\" — Albert Einstein",
                "\"Be the change that you wish to see in the world.\" — Mahatma Gandhi",
                "\"In three words I can sum up everything I've learned about life: it goes on.\" — Robert Frost",
                "\"If you tell the truth, you don't have to remember anything.\" — Mark Twain",
                "\"I've learned that people will forget what you said, people will forget what you did, but people will never forget how you made them feel.\" — Maya Angelou",
                "\"Live as if you were to die tomorrow. Learn as if you were to live forever.\" — Mahatma Gandhi",
                "\"Darkness cannot drive out darkness: only light can do that. Hate cannot drive out hate: only love can do that.\" — Martin Luther King Jr.",
                "\"Without music, life would be a mistake.\" — Friedrich Nietzsche",
                "\"We accept the love we think we deserve.\" — Stephen Chbosky",
                "\"To be yourself in a world that is constantly trying to make you something else is the greatest accomplishment.\" — Ralph Waldo Emerson",
                "\"I have not failed. I've just found 10,000 ways that won't work.\" — Thomas A. Edison",
                "\"It is never too late to be what you might have been.\" — George Eliot",
                "\"Life isn't about finding yourself. Life is about creating yourself.\" — George Bernard Shaw",
                "\"The future belongs to those who believe in the beauty of their dreams.\" — Eleanor Roosevelt"
            ];

            const quote = quotes[Math.floor(Math.random() * quotes.length)];
            message.reply(`💭 **Quote:** ${quote}`);
        }

        // This or That game
        if (commandName === 'thisorthat') {
            const questions = [
                // Original 20 questions
                "Pizza 🍕 or Burgers 🍔?",
                "Movies 🎬 or Books 📚?",
                "Beach 🏖️ or Mountains ⛰️?",
                "Dogs 🐕 or Cats 🐈?",
                "Morning 🌅 or Night 🌃?",
                "Summer ☀️ or Winter ❄️?",
                "Tea 🍵 or Coffee ☕?",
                "Call 📞 or Text 💬?",
                "Instagram 📸 or Twitter 🐦?",
                "Netflix 🎬 or YouTube 📺?",
                "Pancakes 🥞 or Waffles 🧇?",
                "Chocolate 🍫 or Vanilla 🍦?",
                "iOS 🍎 or Android 🤖?",
                "Physical Books 📚 or E-Books 📱?",
                "Sneakers 👟 or Sandals 👡?",
                "Cooking 🍳 or Eating Out 🍽️?",
                "Early Bird 🐦 or Night Owl 🦉?",
                "Introvert 🤫 or Extrovert 🗣️?",
                "Plan Everything 📝 or Go with the Flow 🌊?",
                "Save Money 💰 or Spend It 💸?",

                // 80 more questions (for a total of 100)
                "Sunrise 🌅 or Sunset 🌇?",
                "Ocean 🌊 or Lake 🏞️?",
                "City Life 🏙️ or Country Life 🏡?",
                "Camping ⛺ or Hotel 🏨?",
                "Shower 🚿 or Bath 🛁?",
                "Cake 🍰 or Pie 🥧?",
                "Cookies 🍪 or Brownies 🍫?",
                "Salty 🧂 or Sweet 🍭?",
                "Spicy 🌶️ or Mild 🍲?",
                "Hot Food 🔥 or Cold Food ❄️?",
                "Breakfast 🍳 or Dinner 🍽️?",
                "Soup 🍜 or Salad 🥗?",
                "Pasta 🍝 or Rice 🍚?",
                "Tacos 🌮 or Burritos 🌯?",
                "Sushi 🍣 or Pizza 🍕?",
                "Chicken 🍗 or Beef 🥩?",
                "Fruit 🍎 or Vegetables 🥦?",
                "Ice Cream 🍦 or Frozen Yogurt 🍨?",
                "Donuts 🍩 or Muffins 🧁?",
                "Milk 🥛 or Juice 🧃?",
                "Water 💧 or Soda 🥤?",
                "Beer 🍺 or Wine 🍷?",
                "Whiskey 🥃 or Vodka 🍸?",
                "Cocktails 🍹 or Straight Drinks 🥂?",
                "Gym 🏋️ or Outdoor Exercise 🏃?",
                "Running 🏃 or Swimming 🏊?",
                "Yoga 🧘 or Weightlifting 🏋️?",
                "Team Sports ⚽ or Individual Sports 🎾?",
                "Football 🏈 or Basketball 🏀?",
                "Soccer ⚽ or Baseball ⚾?",
                "Tennis 🎾 or Golf ⛳?",
                "Skiing ⛷️ or Snowboarding 🏂?",
                "Biking 🚴 or Hiking 🥾?",
                "Board Games 🎲 or Video Games 🎮?",
                "Card Games 🃏 or Dice Games 🎲?",
                "Strategy Games 🧩 or Action Games 🎯?",
                "RPGs 🧙 or FPS 🔫?",
                "PC Gaming 💻 or Console Gaming 🎮?",
                "Xbox 🎮 or PlayStation 🎮?",
                "Online Games 🌐 or Offline Games 📴?",
                "Comedy 😂 or Drama 😢?",
                "Action 💥 or Romance ❤️?",
                "Horror 👻 or Sci-Fi 🚀?",
                "Fantasy 🧙‍♂️ or Reality 📺?",
                "Superhero Movies 🦸 or Animated Movies 🧚?",
                "TV Series 📺 or Movies 🎬?",
                "Binge-Watching 📺 or Weekly Episodes 📅?",
                "Live Music 🎵 or Recorded Music 🎧?",
                "Rock 🎸 or Pop 🎤?",
                "Hip Hop 🎤 or Country 🤠?",
                "Classical 🎻 or Jazz 🎷?",
                "Instrumental 🎹 or Vocal 🎤?",
                "Concerts 🎫 or Festivals 🎪?",
                "Headphones 🎧 or Speakers 🔊?",
                "Vinyl Records 📀 or Digital Music 📱?",
                "Singing 🎤 or Dancing 💃?",
                "Art Museums 🖼️ or Science Museums 🔬?",
                "Painting 🎨 or Photography 📷?",
                "Drawing ✏️ or Sculpting 🗿?",
                "Fiction 📖 or Non-Fiction 📚?",
                "Fantasy 🧙‍♂️ or Mystery 🔍?",
                "Romance ❤️ or Thriller 😱?",
                "Poetry 📝 or Prose 📄?",
                "Paperback 📖 or Hardcover 📕?",
                "New Books 📚 or Used Books 📙?",
                "Writing ✍️ or Reading 📖?",
                "Texting 📱 or Talking 🗣️?",
                "Email 📧 or Handwritten Letters ✉️?",
                "Phone Calls 📞 or Video Calls 📹?",
                "Social Media 📱 or Face-to-Face 👥?",
                "Facebook 👍 or TikTok 🎵?",
                "Snapchat 👻 or Instagram 📸?",
                "YouTube 📺 or Twitch 🎮?",
                "Reddit 🤖 or Twitter 🐦?",
                "Laptop 💻 or Desktop 🖥️?",
                "Windows 🪟 or Mac 🍎?",
                "Chrome 🌐 or Firefox 🦊?",
                "Keyboard ⌨️ or Voice Input 🎙️?",
                "Touchscreen 👆 or Mouse 🖱️?",
                "Wired 🔌 or Wireless 📶?",
                "Dark Mode 🌑 or Light Mode ☀️?",
                "Minimalist 🧘 or Maximalist 🎭?",
                "Modern 🏢 or Vintage 🕰️?",
                "Casual 👕 or Formal 👔?",
                "Bright Colors 🌈 or Neutrals 🤎?",
                "Gold 🥇 or Silver 🥈?",
                "Diamonds 💎 or Pearls 🦪?",
                "Tattoos 🎨 or Piercings 💍?",
                "Glasses 👓 or Contacts 👁️?",
                "Long Hair 👱‍♀️ or Short Hair 💇‍♀️?"
            ];

            const question = questions[Math.floor(Math.random() * questions.length)];
            message.reply(`⚔️ **This or That:** ${question}`);
        }

        // Never Have I Ever game
        if (commandName === 'never') {
            const statements = [
                // Original 15 statements
                "Never have I ever stayed up for more than 24 hours.",
                "Never have I ever sent a text to the wrong person.",
                "Never have I ever fallen asleep during class or at work.",
                "Never have I ever pretended to know a celebrity.",
                "Never have I ever eaten food that fell on the floor.",
                "Never have I ever lied about my age.",
                "Never have I ever pretended to be sick to avoid something.",
                "Never have I ever forgotten someone's name while introducing them.",
                "Never have I ever stalked someone on social media.",
                "Never have I ever taken a shower with my socks on.",
                "Never have I ever sent a message that I immediately regretted.",
                "Never have I ever accidentally liked a really old post when stalking someone's profile.",
                "Never have I ever pretended to know a song's lyrics.",
                "Never have I ever used Google to win an argument.",
                "Never have I ever binged an entire series in one day.",

                // 35 more statements (for a total of 50)
                "Never have I ever gone an entire day without using my phone.",
                "Never have I ever pretended to laugh at a joke I didn't get.",
                "Never have I ever taken a selfie in a public bathroom.",
                "Never have I ever sent a text to the wrong person that was about them.",
                "Never have I ever tripped in public and pretended it was intentional.",
                "Never have I ever accidentally called someone and then hung up immediately.",
                "Never have I ever used someone else's Netflix account.",
                "Never have I ever eaten an entire pizza by myself.",
                "Never have I ever pretended to know about a topic just to impress someone.",
                "Never have I ever accidentally liked an ex's social media post.",
                "Never have I ever worn clothes inside out in public without realizing.",
                "Never have I ever pretended to be on the phone to avoid talking to someone.",
                "Never have I ever forgotten to mute myself on a video call.",
                "Never have I ever used an emoji in a professional email.",
                "Never have I ever taken food from a roommate without asking.",
                "Never have I ever accidentally sent a screenshot of a conversation to the person I was talking about.",
                "Never have I ever fallen asleep during a movie at the theater.",
                "Never have I ever pretended to know a famous person.",
                "Never have I ever used the excuse 'I didn't see your text' when I actually did.",
                "Never have I ever gone to a restaurant just for the free WiFi.",
                "Never have I ever taken a picture of my food before eating it.",
                "Never have I ever pretended to be busy to avoid plans.",
                "Never have I ever spent more than an hour deciding what to watch on Netflix.",
                "Never have I ever accidentally called someone by the wrong name.",
                "Never have I ever sent a message meant for someone else to my boss or teacher.",
                "Never have I ever worn pajamas to a virtual meeting.",
                "Never have I ever pretended to know a song at karaoke.",
                "Never have I ever used the 'my battery is dying' excuse to end a call.",
                "Never have I ever accidentally worn mismatched shoes in public.",
                "Never have I ever pretended to be sick to get out of plans.",
                "Never have I ever forgotten someone's birthday and then pretended I knew all along.",
                "Never have I ever used a fake name at a coffee shop.",
                "Never have I ever taken a 'sick day' when I wasn't actually sick.",
                "Never have I ever accidentally liked a very old social media post while stalking someone.",
                "Never have I ever pretended to understand a foreign film without reading the subtitles."
            ];

            const statement = statements[Math.floor(Math.random() * statements.length)];
            message.reply(`🙅 **Never Have I Ever:** ${statement}\n\nReply with "I have" or "I haven't"!`);
        }

        // Word Association game
        if (commandName === 'word') {
            const words = [
                // Original 26 words
                "Apple", "Beach", "Cloud", "Dream", "Earth",
                "Fire", "Garden", "House", "Island", "Jungle",
                "Kitchen", "Light", "Mountain", "Night", "Ocean",
                "Paper", "Queen", "River", "Summer", "Tree",
                "Umbrella", "Vacation", "Water", "Xylophone", "Yellow", "Zebra",

                // 74 more words (for a total of 100)
                "Adventure", "Balloon", "Candle", "Diamond", "Elephant",
                "Forest", "Galaxy", "Horizon", "Ice", "Journey",
                "Key", "Laughter", "Magic", "Nature", "Oxygen",
                "Planet", "Quiet", "Rainbow", "Star", "Thunder",
                "Universe", "Volcano", "Whisper", "Youth", "Zephyr",
                "Autumn", "Butterfly", "Crystal", "Dolphin", "Echo",
                "Feather", "Glitter", "Harmony", "Infinity", "Jasmine",
                "Kaleidoscope", "Lagoon", "Melody", "Nectar", "Orchid",
                "Paradise", "Quasar", "Radiance", "Serenity", "Twilight",
                "Utopia", "Velvet", "Waterfall", "Xenon", "Yoga",
                "Zenith", "Aurora", "Blossom", "Cascade", "Dazzle",
                "Ember", "Frost", "Glimmer", "Horizon", "Illusion",
                "Jubilee", "Kismet", "Luminous", "Mirage", "Nebula",
                "Oasis", "Prism", "Quicksilver", "Ripple", "Sapphire",
                "Tranquil", "Undulate", "Vivid", "Whisper", "Xanadu",
                "Yearning", "Zest"
            ];

            const word = words[Math.floor(Math.random() * words.length)];
            message.reply(`🔤 **Word Association:** I say "${word}" - what word do you associate with it? Reply with your word!`);
        }

        // Emoji Story game
        if (commandName === 'emoji') {
            const emojiStories = [
                "🧙‍♂️🧠🦁🤖👧🌈",
                "👸❄️⛄🦌👑",
                "🐷🐷🐷🐺🏠🏠",
                "👦🌱🌲🌳🐮",
                "🐰⏱️🎩🫖",
                "👧👵🐺🌲🪓",
                "🧜‍♀️🦵👑🌊",
                "🧚‍♀️👦✨🏝️",
                "🐵🦁🐘🦒🦓🌍",
                "👩‍👧🧹🧙‍♀️👠🎃",
                "🐻🐻🐻🥣👧🏠",
                "👸💤💍👸",
                "🐢🐇🏁🐌",
                "👨👦🦁⭐",
                "🐘☁️✈️🎪"
            ];

            const emojiStory = emojiStories[Math.floor(Math.random() * emojiStories.length)];
            message.reply(`📖 **Emoji Story:** ${emojiStory}\n\nCan you guess what story these emojis represent?`);
        }

        // Compliment generator
        if (commandName === 'compliment') {
            const compliments = [
                "Your smile could light up the darkest room!",
                "You have an amazing sense of humor that brightens everyone's day.",
                "Your creativity knows no bounds!",
                "You're incredibly thoughtful and kind.",
                "Your positive energy is absolutely contagious!",
                "You have a unique perspective that makes conversations with you fascinating.",
                "Your dedication and perseverance are truly inspiring.",
                "You make people feel valued and important.",
                "Your passion for what you love is incredible to witness.",
                "You have a gift for making others feel comfortable.",
                "Your intelligence and wit are a powerful combination!",
                "You're the kind of friend everyone wishes they had.",
                "Your authenticity is refreshing and admirable.",
                "You handle challenges with remarkable grace.",
                "Your enthusiasm for life is absolutely infectious!",
                "You have an incredible ability to find joy in the little things.",
                "Your empathy and understanding make you a wonderful human being.",
                "You're making a positive difference in the world, even when you don't realize it.",
                "Your strength during difficult times is truly admirable.",
                "You have a heart of gold!"
            ];

            // Check if a user was mentioned
            const mentionedUser = message.mentions.users.first();

            if (mentionedUser) {
                const compliment = compliments[Math.floor(Math.random() * compliments.length)];
                message.channel.send(`Hey ${mentionedUser}, ${compliment}`);
            } else {
                const compliment = compliments[Math.floor(Math.random() * compliments.length)];
                message.reply(`💖 **Compliment:** ${compliment}`);
            }
        }

        // Fortune Cookie game
        if (commandName === 'fortune') {
            const fortunes = [
                "A beautiful, smart, and loving person will be coming into your life.",
                "Your creativity will make you famous.",
                "Your hard work is about to pay off. Remember, dreams are illustrations from the book your soul is writing about you.",
                "A lifetime of happiness awaits you.",
                "The greatest risk is not taking one.",
                "A dubious friend may be an enemy in camouflage.",
                "A journey of a thousand miles begins with a single step.",
                "All the effort you are making will ultimately pay off.",
                "All your hard work will soon pay off.",
                "An important person will offer you support.",
                "Be careful or you could fall for some tricks today.",
                "Change is happening in your life, so go with the flow!",
                "Curiosity kills boredom. Nothing kills curiosity.",
                "Dedicate yourself with a calm mind to the task at hand.",
                "Determination is what you need now.",
                "Disbelief destroys the magic.",
                "Do not underestimate yourself. Human beings have unlimited potentials.",
                "Don't just spend time. Invest it.",
                "Don't just think, act!",
                "Don't worry about money. The best things in life are free."
            ];

            const fortune = fortunes[Math.floor(Math.random() * fortunes.length)];
            message.reply(`🥠 **Fortune Cookie says:** ${fortune}`);
        }

        // Personality Quiz
        if (commandName === 'quiz') {
            const questions = [
                "What would you do with a million dollars? A) Save it B) Travel the world C) Buy a house D) Give to charity",
                "What's your ideal vacation? A) Beach resort B) Mountain hiking C) City exploration D) Staying home",
                "Which superpower would you choose? A) Invisibility B) Flight C) Mind reading D) Time travel",
                "What's your favorite season? A) Spring B) Summer C) Fall D) Winter",
                "How do you prefer to spend your free time? A) Reading B) Watching movies C) Outdoor activities D) Gaming",
                "What's your communication style? A) Direct and to the point B) Thoughtful and reflective C) Animated and expressive D) Quiet and observant",
                "What's your approach to problems? A) Logical analysis B) Creative solutions C) Ask for help D) Trust your instincts",
                "What animal do you identify with most? A) Lion B) Dolphin C) Owl D) Wolf",
                "What's your ideal job environment? A) Corporate office B) Remote work C) Outdoors D) Creative studio",
                "How do you react to stress? A) Take action B) Analyze the situation C) Talk it out D) Take a break"
            ];

            const question = questions[Math.floor(Math.random() * questions.length)];
            message.reply(`🧠 **Personality Quiz:** ${question}\n\nReply with your answer (A, B, C, or D)!`);
        }

        // Two Truths and a Lie setup
        if (commandName === '2truths') {
            message.reply(`🎭 **Two Truths and a Lie**\n\nShare three statements about yourself - two true and one false. Let others guess which one is the lie!\n\nFormat your response like this:\n1. [First statement]\n2. [Second statement]\n3. [Third statement]`);
        }

        // Roast generator (keeping it light and funny)
        if (commandName === 'roast') {
            const roasts = [
                "You're the human equivalent of a participation award.",
                "I'd agree with you, but then we'd both be wrong.",
                "You have a face for radio and a voice for silent films.",
                "I'm not saying you're boring, but you make vanilla look spicy.",
                "Your fashion sense called. It's filing for divorce.",
                "If you were a spice, you'd be flour.",
                "You're about as useful as a screen door on a submarine.",
                "I'm not insulting you, I'm describing you.",
                "You're not the sharpest knife in the drawer, but you're certainly the most plastic one.",
                "I'd tell you to go outside and play, but my mom said not to throw trash on the lawn.",
                "You have the personality of a wet paper towel.",
                "You're the reason they put instructions on shampoo bottles.",
                "If you were a vegetable, you'd be a 'plain' potato.",
                "You're like a cloud. When you disappear, it's a beautiful day.",
                "I'd tell you to aim high, but I'm afraid you'd just get dizzy."
            ];

            // Check if a user was mentioned
            const mentionedUser = message.mentions.users.first();

            if (mentionedUser) {
                const roast = roasts[Math.floor(Math.random() * roasts.length)];
                message.channel.send(`${mentionedUser}, ${roast} (Just kidding! It's all in good fun!)`);
            } else {
                const roast = roasts[Math.floor(Math.random() * roasts.length)];
                message.reply(`🔥 **Friendly Roast:** ${roast} (All in good fun!)`);
            }
        }

        // Motivational Quote
        if (commandName === 'motivate') {
            const quotes = [
                "Believe you can and you're halfway there. -Theodore Roosevelt",
                "You are never too old to set another goal or to dream a new dream. -C.S. Lewis",
                "It does not matter how slowly you go as long as you do not stop. -Confucius",
                "Everything you've ever wanted is on the other side of fear. -George Addair",
                "Success is not final, failure is not fatal: it is the courage to continue that counts. -Winston Churchill",
                "Hardships often prepare ordinary people for an extraordinary destiny. -C.S. Lewis",
                "Believe in yourself. You are braver than you think, more talented than you know, and capable of more than you imagine. -Roy T. Bennett",
                "I learned that courage was not the absence of fear, but the triumph over it. -Nelson Mandela",
                "If you're going through hell, keep going. -Winston Churchill",
                "The only way to do great work is to love what you do. -Steve Jobs",
                "What you get by achieving your goals is not as important as what you become by achieving your goals. -Zig Ziglar",
                "The future belongs to those who believe in the beauty of their dreams. -Eleanor Roosevelt",
                "It always seems impossible until it's done. -Nelson Mandela",
                "Don't watch the clock; do what it does. Keep going. -Sam Levenson",
                "The only limit to our realization of tomorrow will be our doubts of today. -Franklin D. Roosevelt"
            ];

            const quote = quotes[Math.floor(Math.random() * quotes.length)];
            message.reply(`✨ **Motivation:** ${quote}`);
        }

        // Rock Paper Scissors Lizard Spock
        if (commandName === 'rpsls') {
            if (activeGames.has(message.author.id)) {
                return message.reply('You already have an active game! Finish that one first.');
            }

            activeGames.set(message.author.id, { type: 'rpsls' });
            message.reply(`Let's play Rock Paper Scissors Lizard Spock! Choose one of the following:\n\n🪨 Rock\n📄 Paper\n✂️ Scissors\n🦎 Lizard\n🖖 Spock\n\nRules:\n- Rock crushes Scissors and Lizard\n- Paper covers Rock and disproves Spock\n- Scissors cuts Paper and decapitates Lizard\n- Lizard eats Paper and poisons Spock\n- Spock smashes Scissors and vaporizes Rock`);
        }

        // Hangman Hint
        if (commandName === 'hint') {
            if (!activeGames.has(message.author.id) || activeGames.get(message.author.id).type !== 'hangman') {
                return message.reply('You don\'t have an active Hangman game! Start one with !hangman first.');
            }

            const game = activeGames.get(message.author.id);

            // Generate a hint by revealing one random unguessed letter
            const unguessedLetters = game.word.split('').filter(letter => !game.guessedLetters.includes(letter));

            if (unguessedLetters.length === 0) {
                return message.reply('There are no more letters to hint! You\'ve either guessed them all or they\'re already revealed.');
            }

            const hintLetter = unguessedLetters[Math.floor(Math.random() * unguessedLetters.length)];
            game.guessedLetters.push(hintLetter);

            // Update the display word
            const displayWord = game.word.split('').map(letter => game.guessedLetters.includes(letter) ? letter : '_').join(' ');

            // Check if the player has won with this hint
            const allLettersGuessed = game.word.split('').every(letter => game.guessedLetters.includes(letter));

            if (allLettersGuessed) {
                message.reply(`The hint was "${hintLetter}"! With this hint, you've completed the word: **${game.word}**! Say thanks to my goat!`);
                activeGames.delete(message.author.id);
            } else {
                message.reply(`Here's a hint: the word contains the letter "${hintLetter}".\n\nThe word now looks like this:\n\n${displayWord}\n\nGuessed letters: ${game.guessedLetters.join(', ')}`);
            }
        }

        // Dice War game
        if (commandName === 'dicewar') {
            message.reply(`🎲 **Dice War!**\n\nI'll roll a die, and you roll a die. Highest number wins!\n\nType "roll" to roll your die!`);

            if (activeGames.has(message.author.id)) {
                return message.reply('You already have an active game! Finish that one first.');
            }

            const botRoll = Math.floor(Math.random() * 6) + 1;

            activeGames.set(message.author.id, {
                type: 'dicewar',
                botRoll: botRoll
            });
        }

        // Acronym game
        if (commandName === 'acronym') {
            const acronyms = [
                "LOL", "BRB", "OMG", "ASAP", "DIY",
                "YOLO", "FOMO", "TBT", "BFF", "IDK",
                "NASA", "LASER", "RADAR", "SCUBA", "TGIF",
                "ROFL", "GOAT", "MVP", "VIP", "CEO"
            ];

            const acronym = acronyms[Math.floor(Math.random() * acronyms.length)];
            message.reply(`🔤 **Acronym Game:** What does ${acronym} stand for?\n\nMake up a funny or creative meaning! It doesn't have to be the real one.`);
        }

        // Odd One Out game
        if (commandName === 'oddoneout') {
            const sets = [
                { items: ["🍎 Apple", "🍌 Banana", "🍊 Orange", "🥦 Broccoli"], answer: "🥦 Broccoli", reason: "It's a vegetable, while the others are fruits." },
                { items: ["🐶 Dog", "🐱 Cat", "🐠 Fish", "🐦 Bird"], answer: "🐠 Fish", reason: "It lives in water, while the others live on land." },
                { items: ["🚗 Car", "🚲 Bicycle", "✈️ Airplane", "🚂 Train"], answer: "🚲 Bicycle", reason: "It doesn't have an engine." },
                { items: ["👕 Shirt", "👖 Pants", "👟 Shoes", "👓 Glasses"], answer: "👓 Glasses", reason: "It's not clothing." },
                { items: ["🏀 Basketball", "⚾ Baseball", "⚽ Soccer", "🎸 Guitar"], answer: "🎸 Guitar", reason: "It's a musical instrument, not a sport." },
                { items: ["🍕 Pizza", "🍔 Burger", "🍦 Ice Cream", "🌮 Taco"], answer: "🍦 Ice Cream", reason: "It's a dessert, while the others are main dishes." },
                { items: ["📱 Phone", "💻 Laptop", "📺 TV", "📚 Books"], answer: "📚 Books", reason: "It doesn't require electricity." },
                { items: ["🐘 Elephant", "🦒 Giraffe", "🐬 Dolphin", "🦁 Lion"], answer: "🐬 Dolphin", reason: "It lives in water, while the others live on land." },
                { items: ["🌞 Sun", "🌙 Moon", "⭐ Star", "🌍 Earth"], answer: "🌍 Earth", reason: "It's a planet, while the others are celestial bodies." },
                { items: ["🎭 Theater", "🎬 Cinema", "🏟️ Stadium", "🏪 Store"], answer: "🏪 Store", reason: "It's for shopping, not entertainment." }
            ];

            const set = sets[Math.floor(Math.random() * sets.length)];

            if (activeGames.has(message.author.id)) {
                return message.reply('You already have an active game! Finish that one first.');
            }

            activeGames.set(message.author.id, {
                type: 'oddoneout',
                answer: set.answer,
                reason: set.reason
            });

            message.reply(`🔍 **Odd One Out:** Which one doesn't belong in this group?\n\n${set.items.join('\n')}\n\nType your answer!`);
        }

        // Anagram game
        if (commandName === 'anagram') {
            const words = [
                "discord", "gaming", "server", "message", "channel",
                "friend", "emoji", "voice", "chat", "online",
                "stream", "video", "audio", "text", "role"
            ];

            if (activeGames.has(message.author.id)) {
                return message.reply('You already have an active game! Finish that one first.');
            }

            const word = words[Math.floor(Math.random() * words.length)];

            // Create anagram by sorting the letters alphabetically
            const anagram = word.split('').sort().join('');

            activeGames.set(message.author.id, {
                type: 'anagram',
                word: word,
                attempts: 0
            });

            message.reply(`🔤 **Anagram Game:** Unscramble these letters to form a word: **${anagram}**\n\nType your answer!`);
        }

        // Countdown game
        if (commandName === 'countdown') {
            if (activeGames.has(message.author.id)) {
                return message.reply('You already have an active game! Finish that one first.');
            }

            // Generate 6 random numbers
            const numbers = [];
            for (let i = 0; i < 6; i++) {
                numbers.push(Math.floor(Math.random() * 100) + 1);
            }

            // Generate a target number
            const target = Math.floor(Math.random() * 900) + 100; // 3-digit number

            activeGames.set(message.author.id, {
                type: 'countdown',
                numbers: numbers,
                target: target
            });

            message.reply(`🔢 **Countdown Numbers Game:**\n\nNumbers: ${numbers.join(', ')}\nTarget: ${target}\n\nUsing the numbers above (you can use each number only once), try to get as close as possible to the target using addition, subtraction, multiplication, and division.\n\nType your solution when ready!`);
        }
    } else {
        // This is a regular chat message (not a command)

        // Simple response for chat messages
        const responses = [
            "Sorry! I can't chat right now. Please try playing some games instead! Type !help to see all available games.",
            "I'd love to chat, but my AI brain is taking a nap. Why not try a game? Type !help to see what games we have!",
            "My chatting abilities are limited right now. How about a game instead? Try !rps for Rock Paper Scissors!",
            "I'm not feeling very chatty at the moment. Let's play a game! Try !guess to play a number guessing game.",
            "Sorry, I can't chat right now. But I'd love to play a game with you! Type !trivia to test your knowledge."
        ];

        message.reply(responses[Math.floor(Math.random() * responses.length)]);
    }
});

// Login to Discord with your client's token
client.login(process.env.DISCORD_TOKEN);
