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
const TIMEOUT_MS = 9000; // 9 секунд (защита от петель Telegram)
const DAILY_LIMIT = 10;
const IMAGE_MODEL_ID = 'openai/gpt-5-image-mini';

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
    ru: "🧐 Я вижу файл! Что мне с ним сделать? (Описать, решить задачу или перевести текст?)",
    ro: "🧐 Văd fișierul! Ce dorești să fac cu el? (Să-l descriu, să rezolv o problemă sau să traduc text?)",
    en: "🧐 I see the file! What should I do with it? (Describe it, solve a problem, or translate text?)"
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

// --- БЕЗОПАСНЫЙ ЗАПРОС С ТАЙМАУТОМ ---
async function openRouterRequest(messages, modelId) {
    if (!OPENROUTER_API_KEY) return "NO_KEY";
    
    // Создаем контроллер для отмены запроса через 9 секунд
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const body = {
            "model": modelId,
            "messages": messages
        };

        // ВАЖНО: Не отправляем temperature для картинок
        const isImageModel = modelId.includes('image') || modelId.includes('dall-e') || modelId.includes('flux');
        if (!isImageModel) {
            body.temperature = 0.7;
        }

        console.log(`[AI] Req -> ${modelId} (Img: ${isImageModel})`);

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "HTTP-Referer": process.env.VERCEL_URL || 'https://bot.com',
                "X-Title": 'Telegram Bot',
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body),
            signal: controller.signal // Подключаем таймер
        });

        clearTimeout(timeoutId); // Отменяем таймер, если успели

        if (!response.ok) {
            const errText = await response.text();
            return `API ERROR: ${response.status} - ${errText}`; 
        }
        
        const data = await response.json();
        if (!data.choices || data.choices.length === 0) return "API ERROR: Empty response";
        
        return data.choices[0].message.content;

    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            console.error("Request Timed Out");
            return "TIMEOUT: Generation took too long. Try again.";
        }
        console.error("Fetch Error:", error);
        return `NETWORK ERROR: ${error.message}`;
    }
}
// --- MAIN HANDLER ---
async function handleTextMessage(ctx, textInput) {
    const message = ctx.message;
    const caption = message?.caption || '';
    const text = textInput || caption || ''; 
    const userId = ctx.from.id.toString();

    // DEBUG
    if (text === '/debug') {
        if (store.getDebugData) {
            const debugInfo = await store.getDebugData(userId);
            await ctx.reply(`🐞 DEBUG:\n\n${debugInfo}`);
        } else await ctx.reply('Debug not found.');
        return;
    }

    await ctx.sendChatAction('typing');

    try {
        // 1. ЗАГРУЗКА ДАННЫХ
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
        } catch (e) { console.error("DB Error", e); }

        const lang = savedLang;

        // ----------------------------------------------------
        // ВЕТКА 1: РИСОВАНИЕ (/image)
        // ----------------------------------------------------
        if (userMode === 'image') {
            if (text) {
                const canDraw = await checkLimit(userId);
                if (!canDraw) {
                    const limitMsg = (lang === 'ru') 
                        ? "⛔️ **Лимит исчерпан**\n10/10 запросов. Ждите завтра."
                        : "⛔️ **Daily Limit Reached**";
                    await ctx.reply(limitMsg, { parse_mode: 'Markdown' });
                    return;
                }

                const waitMsg = await ctx.reply("🎨 Drawing... (Wait ~10s)");
                
                const prompt = `Generate an image: ${text}`;
                const result = await openRouterRequest([{ role: "user", content: prompt }], IMAGE_MODEL_ID);

                try { await ctx.telegram.deleteMessage(ctx.chat.id, waitMsg.message_id); } catch(e){}

                // Обработка ошибок и ТАЙМАУТА
                if (!result || result.startsWith("API ERROR") || result.startsWith("NETWORK ERROR") || result.startsWith("TIMEOUT")) {
                    await ctx.reply(`⚠️ **Error:** ${result}\n_Try again later._`, { parse_mode: 'Markdown' });
                    return; 
                }

                // Ищем ссылку
                const urlMatch = result.match(/\((https?:\/\/[^\)]+)\)/) || result.match(/(https?:\/\/[^\s]+)/);
                
                if (urlMatch && urlMatch[1]) {
                    await ctx.replyWithPhoto(urlMatch[1], { caption: `🖼 Generated by GPT-5 Image Mini` });
                    await incrementLimit(userId);
                } else {
                    await ctx.reply(result.substring(0, 500)); // Если пришел текст
                }
                return; 
            }
        }

        // ----------------------------------------------------
        // ВЕТКА 2: ФАЙЛЫ
        // ----------------------------------------------------
        let fileUrl = null;
        let fileType = 'text'; 
        const pendingKey = `pending_file:${userId}`;
        
        const isPhoto = message?.photo;
        const isVoice = message?.voice || message?.audio;
        const isVideo = message?.video || message?.video_note;
        const isDoc = message?.document;

        if (isPhoto || isVoice || isVideo || isDoc) {
             try {
                let fileId = null;
                if (isPhoto) { fileId = message.photo[message.photo.length - 1].file_id; fileType = 'image'; }
                else if (isVoice) { fileId = (message.voice || message.audio).file_id; fileType = 'audio'; }
                else if (isVideo) { fileId = (message.video || message.video_note).file_id; fileType = 'video'; }
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

        // ----------------------------------------------------
        // ВЕТКА 3: ЧАТ
        // ----------------------------------------------------
        let modelToUse = savedModel;
        const pmodel = resolvePModelByKey(modelToUse);
        const realModelId = pmodel || 'deepseek/deepseek-chat';
        
        // Авто-переключение для файлов
        if (fileType === 'audio') modelToUse = getModelForTask('audio_input');
        else if (fileType === 'video') modelToUse = getModelForTask('video_input');
        else if (fileType === 'doc') modelToUse = getModelForTask('doc_heavy');
        else if (fileType === 'image') {
             if (!pmodel.includes('gpt-4o') && !pmodel.includes('gemini') && !pmodel.includes('claude-3-5')) {
                 modelToUse = 'gemini_flash';
             }
        }

        // Проверка платности
        let isFreeModel = false;
        if (FREE_MODEL_IDS.includes(realModelId) || realModelId.includes(':free')) {
            isFreeModel = true;
        }

        if (!isFreeModel) {
            const canChat = await checkLimit(userId);
            if (!canChat) {
                 const limitMsg = (lang === 'ru') 
                    ? "⛔️ **Лимит исчерпан**\nПереключитесь на бесплатные модели (DeepSeek, Gemini) в /menu."
                    : "⛔️ **Daily Limit Reached**\nSwitch to free models in /menu.";
                await ctx.reply(limitMsg, { parse_mode: 'Markdown' });
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

        const aiResponse = await openRouterRequest(messagesToSend, realModelId);

        if (!aiResponse || aiResponse.startsWith("API ERROR") || aiResponse.startsWith("NETWORK ERROR") || aiResponse.startsWith("TIMEOUT")) { 
            await ctx.reply(`⚠️ AI Error: ${aiResponse}`); 
            return; 
        }

        const footer = FOOTER_MSG[lang] || FOOTER_MSG.en;
        await ctx.reply(aiResponse + footer);

        if (!isFreeModel) await incrementLimit(userId);

        if (store.updateConversation) {
            const historyText = fileUrl ? `[${fileType.toUpperCase()}] ${text}` : text;
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
                        
