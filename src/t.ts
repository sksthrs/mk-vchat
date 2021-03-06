import { Tuple2, Util } from "./util";

/**
 * very simple translation service class
 * [notice]
 * Both main and renderer processes need setLocale independently,
 * because T called from main and from renderer is different.
 */
export class T {
  // singleton
  private static _instance : T | null = null;
  private static _isMac : boolean = false;
  private constructor() {
    this.initDict();
  }
  static data() : T {
    if (T._instance === null) { T._instance = new T(); }
    return T._instance;
  }

  static t(basePhrase:string, context:string) : string {
    const phrase = T.data().getPhrase(basePhrase,context);
    if (phrase === "") return basePhrase;
    if (Util.isMac()) {
      phrase.replace("Ctrl+","Cmd+");
    }
    return phrase;
  }

  static a(basePhrase:string, context:string) : string {
    return T.data().analyze(basePhrase,context);
  }

  /**
   * check inner locale dictionaries and return locale that matches most.
   * if fallback language ("en" or "en-US") was chosen, returns "".
   * 
   * @param locale source locale string
   * @example  assumption: dictionaries for "ja", "th", "fr" exist
   * - matchLocale("en") // "" (same as fallback language)
   * - matchLocale("th") // "th"
   * - matchLocale("en-GB") // "" (not exact "en", but near)
   * - matchLocale("fr-CA") // "fr" (near "en")
   * - matchLocale("vi") // "" (no match : fallback was chosen)
   */
  static matchLocale(locale:string) : string {
    return T.data()._matchLocale(locale);
  }

  /**
   * get locale from browser APIs.
   * http://www1.kokusaika.jp/advisory/org/ja/js_point.html
   * https://qiita.com/shogo82148/items/548a6c9904eb19269f8c
   */
  static getBrowserLocale() : string {
    return (window.navigator.languages && window.navigator.languages[0]) 
    || window.navigator.language
  }

  /**
   * set locale for localization.
   * (if specified locale is not available, set fallback language (English).)
   * @param locale locale string to set
   */
  static setLocale(locale:string) : boolean {
    //const result = T.data().trySetLocale(locale);
    // return result;
    T.data().setInnerLocale(locale);
    return true;
  }

  static getLocales() : Array<Tuple2<string, string>> {
    var locales = ["en"];
    for (var locale of Object.keys(T.data()._dicts)) { locales.push(locale); }
    locales.sort();

    var result: Array<Tuple2<string, string>> = [];
    for (var locale of locales) {
      if (locale === "en") {
        result.push({ v1:"en" , v2:"English" });
        continue;
      }
      const d = T.data()._dicts[locale]; if (d === undefined) continue;
      const c = d["MyName"]; if (c === undefined) continue;
      const p = c["English"]; if (p === undefined) continue;
      result.push({ v1:locale , v2:p });
    }

    return result;
  }

  static getFails() : Array<Tuple2<string,string>> {
    return T.data().getAllFails();
  }

  // ========== ========== public instance methods  ========== ==========

  _matchLocale(locale:string) : string {
    // fallback languages
    if (locale === "en" || locale === "en-US") return "";

    if (this._dicts[locale] !== undefined) return locale;

    const indexHyphen = locale.indexOf("-");
    if (indexHyphen <= 0) return "";

    const locale2 = locale.substr(0,indexHyphen);
    if (this._dicts[locale2] !== undefined) return locale2;

    return "";
  }

  setInnerLocale(locale:string) {
    this._locale = this._matchLocale(locale);
    if (this._locale === "") {
      this._dict = null;
    } else {
      this._dict = this._dicts[this._locale];
    }
  }

  trySetLocale(locale:string) : boolean {
    // fallback languages
    if (locale === "en" || locale === "en-US") {
      this._locale = "";
      this._dict = null;
      return true;
    }

    const d = this._dicts[locale];
    if (d !== undefined && d !== null) {
      this._locale = locale;
      this._dict = d;
      return true;
    }

    const indexHyphen = locale.indexOf("-");
    if (indexHyphen <= 0) return false;
    const lang = locale.substr(0,indexHyphen);
    const d2 = this._dicts[lang];
    if (d2 !== undefined && d2 !== null) {
      this._locale = lang;
      this._dict = d2;
      return true;
    }
    return false;
  }

  analyze(basePhrase:string, context:string) : string {
    if (this._dict === null) return `dict===null. return [${basePhrase}]`;

    const phrases = this._dict[context];
    if (phrases === undefined) {
      return `dict[${context}] is undef.`;
    }

    const phrase = phrases[basePhrase];
    if (phrase === undefined) {
      return `phrases[${basePhrase}] is undef.`;
    }

    return `found [${phrase}]`;
  }

