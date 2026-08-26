"use client";
import { createContext, useState, useCallback, useContext, useEffect, useMemo } from "react";

export type LanguageContextType = {
  language: string; setLanguage: (lang: string) => void; translate: (text: string) => Promise<string>;
  isRTL: boolean; t: (key: string) => string;
  availableLanguages: { code: string; name: string; native: string }[]; addTranslation: (lang: string, key: string, value: string) => void;
};

export const LanguageContext = createContext<LanguageContextType | null>(null);
const RTL_LANGUAGES = new Set(["ar", "he"]);

const FALLBACK_TRANSLATIONS: Record<string, Record<string, string>> = {
  ar: { "Home": "الرئيسية", "Checkout": "الدفع", "Wishlist": "المفضلة", "Orders": "الطلبات", "Admin": "الإدارة", "Login": "تسجيل الدخول", "Signup": "إنشاء حساب", "Cart": "السلة", "Search...": "بحث...", "Version": "الإصدار", "Dark": "🌙 داكن", "Light": "☀️ فاتح", "MadeWith": "مصنوع بـ", "AddToCart": "أضف للسلة", "All": "الكل", "Smartphones": "هواتف", "Laptops": "حاسبات", "MaxPrice": "أقصى سعر", "Showing": "عرض", "Products": "المنتجات", "ClearWishlist": "مسح المفضلة", "NoItems": "لا توجد عناصر", "Remove": "إزالة", "ClearHistory": "مسح كل سجل الطلبات", "RemoveUser": "إزالة المستخدم", "NewName": "اسم جديد:", "NewPrice": "سعر جديد:", "NewCurrency": "عملة جديدة:", "ProductUpdated": "تم تحديث المنتج!", "AdminAccessGranted": "تم منح صلاحيات المدير.", "WrongPassword": "كلمة مرور خاطئة.", "SecureAdminAccess": "دخول آمن للمدير", "EnterPassword": "أدخل كلمة المرور", "EnterAdminPassword": "أدخل كلمة مرور المدير", "AdminPanel": "لوحة التحكم", "EnterUsername": "أدخل اسم المستخدم", "Edit": "تعديل", "Delete": "حذف", "DeleteNotWired": "الحذف غير مفعل بعد" },
  de: { "Home": "Startseite", "Checkout": "Kasse", "Wishlist": "Wunschliste", "Orders": "Bestellungen", "Admin": "Admin", "Login": "Anmelden", "Signup": "Registrieren", "Cart": "Warenkorb", "Search...": "Suche...", "Version": "Version", "Dark": "🌙 Dunkel", "Light": "☀️ Hell", "MadeWith": "Hergestellt mit", "AddToCart": "In den Warenkorb", "All": "Alle", "Smartphones": "Smartphones", "Laptops": "Laptops", "MaxPrice": "Maximalpreis", "Showing": "Angezeigt", "Products": "Produkte", "ClearWishlist": "Wunschliste leeren", "NoItems": "Keine Artikel in der Wunschliste.", "Remove": "Entfernen", "ClearHistory": "Gesamten Bestellverlauf löschen", "RemoveUser": "Benutzer entfernen", "NewName": "Neuer Name:", "NewPrice": "Neuer Preis:", "NewCurrency": "Neue Währung:", "ProductUpdated": "Produkt aktualisiert!", "AdminAccessGranted": "Admin-Zugriff gewährt.", "WrongPassword": "Falsches Passwort.", "SecureAdminAccess": "Sicherer Admin-Zugriff", "EnterPassword": "Passwort eingeben", "EnterAdminPassword": "Admin-Passwort eingeben", "AdminPanel": "Admin-Bereich", "EnterUsername": "Benutzername eingeben", "Edit": "Bearbeiten", "Delete": "Löschen", "DeleteNotWired": "Löschen noch nicht verfügbar" },
  zh: { "Home": "首页", "Checkout": "结账", "Wishlist": "收藏夹", "Orders": "订单", "Admin": "管理", "Login": "登录", "Signup": "注册", "Cart": "购物车", "Search...": "搜索...", "Version": "版本", "Dark": "🌙 深色", "Light": "☀️ 浅色", "MadeWith": "使用", "AddToCart": "加入购物车", "All": "全部", "Smartphones": "智能手机", "Laptops": "笔记本电脑", "MaxPrice": "最高价格", "Showing": "显示", "Products": "产品", "ClearWishlist": "清空收藏夹", "NoItems": "收藏夹中没有商品。", "Remove": "删除", "ClearHistory": "清除全部订单历史", "RemoveUser": "删除用户", "NewName": "新名称：", "NewPrice": "新价格：", "NewCurrency": "新货币：", "ProductUpdated": "产品已更新！", "AdminAccessGranted": "管理员权限已授予。", "WrongPassword": "密码错误。", "SecureAdminAccess": "安全管理员登录", "EnterPassword": "输入密码", "EnterAdminPassword": "输入管理员密码", "AdminPanel": "管理面板", "EnterUsername": "输入用户名", "Edit": "编辑", "Delete": "删除", "DeleteNotWired": "删除功能尚未实现" },
  ja: { "Home": "ホーム", "Checkout": "レジに進む", "Wishlist": "お気に入り", "Orders": "注文履歴", "Admin": "管理", "Login": "ログイン", "Signup": "新規登録", "Cart": "カート", "Search...": "検索...", "Version": "バージョン", "Dark": "🌙 ダーク", "Light": "☀️ ライト", "MadeWith": "作成々", "AddToCart": "カートに追加", "All": "すべて", "Smartphones": "スマートフォン", "Laptops": "ノートパソコン", "MaxPrice": "最高価格", "Showing": "表示", "Products": "商品", "ClearWishlist": "お気に入りをクリア", "NoItems": "お気に入りに商品がありません。", "Remove": "削除", "ClearHistory": "注文履歴を全てクリア", "RemoveUser": "ユーザーを削除", "NewName": "新しい名前：", "NewPrice": "新しい価格：", "NewCurrency": "新しい通貨：", "ProductUpdated": "商品が更新されました！", "AdminAccessGranted": "管理者アクセスが許可されました。", "WrongPassword": "パスワードが間違っています。", "SecureAdminAccess": "安全な管理者アクセス", "EnterPassword": "パスワードを入力", "EnterAdminPassword": "管理者パスワードを入力", "AdminPanel": "管理者パネル", "EnterUsername": "ユーザー名を入力", "Edit": "編集", "Delete": "削除", "DeleteNotWired": "削除機能はまだ利用できません" },
  pt: { "Home": "Início", "Checkout": "Finalizar", "Wishlist": "Favoritos", "Orders": "Pedidos", "Admin": "Admin", "Login": "Entrar", "Signup": "Cadastrar", "Cart": "Carrinho", "Search...": "Buscar...", "Version": "Versão", "Dark": "🌙 Escuro", "Light": "☀️ Claro", "MadeWith": "Feito com", "AddToCart": "Adicionar ao carrinho", "All": "Todos", "Smartphones": "Smartphones", "Laptops": "Laptops", "MaxPrice": "Preço máximo", "Showing": "Exibindo", "Products": "Produtos", "ClearWishlist": "Limpar favoritos", "NoItems": "Nenhum item na lista de favoritos.", "Remove": "Remover", "ClearHistory": "Limpar todo o histórico de pedidos", "RemoveUser": "Remover usuário", "NewName": "Novo nome:", "NewPrice": "Novo preço:", "NewCurrency": "Nova moeda:", "ProductUpdated": "Produto atualizado!", "AdminAccessGranted": "Acesso de administrador concedido.", "WrongPassword": "Senha incorreta.", "SecureAdminAccess": "Acesso de administrador seguro", "EnterPassword": "Digite a senha", "EnterAdminPassword": "Digite a senha de administrador", "AdminPanel": "Painel de administração", "EnterUsername": "Digite o nome de usuário", "Edit": "Editar", "Delete": "Excluir", "DeleteNotWired": "Exclusão ainda não implementada" },
  hi: { "Home": "होम", "Checkout": "चेकआउट", "Wishlist": "पसंदीदा", "Orders": "ऑर्डर", "Admin": "व्यवस्थापक", "Login": "लॉगिन", "Signup": "साइनअप", "Cart": "कार्ट", "Search...": "खोजें...", "Version": "संस्करण", "Dark": "🌙 गहरा", "Light": "☀️ हल्का", "MadeWith": "द्वारा निर्मित", "AddToCart": "कार्ट में जोड़ें", "All": "सभी", "Smartphones": "स्मार्टफोन", "Laptops": "लैपटॉप", "MaxPrice": "अधिकतम मूल्य", "Showing": "दिखा रहा", "Products": "उत्पाद", "ClearWishlist": "पसंदीदा साफ़ करें", "NoItems": "पसंदीदा में कोई आइटम नहीं है।", "Remove": "हटाएं", "ClearHistory": "सभी ऑर्डर इतिहास साफ़ करें", "RemoveUser": "उपयोगकर्ता हटाएं", "NewName": "नया नाम:", "NewPrice": "नई कीमत:", "NewCurrency": "नई मुद्रा:", "ProductUpdated": "उत्पाद अपडेट हो गया!", "AdminAccessGranted": "व्यवस्थापक पहुंच प्रदान की गई।", "WrongPassword": "गलत पासवर्ड।", "SecureAdminAccess": "सुरक्षित व्यवस्थापक पहुंच", "EnterPassword": "पासवर्ड दर्ज करें", "EnterAdminPassword": "व्यवस्थापक पासवर्ड दर्ज करें", "AdminPanel": "व्यवस्थापक पैनल", "EnterUsername": "उपयोगकर्ता नाम दर्ज करें", "Edit": "सम्पादित करें", "Delete": "हटाएं", "DeleteNotWired": "हटाना अभी सक्रिय नहीं है" },
};

