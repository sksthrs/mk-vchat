import { UtilDom } from "./utilDom"

export class Util {
  /**
   * Extract string 'before delimiter' or whole if delimiter is not included.
   * 
   * beforeOf('abc/def', '/') === 'abc'
   * beforeOf('abc/def', ':') === 'abc/def'
   * beforeOf('abc/def', 'a') === ''
   * 
   * @param src source string
   * @param delimiter delimiter string
   */
  static beforeOf(src:string, delimiter:string) : string {
    const ix = src.indexOf(delimiter)
    if (ix<0) return src
    return src.substring(0,ix)
  }

  /**
   * Check if a string is legit for room-name.
   * @param name room name candidate
   */
  static isRoomNameLegit(name:string) : boolean {
    const re = /^[A-Za-z0-9]+$/
    return re.test(name)
  }

  /**
   * Get room name, decoded, from URI (1.from query string , 2.from hash)
   * @returns room name if possible, empty string if no information is provided
   */
  static tryGetRoomNameFromURI() : string {
    const queries = UtilDom.getQuery()
    const room = queries.reverse().find(tuple => tuple[1] === '')?.[0] ?? location.hash
    return decodeURIComponent(room)
  }

  /**
   * Get password, decoded, from URI (query string 'p=')
   * @returns password if possible, undefined if no information is provided
   */
  static tryGetPasswordFromURI() : string | undefined {
    const queries = UtilDom.getQuery()
    const pass = queries.find(tuple => tuple[0].toLowerCase() === 'p')?.[1]
    return pass == null ? pass : decodeURIComponent(pass) 
  }

  /**
   * Check if a string contains one of substrings
   * @param text string which is checked if contains one of substrings
   * @param substrings string(s) which might be contained in text
   */
  static contains(text: string, ...substrings: string[]) : boolean {
    for (const ix in substrings) {
      if (text.indexOf(substrings[ix]) >= 0) { return true; }
    }
    return false;
  }

  /**
   * tell if argument is string or not.
   * @param v value to detect
   */
  static isString(v:any) : boolean {
    return typeof (v) === 'string' || v instanceof String
  }

  /**
   * tell if argument is number or not.
   * https://zero-plus-one.jp/javascript/isnumber/
   * @param val value to detect
   */
  static isNumber(val:any) : boolean {
    return ((typeof val === 'number') && isFinite(val))
  }

  /**
   * Translate value as number
   * @param val value translated as number
   * @param def default value (used when val is illegal)
   */
  static toNumber(val:any, def:number = 0) : number {
    if (this.isNumber(val)) {
      return val
    }
    if (this.isString(val)) {
      const n = parseInt(val,10)
      if (Number.isNaN(n) === false) {
        return n
      }
    }
    return def
  }

  /**
   * get UTC time in "hh:mm:ss.sss" format.
   */
  static getNowUTCTimeString() : string {
    const n = new Date()
    const h = n.getUTCHours().toString().padStart(2,'0')
    const m = n.getUTCMinutes().toString().padStart(2,'0')
    const s = n.getUTCSeconds().toString().padStart(2,'0')
    const ms = n.getUTCMilliseconds().toString().padStart(3,'0')
    return `${h}:${m}:${s}.${ms}`
  }

  /**
   * Sums up values in array (e.g. sum of lengths in string-array)
   * @param array source values
   * @param func function to get value for each item in the array
   */
  static arraySum<T>(
    array: T[],
    func: (value: T, index: number, array: T[]) => number): number {
    var sum = 0;
    array.forEach((value: T, index: number, array: T[]) => {
      sum += func(value, index, array);
    });
    return sum;
  }

  /**
   * get n-th item in an array. any n is accepted.
   * count from last item when n is negative value.
   * (example) assume ar = [1,2,3]
   * getArrayItem(ar,0) === 1
   * getArrayItem(ar,3) === getArrayItem(ar,99999) === 3 (large index is handled as last item)
   * getArrayItem(ar,-1) === 3 (negative index means count from last item)
   * getArrayItem(ar,-2) === 2
   * getArrayItem(ar,-3) === getArrayItem(ar,-99999) === 1 (small index is handled as first item)
   * @param array an array from where get a value
   * @param n index
   * @returns a value in the array or undefined (when the array is null or undefined)
   */
  static getArrayItem<T>(array:Array<T> | null | undefined, n:number) : T | undefined {
    if (array == null) return undefined
    const nElement = (n >= 0)
      ? Math.min(n, array.length-1)
      : Math.max(array.length + n,0)
    return array[nElement]
  }

  static toLf(src:string) : string {
    return src.replace(/\r\n?/g, "\n");
  }

  static toCrLf(src:string) : string {
    return this.toLf(src).replace(/\n/g,"\r\n");
  }

