import { AppConfig } from "./appConfig"
import { Pane } from "./pane"
import { UtilDom } from "./utilDom"
import { T } from "./t"
import { Util } from "./util"
import TmpConfig from "./TmpConfig"
import Log from "./log"
import { SpeechRecognitionWrap } from "./speechRecognitionWrap"

export class PaneInput implements Pane {
  getName() { return "PaneInput" }

  private readonly pane = document.getElementById('input') as HTMLDivElement
  private readonly input1Vjs = document.getElementById("input1") as HTMLInputElement
  private readonly voiceButton = document.getElementById('input-by-voice') as HTMLButtonElement
  private readonly voiceStartLabel = document.getElementById('voice-start') as HTMLSpanElement
  private readonly voiceStopLabel = document.getElementById('voice-stop') as HTMLSpanElement
  private readonly sendButton = document.getElementById('send-message') as HTMLButtonElement
  private readonly warning = document.getElementById('warning-in-input') as HTMLDivElement
  private readonly warningMessage = document.getElementById('warning-in-input-message') as HTMLSpanElement
  private readonly warningHide = document.getElementById('warning-in-input-hide') as HTMLButtonElement

  private readonly recognizer: SpeechRecognitionWrap // SpeechRecognition ; this class is not recognized.
  private isSpeechRecognising = false
  private isSpeechRecognitionAvailable = true

  private getFkey: (ix:number) => string = (ix) => { return "" }
  setGetFkey(callback: (ix:number) => string) { this.getFkey = (ix) => callback(ix) }

  private doOnInput: (text:string) => void = (t) => {}
  setDoOnInput(callback: (text:string) => void) { this.doOnInput = (t) => callback(t) }
  private lastSendInput: string = ''
  private onInput(text:string) {
    if (text === this.lastSendInput) return
    this.lastSendInput = text
    this.doOnInput(text)
  }

  private doOnEnter: (text:string) => void = (t) => {}
  setDoOnEnter(callback: (text:string) => void) { this.doOnEnter = (t) => callback(t) }
  private onEnter(text:string) { this.doOnEnter(text) }

  constructor() {
    this.localize()

    this.input1Vjs.addEventListener("input", (ev) => {
      this.onInput(this.input1Vjs.value)
    })

    this.input1Vjs.addEventListener("keydown", (ev) => {
      this.onType(this.input1Vjs, ev)
    })

    this.sendButton.addEventListener('click', (ev) => {
      this.sendMessage(this.input1Vjs)
    })

    this.warningHide.addEventListener('click', (ev) => {
      this.hideWarning()
    })

    this.configToScreen()

    // SpeechRecognition and webkitSpeechRecognition are not recognized.
    // this.recognizer = 
    //   ('SpeechRecognition' in window) ? new (window as any).SpeechRecognition()
    //   : ('webkitSpeechRecognition' in window) ? new (window as any).webkitSpeechRecognition()
    //   : null
    this.recognizer = new SpeechRecognitionWrap()
    if (this.recognizer == null || this.recognizer.isAvailable() !== true || Util.isLine()) {
      this.hideVoiceUIs()
    } else {
      Log.w('info', `SpeechRecognition lang=${this.recognizer.lang} navigator.lang=${navigator.language} langs=[${navigator.languages}]`)
      this.setupRecognizer()
    }
  } // end of constructor

  alertAndRecommendBrowser() {
    const recommend = 
      (Util.isIPhone()) ? T.t("iPhone's own voice input is recommended.",'General') :
      (Util.isIPad()) ? T.t('Voice Input is available on Safari.', 'General') :
      T.t('Voice Input is available on Chrome.','General')
    const message = T.t('You cannot use Voice Input on this browser.', 'General')
    window.alert(message + '\n\n' + recommend)
  }

