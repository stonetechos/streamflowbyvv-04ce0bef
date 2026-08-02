/**
 * Hindi (`hi-IN`) string bundle — Foundation §17 launch locale.
 * Key set mirrors `en.ts` exactly; a missing key falls back to English.
 */
import type { LocaleBundle } from "../localization.types";

export const hiINBundle: LocaleBundle = {
  locale: "hi-IN",
  version: "1.0.0",
  strings: {
    "common.app.name": "StreamFlow",
    "common.app.tagline": "साथ देखें, एक ही समय पर।",
    "common.action.retry": "फिर से कोशिश करें",
    "common.action.go_home": "होम पर जाएँ",
    "common.action.dismiss": "बंद करें",
    "common.state.loading": "लोड हो रहा है",

    "settings.language.label": "भाषा",
    "settings.appearance.theme.label": "थीम",
    "settings.appearance.theme.system": "सिस्टम",
    "settings.appearance.theme.light": "लाइट",
    "settings.appearance.theme.dark": "डार्क",

    "error.sys.unexpected.title": "कुछ गड़बड़ हो गई",
    "error.sys.unexpected": "एक अनपेक्षित समस्या आ गई। इसमें आपकी कोई गलती नहीं है।",
    "error.sys.route_not_found.title": "पेज नहीं मिला",
    "error.sys.route_not_found": "यह पेज मौजूद नहीं है, या इसे हटा दिया गया है।",
    "error.sys.config_invalid.title": "कॉन्फ़िगरेशन समस्या",
    "error.sys.config_invalid": "कॉन्फ़िगरेशन अमान्य होने के कारण StreamFlow शुरू नहीं हो सका।",
    "error.action.retry": "फिर से कोशिश करें",
    "error.action.go_home": "होम पर जाएँ",
    "error.reference.label": "संदर्भ कोड",

    "a11y.skip_to_content": "मुख्य सामग्री पर जाएँ",
    "a11y.main_content.label": "मुख्य सामग्री",
    "a11y.loading.announcement": "लोड हो रहा है, कृपया प्रतीक्षा करें",
    "a11y.error.announcement": "एक त्रुटि हुई",
  },
};
