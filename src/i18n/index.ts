import i18n from "i18next";
import ICU from "i18next-icu";
import { initReactI18next } from "react-i18next";
import enUS from "./en-us.json";
import zhCN from "./zh-cn.json";

// Support multiple locales (extend here if adding more)
const RESOURCES = {
	"en-US": { translation: enUS },
	"zh-CN": { translation: zhCN },
};

// NOTE: We avoid narrowing translation keys too aggressively to keep DX flexible.
declare module "i18next" {
	interface CustomTypeOptions {
		defaultNS: "translation";
		returnNull: false;
	}
}

const LOCAL_STORAGE_LANG_KEY = "amll_lang";

function detectInitialLanguage(): string {
	const saved = localStorage.getItem(LOCAL_STORAGE_LANG_KEY);
	if (saved && Object.keys(RESOURCES).includes(saved)) return saved;
	const nav = navigator.language || navigator.languages?.[0] || "zh-CN";
	if (nav.toLowerCase().startsWith("zh")) return "zh-CN";
	return "en-US";
}

i18n
	.use(initReactI18next)
	.use(ICU)
	.init({
		resources: RESOURCES,
		lng: detectInitialLanguage(),
		debug: import.meta.env.DEV,
		fallbackLng: "zh-CN",
		interpolation: {
			escapeValue: false,
		},
		returnNull: false,
	})
	.then(() => {});

export function setAppLanguage(lng: string) {
	if (!Object.keys(RESOURCES).includes(lng)) return;
	i18n.changeLanguage(lng).catch(() => {});
	try {
		localStorage.setItem(LOCAL_STORAGE_LANG_KEY, lng);
	} catch {
		// ignore
	}
}

export default i18n;
