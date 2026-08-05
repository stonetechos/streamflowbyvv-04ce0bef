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
    "common.app.publisher": "वेडोरा विज़न द्वारा",
    "common.action.learn_more": "और जानें",

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
    "error.net.timeout": "अनुरोध में बहुत समय लग गया। अपना कनेक्शन जाँचें और फिर कोशिश करें।",
    "error.net.offline": "आप ऑफ़लाइन लग रहे हैं। कनेक्शन लौटते ही StreamFlow अपने आप जुड़ जाएगा।",
    "error.net.cancelled": "यह अनुरोध रद्द कर दिया गया।",
    "error.net.unreachable":
      "हम StreamFlow तक नहीं पहुँच सके। अपना कनेक्शन जाँचें और फिर कोशिश करें।",
    "error.net.bad_response": "हमें एक अनपेक्षित उत्तर मिला। कृपया फिर कोशिश करें।",
    "error.net.server_error": "StreamFlow में अभी कुछ दिक्कत है। थोड़ी देर बाद कोशिश करें।",
    // Sprint 1.9 — गतिविधि टाइमलाइन सारांश (Foundation §13).
    "activity.room_created": "आपने एक रूम बनाया।",
    "activity.room_joined": "आप एक रूम में शामिल हुए।",
    "activity.room_ended": "एक वॉच सेशन समाप्त हुआ।",
    "activity.invite_sent": "आपने एक आमंत्रण भेजा।",
    "activity.invite_accepted": "एक आमंत्रण स्वीकार किया गया।",
    "activity.voice_joined": "आप वॉइस चैट में शामिल हुए।",
    // Sprint 1.6 — साझा डोमेन त्रुटि वर्गीकरण (Foundation §16.1).
    "error.sys.invalid_input": "यह अनुरोध मान्य नहीं था, इसलिए कुछ नहीं बदला।",
    "error.sys.service_unavailable":
      "StreamFlow का यह हिस्सा अभी तैयार नहीं है। कृपया फिर कोशिश करें।",
    "error.sys.rate_limited": "आपने यह बहुत बार किया है। कृपया थोड़ा रुकें।",
    "error.room.capacity_exceeded": "यह रूम भर चुका है।",
    "error.room.invalid_transition": "यह रूम उस स्थिति में नहीं जा सकता।",
    "error.room.not_active": "यह रूम अभी सक्रिय नहीं है।",
    "error.room.not_found": "वह रूम नहीं मिला।",
    "error.room.forbidden": "यह केवल रूम होस्ट कर सकता है।",
    "error.room.already_member": "आप पहले ही इस रूम में शामिल हो चुके हैं।",
    "error.room.member_not_found": "वह व्यक्ति इस रूम में नहीं है।",
    // Sprint J.1.5 — हर इनकार असली कारण बताता है।
    "error.room.ended": "यह रूम समाप्त हो चुका है।",
    "error.room.deleted": "यह रूम बंद कर दिया गया है और अब उपलब्ध नहीं है।",
    "error.room.blocked": "आप इस रूम में शामिल नहीं हो सकते।",
    "error.room.already_in_another_room": "आप पहले से किसी दूसरे रूम में शामिल हैं।",
    "error.room.member_removed": "आपको इस रूम से हटा दिया गया था।",
    "error.invite.not_found": "वह आमंत्रण नहीं मिला।",
    "error.invite.expired": "यह आमंत्रण समाप्त हो चुका है।",
    "error.invite.not_pending": "इस आमंत्रण का उत्तर पहले ही दिया जा चुका है।",
    "error.invite.already_pending": "उन्हें पहले ही इस रूम का आमंत्रण भेजा जा चुका है।",
    "error.invite.already_accepted": "वे पहले से इस रूम में हैं।",

    "error.sync.countdown_out_of_range": "3 से 60 सेकंड के बीच काउंटडाउन चुनें।",
    "error.sync.resync_required": "आपकी घड़ियाँ बहुत अलग हैं। शुरू करने से पहले री-सिंक करें।",
    "error.voice.session_not_active": "इस रूम में वॉइस चैट सक्रिय नहीं है।",
    "error.provider.capability_unsupported": "यह सेवा वह क्रिया समर्थित नहीं करती।",
    "error.compliance.action_blocked": "StreamFlow इस सेवा के साथ यह नहीं कर सकता।",
    "error.net.request_failed": "यह अनुरोध पूरा नहीं हो सका। कृपया फिर कोशिश करें।",
    "error.sys.persistence_unavailable":
      "StreamFlow अभी आपके डेटा तक नहीं पहुँच पा रहा। थोड़ी देर बाद कोशिश करें।",
    "error.sys.persistence_failed": "हम यह पूरा नहीं कर सके। कृपया फिर कोशिश करें।",
    "error.sys.not_found": "आप जो खोज रहे थे वह नहीं मिला।",
    "error.sys.conflict": "यह कहीं और पहले ही बदल चुका है। रिफ़्रेश करके फिर कोशिश करें।",
    "error.sys.permission_denied": "आपके पास इसकी अनुमति नहीं है।",
    "error.sys.constraint_violation": "ये विवरण सहेजे नहीं जा सके। इन्हें जाँचकर फिर कोशिश करें।",
    "error.action.retry": "फिर से कोशिश करें",
    "error.action.go_home": "होम पर जाएँ",
    "error.action.leave_other_room": "पहले दूसरा रूम छोड़ें",

    "error.reference.label": "संदर्भ कोड",

    "error.auth.provider_unavailable.title": "साइन-इन अभी उपलब्ध नहीं है",
    "error.auth.provider_unavailable":
      "StreamFlow की प्रमाणीकरण संरचना तैयार है, पर अभी कोई पहचान प्रदाता जुड़ा नहीं है।",
    "error.auth.invalid_credentials.title": "विवरण मेल नहीं खाया",
    "error.auth.invalid_credentials": "अपना ईमेल और पासवर्ड जाँचें, फिर दोबारा प्रयास करें।",
    "error.auth.email_not_verified.title": "अपना ईमेल सत्यापित करें",
    "error.auth.email_not_verified": "साइन-इन पूरा करने के लिए अपना ईमेल पता सत्यापित करें।",
    "error.auth.session_expired.title": "आप साइन आउट हो गए हैं",
    "error.auth.session_expired": "आपका सत्र समाप्त हो गया। जारी रखने के लिए फिर साइन इन करें।",
    "error.auth.session_missing.title": "जारी रखने के लिए साइन इन करें",
    "error.auth.session_missing": "इस पृष्ठ के लिए साइन-इन खाता आवश्यक है।",
    "error.auth.account_suspended.title": "खाता निलंबित",
    "error.auth.account_suspended": "यह खाता अभी उपयोग नहीं किया जा सकता। सहायता से संपर्क करें।",
    "error.auth.permission_denied.title": "आपके पास पहुँच नहीं है",
    "error.auth.permission_denied": "आपके खाते को यह पृष्ठ खोलने की अनुमति नहीं है।",
    "error.auth.rate_limited.title": "बहुत अधिक प्रयास",
    "error.auth.rate_limited": "दोबारा प्रयास करने से पहले कुछ देर प्रतीक्षा करें।",
    "error.auth.weak_password.title": "एक मज़बूत पासवर्ड चुनें",
    "error.auth.weak_password":
      "यह पासवर्ड बहुत आसान है। अक्षरों, संख्याओं और चिह्नों का मिश्रण रखते हुए लंबा पासवर्ड आज़माएँ।",
    "error.auth.sign_out_failed.title": "साइन-आउट पूरा नहीं हुआ",
    "error.auth.sign_out_failed": "हम आपको साइन आउट नहीं कर सके। कृपया दोबारा प्रयास करें।",

    "auth.sign_in.title": "StreamFlow में साइन इन करें",
    "auth.sign_in.subtitle": "अपने अपने खातों से, एक साथ और एक ही समय पर देखें।",
    "auth.sign_out.title": "साइन आउट",
    "auth.sign_out.subtitle": "आपको होम पेज पर वापस भेजा जाएगा।",
    "auth.account.title": "आपका खाता",
    "auth.account.subtitle": "प्रोफ़ाइल और प्राथमिकताएँ आगामी स्प्रिंट में आएँगी।",
    "auth.action.sign_in": "साइन इन",
    "auth.action.sign_out": "साइन आउट",
    "auth.action.reset_password": "अपना पासवर्ड रीसेट करें",
    "auth.action.resend_verification": "सत्यापन ईमेल दोबारा भेजें",
    "auth.state.checking_session": "आपका सत्र जाँचा जा रहा है",
    "auth.state.redirecting": "आपको साइन-इन पर ले जाया जा रहा है",
    "auth.status.session": "सत्र स्थिति",
    "auth.status.adapter": "पहचान अडैप्टर",

    "auth.story.headline": "जहाँ भी हों, साथ मिलकर प्ले दबाइए।",
    "auth.story.body":
      "StreamFlow सबको एक साथ गिनती देकर शुरू करवाता है और बातचीत जारी रखता है। अपने ही खाते, अपने ही ऐप — कुछ भी दोबारा स्ट्रीम नहीं होता।",
    "auth.story.point.accounts": "हर कोई अपनी ही सदस्यता पर देखता है।",
    "auth.story.point.countdown": "साझा काउंटडाउन सबको एक ही फ़्रेम पर शुरू करता है।",
    "auth.story.point.voice": "फ़िल्म चलते समय वॉइस चैट चालू रहती है।",
    "auth.legal.notice":
      "आगे बढ़कर आप सहमत होते हैं कि आप अपने ही स्ट्रीमिंग खातों का उपयोग करेंगे और हर सेवा की शर्तों का पालन करेंगे।",
    "auth.method.legend": "आप कैसे साइन इन करना चाहेंगे?",
    "auth.method.password": "पासवर्ड",
    "auth.method.magic_link": "ईमेल लिंक",
    "auth.field.email": "ईमेल पता",
    "auth.field.email.placeholder": "you@example.com",
    "auth.field.password": "पासवर्ड",
    "auth.field.display_name": "प्रदर्शित नाम",
    "auth.field.display_name.placeholder": "प्रिया",
    "auth.field.display_name.hint": "आपके कमरों में सबको यही नाम दिखेगा।",
    "auth.action.create_account": "खाता बनाएँ",
    "auth.action.send_magic_link": "मुझे साइन-इन लिंक ईमेल करें",
    "auth.action.send_reset_link": "मुझे रीसेट लिंक ईमेल करें",
    "auth.action.back_to_sign_in": "साइन इन पर वापस",
    "auth.action.use_different_email": "दूसरा ईमेल उपयोग करें",
    "auth.action.resend_in": "आप {seconds} सेकंड में दोबारा भेज सकते हैं",
    "auth.magic_link.explainer": "पासवर्ड की ज़रूरत नहीं — हम आपको साइन-इन लिंक ईमेल करेंगे।",
    "auth.magic_link.hint": "यह लिंक एक बार काम करता है और 24 घंटे में समाप्त हो जाता है।",
    "auth.magic_link.sent": "अपना इनबॉक्स देखें। हमने {email} पर साइन-इन लिंक भेजा है।",
    "auth.callback.title":
      "\u0916\u093e\u0924\u093e \u092a\u0941\u0937\u094d\u091f \u0939\u094b \u0930\u0939\u093e \u0939\u0948",
    "auth.callback.subtitle": "\u092c\u0938 \u090f\u0915 \u092a\u0932\u0964",
    "auth.callback.working":
      "\u0938\u093e\u0907\u0928 \u0907\u0928 \u0915\u0930 \u0930\u0939\u0947 \u0939\u0948\u0902\u2026",
    "auth.callback.failed.title":
      "\u092f\u0939 \u0932\u093f\u0902\u0915 \u0915\u093e\u092e \u0928\u0939\u0940\u0902 \u0915\u0930 \u092a\u093e\u092f\u093e",
    "auth.callback.failed.expired":
      "\u0932\u093f\u0902\u0915 \u0915\u0940 \u092e\u0940\u092f\u093e\u0926 \u0916\u0924\u094d\u092e \u0939\u094b \u0917\u0908 \u092f\u093e \u0935\u0939 \u092a\u0939\u0932\u0947 \u0939\u0940 \u0907\u0938\u094d\u0924\u0947\u092e\u093e\u0932 \u0939\u094b \u091a\u0941\u0915\u093e \u0939\u0948\u0964",
    "auth.callback.failed.generic":
      "\u0939\u092e \u0907\u0938 \u0932\u093f\u0902\u0915 \u0915\u0940 \u092a\u0941\u0937\u094d\u091f\u093f \u0928\u0939\u0940\u0902 \u0915\u0930 \u0938\u0915\u0947\u0964",
    "auth.callback.failed.retry":
      "\u0938\u093e\u0907\u0928 \u0907\u0928 \u0915\u0930\u0947\u0902 \u2014 \u0908\u092e\u0947\u0932 \u092a\u0939\u0932\u0947 \u0938\u0947 \u092a\u0941\u0937\u094d\u091f \u0939\u0948 \u0924\u094b \u0938\u0940\u0927\u0947 \u092a\u0939\u0941\u0901\u091a \u091c\u093e\u090f\u0902\u0917\u0947\u0964 \u0935\u0930\u0928\u093e \u0928\u092f\u093e \u0932\u093f\u0902\u0915 \u092e\u0902\u0917\u0935\u093e\u090f\u0902\u0964",
    "auth.reset_password.title":
      "\u0928\u092f\u093e \u092a\u093e\u0938\u0935\u0930\u094d\u0921 \u091a\u0941\u0928\u0947\u0902",
    "auth.reset_password.subtitle":
      "\u0910\u0938\u093e \u091c\u094b \u092a\u0939\u0932\u0947 \u0907\u0938\u094d\u0924\u0947\u092e\u093e\u0932 \u0928 \u0915\u093f\u092f\u093e \u0939\u094b\u0964",
    "auth.reset.link_required":
      "\u0928\u092f\u093e \u092a\u093e\u0938\u0935\u0930\u094d\u0921 \u0930\u0916\u0928\u0947 \u0915\u0947 \u0932\u093f\u090f \u0908\u092e\u0947\u0932 \u0915\u093e \u0932\u093f\u0902\u0915 \u0916\u094b\u0932\u0947\u0902\u0964",
    "auth.reset.updated":
      "\u092a\u093e\u0938\u0935\u0930\u094d\u0921 \u092c\u0926\u0932 \u0917\u092f\u093e\u0964 \u0906\u092a \u0938\u093e\u0907\u0928 \u0907\u0928 \u0939\u0948\u0902\u0964",
    "auth.field.new_password": "\u0928\u092f\u093e \u092a\u093e\u0938\u0935\u0930\u094d\u0921",
    "auth.field.confirm_password":
      "\u092a\u093e\u0938\u0935\u0930\u094d\u0921 \u0926\u094b\u0939\u0930\u093e\u090f\u0902",
    "auth.error.password_mismatch":
      "\u0926\u094b\u0928\u094b\u0902 \u092a\u093e\u0938\u0935\u0930\u094d\u0921 \u090f\u0915 \u091c\u0948\u0938\u0947 \u0939\u094b\u0928\u0947 \u091a\u093e\u0939\u093f\u090f\u0964",
    "auth.action.update_password":
      "\u092a\u093e\u0938\u0935\u0930\u094d\u0921 \u092c\u0926\u0932\u0947\u0902",
    "auth.action.continue": "\u091c\u093e\u0930\u0940 \u0930\u0916\u0947\u0902",
    "auth.reset.hint": "यदि उस पते का खाता मौजूद है, तो रीसेट लिंक भेज दिया गया है।",
    "auth.reset.sent": "रीसेट लिंक के लिए अपना इनबॉक्स देखें।",
    "auth.verify.sent": "हमने {email} पर सत्यापन लिंक भेजा है।",
    "auth.verify.hint": "खाता पूरा करने के लिए इसे इसी डिवाइस पर खोलें।",
    "auth.sign_up.have_account": "पहले से खाता है?",
    "auth.sign_up.title": "अपना StreamFlow खाता बनाएँ",
    "auth.sign_up.subtitle": "एक खाता, हर कमरा जिसे आप बनाएँ या जिसमें शामिल हों।",
    "auth.forgot_password.title": "अपना पासवर्ड रीसेट करें",
    "auth.forgot_password.subtitle": "नया पासवर्ड चुनने के लिए हम आपको लिंक ईमेल करेंगे।",
    "auth.verify.title": "अपना ईमेल सत्यापित करें",
    "auth.verify.subtitle": "एक क्लिक और आप अंदर।",

    "auth.validation.email_required": "अपना ईमेल पता दर्ज करें।",
    "auth.validation.email_invalid": "यह ईमेल पते जैसा नहीं लगता।",
    "auth.validation.password_required": "अपना पासवर्ड दर्ज करें।",
    "auth.validation.password_too_short": "पासवर्ड में कम से कम 8 अक्षर होने चाहिए।",
    "auth.password.strength.weak": "कमज़ोर — थोड़ा लंबा करें या अंक जोड़ें।",
    "auth.password.strength.fair": "ठीक है — एक चिह्न जोड़ें तो और बेहतर।",
    "auth.password.strength.strong": "मज़बूत पासवर्ड।",

    "auth.validation.display_name_required": "एक प्रदर्शित नाम चुनें।",
    "auth.validation.display_name_too_short": "प्रदर्शित नाम में कम से कम 2 अक्षर होने चाहिए।",
    "auth.validation.display_name_too_long": "प्रदर्शित नाम अधिकतम 40 अक्षरों का हो सकता है।",

    "a11y.skip_to_content": "मुख्य सामग्री पर जाएँ",
    "a11y.main_content.label": "मुख्य सामग्री",
    "a11y.loading.announcement": "लोड हो रहा है, कृपया प्रतीक्षा करें",
    "a11y.error.announcement": "एक त्रुटि हुई",

    "room.waiting_room.eyebrow": "प्रतीक्षा कक्ष",
    "room.waiting_room.title": "सबको एक साथ लाया जा रहा है",
    "room.waiting_room.subtitle": "होस्ट के कहने तक कुछ शुरू नहीं होगा।",
    "room.waiting_room.region_label": "प्रतीक्षा कक्ष",
    "room.waiting_room.loading": "प्रतीक्षा कक्ष लोड हो रहा है",
    "room.status.lobby": "लॉबी में",
    "room.status.active": "देखा जा रहा है",
    "room.status.paused": "रुका हुआ",
    "room.status.ended": "समाप्त",
    "room.status.abandoned": "छोड़ा गया",
    "room.info.code": "रूम कोड",
    "room.info.occupancy": "मौजूद लोग",
    "room.info.occupancy_value": "{capacity} में से {joined}",
    "room.info.scheduled_start": "नियोजित शुरुआत",
    "room.info.updates": "अपडेट",
    "room.info.updates_live": "लाइव",
    "room.info.updates_manual": "अपडेट के लिए रिफ़्रेश करें",
    "room.members.title": "सदस्य ({count})",
    "room.members.list_label": "इस रूम के लोग",
    "room.members.empty": "अभी कोई नहीं आया है। शुरू करने के लिए रूम कोड साझा करें।",
    "room.member.you": "आप",
    "room.member.host_badge": "होस्ट",
    "room.member.ready": "तैयार",
    "room.member.not_ready": "तैयार नहीं",
    "room.member_state.invited": "आमंत्रित",
    "room.member_state.joined": "रूम में",
    "room.member_state.left": "बाहर गए",
    "room.member_state.removed": "हटाए गए",
    "room.actions.title": "आपकी जगह",
    "room.actions.join": "इस रूम में शामिल हों",
    "room.actions.join_hint": "रूम में दिखने और तैयार होने का संकेत देने के लिए शामिल हों।",
    "room.actions.leave": "रूम छोड़ें",
    "room.actions.ready_label": "मैं तैयार हूँ",
    "room.actions.ready_hint":
      "तैयारी होस्ट को बताती है कि आप तैयार हैं। इससे प्लेबैक शुरू नहीं होता।",
    "invite.summary.title": "लंबित आमंत्रण",
    "invite.summary.empty": "किसी आमंत्रण का उत्तर बाकी नहीं है।",
    "invite.summary.pending": "{count} उत्तर की प्रतीक्षा में।",
    "invite.summary.share_hint": "जिनके साथ देखना है उन्हें कोड {code} भेजें।",
    "error.room.not_found.title": "रूम नहीं मिला",
    "error.room.member_not_found.title": "सदस्यता नहीं मिली",
    "error.room.capacity_exceeded.title": "रूम भरा हुआ है",
    "error.room.forbidden.title": "केवल होस्ट के लिए",
    "error.room.already_member.title": "आप पहले से इस रूम में हैं",
    "error.room.not_active.title": "रूम सक्रिय नहीं है",
    "error.room.ended.title": "यह पार्टी समाप्त हो चुकी है",
    "error.room.deleted.title": "रूम बंद हो गया",
    "error.room.blocked.title": "आप इस रूम में शामिल नहीं हो सकते",
    "error.room.already_in_another_room.title": "आप पहले से एक रूम में हैं",
    "error.room.member_removed.title": "आप अब इस रूम में नहीं हैं",
    "error.room.invalid_transition.title": "अभी यह संभव नहीं है",
    "home.join.not_found.title": "वह रूम नहीं मिला",
    "error.sys.service_unavailable.title": "अभी तैयार नहीं",
    "error.sys.persistence_unavailable.title": "आपका डेटा नहीं मिल रहा",
    "error.sys.conflict.title": "कोई पहले बदल चुका है",

    "room.presence.online": "ऑनलाइन",
    "room.presence.idle": "निष्क्रिय",
    "room.presence.away": "दूर",
    "room.presence.offline": "ऑफ़लाइन",
    "room.presence.last_seen": "{minutes} मिनट पहले देखा गया",
    "room.members.ready_count": "{total} में से {ready} तैयार",
    "po.banner.title": "पो आपके साथ प्रतीक्षा कर रहा है",
    "po.banner.waiting": "सबके आने तक पेड़ के नीचे विश्राम कर रहा है।",
    "po.banner.all_ready": "सब तैयार हैं — पो प्रसन्न दिख रहा है।",
    "po.banner.thinking": "मेजबान के तय करने तक पो कान लगाए बैठा है।",
    "po.banner.provider_selected": "सेवा चुन ली गई — पो आराम से बैठ गया।",

    "common.save": "सहेजें",
    "common.saving": "सहेजा जा रहा है…",

    "provider.list.label": "कहाँ देखना है, वह चुनें",
    "provider.list.empty": "आपके क्षेत्र के लिए अभी कोई सेवा उपलब्ध नहीं है।",
    "provider.list.error": "सेवाओं की सूची लोड नहीं हुई। फिर कोशिश करें।",
    "provider.list.unavailable": "सेवा चयन अभी उपलब्ध नहीं है।",
    "provider.class.supported": "समर्थित",
    "provider.class.manual_sync": "मैन्युअल सिंक",
    "provider.class.unverified": "असत्यापित",
    "provider.class.unavailable": "अनुपलब्ध",
    "provider.hint.supported": "StreamFlow इसे सबके लिए साथ में चला और रोक सकता है।",
    "provider.hint.manual_sync":
      "सब गिनती पर एक साथ प्ले दबाएंगे। StreamFlow प्लेयर को नियंत्रित नहीं करेगा।",
    "provider.hint.unverified":
      "हमने इसे अभी सत्यापित नहीं किया है। आप गिनती के साथ फिर भी साथ देख सकते हैं।",
    "provider.hint.unavailable": "इस रूम में यह सेवा अभी उपयोग नहीं हो सकती।",
    "provider.badge.default": "आपकी डिफ़ॉल्ट",
    "provider.action.favorite": "{provider} को पसंदीदा में जोड़ें",
    "provider.action.unfavorite": "{provider} को पसंदीदा से हटाएं",
    "provider.youtube.name": "YouTube",
    "provider.local_file.name": "लोकल फ़ाइल",
    "provider.netflix.name": "Netflix",
    "provider.prime_video.name": "Prime Video",
    "provider.disney_hotstar.name": "Disney+ Hotstar",
    "compliance.rationale.tos_no_automation":
      "इस सेवा की शर्तें स्वचालित नियंत्रण की अनुमति नहीं देतीं।",
    "compliance.rationale.public_embed_api":
      "सेवा के अपने सार्वजनिक एम्बेड से, आपके ही सत्र में चलता है।",
    "compliance.rationale.never_store_credentials":
      "StreamFlow आपके खाते की जानकारी न मांगता है, न संग्रहित करता है।",
    "compliance.rationale.user_owned_media": "आपकी अपनी डिवाइस की, आपकी अपनी फ़ाइल चलती है।",
    "compliance.rationale.no_redistribution":
      "वीडियो StreamFlow से होकर नहीं जाता। कुछ भी साझा नहीं किया जाता।",

    "room.setup.title": "देखने से पहले",
    "room.setup.description.host": "सेवा और गिनती की अवधि चुनें। आपके कहने तक कुछ शुरू नहीं होगा।",
    "room.setup.description.guest": "मेजबान सेवा और गिनती की अवधि चुन रहा है।",
    "room.setup.selected.label": "सेवा:",
    "room.setup.selected.none": "अभी नहीं चुनी गई",
    "room.setup.countdown.label": "गिनती की अवधि (सेकंड)",
    "room.setup.countdown.hint":
      "{min} से {max} सेकंड के बीच। सहेजा जाएगा — अभी कुछ शुरू नहीं होगा।",
    "room.setup.countdown.invalid": "{min} से {max} के बीच पूर्ण संख्या दर्ज करें।",
    "room.setup.countdown.readonly": "गिनती {seconds} सेकंड तक चलेगी।",
    "room.countdown.title": "गिनती",
    "room.countdown.description.host":
      "सब तैयार हों तो गिनती शुरू करें। शून्य पर सब एक साथ प्ले दबाएँ — StreamFlow आपके लिए नहीं दबाएगा।",
    "room.countdown.description.guest": "मेजबान गिनती शुरू करेगा। अपनी सेवा खोलकर तैयार रखें।",
    "room.countdown.state.idle": "शुरू नहीं हुई",
    "room.countdown.state.preparing": "तैयारी हो रही है",
    "room.countdown.state.counting_down": "गिनती चल रही है",
    "room.countdown.state.cancelled": "रद्द",
    "room.countdown.state.completed": "अब प्ले दबाएँ",
    "room.countdown.state.expired": "समय बीत गया",
    "room.countdown.started_by": "{host} ने शुरू की",
    "room.countdown.reason.host_cancelled": "मेजबान ने गिनती रद्द कर दी।",
    "room.countdown.reason.restarted": "मेजबान ने गिनती फिर से शुरू की।",
    "room.countdown.reason.expired": "शून्य पर कोई मौजूद नहीं था, इसलिए गिनती समाप्त कर दी गई।",
    "room.countdown.action.start": "गिनती शुरू करें",
    "room.countdown.action.cancel": "गिनती रद्द करें",
    "room.countdown.action.restart": "गिनती फिर शुरू करें",
    "room.countdown.guest_hint": "गिनती केवल मेजबान शुरू या रद्द कर सकता है।",
    "room.countdown.needs_provider": "गिनती शुरू करने से पहले सेवा चुनें।",
    "room.countdown.announce.preparing": "गिनती तैयार हो रही है",
    "room.countdown.announce.counting_down": "गिनती शुरू हुई",
    "room.countdown.announce.tick": "{seconds}",
    "room.countdown.announce.cancelled": "गिनती रद्द हुई",
    "room.countdown.announce.completed": "अब प्ले दबाएँ",
    "room.countdown.announce.expired": "गिनती समाप्त हो गई",
    "po.banner.counting": "Po आपके साथ गिन रहा है।",
    "po.banner.celebrating": "Po खुश है — साथ में प्ले दबाएँ।",
    "po.banner.cancelled": "Po फिर से शांत होकर इंतज़ार करने लगा।",
    "po.banner.playback_ready": "पो खड़ा हो गया — रूम देखने के लिए तैयार है।",
    "po.banner.observing": "पो घड़ियों को स्थिर होते देख रहा है।",
    "po.banner.concerned": "पो धैर्य से प्रतीक्षा कर रहा है — कोई अब भी पीछे है।",
    "po.banner.relieved": "पो ने राहत की सांस ली — कमरा फिर से एक लय में है।",
    "common.yes": "हाँ",
    "common.no": "नहीं",
    "po.banner.encouraging": "पो शांति से प्रतीक्षा कर रहा है — कमरे को बस एक पल चाहिए।",
    "room.playback_sync.status.playback_ready": "प्लेबैक तैयार",
    "room.playback_sync.status.synchronization_ready": "सिंक्रनाइज़ेशन तैयार",
    "room.playback_sync.status.waiting_for_manual_play":
      "सभी के अपने ऐप में प्ले दबाने की प्रतीक्षा है।",
    "room.playback_sync.status.waiting_for_resync": "साथ देखने से पहले री-सिंक की प्रतीक्षा है।",
    "room.playback_sync.decision.stay_synchronized": "कमरा एक लय में है।",
    "room.playback_sync.decision.recommend_resync": "री-सिंक की सलाह दी जाती है।",
    "room.playback_sync.decision.require_resync": "साथ जारी रखने से पहले री-सिंक आवश्यक है।",
    "room.playback_sync.decision.waiting": "कमरे के स्थिर होने की प्रतीक्षा है।",
    "room.playback_sync.decision.recovering": "कमरा फिर से लय में आ रहा है।",
    "room.playback_sync.correction.soft": "एक छोटा समायोजन कमरे को साथ ले आएगा।",
    "room.playback_sync.correction.hard": "कमरे को साथ लाने के लिए पूरा री-सिंक चाहिए होगा।",
    "room.room_sync.title": "कमरे का सिंक्रनाइज़ेशन",
    "room.room_sync.description":
      "सबकी घड़ियाँ कितनी मिलती हैं। कमरा हमेशा सबसे कमज़ोर प्रतिभागी को दर्शाता है।",
    "room.room_sync.count.ready": "तैयार",
    "room.room_sync.count.synced": "सिंक",
    "room.room_sync.count.waiting": "प्रतीक्षारत",
    "room.room_sync.count.of": " / {total}",
    "room.room_sync.block.resync_required":
      "काउंटडाउन रुका है: कम से कम एक व्यक्ति की घड़ी बहुत अलग है। उन्हें दोबारा माप लेने को कहें।",
    "room.room_sync.block.no_participants":
      "काउंटडाउन रुका है: अभी कोई कमरे में शामिल नहीं हुआ है।",
    "room.room_sync.block.participant_advisory":
      "कोई अब भी पीछे है। होस्ट अभी काउंटडाउन शुरू नहीं कर सकता।",
    "room.room_sync.advisory.warning":
      "घड़ियाँ थोड़ी अलग हैं। काउंटडाउन शुरू हो सकता है, पर थोड़ा अंतर रहेगा।",
    "room.room_sync.no_playback_notice":
      "StreamFlow केवल तैयारी का समन्वय करता है; यह आपका प्लेयर कभी नियंत्रित नहीं करता।",
    "room.sync.announce.room_health_changed": "कमरे का सिंक्रनाइज़ेशन: {health}।",
    "room.sync.title": "सिंक स्थिति",
    "room.sync.description":
      "इस डिवाइस की घड़ी रूम की घड़ी से कितनी मेल खाती है। यह केवल मापा जाता है, सुधारा नहीं जाता।",
    "room.sync.health.excellent": "उत्कृष्ट",
    "room.sync.health.good": "अच्छा",
    "room.sync.health.warning": "चेतावनी",
    "room.sync.health.resync_required": "फिर से सिंक आवश्यक",
    "room.sync.health.unknown": "मापा जा रहा है…",
    "room.sync.metric.offset": "घड़ी का अंतर",
    "room.sync.metric.latency": "लेटेंसी",
    "room.sync.metric.confidence": "विश्वास",
    "room.sync.metric.milliseconds": "{value} मिलीसेकंड",
    "room.sync.metric.percent": "{value}%",
    "room.sync.measuring": "पहली माप ली जा रही है…",
    "room.sync.measuring_action": "मापा जा रहा है…",
    "room.sync.measure_action": "फिर से मापें",
    "room.sync.unavailable": "इस डिवाइस पर सिंक उपलब्ध नहीं है।",
    "room.sync.resync_hint": "घड़ियाँ बहुत अलग हैं। काउंटडाउन शुरू करने से पहले फिर से मापें।",
    "room.sync.no_correction_notice":
      "StreamFlow सिंक स्थिति बताता है; वह आपका प्लेबैक कभी नहीं बदलता।",
    "room.sync.announce.health_changed": "सिंक स्थिति: {health}।",
    "room.playback.title": "देखने के लिए तैयार",
    "room.playback.description":
      "सभी तैयार हैं। अपने ऐप में प्ले दबाएं — StreamFlow आपका प्लेयर कभी नहीं चलाता।",
    "room.playback.state.idle": "अभी तैयार नहीं",
    "room.playback.state.queued": "रूम तैयार हो रहा है",
    "room.playback.state.ready": "तैयार — प्ले दबाएं",
    "room.playback.state.playing": "चल रहा है",
    "room.playback.state.paused": "रुका हुआ",
    "room.playback.state.seeking": "नए स्थान पर जा रहे हैं",
    "room.playback.state.completed": "समाप्त",
    "room.playback.state.error": "कुछ गलत हो गया",
    "room.playback.arming": "रूम तैयार किया जा रहा है…",
    "room.playback.press_play_hint": "अपने खाते में अभी प्ले दबाएं।",
    "room.playback.owner": "{owner} रूम को एक साथ रख रहे हैं।",
    "room.playback.no_control_notice":
      "StreamFlow आपकी स्ट्रीमिंग सेवा को नियंत्रित नहीं करता और न ही आपका साइन-इन संग्रहीत करता है।",
    "room.playback.announce.countdown_complete": "काउंटडाउन पूरा हुआ।",
    "room.playback.announce.waiting_for_playback": "प्लेबैक की प्रतीक्षा है।",
    "error.provider.capability_unsupported.title": "यह सेवा यहाँ उपयोग नहीं हो सकती",
    // Sprint 2.8 — provider launch and manual-sync guidance.
    "provider.launch.class.supported": "समर्थित",
    "provider.launch.class.manual_sync": "मैनुअल सिंक",
    "provider.launch.class.deep_link": "बाहर खुलेगा",
    "provider.launch.class.unsupported": "उपलब्ध नहीं",
    "provider.launch.target.app": "ऐप खोलें",
    "provider.launch.target.web": "ब्राउज़र में खोलें",
    "provider.launch.target.homepage": "प्रोवाइडर खोलें",
    "provider.launch.target.store": "ऐप डाउनलोड करें",
    "provider.launch.status.not_launched": "आपने अभी प्रोवाइडर नहीं खोला है।",
    "provider.launch.status.launching": "आपका प्रोवाइडर खोला जा रहा है…",
    "provider.launch.status.launched": "प्रोवाइडर खुल गया। काउंटडाउन के लिए यहाँ लौटें।",
    "provider.launch.status.failed": "कुछ नहीं खुला। ब्राउज़र विकल्प आज़माएँ।",
    "provider.playback_mode.manual_sync": "मैन्युअल सिंक",
    "provider.playback_mode.future_native": "मैन्युअल सिंक (नेटिव कंट्रोल भविष्य में)",
    "provider.playback_mode.unsupported": "उपलब्ध नहीं",
    "provider.control.refusal.browser":
      "StreamFlow आपके लिए प्ले या पॉज़ नहीं कर सकता। काउंटडाउन के बाद सब साथ में प्ले दबाएं।",
    "provider.control.refusal.native_planned": "नेटिव कंट्रोल योजना में है, अभी उपलब्ध नहीं।",
    "provider.control.refusal.unsupported": "StreamFlow यह सेवा नहीं खोल सकता।",
    "provider.session.status.connected": "जुड़ा हुआ",
    "provider.session.status.not_connected": "जुड़ा नहीं",
    "provider.session.status.unavailable": "उपलब्ध नहीं",
    "provider.session.last_used": "अंतिम बार: {when}",
    "provider.capability.manual_sync": "मैन्युअल सिंक",
    "provider.capability.future_control": "भविष्य का कंट्रोल",
    "provider.connect.title": "{service} अपने खाते से खोलें",
    "provider.connect.description":
      "StreamFlow आपकी ओर से साइन इन नहीं करता। आप {service} में हमेशा की तरह खुद साइन इन करेंगे।",
    "provider.connect.point_sign_in": "सेवा में सीधे साइन इन करें।",
    "provider.connect.point_no_credentials":
      "StreamFlow कोई यूज़रनेम, पासवर्ड या टोकन संग्रहीत नहीं करता।",
    "provider.connect.point_manual_sync":
      "प्लेबैक आपके हाथ में रहता है; काउंटडाउन सबको साथ लाता है।",
    "provider.connect.confirm": "जारी रखें",
    "provider.connect.cancel": "अभी नहीं",
    "room.provider.title": "यह वॉच पार्टी",
    "room.provider.service": "सेवा",
    "room.provider.none": "अभी कोई सेवा नहीं चुनी",
    "room.provider.selected_title": "चुना गया शीर्षक",
    "room.provider.title_unknown": "अभी तय नहीं",
    "provider.tier.a.label": "पूर्ण सिंक",
    "provider.tier.b.label": "सहायक सिंक",
    "provider.tier.c.label": "मैन्युअल रूप से साथ",
    "provider.tier.a.summary": "सबका प्लेयर अपने आप रूम के साथ चलता है।",
    "provider.tier.b.summary": "StreamFlow बता सकता है कि आप पीछे हैं और साथ लाने में मदद करेगा।",
    "provider.tier.c.summary": "काउंटडाउन पर साथ प्ले दबाएँ — इस सेवा का रिमोट उसी के पास रहता है।",
    "room.stage.voice_connected": "वॉइस चालू",
    "room.invite.qr_caption": "इस रूम में शामिल होने के लिए स्कैन करें",
    "room.invite.qr_alt": "{room} में शामिल होने का QR कोड",
    "watch_party.hud.hosted_by": "होस्ट: {host}",
    "watch_party.hud.together": "साथ देख रहे हैं",
    "watch_party.hud.speaking": "{name} बोल रहे हैं",
    "watch_party.hud.voice_on": "वॉइस चालू",
    "watch_party.hud.voice_off": "वॉइस बंद",
    "watch_party.hud.mute": "माइक बंद करें",
    "watch_party.hud.unmute": "माइक चालू करें",
    "watch_party.hud.react": "रिएक्ट करें",
    "watch_party.hud.catch_up": "साथ आएँ",
    "watch_party.hud.hide": "कंट्रोल छिपाएँ",
    "watch_party.hud.show": "कंट्रोल दिखाएँ",
    "watch_party.hud.leave": "छोड़ें",
    "watch_party.catch_up.title": "क्या हम अब भी साथ हैं?",
    "watch_party.catch_up.description": "अपने प्लेयर में दिख रहा समय यहाँ लिखें। हम बताएँगे किस ओर बढ़ना है।",
    "watch_party.catch_up.field": "आपके प्लेयर का समय",
    "watch_party.catch_up.compare": "तुलना करें",
    "watch_party.catch_up.in_sync": "आप रूम के साथ सिंक में हैं।",
    "watch_party.catch_up.behind": "आप {seconds} सेकंड पीछे हैं।",
    "watch_party.catch_up.ahead": "आप {seconds} सेकंड आगे हैं।",
    "watch_party.catch_up.advice_behind": "अपने प्लेयर में लगभग {seconds} सेकंड आगे बढ़ें।",
    "watch_party.catch_up.advice_ahead": "अपने प्लेयर में लगभग {seconds} सेकंड पीछे जाएँ।",
    "watch_party.catch_up.footnote": "StreamFlow कभी आपका प्लेयर खुद नहीं चलाता — आपकी स्क्रीन आपके नियंत्रण में रहती है।",
    "room.provider.episode_value": "S{season} · E{episode}",
    "room.provider.host": "होस्ट",
    "room.provider.host_unknown": "अज्ञात",
    "room.provider.playback_mode": "प्लेबैक मोड",
    "room.provider.manual_note":
      "StreamFlow काउंटडाउन से सबको एक साथ रखता है; वह सेवा का प्लेयर नहीं चलाता।",
    "provider.launch.refusal.compliance_blocked": "यह प्रोवाइडर StreamFlow से नहीं खोला जा सकता।",
    "provider.launch.refusal.provider_unavailable":
      "यह प्रोवाइडर अभी आपके क्षेत्र में उपलब्ध नहीं है।",
    "provider.launch.refusal.missing_content_reference": "होस्ट ने अभी कोई शीर्षक नहीं चुना है।",
    "provider.launch.refusal.no_known_destination": "StreamFlow को इस प्रोवाइडर का पता नहीं है।",
    "provider.launch.refusal.local_media": "अपनी फ़ाइल अपने प्लेयर में खोलें।",
    "provider.launch.announce.opened": "प्रोवाइडर नई विंडो में खुल गया।",
    "provider.launch.announce.failed": "प्रोवाइडर नहीं खुला।",
    "provider.guidance.heading.supported": "काउंटडाउन से पहले",
    "provider.guidance.heading.manual_sync": "मैनुअल सिंक के चरण",
    "provider.guidance.heading.deep_link": "तैयारी करें",
    "provider.guidance.heading.unsupported": "यह क्यों उपलब्ध नहीं है",
    "provider.guidance.summary.supported": "शून्य पर सब एक साथ प्ले दबाते हैं।",
    "provider.guidance.summary.manual_sync":
      "StreamFlow गिनती करता है; प्ले आप अपने ऐप में दबाते हैं।",
    "provider.guidance.summary.deep_link":
      "StreamFlow प्रोवाइडर खोलता है, फिर नियंत्रण आपको देता है।",
    "provider.guidance.summary.unsupported": "StreamFlow यह प्रोवाइडर नहीं खोलेगा।",
    "provider.guidance.unsupported.explain": "StreamFlow केवल अनुमत प्रोवाइडर से ही लिंक करता है।",
    "provider.guidance.step.open_provider": "ऊपर दिए बटन से प्रोवाइडर खोलें।",
    "provider.guidance.step.sign_in_own_account": "अपने खाते से साइन इन करें।",
    "provider.guidance.step.find_title": "होस्ट द्वारा चुना गया शीर्षक खोलें।",
    "provider.guidance.step.return_and_wait": "StreamFlow पर लौटें और काउंटडाउन का इंतज़ार करें।",
    "provider.guidance.step.press_play_on_zero": "शून्य पर अपने ऐप में प्ले दबाएँ।",
    "provider.guidance.youtube.pause_at_start": "शुरुआत में रोक कर रखें ताकि सब साथ शुरू करें।",
    "provider.guidance.netflix.skip_intro_together": "इंट्रो स्किप करने पर पहले सहमत हों।",
    "provider.guidance.prime_video.check_audio_track":
      "सुनिश्चित करें सबका ऑडियो ट्रैक एक जैसा है।",
    "provider.guidance.disney_hotstar.check_language": "सुनिश्चित करें सबने एक ही भाषा चुनी है।",
    "provider.guidance.local_file.open_your_copy": "अपनी फ़ाइल अपने सामान्य प्लेयर में खोलें।",
    "provider.guidance.local_file.confirm_same_cut": "सुनिश्चित करें सबके पास एक ही संस्करण है।",
    // Sprint 2.9 — तैयारी की पुष्टि, होस्ट सारांश और मैनुअल प्ले रिमाइंडर।
    "room.actions.member_hint": "आप रूम में हैं। अपना ऐप खोलने के बाद तैयार होने की पुष्टि करें।",
    "room.ready.title": "शुरू करने के लिए तैयार",
    "room.ready.description": "रूम को बताएं कि आप तैयार हैं। हर कोई खुद ही पुष्टि करता है।",
    "room.ready.state.not_member": "तैयारी बताने के लिए पहले रूम में शामिल हों।",
    "room.ready.state.not_ready": "आपने अभी पुष्टि नहीं की है।",
    "room.ready.state.launch_pending": "आपका प्रोवाइडर खुल रहा है…",
    "room.ready.state.waiting_for_others": "आप तैयार हैं। बाकी लोगों का इंतज़ार है।",
    "room.ready.state.everyone_ready": "सब तैयार हैं।",
    "room.ready.count": "{total} में से {ready} तैयार",
    "room.ready.action.confirm": "मैं तैयार हूँ",
    "room.ready.action.undo": "अभी तैयार नहीं हूँ",
    "room.ready.timeout_hint":
      "आप काफ़ी देर से बिना पुष्टि किए रूम में हैं। तैयार होने पर पुष्टि करें।",
    "room.ready.late_join_hint": "रूम तैयार होने के बाद कोई शामिल हुआ है। उन्हें थोड़ा समय दें।",
    "room.ready.no_control_notice": "StreamFlow सिर्फ़ समय मिलाता है; प्ले हमेशा आप खुद दबाते हैं।",
    "room.ready.block.no_participants": "अभी तक कोई रूम में शामिल नहीं हुआ।",
    "room.ready.block.no_provider": "होस्ट ने अभी कोई सेवा नहीं चुनी है।",
    "room.ready.block.not_everyone_ready": "सबकी तैयारी की पुष्टि का इंतज़ार है।",
    "room.ready.block.resync_required": "काउंटडाउन से पहले रूम को फिर से सिंक करना होगा।",
    "room.ready.announce.member_ready": "{member} तैयार हैं।",
    "room.ready.announce.everyone_ready": "सब तैयार हैं।",
    "room.ready.announce.countdown_available": "काउंटडाउन उपलब्ध है।",
    "room.ready.announce.manual_play_reminder":
      "काउंटडाउन खत्म होते ही अपने ऐप में प्ले दबाना याद रखें।",
    "room.summary.title": "रूम सारांश",
    "room.summary.description": "काउंटडाउन शुरू करने से पहले ज़रूरी सब कुछ।",
    "room.summary.members_ready": "तैयार सदस्य",
    "room.summary.members_waiting": "प्रतीक्षारत सदस्य",
    "room.summary.synchronization": "सिंक्रोनाइज़ेशन",
    "room.summary.provider": "सेवा",
    "room.summary.provider_missing": "अभी नहीं चुनी",
    "room.summary.countdown": "काउंटडाउन उपलब्ध",
    "room.summary.waiting_on": "{members} का इंतज़ार है।",
    "room.summary.timed_out": "{members} काफ़ी देर से बिना पुष्टि किए इंतज़ार में हैं।",
    "room.manual_play.before": "काउंटडाउन खत्म होने पर अपने स्ट्रीमिंग ऐप में प्ले दबाएँ।",
    "room.manual_play.now": "अब अपने ऐप में प्ले दबाएँ।",
    "po.banner.waiting_for_members": "Po शांति से इंतज़ार करता है जब तक सब तैयार हों।",
    "po.banner.someone_ready": "Po खुश हुआ — कोई और तैयार है।",
    "common.action.refresh": "रिफ़्रेश करें",
    "common.action.save": "सहेजें",
    "common.badge.coming_soon": "जल्द आ रहा है",
    "landing.headline": "साथ देखें, बिल्कुल एक साथ सिंक में।",
    "landing.subheadline":
      "हर कोई अपनी ही स्ट्रीमिंग सदस्यता पर देखता है, और StreamFlow सबका प्लेबैक सिंक में रखता है — साथ में लाइव वॉइस चैट। कोई भी कंटेंट दोबारा स्ट्रीम नहीं होता।",
    "landing.cta.primary": "खाता बनाएँ",
    "landing.cta.secondary": "साइन इन करें",
    "landing.card.together.title": "साथ देखें",
    "landing.card.together.body": "दोस्तों के साथ वही फ़िल्म या एपिसोड, रियल टाइम में देखें।",
    "landing.card.subscription.title": "अपनी ही सदस्यता इस्तेमाल करें",
    "landing.card.subscription.body":
      "हर कोई अपने Netflix, Prime Video, Disney+, JioHotstar या अन्य समर्थित खाते पर देखता है।",
    "landing.card.voice.title": "लाइव वॉइस और काउंटडाउन",
    "landing.card.voice.body":
      "बिल्ट-इन वॉइस चैट से जुड़े रहें, और साझा काउंटडाउन सबको एक साथ तैयार करता है।",
    "landing.how.title": "StreamFlow कैसे काम करता है",
    "landing.how.description": "ऐप खोलने से लेकर साथ में प्ले दबाने तक, तीन कदम।",
    "landing.how.step": "चरण {step}",
    "landing.how.step1": "अपनी स्ट्रीमिंग सेवा चुनें।",
    "landing.how.step2": "रूम कोड या इनवाइट लिंक से दोस्तों को बुलाएँ।",
    "landing.how.step3": "हर कोई अपने ही खाते पर देखता है और StreamFlow सबको सिंक में रखता है।",
    "landing.services.title": "उन सेवाओं के साथ जो आप पहले से इस्तेमाल करते हैं",

    "nav.home": "होम",
    "nav.invites": "निमंत्रण",
    "nav.settings": "सेटिंग्स",
    "nav.badge.unread": "{destination} में {count} नए",
    "nav.primary": "मुख्य",
    "nav.account": "खाता",
    "nav.sign_in": "साइन इन",
    "nav.get_started": "शुरू करें",
    "nav.toggle_theme": "थीम बदलें",
    "home.hero.question": "\u0906\u091c \u0915\u094d\u092f\u093e \u0926\u0947\u0916\u0947\u0902?",
    "home.services.title":
      "\u0906\u092a \u0915\u0939\u093e\u0901 \u0926\u0947\u0916\u0928\u093e \u091a\u093e\u0939\u0924\u0947 \u0939\u0948\u0902?",
    "home.services.description":
      "\u090f\u0915 \u0938\u0947\u0935\u093e \u091a\u0941\u0928\u093f\u090f \u2014 StreamFlow \u0906\u092a\u0915\u0947 \u0932\u093f\u090f \u0930\u0942\u092e \u0924\u0948\u092f\u093e\u0930 \u0915\u0930 \u0926\u0947\u0917\u093e\u0964",
    "home.services.status.supported": "समर्थित",
    "home.services.status.manual_sync": "मैन्युअल सिंक",
    "home.services.status.unverified": "बीटा",
    "home.services.status.unavailable": "अनुपलब्ध",
    "home.services.status.coming_soon":
      "\u091c\u0932\u094d\u0926 \u0906 \u0930\u0939\u093e \u0939\u0948",
    "home.services.room_name": "{service} \u0928\u093e\u0907\u091f",
    "home.services.footnote":
      "StreamFlow \u0915\u0902\u091f\u0947\u0902\u091f \u0928\u0939\u0940\u0902 \u091a\u0932\u093e\u0924\u093e \u2014 \u0906\u092a \u0905\u092a\u0928\u0947 \u0910\u092a \u092e\u0947\u0902 \u0926\u0947\u0916\u0924\u0947 \u0939\u0948\u0902\u0964",
    "home.live.badge": "\u0932\u093e\u0907\u0935",
    "home.live.host_other":
      "\u0926\u094b\u0938\u094d\u0924 \u0939\u094b\u0938\u094d\u091f \u0915\u0930 \u0930\u0939\u093e \u0939\u0948",
    "home.live.join": "\u091c\u0941\u0921\u093c\u0947\u0902",
    "home.po.resume":
      "\u0935\u0939\u0940\u0902 \u0938\u0947 \u0936\u0941\u0930\u0942 \u0915\u0930\u0947\u0902?",
    "home.po.friends":
      "\u0906\u092a\u0915\u0947 {count} \u0932\u094b\u0917 \u092f\u0939\u093e\u0901 \u0939\u0948\u0902\u0964",
    "home.notice.room_ended": "\u092f\u0939 \u0935\u0949\u091a \u092a\u093e\u0930\u094d\u091f\u0940 \u0938\u092e\u093e\u092a\u094d\u0924 \u0939\u094b \u0917\u0908 \u0939\u0948\u0964",
    "home.po.idle":
      "\u090f\u0915 \u0938\u0947\u0935\u093e \u091a\u0941\u0928\u093f\u090f, \u092e\u0948\u0902 \u0930\u0942\u092e \u0924\u0948\u092f\u093e\u0930 \u0915\u0930\u0924\u093e \u0939\u0942\u0901\u0964",
    "home.greeting": "नमस्ते, {name}",
    "home.subtitle.first_time": "अपनी पहली वॉच पार्टी शुरू करें, या कोड से शामिल हों।",
    "home.subtitle.returning": "आपने अब तक {count} वॉच पार्टी होस्ट की हैं।",
    "home.unavailable.title": "रूम अभी उपलब्ध नहीं हैं",
    "home.unavailable.description": "आपके खाते से कनेक्शन तैयार होते ही आपके रूम यहाँ दिखेंगे।",
    "home.continue.eyebrow": "देखना जारी रखें",
    "home.continue.action": "रूम में लौटें",
    "home.create.title": "वॉच पार्टी शुरू करें",
    "home.create.description": "एक निजी रूम बनाएँ और तीन लोगों तक को बुलाएँ।",
    "home.create.name_label": "रूम का नाम",
    "home.create.name_placeholder": "शुक्रवार की फ़िल्म",
    "home.create.action": "रूम बनाएँ",
    "home.create.default_name": "वॉच पार्टी",
    "home.join.title": "कोड से जुड़ें",
    "home.join.description": "होस्ट द्वारा साझा किया गया छह अक्षरों का कोड डालें।",
    "home.join.code_label": "रूम कोड",
    "home.join.action": "रूम में जुड़ें",
    "home.join.not_found": "इस कोड से कोई खुला रूम नहीं मिला।",
    "share.eyebrow": "StreamFlow पर साझा किया गया",
    "share.title_unknown": "देखने के लिए कुछ",
    "share.status.reading": "आपने जो साझा किया, उसे पढ़ा जा रहा है…",
    "share.status.creating": "आपकी वॉच पार्टी बनाई जा रही है…",
    "share.status.created": "आपका रूम तैयार है। आपको वहाँ ले जाया जा रहा है…",
    "share.status.provider_unavailable":
      "{service} यहाँ अभी वॉच पार्टी के लिए उपलब्ध नहीं है, इसलिए कोई रूम नहीं बना।",
    "share.refusal.no_input":
      "कुछ भी साझा नहीं हुआ। अपने ऐप से कोई टाइटल साझा करें या उसका लिंक चिपकाएँ।",
    "share.refusal.not_a_link": "यह किसी टाइटल का लिंक नहीं लगता।",
    "share.refusal.unrecognized_provider":
      "StreamFlow इस सेवा को अभी नहीं पहचानता, इसलिए उसके लिए रूम नहीं बनाया जा सकता।",
    "share.manual_note":
      "टाइटल आप सेवा के अपने ऐप में ही चलाएँगे। StreamFlow सिर्फ़ सबको एक ही पल में प्ले कराने में मदद करता है।",
    "share.kind.movie": "फ़िल्म",
    "share.kind.episode": "एपिसोड",
    "share.kind.series": "सीरीज़",
    "share.kind.video": "वीडियो",
    "share.kind.unknown": "टाइटल",
    "share.room.default_name": "{service} वॉच पार्टी",
    "home.share.eyebrow": "अपने स्ट्रीमिंग ऐप से शुरू करें",
    "home.share.title": "StreamFlow पर कोई टाइटल साझा करें",
    "home.share.description":
      "कुछ देखने को मिल गया? अपने स्ट्रीमिंग ऐप का Share बटन दबाएँ और StreamFlow चुनें। हम रूम बना देंगे — आप दोस्तों को बुला लें।",
    "home.share.step_label": "चरण {number}",
    "home.share.step.one": "फ़िल्म या एपिसोड उसके अपने ऐप में खोलें।",
    "home.share.step.two": "Share दबाएँ और StreamFlow चुनें।",
    "home.share.step.three": "हम रूम बनाते हैं — आप अपने लोगों को बुलाएँ।",
    "home.share.paste_label": "या लिंक चिपकाएँ",
    "home.share.paste_placeholder": "https://…",
    "home.share.paste_action": "रूम शुरू करें",
    "room.now_watching.eyebrow": "साथ में देख रहे हैं",
    "room.now_watching.hosted_by": "होस्ट",
    "room.now_watching.participants": "रूम में",
    "room.now_watching.participant_count": "{capacity} में से {count}",
    "invite.content.watching": "देख रहे हैं",
    "home.invites.title": "निमंत्रण",
    "home.invites.description": "जो लोग आपके उत्तर की प्रतीक्षा कर रहे हैं।",
    "home.live.title": "अभी चल रहा है",
    "home.live.description": "वे रूम जिनमें आप सीधे लौट सकते हैं।",
    "home.live.empty.title": "अभी कुछ नहीं चल रहा",
    "home.live.empty.description": "आपके लाइव रूम यहाँ दिखाई देंगे।",
    "home.settings.title": "सेटिंग्स",
    "home.settings.description": "आवाज़, रूप, भाषा और गोपनीयता — एक ही जगह।",
    "home.settings.action": "सेटिंग्स खोलें",
    "room.stage.hosted_by": "होस्ट: {host}",
    "room.members.seat_waiting": "प्रतीक्षा",
    "room.invite.action": "दोस्तों को बुलाएँ",
    "room.invite.description": "जिनके साथ देखना है उन्हें रूम भेजें।",
    "room.invite.whatsapp": "WhatsApp पर भेजें",
    "room.invite.copy_link": "इनवाइट लिंक कॉपी करें",
    "room.invite.copy_code": "रूम कोड कॉपी करें · {code}",
    "room.details.toggle": "रूम विवरण",
    "room.countdown.launching": "{service} खुल रहा है…",
    "room.countdown.launching_generic": "प्ले दबाने के लिए तैयार हो जाइए।",
    "home.friends.empty.title": "अपने पहले दोस्त को बुलाएँ।",
    "home.friends.empty.description": "साथ में देखना ज़्यादा मज़ेदार होता है।",
    "home.join.prompt": "क्या आपके पास इनवाइट कोड है?",
    "home.recent.title": "हाल के रूम",
    "home.recent.description": "समाप्त हो चुकी वॉच पार्टियाँ।",
    "home.recent.empty.title": "अभी कोई पुराना रूम नहीं",
    "home.recent.empty.description": "समाप्त वॉच पार्टियाँ यहाँ रखी जाती हैं।",
    "home.providers.title": "आपकी सेवाएँ",
    "home.providers.description": "StreamFlow आपके अपने खातों के साथ जिनका समन्वय कर सकता है।",
    "home.providers.empty.title": "अभी कोई सेवा नहीं",
    "home.providers.empty.description": "कैटलॉग उपलब्ध होते ही सेवाएँ यहाँ दिखेंगी।",
    "home.providers.unavailable.title": "सेवा सूची उपलब्ध नहीं",
    "home.providers.unavailable.description": "सेवा कैटलॉग अभी उपलब्ध नहीं है।",
    "home.room.members": "{count} लोग रूम में",
    "home.room.open": "खोलें",
    "home.room.you_host": "आप होस्ट हैं",
    "home.friends.title": "मित्र",
    "home.friends.description": "नियमित साथियों को जोड़ना v1.0 के बाद आएगा।",
    "home.upcoming.title": "निर्धारित पार्टियाँ",
    "home.upcoming.description": "पहले से वॉच पार्टी तय करना v1.0 के बाद आएगा।",
    "invites.title": "निमंत्रण",
    "invites.description": "रूम में शामिल होने के लिए स्वीकार करें, या अस्वीकार करके हटाएँ।",
    "invites.empty.title": "कोई निमंत्रण नहीं",
    "invites.empty.description": "जब कोई आपको बुलाएगा, वह यहाँ दिखेगा।",
    "invite.action.accept": "स्वीकार करें",
    "invite.action.decline": "अस्वीकार करें",
    "invite.expires": "{when} समाप्त",
    "invite.unknown_room": "एक वॉच पार्टी",
    "invite.history.empty.title": "अभी कोई उत्तर नहीं",
    "invite.history.empty.description": "स्वीकार या अस्वीकार किए गए निमंत्रण यहाँ दिखेंगे।",
    "invite.share.title": "लोगों को बुलाएँ",
    "invite.share.description": "लिंक साझा करें या कोड बताएँ। केवल वही लोग जुड़ सकते हैं।",
    "invite.share.code_label": "रूम कोड",
    "invite.share.copy_link": "लिंक कॉपी करें",
    "invite.share.copied": "लिंक कॉपी हो गया।",
    "invite.share.copy_failed": "लिंक कॉपी नहीं हो सका।",
    "invite.share.share": "साझा करें",
    "invite.share.text": "मेरी StreamFlow वॉच पार्टी में शामिल हों।",
    "invite.share.qr_placeholder": "स्कैन करने योग्य कोड बाद के संस्करण में आएगा।",
    "onboarding.progress": "सेटअप प्रगति",
    "onboarding.step_of": "चरण {current} / {total}",
    "onboarding.action.next": "आगे बढ़ें",
    "onboarding.action.back": "पीछे",
    "onboarding.action.skip": "अभी छोड़ें",
    "onboarding.action.finish": "सेटअप पूरा करें",
    "onboarding.welcome.title": "StreamFlow में आपका स्वागत है",
    "onboarding.welcome.description": "थोड़ा सा सेटअप, ताकि पहली वॉच पार्टी आपकी लगे।",
    "onboarding.name.title": "लोग आपको क्या कहें?",
    "onboarding.name.description": "यही नाम रूम में सबको दिखेगा।",
    "onboarding.name.label": "प्रदर्शित नाम",
    "onboarding.name.hint": "आपका हैंडल @{handle} होगा।",
    "onboarding.avatar.title": "अपना चिह्न चुनें",
    "onboarding.avatar.description": "एक तैयार अवतार — अपलोड की ज़रूरत नहीं।",
    "onboarding.language.title": "अपनी भाषा चुनें",
    "onboarding.language.description": "इसे कभी भी सेटिंग्स में बदल सकते हैं।",
    "onboarding.providers.title": "आप कौन-सी सेवाएँ उपयोग करते हैं?",
    "onboarding.providers.description":
      "आपकी पसंद पहले दिखेगी। StreamFlow कभी आपके स्ट्रीमिंग पासवर्ड नहीं माँगता।",
    "onboarding.accessibility.title": "सुविधा सेटिंग्स",
    "onboarding.accessibility.description": "अभी तय करें, या बाद में सेटिंग्स में बदलें।",
    "onboarding.accessibility.hint": "ये तुरंत लागू होती हैं और आपके खाते के साथ चलती हैं।",
    "settings.title": "सेटिंग्स",
    "settings.description": "आपकी प्रोफ़ाइल और StreamFlow का व्यवहार।",
    "settings.unavailable": "प्राथमिकताएँ अभी सहेजी नहीं जा सकतीं, पर इस डिवाइस पर बदलाव लागू हैं।",
    "settings.identity.title": "प्रोफ़ाइल",
    "settings.identity.description": "रूम में आप दूसरों को कैसे दिखते हैं।",
    "settings.identity.display_name": "प्रदर्शित नाम",
    "settings.identity.unnamed": "बिना नाम",
    "settings.appearance.title": "रूप",
    "settings.appearance.theme": "थीम",
    "settings.appearance.compact": "संक्षिप्त रूम लेआउट",
    "settings.notifications.title": "सूचनाएँ",
    "settings.notifications.in_app": "ऐप में अलर्ट",
    "settings.notifications.push": "पुश सूचनाएँ",
    "settings.notifications.email": "ईमेल अपडेट",
    "settings.privacy.title": "गोपनीयता",
    "settings.privacy.presence": "दिखाएँ कि मैं रूम में हूँ",
    "settings.privacy.invites_from_anyone": "कोई भी मुझे बुला सकता है",
    "settings.privacy.analytics": "अनाम उपयोग डेटा साझा करें",
    "settings.language.title": "भाषा",
    "settings.accessibility.title": "सुलभता",
    "settings.accessibility.description": "गति और कंट्रास्ट प्राथमिकताएँ हर जगह लागू होती हैं।",
    "settings.accessibility.reduced_motion": "गति कम करें",
    "settings.accessibility.high_contrast": "उच्च कंट्रास्ट",
    "settings.session.title": "सत्र",
    "onboarding.avatar.preset.aurora": "ऑरोरा",
    "onboarding.avatar.preset.dusk": "डस्क",
    "onboarding.avatar.preset.ember": "एम्बर",
    "onboarding.avatar.preset.forest": "फ़ॉरेस्ट",
    "onboarding.avatar.preset.lagoon": "लैगून",
    "onboarding.avatar.preset.orchid": "ऑर्किड",

    // Milestone F.0 — social foundation.
    "nav.people": "\u0932\u094b\u0917",
    "invite.history.title":
      "\u0909\u0924\u094d\u0924\u0930 \u0926\u093f\u090f \u0917\u090f \u0928\u093f\u092e\u0902\u0924\u094d\u0930\u0923",
    "invite.history.description":
      "\u091c\u093f\u0928 \u0928\u093f\u092e\u0902\u0924\u094d\u0930\u0923\u094b\u0902 \u0915\u094b \u0906\u092a\u0928\u0947 \u0938\u094d\u0935\u0940\u0915\u093e\u0930 \u092f\u093e \u0905\u0938\u094d\u0935\u0940\u0915\u093e\u0930 \u0915\u093f\u092f\u093e, \u092f\u093e \u091c\u094b \u0938\u092e\u093e\u092a\u094d\u0924 \u0939\u094b \u0917\u090f\u0964",
    "invite.status.pending":
      "\u092a\u094d\u0930\u0924\u0940\u0915\u094d\u0937\u093e \u092e\u0947\u0902",
    "invite.status.accepted": "\u0938\u094d\u0935\u0940\u0915\u0943\u0924",
    "invite.status.declined": "\u0905\u0938\u094d\u0935\u0940\u0915\u0943\u0924",
    "invite.status.expired": "\u0938\u092e\u093e\u092a\u094d\u0924",
    "invite.status.revoked": "\u0935\u093e\u092a\u0938 \u0932\u093f\u092f\u093e",
    "social.title": "\u0932\u094b\u0917",
    "social.description":
      "\u091c\u093f\u0928\u0915\u0947 \u0938\u093e\u0925 \u0906\u092a \u0926\u0947\u0916\u0924\u0947 \u0939\u0948\u0902 \u0909\u0928\u094d\u0939\u0947\u0902 \u0922\u0942\u0901\u0922\u0947\u0902, \u0905\u0928\u0941\u0930\u094b\u0927\u094b\u0902 \u0915\u093e \u0909\u0924\u094d\u0924\u0930 \u0926\u0947\u0902, \u0914\u0930 \u0924\u092f \u0915\u0930\u0947\u0902 \u0915\u094c\u0928 \u0906\u092a\u0938\u0947 \u091c\u0941\u0921\u093c \u0938\u0915\u0924\u093e \u0939\u0948\u0964",
    "social.unavailable.title":
      "\u0932\u094b\u0917 \u0905\u092d\u0940 \u0909\u092a\u0932\u092c\u094d\u0927 \u0928\u0939\u0940\u0902 \u0939\u0948",
    "social.unavailable.description":
      "\u0906\u092a\u0915\u0940 \u092e\u093f\u0924\u094d\u0930 \u0938\u0942\u091a\u0940 \u0905\u092d\u0940 \u0928\u0939\u0940\u0902 \u092e\u093f\u0932 \u0930\u0939\u0940\u0964 \u0925\u094b\u0921\u093c\u0940 \u0926\u0947\u0930 \u092c\u093e\u0926 \u092a\u094d\u0930\u092f\u093e\u0938 \u0915\u0930\u0947\u0902\u0964",
    "social.search.title": "\u0932\u094b\u0917 \u0916\u094b\u091c\u0947\u0902",
    "social.search.label":
      "\u0928\u093e\u092e, \u0939\u0948\u0902\u0921\u0932 \u092f\u093e \u092a\u094d\u0930\u094b\u092b\u093c\u093e\u0907\u0932 \u0915\u094b\u0921 \u0938\u0947 \u0916\u094b\u091c\u0947\u0902",
    "social.search.hint":
      "\u0915\u092e \u0938\u0947 \u0915\u092e \u0926\u094b \u0905\u0915\u094d\u0937\u0930 \u0932\u093f\u0916\u0947\u0902\u0964",
    "social.search.loading":
      "\u0916\u094b\u091c\u093e \u091c\u093e \u0930\u0939\u093e \u0939\u0948\u2026",
    "social.search.empty.title":
      "\u0915\u094b\u0908 \u0928\u0939\u0940\u0902 \u092e\u093f\u0932\u093e",
    "social.search.empty.description":
      "\u0935\u0930\u094d\u0924\u0928\u0940 \u091c\u093e\u0901\u091a\u0947\u0902, \u092f\u093e \u0909\u0928\u0915\u093e \u092a\u094d\u0930\u094b\u092b\u093c\u093e\u0907\u0932 \u0915\u094b\u0921 \u092a\u0942\u091b\u0947\u0902\u0964",
    "social.search.error.title":
      "\u0916\u094b\u091c \u0928\u0939\u0940\u0902 \u0939\u094b \u092a\u093e\u0908",
    "social.search.error.description":
      "\u0916\u094b\u091c\u0924\u0947 \u0938\u092e\u092f \u0915\u0941\u091b \u0917\u0921\u093c\u092c\u0921\u093c \u0939\u0941\u0908\u0964 \u092b\u093f\u0930 \u0938\u0947 \u092a\u094d\u0930\u092f\u093e\u0938 \u0915\u0930\u0947\u0902\u0964",
    "social.friends.title": "\u092e\u093f\u0924\u094d\u0930",
    "social.friends.description":
      "\u091c\u093f\u0928\u094d\u0939\u0947\u0902 \u0906\u092a \u090f\u0915 \u091f\u0948\u092a \u092e\u0947\u0902 \u0906\u092e\u0902\u0924\u094d\u0930\u093f\u0924 \u0915\u0930 \u0938\u0915\u0924\u0947 \u0939\u0948\u0902\u0964",
    "social.friends.empty.title":
      "\u0905\u092d\u0940 \u0915\u094b\u0908 \u092e\u093f\u0924\u094d\u0930 \u0928\u0939\u0940\u0902",
    "social.friends.empty.description":
      "\u0915\u093f\u0938\u0940 \u0915\u094b \u0916\u094b\u091c\u0947\u0902 \u0914\u0930 \u092e\u093f\u0924\u094d\u0930 \u0905\u0928\u0941\u0930\u094b\u0927 \u092d\u0947\u091c\u0947\u0902\u0964",
    "social.requests.incoming.title":
      "\u092e\u093f\u0924\u094d\u0930 \u0905\u0928\u0941\u0930\u094b\u0927",
    "social.requests.incoming.description":
      "\u091c\u094b \u0906\u092a\u0915\u0947 \u0938\u093e\u0925 \u0926\u0947\u0916\u0928\u093e \u091a\u093e\u0939\u0924\u0947 \u0939\u0948\u0902\u0964",
    "social.requests.incoming.empty.title":
      "\u0915\u094b\u0908 \u0905\u0928\u0941\u0930\u094b\u0927 \u0928\u0939\u0940\u0902",
    "social.requests.incoming.empty.description":
      "\u0928\u090f \u092e\u093f\u0924\u094d\u0930 \u0905\u0928\u0941\u0930\u094b\u0927 \u092f\u0939\u093e\u0901 \u0926\u093f\u0916\u0947\u0902\u0917\u0947\u0964",
    "social.requests.outgoing.title":
      "\u0906\u092a\u0915\u0947 \u092d\u0947\u091c\u0947 \u0905\u0928\u0941\u0930\u094b\u0927",
    "social.requests.outgoing.description":
      "\u0909\u0924\u094d\u0924\u0930 \u0915\u0940 \u092a\u094d\u0930\u0924\u0940\u0915\u094d\u0937\u093e \u0939\u0948\u0964",
    "social.requests.outgoing.empty.title":
      "\u0915\u0941\u091b \u0932\u0902\u092c\u093f\u0924 \u0928\u0939\u0940\u0902",
    "social.requests.outgoing.empty.description":
      "\u0906\u092a\u0915\u0947 \u092d\u0947\u091c\u0947 \u0905\u0928\u0941\u0930\u094b\u0927 \u0909\u0924\u094d\u0924\u0930 \u092e\u093f\u0932\u0928\u0947 \u0924\u0915 \u092f\u0939\u093e\u0901 \u0926\u093f\u0916\u0947\u0902\u0917\u0947\u0964",
    "social.blocked.title": "\u0905\u0935\u0930\u0941\u0926\u094d\u0927",
    "social.blocked.description":
      "\u092f\u0947 \u0932\u094b\u0917 \u0906\u092a\u0915\u094b \u0928 \u0922\u0942\u0901\u0922 \u0938\u0915\u0924\u0947 \u0939\u0948\u0902, \u0928 \u0906\u092e\u0902\u0924\u094d\u0930\u093f\u0924 \u0915\u0930 \u0938\u0915\u0924\u0947 \u0939\u0948\u0902\u0964",
    "social.blocked.empty.title":
      "\u0915\u094b\u0908 \u0905\u0935\u0930\u0941\u0926\u094d\u0927 \u0928\u0939\u0940\u0902",
    "social.blocked.empty.description":
      "\u0906\u092a\u0915\u0947 \u0905\u0935\u0930\u0941\u0926\u094d\u0927 \u0915\u093f\u090f \u0932\u094b\u0917 \u092f\u0939\u093e\u0901 \u0926\u093f\u0916\u0947\u0902\u0917\u0947\u0964",
    "social.partners.title": "\u0939\u093e\u0932 \u0915\u0947 \u0938\u093e\u0925\u0940",
    "social.partners.description":
      "\u091c\u093f\u0928\u0915\u0947 \u0938\u093e\u0925 \u0906\u092a\u0928\u0947 \u0939\u093e\u0932 \u0939\u0940 \u092e\u0947\u0902 \u0926\u0947\u0916\u093e\u0964",
    "social.partners.empty.title":
      "\u0905\u092d\u0940 \u0915\u094b\u0908 \u0938\u093e\u0925\u0940 \u0928\u0939\u0940\u0902",
    "social.partners.empty.description":
      "\u0938\u093e\u0925 \u092e\u0947\u0902 \u0915\u0941\u091b \u0926\u0947\u0916\u0928\u0947 \u0915\u0947 \u092c\u093e\u0926 \u0935\u0947 \u092f\u0939\u093e\u0901 \u0926\u093f\u0916\u0947\u0902\u0917\u0947\u0964",
    "social.partners.meta_one":
      "{count} \u092c\u093e\u0930 \u0938\u093e\u0925 \u0926\u0947\u0916\u093e",
    "social.partners.meta_other":
      "{count} \u092c\u093e\u0930 \u0938\u093e\u0925 \u0926\u0947\u0916\u093e",
    "social.profile.loading":
      "\u092a\u094d\u0930\u094b\u092b\u093c\u093e\u0907\u0932 \u0932\u094b\u0921 \u0939\u094b \u0930\u0939\u0940 \u0939\u0948\u2026",
    "social.profile.missing.title":
      "\u092a\u094d\u0930\u094b\u092b\u093c\u093e\u0907\u0932 \u0909\u092a\u0932\u092c\u094d\u0927 \u0928\u0939\u0940\u0902",
    "social.profile.missing.description":
      "\u092f\u0939 \u092a\u094d\u0930\u094b\u092b\u093c\u093e\u0907\u0932 \u0905\u092d\u0940 \u0928\u0939\u0940\u0902 \u0926\u093f\u0916\u093e\u0908 \u091c\u093e \u0938\u0915\u0924\u0940\u0964",
    "social.status.friends": "\u092e\u093f\u0924\u094d\u0930",
    "social.status.requested": "\u0905\u0928\u0941\u0930\u094b\u0927 \u092d\u0947\u091c\u093e",
    "social.action.add_friend": "\u092e\u093f\u0924\u094d\u0930 \u092c\u0928\u093e\u090f\u0901",
    "social.action.accept": "\u0938\u094d\u0935\u0940\u0915\u093e\u0930\u0947\u0902",
    "social.action.decline": "\u0905\u0938\u094d\u0935\u0940\u0915\u093e\u0930\u0947\u0902",
    "social.action.cancel_request": "\u0930\u0926\u094d\u0926 \u0915\u0930\u0947\u0902",
    "social.action.remove": "\u0939\u091f\u093e\u090f\u0901",
    "social.action.block": "\u0905\u0935\u0930\u0941\u0926\u094d\u0927 \u0915\u0930\u0947\u0902",
    "social.action.unblock":
      "\u0905\u0928\u0935\u0930\u0941\u0926\u094d\u0927 \u0915\u0930\u0947\u0902",
    "social.action.invite":
      "\u0906\u092e\u0902\u0924\u094d\u0930\u093f\u0924 \u0915\u0930\u0947\u0902",
    "social.action.see_all": "\u0938\u092d\u0940 \u0926\u0947\u0916\u0947\u0902",
    "social.action.find_people": "\u0932\u094b\u0917 \u0916\u094b\u091c\u0947\u0902",

    "voice.panel.title": "\u0935\u0949\u0907\u0938",
    "voice.panel.subtitle":
      "\u0926\u0947\u0916\u0924\u0947 \u0939\u0941\u090f \u092c\u093e\u0924 \u0915\u0930\u0947\u0902\u0964",
    "voice.panel.count": "\u0915\u0949\u0932 \u092a\u0930 {count}",
    "voice.panel.roster_label":
      "\u0935\u0949\u0907\u0938 \u0915\u0949\u0932 \u092a\u0930 \u0932\u094b\u0917",
    "voice.panel.you": "\u0906\u092a",
    "voice.unavailable":
      "\u0907\u0938 \u0921\u093f\u0935\u093e\u0907\u0938 \u092a\u0930 \u0935\u0949\u0907\u0938 \u0909\u092a\u0932\u092c\u094d\u0927 \u0928\u0939\u0940\u0902 \u0939\u0948\u0964",
    "voice.action.join":
      "\u0935\u0949\u0907\u0938 \u091c\u0949\u0907\u0928 \u0915\u0930\u0947\u0902",
    "voice.action.leave": "\u0935\u0949\u0907\u0938 \u091b\u094b\u0921\u093c\u0947\u0902",
    "voice.action.mute": "\u092e\u094d\u092f\u0942\u091f",
    "voice.action.unmute": "\u0905\u0928\u092e\u094d\u092f\u0942\u091f",
    "voice.action.deafen": "\u0938\u092c \u092c\u0902\u0926 \u0915\u0930\u0947\u0902",
    "voice.action.undeafen":
      "\u0938\u0941\u0928\u0928\u093e \u0936\u0941\u0930\u0942 \u0915\u0930\u0947\u0902",
    "voice.action.reconnect":
      "\u092b\u093f\u0930 \u0915\u094b\u0936\u093f\u0936 \u0915\u0930\u0947\u0902",
    "voice.state.unavailable":
      "\u0935\u0949\u0907\u0938 \u0909\u092a\u0932\u092c\u094d\u0927 \u0928\u0939\u0940\u0902",
    "voice.state.idle": "\u0915\u0949\u0932 \u092a\u0930 \u0928\u0939\u0940\u0902",
    "voice.state.connecting":
      "\u091c\u0941\u0921\u093c \u0930\u0939\u0947 \u0939\u0948\u0902\u2026",
    "voice.state.connected": "\u091c\u0941\u0921\u093c \u0917\u090f",
    "voice.state.reconnecting":
      "\u092b\u093f\u0930 \u0938\u0947 \u091c\u0941\u0921\u093c \u0930\u0939\u0947 \u0939\u0948\u0902\u2026",
    "voice.state.error": "\u0935\u0949\u0907\u0938 \u0915\u091f \u0917\u092f\u093e",
    "voice.quality.excellent":
      "\u092c\u0939\u0941\u0924 \u0905\u091a\u094d\u091b\u093e \u0915\u0928\u0947\u0915\u094d\u0936\u0928",
    "voice.quality.good":
      "\u0905\u091a\u094d\u091b\u093e \u0915\u0928\u0947\u0915\u094d\u0936\u0928",
    "voice.quality.poor":
      "\u0915\u092e\u091c\u094b\u0930 \u0915\u0928\u0947\u0915\u094d\u0936\u0928",
    "voice.quality.unknown":
      "\u091c\u093e\u0902\u091a \u0939\u094b \u0930\u0939\u0940 \u0939\u0948",
    "voice.error.not_configured":
      "\u0907\u0938 \u0930\u0942\u092e \u0915\u0947 \u0932\u093f\u090f \u0935\u0949\u0907\u0938 \u0905\u092d\u0940 \u0938\u0947\u091f \u0928\u0939\u0940\u0902 \u0939\u0948\u0964",
    "voice.error.unauthenticated":
      "\u0935\u0949\u0907\u0938 \u091c\u0949\u0907\u0928 \u0915\u0930\u0928\u0947 \u0915\u0947 \u0932\u093f\u090f \u092b\u093f\u0930 \u0938\u0947 \u0938\u093e\u0907\u0928 \u0907\u0928 \u0915\u0930\u0947\u0902\u0964",
    "voice.error.connect_failed":
      "\u0935\u0949\u0907\u0938 \u091c\u0949\u0907\u0928 \u0928\u0939\u0940\u0902 \u0939\u094b \u092a\u093e\u092f\u093e\u0964 \u092e\u093e\u0907\u0915 \u091c\u093e\u0901\u091a\u0915\u0930 \u092b\u093f\u0930 \u0915\u094b\u0936\u093f\u0936 \u0915\u0930\u0947\u0902\u0964",
    "voice.member.absent": "\u0915\u0949\u0932 \u092a\u0930 \u0928\u0939\u0940\u0902",
    "voice.member.listening": "\u0915\u0949\u0932 \u092a\u0930",
    "voice.member.speaking": "\u092c\u094b\u0932 \u0930\u0939\u0947 \u0939\u0948\u0902",
    "voice.member.muted": "\u092e\u094d\u092f\u0942\u091f",
    "watch_party.region_label": "\u0935\u0949\u091a \u092a\u093e\u0930\u094d\u091f\u0940",
    "watch_party.eyebrow":
      "\u0938\u093e\u0925 \u0926\u0947\u0916 \u0930\u0939\u0947 \u0939\u0948\u0902",
    "watch_party.watching_on": "{provider} \u092a\u0930",
    "watch_party.no_provider":
      "\u0915\u094b\u0908 \u0938\u0947\u0935\u093e \u0928\u0939\u0940\u0902 \u091a\u0941\u0928\u0940 \u0917\u0908",
    "watch_party.elapsed.label":
      "\u0915\u092c \u0938\u0947 \u0926\u0947\u0916 \u0930\u0939\u0947 \u0939\u0948\u0902",
    "watch_party.elapsed.hint":
      "\u091c\u092c \u0930\u0942\u092e \u0928\u0947 \u0938\u093e\u0925 \u0936\u0941\u0930\u0942 \u0915\u093f\u092f\u093e, \u0924\u092c \u0938\u0947\u0964",
    "watch_party.manual_reminder.title":
      "\u092a\u094d\u0932\u0947\u092f\u0930 \u0906\u092a\u0915\u0947 \u0939\u093e\u0925 \u092e\u0947\u0902 \u0939\u0948",
    "watch_party.manual_reminder.body":
      "StreamFlow \u0938\u092c\u0915\u094b \u090f\u0915 \u0938\u093e\u0925 \u0930\u0916\u0924\u093e \u0939\u0948\u0964 \u092a\u094d\u0932\u0947, \u092a\u0949\u091c \u0914\u0930 \u0938\u0940\u0915 \u0906\u092a\u0915\u0947 \u0910\u092a \u092e\u0947\u0902 \u0939\u0940 \u0930\u0939\u0924\u0947 \u0939\u0948\u0902\u0964",
    "watch_party.status.title":
      "\u090f\u0915 \u0938\u093e\u0925 \u092c\u0928\u0947 \u0930\u0939\u0928\u093e",
    "watch_party.status.resync":
      "\u092b\u093f\u0930 \u0938\u0947 \u0938\u093f\u0902\u0915 \u0915\u0930\u0947\u0902",
    "watch_party.status.in_sync": "\u0938\u093f\u0902\u0915 \u092e\u0947\u0902",
    "watch_party.status.out_of_sync": "\u092a\u0940\u091b\u0947",
    "watch_party.status.unmeasured": "\u0905\u0928\u092e\u093e\u092a\u093e",
    "watch_party.leave.title": "\u0930\u0942\u092e \u091b\u094b\u0921\u093c\u0947\u0902",
    "watch_party.leave.body":
      "\u0906\u092a \u0915\u0949\u0932 \u0938\u0947 \u092d\u0940 \u092c\u093e\u0939\u0930 \u0939\u094b \u091c\u093e\u090f\u0902\u0917\u0947\u0964",
    "watch_party.leave.action": "\u0930\u0942\u092e \u091b\u094b\u0921\u093c\u0947\u0902",
    "settings.voice.title": "\u0935\u0949\u0907\u0938",
    "settings.voice.description":
      "\u0921\u093f\u0935\u093e\u0907\u0938 \u0915\u0940 \u092a\u0938\u0902\u0926 \u0907\u0938\u0940 \u0921\u093f\u0935\u093e\u0907\u0938 \u092a\u0930 \u0930\u0939\u0924\u0940 \u0939\u0948\u0964",
    "settings.voice.input_device": "\u092e\u093e\u0907\u0915",
    "settings.voice.output_device": "\u0938\u094d\u092a\u0940\u0915\u0930",
    "settings.voice.device_default":
      "\u0938\u093f\u0938\u094d\u091f\u092e \u0921\u093f\u092b\u093c\u0949\u0932\u094d\u091f",
    "settings.voice.device_unnamed":
      "\u092c\u093f\u0928\u093e \u0928\u093e\u092e \u0915\u093e \u0921\u093f\u0935\u093e\u0907\u0938",
    "settings.voice.permission_hint":
      "\u0928\u093e\u092e \u0926\u0947\u0916\u0928\u0947 \u0915\u0947 \u0932\u093f\u090f \u092e\u093e\u0907\u0915 \u0915\u0940 \u0905\u0928\u0941\u092e\u0924\u093f \u0926\u0947\u0902\u0964",
    "settings.voice.auto_join":
      "\u0905\u092a\u0928\u0947 \u0906\u092a \u0935\u0949\u0907\u0938 \u091c\u0949\u0907\u0928 \u0915\u0930\u0947\u0902",
    "settings.voice.join_muted":
      "\u092e\u094d\u092f\u0942\u091f \u0915\u0947 \u0938\u093e\u0925 \u091c\u0941\u0921\u093c\u0947\u0902",
    "settings.voice.voice_activity":
      "\u0906\u0935\u093e\u091c\u093c \u092a\u0930 \u0916\u0941\u0932\u0947",
    "settings.voice.voice_activity_hint":
      "\u092c\u094b\u0932\u0928\u0947 \u092a\u0930 \u092e\u093e\u0907\u0915 \u0916\u0941\u0932 \u091c\u093e\u0924\u093e \u0939\u0948\u0964",
    "settings.voice.push_to_talk": "\u092a\u0941\u0936 \u091f\u0942 \u091f\u0949\u0915",
    "settings.voice.noise_suppression": "\u0936\u094b\u0930 \u0915\u092e \u0915\u0930\u0928\u093e",
    "settings.voice.echo_cancellation": "\u0907\u0915\u094b \u0939\u091f\u093e\u0928\u093e",
    "settings.voice.coming_soon": "\u091c\u0932\u094d\u0926 \u0906 \u0930\u0939\u093e \u0939\u0948",
    "po.banner.listening":
      "Po \u0930\u0942\u092e \u0915\u0947 \u0938\u093e\u0925 \u0938\u0941\u0928 \u0930\u0939\u093e \u0939\u0948\u0964",
    "po.banner.watching":
      "Po \u0938\u092c\u0915\u0947 \u0938\u093e\u0925 \u0926\u0947\u0916 \u0930\u0939\u093e \u0939\u0948\u0964",
    "po.banner.sleeping":
      "\u0930\u0942\u092e \u0936\u093e\u0902\u0924 \u0939\u0948, Po \u0938\u094b \u0917\u092f\u093e\u0964",

    // Milestone H1 — Po brain replies.
    "po.console.title": "\u092a\u094b",
    "po.console.subtitle":
      "\u0930\u0942\u092e \u0938\u0947\u091f \u0915\u0930\u0928\u0947 \u0915\u0947 \u0932\u093f\u090f \u092a\u094b \u0938\u0947 \u0915\u0939\u0947\u0902\u0964",
    "po.console.placeholder":
      "\u092a\u094b \u0915\u094b \u092c\u0924\u093e\u090f\u0901 \u0906\u092a\u0915\u094b \u0915\u094d\u092f\u093e \u091a\u093e\u0939\u093f\u090f",
    "po.console.send": "\u092d\u0947\u091c\u0947\u0902",
    "po.console.open": "\u092a\u094b \u0916\u094b\u0932\u0947\u0902",
    "po.console.close": "\u092a\u094b \u092c\u0902\u0926 \u0915\u0930\u0947\u0902",
    "po.console.empty":
      "\u0906\u091c\u093c\u092e\u093e\u090f\u0901: \u201c\u092e\u0942\u0935\u0940 \u0928\u093e\u0907\u091f \u0928\u093e\u092e \u0915\u093e \u0930\u0942\u092e \u092c\u0928\u093e\u0913\u201d\u0964",
    "po.console.thinking":
      "\u092a\u094b \u0915\u093e\u092e \u0915\u0930 \u0930\u0939\u093e \u0939\u0948\u0964",
    "po.console.unavailable":
      "\u092a\u094b \u0905\u092d\u0940 \u0909\u092a\u0932\u092c\u094d\u0927 \u0928\u0939\u0940\u0902 \u0939\u0948\u0964",
    "po.console.yes": "\u0939\u093e\u0901",
    "po.console.no": "\u0928\u0939\u0940\u0902",

    "po.console.planning":
      "\u0915\u0926\u092e \u0924\u092f \u0915\u0930 \u0930\u0939\u093e \u0939\u0942\u0901\u0964",
    "po.console.executing":
      "\u0905\u092d\u0940 \u0915\u0930 \u0930\u0939\u093e \u0939\u0942\u0901\u0964",
    "po.ask.which_person":
      "{names} \u0926\u094b\u0928\u094b\u0902 {term} \u0938\u0947 \u092e\u093f\u0932\u0924\u0947 \u0939\u0948\u0902\u0964 \u0915\u094c\u0928 \u0938\u093e?",
    "po.ask.which_invite":
      "\u0906\u092a\u0915\u0947 \u092a\u093e\u0938 {rooms} \u0915\u0947 \u0928\u094d\u092f\u094b\u0924\u0947 \u0939\u0948\u0902\u0964 \u0915\u094c\u0928 \u0938\u093e?",
    "po.next.invite_friends":
      "\u0915\u093f\u0938\u0940 \u0915\u094b \u092c\u0941\u0932\u093e\u0928\u093e \u0939\u0948?",
    "po.next.countdown":
      "\u0924\u0948\u092f\u093e\u0930 \u0939\u094b\u0902 \u0924\u094b \u0915\u093e\u0909\u0902\u091f\u0921\u093e\u0909\u0928 \u0936\u0941\u0930\u0942 \u0915\u0930\u0947\u0902\u0964",
    "po.next.ready_check":
      "\u0938\u092c\u0915\u0947 \u0916\u094b\u0932\u0928\u0947 \u092a\u0930 \u0930\u0947\u0921\u0940 \u0915\u0930\u0947\u0902\u0964",
    "po.next.press_play":
      "\u091c\u093c\u0940\u0930\u094b \u092a\u0930 \u0938\u092c \u092a\u094d\u0932\u0947 \u0926\u092c\u093e\u090f\u0902\u0964",
    "po.next.join_voice":
      "\u092c\u093e\u0924 \u0915\u0930\u0928\u0940 \u0939\u094b \u0924\u094b \u0935\u0949\u092f\u0938 \u091c\u094b\u0921\u093c\u0947\u0902\u0964",
    "po.next.invite_when_ready":
      "\u0938\u094d\u0935\u0940\u0915\u093e\u0930 \u0915\u0930\u0928\u0947 \u092a\u0930 \u0906\u092a \u0909\u0928\u094d\u0939\u0947\u0902 \u092c\u0941\u0932\u093e \u0938\u0915\u0924\u0947 \u0939\u0948\u0902\u0964",
    "po.refuse.already_friends":
      "{name} \u092a\u0939\u0932\u0947 \u0938\u0947 \u0906\u092a\u0915\u0947 \u0926\u094b\u0938\u094d\u0924 \u0939\u0948\u0902\u0964",
    "po.refuse.already_there": "\u0906\u092a \u0935\u0939\u0940\u0902 \u0939\u0948\u0902\u0964",
    "po.refuse.memory_known":
      "\u092f\u0939 \u092e\u0941\u091d\u0947 \u092f\u093e\u0926 \u0939\u0948\u0964",
    "po.ask.repeat":
      "\u092e\u0948\u0902 \u0938\u092e\u091d \u0928\u0939\u0940\u0902 \u092a\u093e\u092f\u093e\u0964 \u092b\u093f\u0930 \u0938\u0947 \u0915\u0939\u0947\u0902?",
    "po.ask.room_name":
      "\u0930\u0942\u092e \u0915\u093e \u0928\u093e\u092e \u0915\u094d\u092f\u093e \u0930\u0916\u0947\u0902?",
    "po.ask.room_code":
      "\u0930\u0942\u092e \u0915\u094b\u0921 \u0915\u094d\u092f\u093e \u0939\u0948?",
    "po.ask.person":
      "\u0906\u092a \u0915\u093f\u0938\u0915\u0940 \u092c\u093e\u0924 \u0915\u0930 \u0930\u0939\u0947 \u0939\u0948\u0902?",
    "po.ask.seconds":
      "\u0915\u093e\u0909\u0902\u091f\u0921\u093e\u0909\u0928 \u0915\u093f\u0924\u0928\u0947 \u0938\u0947\u0915\u0902\u0921 \u0915\u093e \u0939\u094b?",
    "po.ask.provider":
      "\u0930\u0942\u092e \u0915\u094c\u0928 \u0938\u0940 \u0938\u0947\u0935\u093e \u0907\u0938\u094d\u0924\u0947\u092e\u093e\u0932 \u0915\u0930\u0947?",
    "po.ask.setting_field":
      "\u0906\u092a \u0915\u094c\u0928 \u0938\u0940 \u0938\u0947\u091f\u093f\u0902\u0917 \u0915\u0940 \u092c\u093e\u0924 \u0915\u0930 \u0930\u0939\u0947 \u0939\u0948\u0902?",
    "po.ask.setting_value":
      "\u0907\u0938\u0947 \u091a\u093e\u0932\u0942 \u0915\u0930\u0942\u0901 \u092f\u093e \u092c\u0902\u0926?",
    "po.ask.note":
      "\u092e\u0948\u0902 \u0915\u094d\u092f\u093e \u092f\u093e\u0926 \u0930\u0916\u0942\u0901?",
    "po.ask.destination":
      "\u0906\u092a \u0915\u0939\u093e\u0901 \u091c\u093e\u0928\u093e \u091a\u093e\u0939\u0924\u0947 \u0939\u0948\u0902?",

    "po.plan.room_leave.confirm":
      "\u092f\u0939 \u0930\u0942\u092e \u091b\u094b\u0921\u093c \u0926\u0942\u0901?",
    "po.plan.room_close.confirm":
      "\u0938\u092c\u0915\u0947 \u0932\u093f\u090f \u0930\u0942\u092e \u092c\u0902\u0926 \u0915\u0930 \u0926\u0942\u0901?",
    "po.plan.countdown_start.confirm":
      "{seconds} \u0938\u0947\u0915\u0902\u0921 \u0915\u093e \u0915\u093e\u0909\u0902\u091f\u0921\u093e\u0909\u0928 \u0936\u0941\u0930\u0942 \u0915\u0930\u0942\u0901?",

    "po.done.generic": "\u0939\u094b \u0917\u092f\u093e\u0964",
    "po.done.cancelled": "\u0930\u0926\u094d\u0926 \u0915\u0930 \u0926\u093f\u092f\u093e\u0964",
    "po.done.room_created":
      "{roomName} \u092c\u0928 \u0917\u092f\u093e\u0964 \u0915\u094b\u0921 {roomCode} \u0939\u0948\u0964",
    "po.done.room_joined": "\u0906\u092a {roomName} \u092e\u0947\u0902 \u0939\u0948\u0902\u0964",
    "po.done.room_left":
      "\u0906\u092a\u0928\u0947 {roomName} \u091b\u094b\u0921\u093c \u0926\u093f\u092f\u093e\u0964",
    "po.done.room_closed":
      "{roomName} \u0938\u092c\u0915\u0947 \u0932\u093f\u090f \u092c\u0902\u0926 \u0939\u0948\u0964",
    "po.done.ready_set":
      "\u0906\u092a\u0915\u094b \u0924\u0948\u092f\u093e\u0930 \u092e\u093e\u0930\u094d\u0915 \u0915\u0930 \u0926\u093f\u092f\u093e\u0964",
    "po.done.invited":
      "{displayName} \u0915\u094b {roomName} \u092e\u0947\u0902 \u092c\u0941\u0932\u093e\u092f\u093e\u0964",
    "po.done.invite_accepted":
      "\u0938\u094d\u0935\u0940\u0915\u093e\u0930 \u0915\u093f\u092f\u093e\u0964",
    "po.done.invite_declined":
      "\u0905\u0938\u094d\u0935\u0940\u0915\u093e\u0930 \u0915\u093f\u092f\u093e\u0964",
    "po.done.countdown_set":
      "\u0915\u093e\u0909\u0902\u091f\u0921\u093e\u0909\u0928 {seconds} \u0938\u0947\u0915\u0902\u0921 \u0915\u093e\u0964",
    "po.done.countdown_started":
      "{seconds} \u0938\u0947 \u0917\u093f\u0928\u0924\u0940 \u0936\u0941\u0930\u0942\u0964",
    "po.done.countdown_cancelled":
      "\u0915\u093e\u0909\u0902\u091f\u0921\u093e\u0909\u0928 \u0930\u0926\u094d\u0926\u0964",
    "po.done.provider_selected":
      "\u0930\u0942\u092e {name} \u092a\u0930 \u0938\u0947\u091f \u0939\u0948\u0964",
    "po.done.voice_joined":
      "\u0906\u092a \u0935\u0949\u092f\u0938 \u092e\u0947\u0902 \u0939\u0948\u0902\u0964",
    "po.done.voice_left":
      "\u0906\u092a\u0928\u0947 \u0935\u0949\u092f\u0938 \u091b\u094b\u0921\u093c\u093e\u0964",
    "po.done.muted": "\u092e\u093e\u0907\u0915 \u092e\u094d\u092f\u0942\u091f\u0964",
    "po.done.unmuted": "\u092e\u093e\u0907\u0915 \u091a\u093e\u0932\u0942\u0964",
    "po.done.resynced":
      "\u092b\u093f\u0930 \u0938\u0947 \u092e\u093e\u092a\u093e\u0964 \u0938\u093f\u0902\u0915: {health}\u0964",
    "po.done.friend_requested":
      "{displayName} \u0915\u094b \u0905\u0928\u0941\u0930\u094b\u0927 \u092d\u0947\u091c\u093e\u0964",
    "po.done.setting_changed": "{field} \u0905\u092c {enabled} \u0939\u0948\u0964",
    "po.done.remembered":
      "\u092e\u0948\u0902 \u092f\u093e\u0926 \u0930\u0916\u0942\u0901\u0917\u093e\u0964",
    "po.done.forgotten": "\u092d\u0942\u0932 \u0917\u092f\u093e\u0964",
    "po.done.navigated":
      "{destination} \u0916\u094b\u0932 \u0930\u0939\u093e \u0939\u0942\u0901\u0964",

    "po.answer.overview":
      "{liveRoomCount} \u0932\u093e\u0907\u0935 \u0930\u0942\u092e, {pendingInviteCount} \u0928\u094d\u092f\u094b\u0924\u0947\u0964",
    "po.answer.room_status":
      "{roomName}: {memberCount} \u092e\u094c\u091c\u0942\u0926, {readyCount} \u0924\u0948\u092f\u093e\u0930, \u0915\u093e\u0909\u0902\u091f\u0921\u093e\u0909\u0928 {countdownSeconds}s\u0964",
    "po.answer.recent_rooms": "\u0939\u093e\u0932 \u0915\u0947 \u0930\u0942\u092e: {names}\u0964",
    "po.answer.pending_invites":
      "\u0906\u092a\u0915\u0947 \u092a\u093e\u0938 {count} \u0928\u094d\u092f\u094b\u0924\u0947 \u0939\u0948\u0902\u0964",
    "po.answer.providers":
      "\u092f\u0939\u093e\u0901 {count} \u0938\u0947\u0935\u093e\u090f\u0901 \u091a\u0941\u0928\u0940 \u091c\u093e \u0938\u0915\u0924\u0940 \u0939\u0948\u0902\u0964",
    "po.answer.sync": "\u0938\u093f\u0902\u0915: {health}\u0964",
    "po.answer.friends":
      "{friendCount} \u092e\u093f\u0924\u094d\u0930, {incomingCount} \u0905\u0928\u0941\u0930\u094b\u0927\u0964",
    "po.answer.partners":
      "\u0906\u092a \u0905\u0915\u094d\u0938\u0930 {names} \u0915\u0947 \u0938\u093e\u0925 \u0926\u0947\u0916\u0924\u0947 \u0939\u0948\u0902\u0964",
    "po.answer.search": "{count} \u092e\u093f\u0932\u0947: {names}\u0964",
    "po.answer.settings":
      "\u0911\u091f\u094b-\u091c\u0949\u0907\u0928 {voiceAutoJoin}, \u092e\u094d\u092f\u0942\u091f \u091c\u0949\u0907\u0928 {voiceJoinMuted}, \u092e\u0947\u092e\u0930\u0940 {poMemoryOptIn}\u0964",
    "po.answer.memories":
      "\u092e\u0941\u091d\u0947 {count} \u092c\u093e\u0924\u0947\u0902 \u092f\u093e\u0926 \u0939\u0948\u0902: {summaries}\u0964",
    "po.answer.capabilities":
      "\u092e\u0948\u0902 \u0930\u0942\u092e, \u0928\u094d\u092f\u094b\u0924\u0947, \u0915\u093e\u0909\u0902\u091f\u0921\u093e\u0909\u0928, \u0935\u0949\u092f\u0938 \u0914\u0930 \u0938\u0947\u091f\u093f\u0902\u0917\u094d\u0938 \u0938\u0902\u092d\u093e\u0932 \u0938\u0915\u0924\u093e \u0939\u0942\u0901 \u2014 \u0915\u0941\u0932 {toolCount}\u0964",

    "po.refuse.unknown":
      "\u092f\u0939 \u092e\u0948\u0902 \u0905\u092d\u0940 \u0928\u0939\u0940\u0902 \u0915\u0930 \u0938\u0915\u0924\u093e\u0964",
    "po.refuse.signed_out":
      "\u092a\u0939\u0932\u0947 \u0938\u093e\u0907\u0928 \u0907\u0928 \u0915\u0930\u0947\u0902\u0964",
    "po.refuse.no_room":
      "\u0906\u092a \u0905\u092d\u0940 \u0915\u093f\u0938\u0940 \u0930\u0942\u092e \u092e\u0947\u0902 \u0928\u0939\u0940\u0902 \u0939\u0948\u0902\u0964",
    "po.refuse.host_only":
      "\u092f\u0939 \u0915\u0947\u0935\u0932 \u0939\u094b\u0938\u094d\u091f \u0915\u0930 \u0938\u0915\u0924\u093e \u0939\u0948\u0964",
    "po.refuse.person_unknown":
      "{term} \u0928\u093e\u092e \u0915\u093e \u0915\u094b\u0908 \u0928\u0939\u0940\u0902 \u092e\u093f\u0932\u093e\u0964",
    "po.refuse.person_ambiguous":
      "{term} \u0938\u0947 \u090f\u0915 \u0938\u0947 \u091c\u093c\u094d\u092f\u093e\u0926\u093e \u0932\u094b\u0917 \u092e\u093f\u0932\u0924\u0947 \u0939\u0948\u0902\u0964 \u0915\u094c\u0928 \u0938\u093e?",
    "po.refuse.no_invites":
      "\u0915\u094b\u0908 \u0928\u094d\u092f\u094b\u0924\u093e \u0932\u0902\u092c\u093f\u0924 \u0928\u0939\u0940\u0902 \u0939\u0948\u0964",
    "po.refuse.invite_ambiguous":
      "\u0906\u092a\u0915\u0947 \u092a\u093e\u0938 {count} \u0928\u094d\u092f\u094b\u0924\u0947 \u0939\u0948\u0902\u0964 \u0928\u094d\u092f\u094b\u0924\u0947 \u0938\u094d\u0915\u094d\u0930\u0940\u0928 \u0938\u0947 \u091a\u0941\u0928\u0947\u0902\u0964",
    "po.refuse.no_provider":
      "\u092a\u0939\u0932\u0947 \u0930\u0942\u092e \u0915\u0947 \u0932\u093f\u090f \u0938\u0947\u0935\u093e \u091a\u0941\u0928\u0947\u0902\u0964",
    "po.refuse.sync_not_ready":
      "\u0938\u093f\u0902\u0915 \u0905\u092d\u0940 \u0938\u094d\u0925\u093f\u0930 \u0928\u0939\u0940\u0902 \u0939\u0941\u0906\u0964",
    "po.refuse.providers_unavailable":
      "\u0938\u0947\u0935\u093e \u0938\u0942\u091a\u0940 \u0905\u092d\u0940 \u0928\u0939\u0940\u0902 \u092a\u095d \u092a\u093e \u0930\u0939\u093e\u0964",
    "po.refuse.provider_unknown":
      "{name} \u0928\u093e\u092e \u0915\u0940 \u0938\u0947\u0935\u093e \u092e\u0941\u091d\u0947 \u0928\u0939\u0940\u0902 \u092a\u0924\u093e\u0964",
    "po.refuse.provider_blocked":
      "{name} \u092f\u0939\u093e\u0901 \u0907\u0938\u094d\u0924\u0947\u092e\u093e\u0932 \u0928\u0939\u0940\u0902 \u0939\u094b \u0938\u0915\u0924\u0940\u0964",
    "po.refuse.provider_blocked_generic":
      "\u0935\u0939 \u0938\u0947\u0935\u093e \u092f\u0939\u093e\u0901 \u0907\u0938\u094d\u0924\u0947\u092e\u093e\u0932 \u0928\u0939\u0940\u0902 \u0939\u094b \u0938\u0915\u0924\u0940\u0964",
    "po.refuse.setting_unknown":
      "\u092e\u0948\u0902 {field} \u0928\u0939\u0940\u0902 \u092c\u0926\u0932 \u0938\u0915\u0924\u093e\u0964",
    "po.refuse.memory_unknown":
      "\u092f\u0939 \u092e\u0947\u0930\u0940 \u092f\u093e\u0926 \u092e\u0947\u0902 \u0928\u0939\u0940\u0902 \u0939\u0948\u0964",
    "po.refuse.memory_off":
      "\u0938\u0947\u091f\u093f\u0902\u0917\u094d\u0938 \u092e\u0947\u0902 \u092a\u094b \u092e\u0947\u092e\u0930\u0940 \u091a\u093e\u0932\u0942 \u0915\u0930\u0947\u0902\u0964",
    "po.refuse.destination_unknown":
      "{destination} \u0916\u094b\u0932\u0928\u093e \u092e\u0941\u091d\u0947 \u0928\u0939\u0940\u0902 \u0906\u0924\u093e\u0964",

    "po.fail.generic":
      "\u092f\u0939 \u0915\u093e\u092e \u0928\u0939\u0940\u0902 \u0915\u0930 \u092a\u093e\u092f\u093e\u0964",
    "po.fail.invalid_input":
      "\u092f\u0939 \u092e\u093e\u0928 \u092f\u0939\u093e\u0901 \u0928\u0939\u0940\u0902 \u091a\u0932\u0947\u0917\u093e\u0964",
    "po.fail.unavailable":
      "\u092f\u0939 \u0905\u092d\u0940 \u0909\u092a\u0932\u092c\u094d\u0927 \u0928\u0939\u0940\u0902 \u0939\u0948\u0964",
    "po.fail.voice_unavailable":
      "\u0907\u0938 \u0930\u0942\u092e \u092e\u0947\u0902 \u0935\u0949\u092f\u0938 \u0909\u092a\u0932\u092c\u094d\u0927 \u0928\u0939\u0940\u0902\u0964",
    "po.fail.navigation_unavailable":
      "\u092f\u0939\u093e\u0901 \u0938\u0947 \u0938\u094d\u0915\u094d\u0930\u0940\u0928 \u0928\u0939\u0940\u0902 \u0916\u094b\u0932 \u0938\u0915\u0924\u093e\u0964",
    "po.fail.room_full":
      "\u0930\u0942\u092e \u092d\u0930\u093e \u0939\u0941\u0906 \u0939\u0948\u0964",
    "po.fail.room_not_found":
      "\u0935\u0939 \u0930\u0942\u092e \u0928\u0939\u0940\u0902 \u092e\u093f\u0932\u093e\u0964",
    "po.fail.already_member":
      "\u0906\u092a \u092a\u0939\u0932\u0947 \u0938\u0947 \u0909\u0938 \u0930\u0942\u092e \u092e\u0947\u0902 \u0939\u0948\u0902\u0964",
    "po.fail.invite_gone":
      "\u0935\u0939 \u0928\u094d\u092f\u094b\u0924\u093e \u0905\u092c \u0916\u0941\u0932\u093e \u0928\u0939\u0940\u0902 \u0939\u0948\u0964",
    "po.fail.conflict":
      "\u0930\u0942\u092e \u092c\u0926\u0932 \u0917\u092f\u093e\u0964 \u092b\u093f\u0930 \u0915\u094b\u0936\u093f\u0936 \u0915\u0930\u0947\u0902\u0964",
    "po.fail.rate_limited":
      "\u092c\u0939\u0941\u0924 \u0938\u093e\u0930\u0947 \u0905\u0928\u0941\u0930\u094b\u0927\u0964 \u0925\u094b\u0921\u093c\u0940 \u0926\u0947\u0930 \u092e\u0947\u0902 \u092b\u093f\u0930 \u0915\u0930\u0947\u0902\u0964",
    "invite.landing.joining": "आपको रूम में ले जा रहे हैं…",
    "room.journey.invite.title": "शुरू करने के लिए दोस्तों को बुलाएँ।",
    "room.journey.waiting.title": "दोस्तों का इंतज़ार…",
    "room.journey.ready.title": "सब आ गए हैं।",
    "room.journey.progress": "{total} में से {joined} शामिल",
    "room.journey.po.invite": "जिनके साथ देखना है उन्हें लिंक भेजें।",
    "room.journey.po.waiting": "सबका इंतज़ार है।",
    "room.journey.po.ready": "सब तैयार हैं। जब चाहें शुरू करें।",
    "voice.short.mic": "माइक",
    "voice.short.muted": "म्यूट",
    "voice.short.speaker": "स्पीकर",
    "voice.short.leave": "छोड़ें",
  },
};