const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English", native: "English" }, { code: "ar", name: "Arabic", native: "العربية" },
  { code: "ru", name: "Russian", native: "Русский" }, { code: "fr", name: "French", native: "Français" },
  { code: "es", name: "Spanish", native: "Español" }, { code: "de", name: "German", native: "Deutsch" },
  { code: "zh", name: "Chinese", native: "中文" }, { code: "ja", name: "Japanese", native: "日本語" },
  { code: "pt", name: "Portuguese", native: "Português" }, { code: "hi", name: "Hindi", native: "हिन्दी" },
];

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState(() => {
    try {
      const saved = localStorage.getItem("preferred_language");
      if (saved && SUPPORTED_LANGUAGES.some((l) => l.code === saved)) return saved;
    } catch {}
    const browserLangs = navigator.languages || [navigator.language];
    for (const bl of browserLangs) {
      const code = bl.split("-")[0];
      if (SUPPORTED_LANGUAGES.some((l) => l.code === code)) return code;
    }
    return "en";
  });

  const isRTL = RTL_LANGUAGES.has(language);
  const setLanguage = useCallback((lang: string) => { setLanguageState(lang); try { localStorage.setItem("preferred_language", lang); } catch {} }, []);

  useEffect(() => { document.documentElement.dir = isRTL ? "rtl" : "ltr"; document.documentElement.lang = language; }, [language, isRTL]);

  const translate = useCallback(async (text: string): Promise<string> => {
    if (language === "en") return text;
    const fallback = FALLBACK_TRANSLATIONS[language]?.[text];
    if (fallback) return fallback;
    return text;
  }, [language]);

  const t = useCallback((key: string): string => {
    if (language === "en") return key;
    return FALLBACK_TRANSLATIONS[language]?.[key] ?? key;
  }, [language]);

  const addTranslation = useCallback((lang: string, key: string, value: string) => {
    if (!FALLBACK_TRANSLATIONS[lang]) FALLBACK_TRANSLATIONS[lang] = {};
    FALLBACK_TRANSLATIONS[lang][key] = value;
    try {
      const stored = localStorage.getItem("custom_translations");
      const custom: Record<string, Record<string, string>> = stored ? JSON.parse(stored) : {};
      if (!custom[lang]) custom[lang] = {};
      custom[lang][key] = value;
      localStorage.setItem("custom_translations", JSON.stringify(custom));
    } catch {}
  }, []);

  return (
    <LanguageContext.Provider value={useMemo(() => ({ language, setLanguage, translate, isRTL, t, availableLanguages: SUPPORTED_LANGUAGES, addTranslation }), [language, setLanguage, translate, isRTL, t, addTranslation])}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) return { language: "en", setLanguage: () => {}, translate: async (t: string) => t, isRTL: false, t: (k: string) => k, availableLanguages: SUPPORTED_LANGUAGES, addTranslation: () => {} };
  return ctx;
};