  private setupRecognizer() {
    this.recognizer.ondetectunavailable = () => {
      this.hideVoiceUIs()
      this.alertAndRecommendBrowser()
    }

    this.recognizer.continuous = false
    this.recognizer.interimResults = false

    this.recognizer.onstart = () => {}
    this.recognizer.onend = () => {}
    this.recognizer.onaudiostart = () => {}
    this.recognizer.onaudioend = () => {}
    this.recognizer.onsoundstart = () => {}
    this.recognizer.onsoundend = () => {}
    this.recognizer.onspeechstart = () => {}
    this.recognizer.onspeechend = () => {}

    this.recognizer.onnomatch = () => {
      Log.w('error', 'Speech recognition : no-match')
      this.setGuiAsTyping()
      this.showWarning(T.t('Cannot recognize', 'Input'))
    }

    // the type of ev should be SpeechRecognitionErrorEventInit
    this.recognizer.onerror = (ev:any) => {
      Log.w('error', `Speech recognition error : ${ev.error}`)
      this.setGuiAsTyping()
      if (this.recognizer.isAvailable()) {
        this.showWarning(T.t('Error in speech recognition', 'Input'))
      }
    }
    
    // the type of ev should be SpeechRecognitionEventInit
    this.recognizer.onresult = (ev:any) => {
      let phrase = ''
      for (let i=0 ; i<ev.results.length ; i++) {
        phrase += ev.results[i][0].transcript
      }

      // [for iPhone] SpeechRecognition on iPhone sometimes duplicate same phrase twice.
      if (Util.isIPhone()) {
        if ((phrase.length & 1) == 0) {
          const half1st = phrase.substring(0, phrase.length/2)
          const half2nd = phrase.substring(phrase.length/2)
          if (half1st === half2nd) {
            phrase = half1st
          }
        }
      }

      // Voice recognition often lacks sentence-ending punctuation.
      const endSentence = T.t('.', 'Input')
      if (endSentence.length > 0 && phrase.endsWith(endSentence) !== true) {
        phrase += endSentence
      }

      // set the result
      this.addWord(phrase)
      this.onInput(this.input1Vjs.value)
      this.setGuiAsTyping()
    }

    this.voiceButton.addEventListener('click', (ev) => {
      if (this.isSpeechRecognising) {
        this.setGuiAsTyping()
        this.recognizer.stop()
      } else {
        this.setGuiAsSpeechRecognising()
        this.recognizer.start()
      }
    })
  }

  private addWord(message:string) {
    this.input1Vjs.value += message
    // go to the end of text
    const len = this.input1Vjs.value.length
    this.input1Vjs.blur() // workaround for Chromium (setSelectionRange doesn't textarea's scrollTop)
    this.input1Vjs.setSelectionRange(len, len)
    this.input1Vjs.focus()
  }

  private setGuiAsSpeechRecognising() {
    this.isSpeechRecognising = true
    this.voiceStartLabel.classList.add('noshow')
    this.voiceStopLabel.classList.remove('noshow')
  }

  private setGuiAsTyping() {
    this.isSpeechRecognising = false
    this.voiceStartLabel.classList.remove('noshow')
    this.voiceStopLabel.classList.add('noshow')
  }

  private showWarning(message:string) {
    this.warningMessage.textContent = message
    UtilDom.show(this.warning)
    this.warningHide.focus()
  }

  private hideWarning() {
    UtilDom.hide(this.warning)
  }

  private onType(el:HTMLInputElement, ev:KeyboardEvent) {
    // Only on macOS, when some key is typed while IME input, ev.key is same as when not IME inputing.
    // https://qiita.com/ledsun/items/31e43a97413dd3c8e38e
    if (ev.keyCode === UtilDom.KEY_CTRL) { return }
    if (ev.keyCode === UtilDom.KEY_ENTER) {
      // if (UtilDom.isCommandOrControlPressed(ev) === true) {
      //   this.replacePart(el, "\n")
      // } else {
        this.sendMessage(el)
      // }
      ev.preventDefault()
      ev.stopImmediatePropagation()
    } else if (ev.keyCode === UtilDom.KEY_ESC) {
      this.clearInput(el)
      ev.preventDefault()
      ev.stopImmediatePropagation()
    } else {
      const iFkey = UtilDom.getCtrlOrFKeyNumber(ev) - 1
      if (iFkey >= 0 && iFkey < 7) {
        const sFkey = this.getFkey(iFkey)
        if (sFkey.length > 0) { this.replacePart(el, sFkey) }
        ev.preventDefault()
        ev.stopImmediatePropagation()
      } else if (iFkey === 7) {
        if (ev.shiftKey !== true) {
          this.enclose(el, 
            AppConfig.data.getParentheses1(), 
            AppConfig.data.getParentheses2())
        } else {
          this.enclose(el, 
            AppConfig.data.getParenthesesShift1(), 
            AppConfig.data.getParenthesesShift2())
        }
        ev.preventDefault()
        ev.stopImmediatePropagation()
      }
    }
    this.onInput(el.value)
  }