  getPhrase(basePhrase:string, context:string) : string {
    if (this._dict === null) return basePhrase;

    const phrases = this._dict[context];
    if (phrases === undefined) {
      this._failed.push({ v1: basePhrase, v2: context });
      return basePhrase;
    }

    const phrase = phrases[basePhrase];
    if (phrase === undefined) {
      this._failed.push({v1:basePhrase, v2:context});
      return basePhrase;
    }

    return phrase;
  }

  getAllFails() : Array<Tuple2<string,string>> {
    return this._failed;
  }

  // ========== ========== private  ========== ==========

  _locale = "";
  _failed : Array<Tuple2<string,string>> = [];

  _dicts : {[keyLocale:string]: {[keyCategory:string]: {[keyBase:string]: string}}} = {};
  _dict : {[keyCategory:string]: {[keyBase:string]: string}} | null = null;

  initDict() {
    this._dicts["ja"] = {
      "MyName" : {
        "English" : "?????????", // ????????????????????????????????????????????????????????????????????????
      },
      "General" : {
        "mekiku-web" : "web???mekiku",
        "mk-Chat with Voice" : "??????????????????????????????",
        "OK" : "OK",
        "Cancel" : "???????????????",
        "Error" : "?????????",
        "Warning" : "??????",
        "all files" : "?????????????????????",
        "file name" : "???????????????",
        "Subtitler" : "?????????",
        "Viewer" : "?????????",
        "Number of Viewers" : "????????????",
        "Error occured on file access.\nIf another application is using it, first quit it." : "??????????????????????????????????????????????????????????????????\n???????????????????????????????????????????????????????????????????????????????????????????????????",
        "Communication error." : "????????????????????????",
        "Detail" : "??????",
        "Internet Explorer and old version of Microsoft Edge are not supported." : "Internet Explorer??????????????????Microsoft Edge??????????????????????????????",
        "Note" : "????????????",
        "Chat" : "??????????????????",
        "Can not copy URI." : "URL???????????????????????????????????????",
        "You cannot use Voice Input on this browser." : "???????????????????????????????????????????????????????????????",
        "Voice Input is available on Chrome." : "Chrome????????????????????????????????????????????????",
        "Voice Input is available on Safari." : "Safari????????????????????????????????????????????????",
        "iPhone's own voice input is recommended." : "iPhone???????????????????????????????????????????????????",
      },
      "Input" : {
        "Input Window" : "?????????????????????",
        "Type your message here, then hit enter." : "?????????????????????????????????Enter???????????????",
        "Cannot recognize" : "?????????????????????",
        "Speech is not detected (Getting closer to your mic may help)" : "?????????????????????????????????????????????????????????????????????????????????",
        "Maybe no mic detected" : "??????????????????????????????????????????",
        "Error in speech recognition" : "???????????????????????????",
        "." : "???",
      },
      "Chat" : {
        "Chat" : "?????????",
        "Start" : "???????????????????????????",
        "Halt" : "???????????????????????????",
        "Reset" : "????????????????????????",
        "Increase Timer By A Minute" : "????????????1?????????",
        "Decrease Timer By A Minute" : "????????????1?????????",
        "0:00" : "0???00",
        "30 seconds to next turn." : "30???????????????",
        " : " : "???",
        "It's new turn now." : "???????????????",
        "Timer started. Next " : "???????????????????????????????????????????????? ",
        "Timer halted." : "????????????????????????????????????",
        "login" : "????????????",
        "New viewer" : "????????????????????????",
        "logout" : "???????????????",
        "A viewer left" : "??????????????????",
      },
      "Monitor" : {
        "Input Monitor" : "??????????????????",
        "name" : "??????",
        "current input window" : "??????????????????",
        "connect" : "??????",
        "(no attendance)" : "?????????????????????",
      },
      "PFT" : {
        "PFT (Pre-Formatted Text)" : "????????????",
        "Open (Ctrl+O)" : "?????? (Ctrl+O)",
        "Save As (Ctrl+S)" : "???????????????????????? (Ctrl+S)",
        "Next Comment (Ctrl+down)" : "???????????????????????????????????? (Ctrl+???)",
        "Previous Comment (Ctrl+up)" : "???????????????????????????????????? (Ctrl+???)",
        "Next Window (Ctrl+right)" : "?????????????????????????????? (Ctrl+???)",
        "Previous Window (Ctrl+left)" : "?????????????????????????????? (Ctrl+???)",
        "PFT files" : "????????????????????????",
        "UTF-8 PFT files" : "UTF-8????????????????????????",
        "Unicode PFT files" : "Unicode????????????????????????",
        "text files" : "????????????????????????",
      },
      "PftMon" : {
        "PFT Monitor" : "????????????????????????",
        "'s Pre-Formatted Text" : "?????????????????????????????????",
      },
      "Fkey" : {
        "Shortcut" : "F??????",
        "Parenthesize all" : "?????????????????????????????????",
        "Undo" : "????????????1????????????(undo)",
        "(Not available)" : "??????????????????",
      },
      "Note" : {
        "Shared Note" : "????????????",
        "Last update" : "?????????",
        "(yourself)" : "????????????",
      },
      "Log" : {
        "Log" : "??????",
      },
      "Login" : {
        "Login" : "????????????",
        "LAN card" : "LAN?????????",
        "Name" : "??????",
        "Channel" : "???????????????",
        "Group" : "???",
        "The network port is occupied by other application.\nSelect another channel and login." : "????????????????????????????????????????????????????????????????????????????????????\n???????????????????????????????????????????????????????????????????????????",
        "Network error occurs. Make sure network connection." : "???????????????????????????????????????????????????????????????????????????",
        "(No Network Available)" : "??????????????????LAN?????????????????????",
        "Room" : "?????????",
        "Viewer" : "?????????????????????",
        "Subtitler" : "??????????????????????????????",
        "Password" : "???????????????",
        "Login failed." : "????????????????????????????????????",
        "Logout" : "???????????????",
      },
      "Config" : {
        "Config" : "??????",
      },
      "Config|General" : {
        "Font Size" : "??????????????????",
        "Font Name" : "???????????????",
        "Font Color" : "?????????",
        "Bold" : "??????",
        "Background Color" : "?????????",
        "Show" : "????????????",
      },
      "Config|Misc" : {
        "General" : "??????????????????",
        "Re-Login" : "LAN????????????????????????????????????",
        "Full Screen" : "????????????",
        "Select Language" : "???????????????",
        "To make your choice effective, Restart mekiku-M." : "???????????????????????????????????????mekiku-M?????????????????????????????????",
        "Save log" : "?????????????????????",
        "Save note" : "?????????????????????",
        "Save main log" : "?????????????????????????????????",
        "Save chat log" : "?????????????????????????????????",
        "Startup Settings" : "???????????????",
        "Keep Last Settings" : "????????????????????????????????????????????????",
        "Copy URL of this room including password" : "?????????????????????????????????????????????URL????????????",
      },
      "Config|Main" : {
        "Main Display" : "??????????????????",
        "Display style" : "????????????",
        "Normal" : "????????????",
        "Full Width" : "???????????????",
        "Full Window" : "???????????????????????????",
        "Line Height" : "1????????????",
        "Scroll interval per line" : "1???????????????????????????",
        "msec" : "?????????",
      },
      "Config|Input" : {
        "Parentheses on F8 press" : "F8????????????????????????",
        "Parentheses on Shift+F8 press" : "Shift+F8????????????????????????",
        "???" : "???",
        "???" : "???",
        "(" : "???",
        ")" : "???",
      },
      "Config|Chat" : {
        "Notification Color" : "?????????????????????",
        "Play sound on timer-notifications" : "?????????????????????????????????",
      },
      "Config|Monitor" : {
        "Background Color On Loss" : "???????????????????????????",
      },
      "Config|PFT" : {
        "Background Color (Name)" : "???????????????????????????",
        "Background Color (Name of Other Panes)" : "????????????????????????????????????",
        "Display All" : "???????????????????????????",
        "Current Window Width" : "??????????????????????????????",
        "Same As Others (x1.0)" : "???????????????1.0??????",
        "50% wider (x1.5)" : "??????5?????????1.5??????",
        "double (x2.0)" : "??????2??????2.0??????",
        "triple (x3.0)" : "??????3??????3.0??????",
      },
      "Menu|Menu" : {
        "Menu" : "????????????",
        "File" : "????????????",
        "Edit" : "??????",
        "Re-Login" : "LAN????????????????????????????????????",
        "Open Settings..." : "???????????????????????????...",
        "Save Settings As..." : "?????????????????????????????????...",
        "Config..." : "??????...",
        "Reset All Settings" : "??????????????????",
        "Current As Default" : "???????????????????????????????????????",
        "Full Screen" : "????????????",
        "Version..." : "???????????????...",
        "Exit" : "??????",
        "mekiku-M settings files" : "mekiku-M??????????????????",
        "Undo" : "????????????",
        "Cut" : "????????????",
        "Copy" : "?????????",
        "Paste" : "????????????",
        "Select All" : "???????????????",
      },
    };

    this._dicts["th"] = {
      "MyName" : {
        "English" : "?????????????????????",
      },
      "General" : {
        // "mekiku-web" : "",
        // "mk-Chat with Voice" : "",
        "OK" : "OK",
        "Cancel" : "??????????????????",
        "Error" : "??????????????????????????????",
        "Warning" : "???????????????",
        "all files" : "?????????????????????????????????",
        // "file name" : "",
        // "Subtitler" : "",
        // "Viewer" : "",
        // "Number of Viewers" : "",
        "Error occured on file access.\nIf another application is using it, first quit it." : "?????????????????????????????????????????????????????????????????????????????????\n??????????????????????????????????????????????????????????????????????????????????????????????????????\n???????????????????????????????????????????????????",
        // "Communication error." : "",
        // "Detail" : "",
        // "Internet Explorer and old version of Microsoft Edge are not supported." : "",
        //"Note" : "",
        //"Back" : "",
        //"Can not copy URL." : "",
        //"You cannot use Voice Input on this browser." : "",
        //"Voice Input is availabel on Chrome." : "",
        //"Voice Input is availabel on Safari." : "",
        //"iPhone's own voice input is recommended." : "",
      },
      "Input" : {
        "Input Window" : "??????????????????????????????????????????",
        // "Type your message here, then hit enter." : "",
        // "Cannot recognize" : "",
        // "Error in speech recognition" : "",
        // "." : "",
      },
      "Chat" : {
        "Chat" : "????????????",
        "Start" : "???????????????",
        "Halt" : "????????????",
        "Reset" : "????????????????????????",
        "Increase Timer By A Minute" : "??????????????????????????????????????? A ????????????",
        "Decrease Timer By A Minute" : "?????????????????????????????? A ????????????",
        "0:00" : "0:00",
        "30 seconds to next turn." : "?????????????????????????????????.?????????????????????????????????",
        " : " : " : ",
        "It's new turn now." : "???????????????????????????",
        "Timer started. Next " : "???????????????????????????????????? ??????????????? ",
        "Timer halted." : "????????????????????????????????? ",
        // "login" : "", // real message : "(login : NAME_OF_MEMBER)"
        // "New viewer" : "",
        // "logout" : "", // real message : "(logout : NAME_OF_MEMBER)"
        // "A viewer left" : "",
      },
      "Monitor" : {
        "Input Monitor" : "?????????????????????????????????????????????",
        "name" : "????????????",
        "current input window" : "??????????????????????????????????????????????????????????????????",
        "connect" : "???????????????????????????",
        //"(no attendance)" : "",
      },
      "PFT" : {
        "PFT (Pre-Formatted Text)" : "???????????????????????????????????????????????????",
        "Open... (Ctrl+O)" : "????????????... (Ctrl+O)",
        "Save As (Ctrl+S)" : "??????????????????????????????... (Ctrl+S)",
        "Next Comment (Ctrl+down)" : "??????????????????????????????????????? (Ctrl+down)",
        "Previous Comment (Ctrl+up)" : "???????????????????????????????????????????????? (Ctrl+up)",
        "Next Window (Ctrl+right)" : "??????????????????????????????????????? (Ctrl+right)",
        "Previous Window (Ctrl+left)" : "???????????????????????????????????????????????? (Ctrl+left)",
        "PFT files" : "????????????????????????????????? ",
        "UTF-8 PFT files" : "UTF-8 ????????????????????????????????? ",
        "Unicode PFT files" : "???????????????????????? ????????????????????????????????? ",
        "text files" : "??????????????????????????????",
      },
      "PftMon" : {
        "PFT Monitor" : "????????????????????????????????????????????????",
        "'s Pre-Formatted Text" : "???????????????????????????????????????????????????",
      },
      "Fkey" : {
        "Shortcut" : "?????????????????????",
        "Parenthesize all" : "??????????????????????????????????????? ",
        "Undo" : "?????????????????????????????????",
        "(Not available)" : "(?????????????????????????????????????????????)",
      },
      "Note" : {
        // "Shared Note" : "",
        // "Last update" : "",
      },
      "Log" : {
        "Log" : "????????????",
      },
      "Login" : {
        "Login" : "????????????????????? ",
        "LAN card" : "????????????????????????",
        "Name" : "????????????",
        "Channel" : "?????????????????????",
        "Group" : "???????????????",
        "The network port is occupied by other application.\nSelect another channel and login." : "?????????????????????????????????????????????\n???????????????????????????????????????????????????????????????????????????\n????????????????????????????????????????????????????????????\n?????????????????????",
        "Network error occurs. Make sure network connection." : "????????????????????????????????????????????????????????????????????????????????? \n?????????????????????????????????????????????????????????\n??????????????????????????????",
        "(No Network Available)" : "(?????????????????????????????????????????????)",
        // "Room" : "",
        // "Viewer" : "",
        // "Subtitler" : "",
        // "Password" : "",
        // "Login failed." : "",
      },
      "Config" : {
        "Config" : "?????????????????????????????? ",
      },
      "Config|General" : {
        "Font Size" : "???????????????????????????",
        "Font Name" : "??????????????????",
        "Font Color" : "????????????????????????",
        "Bold" : "??????????????????",
        "Background Color" : "??????????????????????????????",
        "Show" : "????????????",
      },
      "Config|Misc" : {
        "General" : "???????????????????????????????????????????????????",
        "Re-Login" : "?????????????????????????????????",
        "Full Screen" : "???????????????????????????",
        "Select Language" : "???????????????????????????",
        "To make your choice effective, Restart mekiku-M." : "????????????????????????????????????????????????????????????????????? ???????????????, ??????????????????????????? mekiku-M ????????????????????????",
        "Save log" : "??????????????????",
        // "Save note" : "",
        "Save main log" : "?????????????????? (????????????????????????????????????????????????)",
        "Save chat log" : "?????????????????? (????????????????????????????????????????????????)",
        "Startup Settings" : "?????????????????????????????????????????????",
        "Keep Last Settings" : "???????????????????????????????????????????????????",
        // "Copy URL of this room including password" : "",
      },
      "Config|Main" : {
        "Main Display" : "????????????????????????????????????",
        "Display style" : "???????????????????????????????????????",
        "Normal" : "????????????",
        "Full Width" : "?????????????????????????????????????????????",
        "Full Window" : "????????????????????????????????????",
        "Line Height" : "???????????????????????????????????????",
        "Scroll interval per line" : "???????????????????????????????????????????????? ???????????????????????????",
        "msec" : "??????????????????????????????????????????",
      },
      "Config|Input" : {
        "Parentheses on F8 press" : "?????????????????????????????????????????? F8",
        "Parentheses on Shift+F8 press" : "Shift+F8",
        "???" : "\"\"",
        "???" : "\"\"",
        "(" : "(",
        ")" : ")",
      },
      "Config|Chat" : {
        "Notification Color" : "?????????????????????",
        // "Play sound on timer-notifications" : "",
      },
      "Config|Monitor" : {
        "Background Color On Loss" : "??????????????????????????????  ??????????????????????????????",
      },
      "Config|PFT" : {
        "Background Color (Name)" : "??????????????????????????????(????????????????????????)",
        "Background Color (Name of Other Panes)" : "??????????????????????????????(????????????????????????????????????)",
        "Display All" : "?????????????????????????????????????????????",
        "Current Window Width" : "???????????????????????????????????????????????????????????????????????????",
        "Same As Others (x1.0)" : "?????????????????????????????????",
        "50% wider (x1.5)" : "??????????????????????????? 1.5 ????????????",
        "double (x2.0)" : "2 ????????????",
        "triple (x3.0)" : "3 ????????????",
      },
      "Menu|Menu" : {
        "Menu" : "????????????",
        "File" : "????????????",
        "Edit" : "????????????????????????",
        "Re-Login" : "?????????????????????????????????",
        "Open Settings..." : "???????????????????????????????????????????????????????????????????????? ...",
        "Save Settings As..." : "????????????????????????????????????????????????????????????????????? ...",
        "Config..." : "?????????????????????????????? ...",
        "Reset All Settings" : "??????????????????????????????????????????",
        "Current As Default" : "??????????????????????????????????????????????????????????????????????????????????????????",
        "Full Screen" : "???????????????????????????",
        "Version..." : "??????????????????????????? ...",
        "Exit" : "?????????",
        "mekiku-M settings files" : "????????????????????????????????? mekiku-M",
        "Undo" : "??????????????????",
        "Cut" : "?????????",
        "Copy" : "??????????????????",
        "Paste" : "?????????",
        "Select All" : "????????????????????????????????????",
      },
    };
  }

}