  /**
   * Translate number into "Zero-Padded" string (like "00123")
   * @param value the number translated to string
   * @param digit the length of the result string
   */
  static toStringWithZero(value:number, digit:number) : string {
    return ("0".repeat(digit) + value.toFixed(0)).slice(-digit);
  }

  static getNewLineCode() : string {
    return this.isWin() ? "\r\n" : "\n"
  }

  static isWin() : boolean {
    const platform = window.navigator.platform.toLowerCase()
    if (platform.includes("win"))
    {
      return true
    }
    return false
  }

  static isMac() : boolean {
    const platform = window.navigator.platform.toLowerCase()
    if (platform.includes("mac") 
      || platform.includes("iphone") 
      || platform.includes("ipad"))
    {
      return true
    }
    return false
  }

  /**
   * Detect if accessing browser is running on iOS.
   */
   static isIOS() : boolean {
    const platform = window.navigator.platform.toLowerCase()
    return platform.includes('iphone') || platform.includes('ipad') || platform.includes('ipod')
  }

  /**
   * Detect if accessing browser is running on iPhone.
   * (Reason) Safari on iPhone implements SpeechRecognition so badly, we need to detect.
   */
   static isIPhone() : boolean {
    const platform = window.navigator.platform.toLowerCase()
    return platform.includes('iphone') // || platform.includes('ipod') // I do not have an iPod.
  }

  /**
   * Detect if accessing browser is running on iPad.
   * (Reason) SpeechRecognition is available only on Safari.
   */
  static isIPad() : boolean {
    const platform = window.navigator.platform.toLowerCase()
    return platform.includes('ipad')
  }

  /**
   * Detect if accessing browser is inner browser of LINE(messaging app).
   */
  static isLine() : boolean {
    return navigator.userAgent.toLowerCase().includes(' line')
  }

  static estimateOSAndBrowser() : string {
    const os = this.estimateOS()
    const browser = this.estimateBrowser()
    return (browser == null || browser.length < 1) ? os : os + " - " + browser
  }

  static estimateOS() : string {
    const ua = navigator.userAgent.toLowerCase()

    // detect specific OS first
    if (ua.includes('windows phone')) return 'Windows Phone'
    if (ua.includes('iphone')) return 'iPhone'
    if (ua.includes('ipad')) return 'iPad'
    if (ua.includes('CrOS')) return 'ChromeOS'
    if (ua.includes('appletv')) return 'AppleTV'
    if (ua.includes('kindle')) return 'FireOS'
    if (ua.includes('silk')) return 'FireOS'
    if (ua.includes('aftb')) return 'FireTV'
    if (ua.includes('nintendo')) return 'Nintendo'
    if (ua.includes('playstation')) return 'PlayStation'
    if (ua.includes('xbox')) return 'XBox'

    // detect generic OS names (used also for specific OS)
    if (ua.includes('mac os')) return 'macOS'
    if (ua.includes('android')) return 'Android'
    if (ua.includes('windows')) return 'Windows'
    if (ua.includes('freebsd')) return 'FreeBSD'
    if (ua.includes('linux')) return 'Linux'

    // unidentifiable
    return ''
  }

  static estimateBrowser() : string {
    const ua = navigator.userAgent.toLowerCase()

    // not necessary browser information for some OS
    if (ua.includes('windows phone')) return ''
    if (ua.includes('iphone')) return ''
    if (ua.includes('ipad')) return ''
    if (ua.includes('CrOS')) return ''
    if (ua.includes('appletv')) return ''
    if (ua.includes('kindle')) return ''
    if (ua.includes('silk')) return ''
    if (ua.includes('aftb')) return ''
    if (ua.includes('nintendo')) return ''
    if (ua.includes('playstation')) return ''
    if (ua.includes('xbox')) return ''

    // estimate browser (special cases)
    if (ua.includes('samsung')) return 'Samsung'
    if (ua.includes('ucbrowser')) return 'UC Browser'
    if (ua.includes('qqbrowser')) return 'QQ Browser'
    if (ua.includes('yabrowser')) return 'Yandex'
    if (ua.includes('whale')) return 'Whale'
    if (ua.includes('puffin')) return 'Puffin'
    if (ua.includes('opr')) return 'Opera'
    if (ua.includes('coc_coc')) return 'Cốc Cốc'
    if (ua.includes('yahoo') || ua.includes('yjapp')) return 'Yahoo'
    if (ua.includes('fban') || ua.includes('fbios')) return 'Facebook'
    if (ua.includes('instagram')) return 'Instagram'
    if (ua.includes('line')) return 'LINE'

    // estimate browser (semi-special cases)
    if (ua.includes('crios')) return 'Chrome(iOS)'
    if (ua.includes('fxios')) return 'Firefox(iOS)'
    if (ua.includes('cfnetwork')) return 'iOS app'
    if (ua.includes('dalvik')) return 'Android app'
    if (ua.includes('wv)')) return 'Android WebView'

    // estimate browser (general cases)
    if (ua.includes('trident') || ua.includes('msie')) return 'IE'
    if (ua.includes('edge')) return 'Edge(old)'
    if (ua.includes('edg')) return 'Edge'
    if (ua.includes('firefox')) return 'Firefox'

    // super-general names (order matters)
    if (ua.includes('chrome')) return 'Chrome' // 'chrome' is included in most Browsers' userAgent
    if (ua.includes('safari')) return 'Safari' // 'safari' is included in most Browsers' userAgent, includes Chrome

    // unidentifiable
    return ''
  }