  clearAllInput() {
    this.clearInput(this.input1Vjs)
  }

  private sendMessage(el:HTMLInputElement) {
    if (el.value !== '' && el.value !== this.makeInitialPhrase()) {
      this.onEnter(el.value)
      this.clearInput(el)
    }
  }

  private clearInput(el:HTMLInputElement) {
    el.value = this.makeInitialPhrase()
    // if (TmpConfig.getIfNarrow() && (TmpConfig.useAutoNameOnSend() !== true)) {
    //   el.value = this.makeInitialPhrase()
    // } else {
    //   el.value = ''
    // }
  }

  private makeInitialPhrase(): string {
    return TmpConfig.getName() + T.t(' : ','Chat')
  }

  setupAsNarrowScreen() {
    if (this.input1Vjs.value === '') {
      this.clearInput(this.input1Vjs)
    }
  }

  private configToScreen() {
    const fontSizePt = (Util.isIOS()) 
      ? Math.max(AppConfig.data.main_font_size, 12) 
      : AppConfig.data.main_font_size
    this.input1Vjs.style.fontSize = fontSizePt + 'pt'
    this.voiceButton.style.fontSize = fontSizePt + 'pt'
    this.sendButton.style.fontSize = Math.floor(fontSizePt * 0.7) + 'pt'
    this.warningMessage.style.fontSize = Math.floor(fontSizePt * 0.5) + 'pt'
  }

  isVoiceInputAvailable() : boolean {
    return this.isSpeechRecognitionAvailable
  }

  private hideVoiceUIs() {
    this.isSpeechRecognitionAvailable = false
    this.voiceButton.disabled = true
    UtilDom.displayOff(this.voiceButton)
  }

  setPaneToConfig() {
  }

  private replacePart(el:HTMLInputElement, replaced:string) {
    // HTMLInputElement.selectionStart/End must exist in types text/password/search/tel/url/week/month
    const index0 = el.selectionStart || 0
    const index1 = el.selectionEnd || 0
    const text0 = el.value.substring(0, index0)
    const text1 = el.value.substring(index1)
    el.value = text0 + replaced + text1
    const newIndex = index0 + replaced.length
    el.blur() // workaround for Chromium (setSelectionRange doesn't textarea's scrollTop)
    el.setSelectionRange(newIndex, newIndex)
    el.focus()
  }

  private enclose(el:HTMLInputElement, strPre:string, strPost:string) {
    // HTMLInputElement.selectionStart/End must exist in types text/password/search/tel/url/week/month
    const index0 = el.selectionStart || 0
    const index1 = el.selectionEnd || 0
    const len = el.value.length
    el.value = strPre + el.value + strPost
    var newIndex0 = index0 + strPre.length
    var newIndex1 = index1 + strPre.length
    if (index0 === index1 && index1 === len) {
      newIndex0 += strPost.length
      newIndex1 += strPost.length
    }
    el.blur() // workaround for Chromium (setSelectionRange doesn't textarea's scrollTop)
    el.setSelectionRange(newIndex0, newIndex1)
    el.focus()
  }

  updateConfig() {
    this.configToScreen()
  }

  focus(): void {
    this.input1Vjs.focus()
  }

  localize() {
    this.input1Vjs.placeholder = T.t('Type your message here, then hit enter.', 'Input')
  }
}
