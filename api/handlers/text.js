const store = require('../../lib/store');
const content = require('../../content.json');
const { 
    GPT_MODELS, 
    isProKey, 
    getModelForTask, 
    gptKeyboard, 
    premiumMsg, 
    resolvePModelByKey 
} = require('../../lib/models');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY; 

// --- НАСТРОЙКИ ---
const DAILY_LIMIT = 10;

// Используем DeepSeek для перевода (он надежнее Gemini)
const TRANSLATION_MODEL = 'deepseek/deepseek-chat';

const FREE_MODEL_IDS = [
    'google/gemini-2.0-flash-exp:free',
    'deepseek/deepseek-chat',
    'deepseek/deepseek-r1',
    'meta-llama/llama-3.2-90b-vision-instruct',
    'mistralai/mistral-7b-instruct:free',
    'google/gemini-2.0-flash-lite-preview-02-05:free'
];

const FOOTER_MSG = {
  ru: "\n\n➖➖➖➖➖➖\n🔄 Сменить модель: /model | ⚙️ Настройки: /settingsbot",
  ro: "\n\n➖➖➖➖➖➖\n🔄 Schimbă modelul: /model | ⚙️ Setări: /settingsbot",
  en: "\n\n➖➖➖➖➖➖\n🔄 Change model: /model | ⚙️ Settings: /settingsbot"
};

const ASK_FILE_MSG = {
    ru: "🧐 Я вижу файл! Что мне с ним сделать?",
    ro: "🧐 Văd fișierul! Ce dorești să fac cu el?",
    en: "🧐 I see the file! What should I do with it?"
};

// --- ЛИМИТЫ ---
async function checkLimit(userId) {
    if (!store.redis) return true; 
    const today = new Date().toISOString().split('T')[0];
    const key = `usage:${today}:${userId}`;
    let current = await store.redis.get(key);
    current = parseInt(current) || 0;
    return current < DAILY_LIMIT;
}

async function incrementLimit(userId) {
    if (!store.redis) return;
    const today = new Date().toISOString().split('T')[0];
    const key = `usage:${today}:${userId}`;
    await store.redis.incr(key);
    await store.redis.expire(key, 86400); 
    await store.redis.incr(`usage:text:${userId}`); 
}

function getModelNiceName(key, lang = 'ru') {
    const m = GPT_MODELS.find(x => x.key === key);
    if (!m) return key;
    return m.label[lang] || m.label.en || m.key;
}

// --- 1. СЕРВИС ПЕРЕВОДА (УЛУЧШЕН) ---
async function translatePrompt(text) {
    if (!OPENROUTER_API_KEY) return text;
    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "HTTP-Referer": process.env.VERCEL_URL || "https://bot.com",
                "X-Title": 'Telegram Bot',
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "model": TRANSLATION_MODEL,
                "messages": [
                    { role: "system", content: "Translate this prompt to English for image generation. Output ONLY the English translation." },
                    { role: "user", content: text }
                ],
                "temperature": 0.3
            })
        });

        if (!response.ok) return text; // Если ошибка API, возвращаем оригинал

        const data = await response.json();
        
        // ЗАЩИТА ОТ ОШИБКИ "Undefined reading 0"
        if (data && data.choices && data.choices.length > 0) {
            return data.choices[0].message.content;
        }
        
        return text; // Если ответ пустой
    } catch (e) {
        console.error("Translation failed:", e);
        return text;
    }
}

