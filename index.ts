import * as Localization from 'expo-localization';
import { I18n } from 'i18n-js';

const translations = {
  en: {
    welcome: 'Welcome', auth_subtitle: 'Sign in or create an account', email: 'Email', password: 'Password', continue: 'Continue', or_continue: 'or continue with', error_empty: 'Error: Empty fields', reg_success: 'Registration successful', login_success: 'Login successful',
    legal_title: 'Legal Consent & Safety', legal_body: 'By agreeing, you accept and confirm that you are interacting with an Artificial Intelligence.\n\nThis system is designed for entertainment purposes and does not constitute any form of counseling.', legal_btn: 'I Understand & Accept',
    comp_setup: 'COMPANION SETUP', persona_voice: 'Persona & Voice', plugin_store: 'Plugin Store', skills_int: 'SKILLS & INTEGRATIONS', comp_skills: 'Companion Skills', account: 'ACCOUNT', sub_limits: 'Subscription & Limits', lang: 'Language', settings: 'Settings', sign_out: 'Sign Out',
    voice_quota: 'Voice Quota', mins_left: 'min left', get_mins: 'Get More Minutes', live_conn: 'Live Connection', connecting: 'Connecting...', ready: 'Ready', tap_to_start: 'Tap Call to start', listening: 'Listening...', hi: 'Hi'
  },
  ru: {
    welcome: 'Добро пожаловать', auth_subtitle: 'Войдите или создайте аккаунт', email: 'Почта', password: 'Пароль', continue: 'Продолжить', or_continue: 'или войдите через', error_empty: 'Ошибка: пустые поля', reg_success: 'Регистрация успешна', login_success: 'Вход выполнен',
    legal_title: 'Юридическое согласие', legal_body: 'Соглашаясь, вы принимаете и подтверждаете, что общаетесь с Искусственным Интеллектом.\n\nЭта система создана в развлекательных целях и не является каким либо видом консультирования.', legal_btn: 'Согласен',
    comp_setup: 'НАСТРОЙКА КОМПАНЬОНА', persona_voice: 'Личность и голос', plugin_store: 'Магазин плагинов (MCP)', skills_int: 'НАВЫКИ И ИНТЕГРАЦИИ', comp_skills: 'Навыки компаньона', account: 'АККАУНТ', sub_limits: 'Подписка и лимиты', lang: 'Язык', settings: 'Настройки', sign_out: 'Выйти',
    voice_quota: 'Голосовая квота', mins_left: 'мин осталось', get_mins: 'Добавить минуты', live_conn: 'В сети', connecting: 'Соединение...', ready: 'Готов', tap_to_start: 'Нажмите для звонка', listening: 'Слушаю...', hi: 'Привет'
  },
  es: { 
    legal_title: 'Consentimiento Legal', legal_body: 'Al aceptar, usted acepta y confirma que está interactuando con una Inteligencia Artificial.\n\nEste sistema está diseñado con fines de entretenimiento y no constituye ningún tipo de asesoramiento.', legal_btn: 'Acepto', 
    welcome: 'Bienvenido', auth_subtitle: 'Inicia sesión', email: 'Correo', password: 'Clave', continue: 'Continuar', or_continue: 'o con', 
    comp_setup: 'CONFIGURACIÓN', persona_voice: 'Persona y Voz', plugin_store: 'Plugins', skills_int: 'HABILIDADES', comp_skills: 'Habilidades', account: 'CUENTA', sub_limits: 'Suscripción', lang: 'Idioma', settings: 'Ajustes', sign_out: 'Salir', 
    voice_quota: 'Cuota', mins_left: 'min restantes', get_mins: 'Más min', hi: 'Hola' 
  },
  fr: { 
    legal_title: 'Consentement Légal', legal_body: 'En acceptant, vous acceptez et confirmez que vous interagissez avec une Intelligence Artificielle.\n\nCe système est conçu à des fins de divertissement et ne constitue en aucun cas une forme de consultation.', legal_btn: 'J\'accepte', 
    welcome: 'Bienvenue', auth_subtitle: 'Connexion', email: 'Email', password: 'MDP', continue: 'Continuer', or_continue: 'ou avec', 
    comp_setup: 'CONFIGURATION', persona_voice: 'Voix', plugin_store: 'Plugins', skills_int: 'COMPÉTENCES', comp_skills: 'Compétences', account: 'COMPTE', sub_limits: 'Abonnement', lang: 'Langue', settings: 'Paramètres', sign_out: 'Sortir', 
    voice_quota: 'Quota', mins_left: 'min restantes', get_mins: 'Plus min', hi: 'Salut' 
  },
  de: { 
    legal_title: 'Rechtliche Zustimmung', legal_body: 'Mit Ihrer Zustimmung akzeptieren und bestätigen Sie, dass Sie mit einer Künstlichen Intelligenz interagieren.\n\nDieses System wurde zu Unterhaltungszwecken entwickelt und stellt keinerlei Form von Beratung dar.', legal_btn: 'Ich stimme zu', 
    welcome: 'Willkommen', auth_subtitle: 'Anmelden', email: 'E-Mail', password: 'Passwort', continue: 'Weiter', or_continue: 'oder mit', 
    comp_setup: 'SETUP', persona_voice: 'Stimme', plugin_store: 'Plugins', skills_int: 'FÄHIGKEITEN', comp_skills: 'Fähigkeiten', account: 'KONTO', sub_limits: 'Abonnement', lang: 'Sprache', settings: 'Optionen', sign_out: 'Abmelden', 
    voice_quota: 'Limit', mins_left: 'Min. übrig', get_mins: 'Mehr', hi: 'Hallo' 
  },
  it: { 
    legal_title: 'Consenso Legale', legal_body: 'Accettando, accetti e confermi di interagire con un\'Intelligenza Artificiale.\n\nQuesto sistema è stato creato per scopi di intrattenimento e non costituisce alcun tipo di consulenza.', legal_btn: 'Accetto', 
    welcome: 'Benvenuto', auth_subtitle: 'Accedi', email: 'Email', password: 'Password', continue: 'Continua', or_continue: 'o con', 
    comp_setup: 'SETUP', persona_voice: 'Voce', plugin_store: 'Plugins', skills_int: 'ABILITÀ', comp_skills: 'Abilità', account: 'ACCOUNT', sub_limits: 'Abbonamento', lang: 'Lingua', settings: 'Opzioni', sign_out: 'Esci', 
    voice_quota: 'Quota', mins_left: 'min rimasti', get_mins: 'Più min', hi: 'Ciao' 
  },
  pt: { 
    legal_title: 'Consentimento Legal', legal_body: 'Ao concordar, você aceita e confirma que está interagindo com uma Inteligência Artificial.\n\nEste sistema foi criado para fins de entretenimento e não constitui nenhum tipo de aconselhamento.', legal_btn: 'Concordo', 
    welcome: 'Bem-vindo', auth_subtitle: 'Entrar', email: 'E-mail', password: 'Senha', continue: 'Continuar', or_continue: 'ou com', 
    comp_setup: 'SETUP', persona_voice: 'Voz', plugin_store: 'Plugins', skills_int: 'HABILIDADES', comp_skills: 'Habilidades', account: 'CONTA', sub_limits: 'Assinatura', lang: 'Idioma', settings: 'Ajustes', sign_out: 'Sair', 
    voice_quota: 'Cota', mins_left: 'min restantes', get_mins: 'Mais min', hi: 'Olá' 
  },
  zh: { 
    legal_title: '法律同意', legal_body: '同意即表示您接受并确认您正在与人工智能进行互动。\n\n本系统专为娱乐目的而设计，不构成任何形式的咨询。', legal_btn: '我同意', 
    welcome: '欢迎', auth_subtitle: '登录', email: '电邮', password: '密码', continue: '继续', or_continue: '或其他', 
    comp_setup: '设置', persona_voice: '声音', plugin_store: '商店', skills_int: '技能', comp_skills: '技能', account: '账户', sub_limits: '订阅', lang: '语言', settings: '设置', sign_out: '登出', 
    voice_quota: '限额', mins_left: '分钟剩余', get_mins: '更多', hi: '你好' 
  },
  ja: { 
    legal_title: '法的同意', legal_body: '同意することにより、人工知能と対話していることを受け入れ、確認するものとします。\n\nこのシステムは娯楽目的で作られており、いかなる種類のカウンセリングを構成するものではありません。', legal_btn: '同意する', 
    welcome: 'ようこそ', auth_subtitle: 'ログイン', email: 'メール', password: 'パス', continue: '続行', or_continue: '他', 
    comp_setup: '設定', persona_voice: '音声', plugin_store: 'ストア', skills_int: 'スキル', comp_skills: 'スキル', account: 'アカウント', sub_limits: 'サブスク', lang: '言語', settings: '設定', sign_out: '終了', 
    voice_quota: '枠', mins_left: '分残り', get_mins: '追加', hi: 'こんにちは' 
  },
  ko: { 
    legal_title: '법적 동의', legal_body: '동의함으로써 귀하는 인공지능과 상호작용하고 있음을 수락하고 확인합니다.\n\n이 시스템은 엔터테인먼트 목적으로 제작되었으며 어떠한 형태의 상담도 제공하지 않습니다.', legal_btn: '동의합니다', 
    welcome: '환영합니다', auth_subtitle: '로그인', email: '메일', password: '비번', continue: '계속', or_continue: '다른', 
    comp_setup: '설정', persona_voice: '음성', plugin_store: '상점', skills_int: '스킬', comp_skills: '스킬', account: '계정', sub_limits: '구독', lang: '언어', settings: '설정', sign_out: '로그아웃', 
    voice_quota: '한도', mins_left: '분 남음', get_mins: '추가', hi: '안녕하세요' 
  },
  ar: { 
    legal_title: 'الموافقة القانونية', legal_body: 'بالموافقة، أنت تقبل وتؤكد أنك تتفاعل مع ذكاء اصطناعي.\n\nتم تصميم هذا النظام لأغراض ترفيهية ولا يمثل أي نوع من أنواع الاستشارات.', legal_btn: 'أوافق', 
    welcome: 'أهلاً', auth_subtitle: 'دخول', email: 'بريد', password: 'كلمة', continue: 'متابعة', or_continue: 'أو', 
    comp_setup: 'إعداد', persona_voice: 'صوت', plugin_store: 'متجر', skills_int: 'مهارات', comp_skills: 'مهارات', account: 'حساب', sub_limits: 'اشتراك', lang: 'لغة', settings: 'إعدادات', sign_out: 'خروج', 
    voice_quota: 'حصة', mins_left: 'دقائق', get_mins: 'المزيد', hi: 'أهلاً' 
  },
  hi: { 
    legal_title: 'कानूनी सहमति', legal_body: 'सहमति देकर, आप स्वीकार करते हैं और पुष्टि करते हैं कि आप एक कृत्रिम बुद्धिमत्ता के साथ बातचीत कर रहे हैं।\n\nयह प्रणाली मनोरंजन के उद्देश्यों के लिए बनाई गई है और यह किसी भी प्रकार का परामर्श नहीं है।', legal_btn: 'मैं सहमत हूँ', 
    welcome: 'स्वागत', auth_subtitle: 'लॉगिन', email: 'ईमेल', password: 'पासवर्ड', continue: 'जारी', or_continue: 'अन्य', 
    comp_setup: 'सेटअप', persona_voice: 'आवाज़', plugin_store: 'स्टोर', skills_int: 'कौशल', comp_skills: 'कौशल', account: 'खाता', sub_limits: 'सदस्यता', lang: 'भाषा', settings: 'सेटिंग', sign_out: 'बाहर', 
    voice_quota: 'कोटा', mins_left: 'मिनट', get_mins: 'अधिक', hi: 'नमस्ते' 
  }
};

const i18n = new I18n(translations);
const code = Localization.getLocales()[0].languageCode ?? 'en';
const short = code.split('-')[0];
i18n.locale = translations[short as keyof typeof translations] ? short : 'en';
i18n.enableFallback = true;

export { i18n };
