import { Util } from "./util"

/**
 * Wrapper class for SpeechRecognition, avoiding pitfalls like:
 * (1) Some browsers says thay have SpeechRecognition class, but when start(), they fails immediately.
 * (2) Safari on iPhone (not iPad) runs wrong when SpeechRecognition.continuous is true
 */
export class SpeechRecognitionWrap {
  private recognizer: any // SpeechRecognition ; this class is not recognized.
  private recognizerState:number = SpeechRecognitionStatus.None
  /**
   * [for iPhone] SpeechRecognition.continuous must always be true. So this property hold intended flag.
   * To avoid iPhone's pitfalls, this class set continuous true always
   * and abort() manually on onresult event handler.
   */
  private shouldBeContinuous: boolean = false

  isAvailable() : boolean {
    return this.recognizer != null
  }

  get lang() : string {
    return this.recognizer?.lang
  }
  set lang(l:string) {
    if (this.recognizer?.lang != null) {
      this.recognizer.lang = l
    }
  }

  get continuous() : boolean {
    if (Util.isIPhone()) { return this.shouldBeContinuous }
    return this.recognizer?.continuous ?? false
  }
  set continuous(c:boolean) {
    this.shouldBeContinuous = c
    if (this.recognizer?.continuous != null && Util.isIPhone() !== true) {
      this.recognizer.continuous = c
    }
  }

  get interimResults() : boolean {
    return this.recognizer?.interimResults ?? false
  }
  set interimResults(i:boolean) {
    if (this.recognizer?.interimResults != null) {
      this.recognizer.interimResults = i
    }
  }

  start() : void {
    if (this.recognizer != null) {
      this.recognizer.start()
    }
  }

  abort() : void {
    if (this.recognizer != null) {
      this.recognizer.abort()
    }
  }

  stop() : void {
    if (this.recognizer != null) {
      this.recognizer.stop()
    }
  }

  onaudiostart: () => void = () => {}
  onaudioend: () => void = () => {}
  onend: () => void = () => {}
  onerror: (ev:any) => void = (e) => {} // SpeechRecognitionErrorEvent (has 'error','message' string properties)
  onnomatch: () => void = () => {}
  onresult: (ev:any) => void = (e) => {} // SpeechRecognitionEvent See https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognitionEvent
  onsoundstart: () => void = () => {}
  onsoundend: () => void = () => {}
  onspeechstart: () => void = () => {}
  onspeechend: () => void = () => {}
  onstart: () => void = () => {}

  /** called when Speech Recognition is not available in this browser */
  ondetectunavailable: () => void = () => {}

  constructor() {
    this.generateRecognizer()
  }

  private generateRecognizer() {
    this.recognizer = 
      ('SpeechRecognition' in window) ? new (window as any).SpeechRecognition()
      : ('webkitSpeechRecognition' in window) ? new (window as any).webkitSpeechRecognition()
      : null
    if (this.recognizer == null) {
      return
    }

    if (Util.isIPhone()) {
      this.recognizer.continuous = true // always true
    }

    this.recognizer.onstart = () => {
      this.recognizerState |= SpeechRecognitionStatus.Start
      this.onstart()
    }
    this.recognizer.onend = () => {
      this.recognizerState &= ~SpeechRecognitionStatus.Start
      this.onend()
    }
    this.recognizer.onaudiostart = () => {
      this.recognizerState |= SpeechRecognitionStatus.AudioStart
      this.onaudiostart()
    }
    this.recognizer.onaudioend = () => {
      this.recognizerState &= ~SpeechRecognitionStatus.AudioStart
      this.onaudioend()
    }
    this.recognizer.onsoundstart = () => {
      this.recognizerState |= SpeechRecognitionStatus.SoundStart
      this.onsoundstart()
    }
    this.recognizer.onsoundend = () => {
      this.recognizerState &= ~SpeechRecognitionStatus.SoundStart
      this.onsoundend()
    }
    this.recognizer.onspeechstart = () => {
      this.recognizerState |= SpeechRecognitionStatus.SpeechStart
      this.onspeechstart()
    }
    this.recognizer.onspeechend = () => {
      this.recognizerState &= ~SpeechRecognitionStatus.SpeechStart
      this.onspeechend()
    }
    this.recognizer.onnomatch = () => {
      this.onnomatch()
    }
    this.recognizer.onresult = (ev:any) => {
      this.onresult(ev)
      if (Util.isIPhone()
        && this.shouldBeContinuous === false 
        && ev.results[ev.results.length-1].isFinal)
      {
        this.recognizer.abort()
      }
    }
    this.recognizer.onerror = (ev: any) => {
      this.recognizer.abort()
      this.recognizer = null
      if (this.recognizerState === SpeechRecognitionStatus.Start) {
        this.ondetectunavailable() // error on "just start" must be "SpeechRecognition is unavailable"
      } else {
        this.generateRecognizer() // re-generate on other errors
      }
      this.onerror(ev)
    }
  }
}

enum SpeechRecognitionStatus {
  None = 0,
  Start = 1 << 0,
  AudioStart = 1 << 1,
  SoundStart = 1 << 2,
  SpeechStart = 1 << 3,
}