// --- 2. СЕРВИС ГЕНЕРАЦИИ (POLLINATIONS/FLUX) ---
async function generateImageBuffer(prompt) {
    try {
        const seed = Math.floor(Math.random() * 1000000);
        // enhance=false (чтобы не менял промпт), nologo=true
        const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&seed=${seed}&nologo=true&model=flux`;
        
        const response = await fetch(url);
        if (!response.ok) return null;
        
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
    } catch (e) {
        console.error("Image Gen Error:", e);
        return null;
    }
}

// --- 3. СЕРВИС ЧАТА ---
async function chatWithAI(messages, modelId) {
    if (!OPENROUTER_API_KEY) return "NO_KEY";
    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "HTTP-Referer": process.env.VERCEL_URL,
                "X-Title": 'Telegram Bot',
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "model": modelId,
                "messages": messages,
                "temperature": 0.7
            })
        });
        const data = await response.json();
        if (!data.choices) return `API Error: ${JSON.stringify(data)}`;
        return data.choices[0].message.content;
    } catch (error) {
        return `Network Error: ${error.message}`;
    }
}

// --- MAIN HANDLER ---
async function handleTextMessage(ctx, textInput) {
    const message = ctx.message;
    const caption = message?.caption || '';
    const text = textInput || caption || ''; 
    const userId = ctx.from.id.toString();

    if (text === '/debug') {
        if (store.getDebugData) {
            const debugInfo = await store.getDebugData(userId);
            await ctx.reply(`🐞 DEBUG:\n\n${debugInfo}`);
        } else await ctx.reply('Debug not found.');
        return;
    }

    await ctx.sendChatAction('typing');

    try {
        let savedModel = 'deepseek'; 
        let savedLang = 'ru';
        let userMode = 'chat';

        try {
            const [m, l, mode] = await Promise.all([
                store.getUserModel(userId),
                store.getUserLang(userId),
                store.getUserMode ? store.getUserMode(userId) : 'chat'
            ]);
            if (m) savedModel = m;
            if (l) savedLang = l;
            if (mode) userMode = mode;
        } catch (e) {}

        const lang = savedLang;

        // ----------------------------------------------------
        // РЕЖИМ РИСОВАНИЯ
        // ----------------------------------------------------
        if (userMode === 'image') {
            if (text) {
                const canDraw = await checkLimit(userId);
                if (!canDraw) {
                    await ctx.reply("⛔️ Limit reached (10/10).");
                    return;
                }

                const waitMsg = await ctx.reply("🎨 Translating & Drawing...");
                
                // A. Перевод (с защитой)
                let promptEn = text;
                // Проверяем, есть ли кириллица
                if (/[а-яА-ЯёЁ]/.test(text)) {
                    promptEn = await translatePrompt(text);
                }

                // B. Генерация
                const imageBuffer = await generateImageBuffer(promptEn);

                try { await ctx.telegram.deleteMessage(ctx.chat.id, waitMsg.message_id); } catch(e){}

                if (imageBuffer) {
                    await ctx.replyWithPhoto({ source: imageBuffer }, { 
                        caption: `🖼 Generated by AI\n🇺🇸 Prompt: ${promptEn}`, 
                        parse_mode: 'Markdown' 
                    });
                    await incrementLimit(userId);
                } else {
                    await ctx.reply("⚠️ Failed to generate image. Try again.");
                }
                return; 
            }
        }

        // ----------------------------------------------------
        // РЕЖИМ ФАЙЛОВ И ЧАТА
        // ----------------------------------------------------
        let fileUrl = null;
        let fileType = 'text'; 
        const pendingKey = `pending_file:${userId}`;
        const isPhoto = message?.photo;
        const isDoc = message?.document;

        if (isPhoto || isDoc) {
             try {
                let fileId = null;
                if (isPhoto) { fileId = message.photo[message.photo.length - 1].file_id; fileType = 'image'; }
                else if (isDoc) { fileId = message.document.file_id; fileType = 'doc'; }

                if (fileId) {
                    const urlObj = await ctx.telegram.getFileLink(fileId);
                    fileUrl = urlObj.href;
                    if (!text) {
                        if (store.redis) await store.redis.set(pendingKey, { url: fileUrl, type: fileType }, { ex: 300 });
                        const askText = ASK_FILE_MSG[lang] || ASK_FILE_MSG.en;
                        await ctx.reply(askText);
                        return;
                    }
                }
            } catch (e) { console.error("File error:", e); }
        } else if (text && store.redis) {
            const pending = await store.redis.get(pendingKey);
            if (pending) { fileUrl = pending.url; fileType = pending.type; await store.redis.del(pendingKey); }
        }

        if (!text && !fileUrl) return;

        let modelToUse = savedModel;
        const pmodel = resolvePModelByKey(modelToUse);
        const realModelId = pmodel || 'deepseek/deepseek-chat';
        
        if (fileType === 'image') {
             if (!pmodel.includes('gpt-4o') && !pmodel.includes('gemini') && !pmodel.includes('claude-3-5')) {
                 modelToUse = 'gemini_flash';
             }
        }

        let isFreeModel = false;
        if (FREE_MODEL_IDS.includes(realModelId) || realModelId.includes(':free')) {
            isFreeModel = true;
        }

        if (!isFreeModel) {
            const canChat = await checkLimit(userId);
            if (!canChat) {
                await ctx.reply("⛔️ Daily limit reached. Switch to free models.");
                return;
            }
        }

        let history = [];
        if (store.getHistory) history = await store.getHistory(userId) || [];

        const niceModelName = getModelNiceName(modelToUse, lang);
        const systemPrompt = {
            role: "system",
            content: `You are a helpful AI assistant running on "${niceModelName}". Reply in the SAME language as the user.`
        };

        let userMessageContent;
        if (fileUrl) {
            userMessageContent = [
                { type: "text", text: text || "Describe this." },
                { type: "image_url", image_url: { url: fileUrl } }
            ];
        } else {
            userMessageContent = text;
        }

        const messagesToSend = [
            systemPrompt,
            ...history, 
            { role: "user", content: userMessageContent }
        ];

        const aiResponse = await chatWithAI(messagesToSend, realModelId);

        if (!aiResponse || aiResponse.startsWith("API Error")) { 
            await ctx.reply(`⚠️ AI Error: ${aiResponse}`); 
            return; 
        }

        const footer = FOOTER_MSG[lang] || FOOTER_MSG.en;
        await ctx.reply(aiResponse + footer);

        if (!isFreeModel) await incrementLimit(userId);

        if (store.updateConversation) {
            const historyText = fileUrl ? `[FILE] ${text}` : text;
            await store.updateConversation(
                userId, 
                { role: "user", content: historyText }, 
                { role: "assistant", content: aiResponse }
            );
        }

    } catch (error) {
        console.error('Handle Text Error:', error);
    }
}

// --- ХЕЛПЕРЫ ---
async function handleClearCommand(ctx) {
    const userId = ctx.from.id.toString();
    if (store.clearHistory) await store.clearHistory(userId);
    await ctx.reply('🗑️ History cleared.');
}

async function handleModelCommand(ctx) {
    const userId = ctx.from.id.toString();
    let lang = 'ru';
    let model = 'deepseek'; 
    try {
        if (store.getUserLang) lang = await store.getUserLang(userId) || 'ru';
        if (store.getUserModel) model = await store.getUserModel(userId) || 'deepseek';
    } catch(e){}

    const menuText = content.gpt_menu[lang] || content.gpt_menu.en;
    const keyboard = gptKeyboard(lang, model, () => false);
    await ctx.reply(menuText, { parse_mode: 'Markdown', reply_markup: keyboard });
}

async function handleModelCallback(ctx, langCode) {
    const data = ctx.callbackQuery.data;
    const key = data.replace('model_', ''); 
    const userId = ctx.from.id.toString();
    let currentLang = langCode || 'ru';
    try {
        if (!langCode && store.getUserLang) currentLang = await store.getUserLang(userId) || 'ru';
    } catch (e) {}

    if (isProKey(key)) {
        const hasPremium = false; 
        if (!hasPremium) {
            const msg = premiumMsg(currentLang);
            await ctx.answerCbQuery(msg, { show_alert: true });
            return;
        }
    }

    if (store.clearHistory) await store.clearHistory(userId);
    if (store.setUserModel) await store.setUserModel(userId, key);

    try {
        const keyboard = gptKeyboard(currentLang, key, () => false);
        await ctx.editMessageReplyMarkup(keyboard); 
    } catch (e) {}

    const niceName = getModelNiceName(key, currentLang);
    const replyText = (currentLang === 'ru') 
        ? `Вы выбрали модель ${niceName}. История сброшена.` 
        : `You selected model ${niceName}. History reset.`;

    await ctx.reply(replyText + "\n/settingsbot");
    await ctx.answerCbQuery();
}

module.exports = {
    handleTextMessage,
    handleClearCommand,
    handleModelCommand,
    handleModelCallback
};
        