  /**
   * provide shortcut-description string (ex. "Ctrl+S").
   * on macOS, "Cmd" is used instead of "Ctrl".
   * [notice] return value starts with space (u0020) because most usage need it.
   * @param key character of shortcut-base-key. assuming "R","1",...
   */
  static getShortcutTextRaw(key: string) : string {
    if (key.length < 1) return ""
    const modifier = this.isMac() ? "Cmd+" : "Ctrl+"
    return modifier + key.charAt(0)
  }

  /**
   * provide shortcut-description string with leading space (ex. " Ctrl+S").
   * on macOS, "Cmd" is used instead of "Ctrl".
   * [notice] return value starts with space (u0020) because most usage need it.
   * @param key character of shortcut-base-key. assuming "R","1",...
   */
  static getShortcutText(key: string) : string {
    if (key.length < 1) return "";
    return " " + this.getShortcutTextRaw(key);
  }

  /**
   * provide shortcut-description string with leading space and parenthesized (ex. " (Ctrl+S)").
   * on macOS, "Cmd" is used instead of "Ctrl".
   * [notice] return value starts with space (u0020) because most usage need it.
   * @param key character of shortcut-base-key. assuming "R","1",...
   */
  static getShortcutParenthesized(key: string) : string {
    if (key.length < 1) return "";
    return " (" + this.getShortcutTextRaw(key) + ")";
  }

  /**
   * provide shortcut (with shift key) description string (ex. "Ctrl+Shift+S").
   * on macOS, "Cmd" is used instead of "Ctrl".
   * [notice] return value starts with space (u0020) because most usage need it.
   * @param key character of shortcut-base-key. assuming "R","1",...
   */
  static getShiftShortcutTextRaw(key: string) : string {
    if (key.length < 1) return "";
    var modifier = (this.isMac()) ? "Shift+Cmd+" : "Ctrl+Shift+";
    return modifier + key.charAt(0);
  }

  /**
   * provide shortcut (with shift key) description string with leading space (ex. " Ctrl+Shift+S").
   * on macOS, "Cmd" is used instead of "Ctrl".
   * [notice] return value starts with space (u0020) because most usage need it.
   * @param key character of shortcut-base-key. assuming "R","1",...
   */
  static getShiftShortcutText(key: string) : string {
    if (key.length < 1) return "";
    return " " + this.getShiftShortcutTextRaw(key);
  }

  /**
   * provide shortcut (with shift key) description string with leading space and parenthesized (ex. " (Ctrl+Shift+S)").
   * on macOS, "Cmd" is used instead of "Ctrl".
   * [notice] return value starts with space (u0020) because most usage need it.
   * @param key character of shortcut-base-key. assuming "R","1",...
   */
  static getShiftShortcutParenthesized(key: string) : string {
    if (key.length < 1) return "";
    return " (" + this.getShiftShortcutTextRaw(key) + ")";
  }

  static numberToText2(v:number) : string {
    return v.toString().padStart(2,'0')
  }

  /**
   * return current timestamp string as '2020-01-23_01:23:45'
   */
  static getIsoModifiedDateTimeString() : string {
    const n = new Date()
    const y = n.getFullYear().toString()
    const m = this.numberToText2(n.getMonth()+1)
    const d = this.numberToText2(n.getDate())
    const hh = this.numberToText2(n.getHours())
    const mm = this.numberToText2(n.getMinutes())
    const ss = this.numberToText2(n.getSeconds())
    return `${y}-${m}-${d}_${hh}:${mm}:${ss}`
  }

  /**
   * return current timestamp string as '2020-01-23'
   */
  static getIsoStyleDateString() : string {
    const n = new Date()
    const y = n.getFullYear().toString()
    const m = this.numberToText2(n.getMonth()+1)
    const d = this.numberToText2(n.getDate())
    return `${y}-${m}-${d}`
  }

  /**
   * make message digest and returns hex-ed string
   * https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest
   * @param message string to make digest
   */
  static async digestMessage(message:string) : Promise<string> {
    const msgUint8 = new TextEncoder().encode(message)
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    return hashHex
  }

  // Only for static-calling. Don't "new".
  private constructor() {}
}

export interface Tuple2<T1,T2> {
  v1: T1;
  v2: T2;
}
