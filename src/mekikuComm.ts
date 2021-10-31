import Peer from 'skyway-js'
import {SfuRoom, MeshRoom} from 'skyway-js'
import LogLevel from 'skyway-js'
import Log from "./log"
import {Content, ContentClass, ContentToSend, ContentToSendClass} from './content'
import LoginInfo from "./loginInfo"
import { Util } from "./util"

export class MekikuCommEvents {
  /** called when Peer-ID confirmed */
  onPeerIdAcquired: (id:string) => void = (id) => {}
  /** called when error occured on Peer level */
  onPeerError: (err:any) => void = (err) => {}
  /** called when someone sends a message */
  onReceived: (data:Content) => void = (d) => {}
  /** called when you joined a room */
  onJoinedRoom: () => void = () => {}
  /** called when you left the room */
  onLeftRoom: () => void = () => {}
  /** called when someone joined the room you are in */
  onSomeoneJoined: (id:string) => void = (id) => {}
  /** called when someone left the room you are in */
  onSomeoneLeft: (id:string) => void = (id) => {}
  logger: (msg:string) => void = (msg) => {}
}

export interface MekikuCommOpenOption {
  debugLevel?: number
  id?: string
  handleOpen?: (id:string) => void
}

class MekikuCommOpenOptionClass implements MekikuCommOpenOption {
  debugLevel: number = 2
  id?: string
  handleOpen: (id:string) => void = id => {}
}

/**
 * Communication class for mekiku-web
 */
class MekikuComm {
  private peer: Peer | undefined
  private room: SfuRoom | MeshRoom | null | undefined
  private info: LoginInfo | undefined
  private openOption?: MekikuCommOpenOption
  isOpen() : boolean {
    return this.peer?.open === true
  }
  getInfo() : LoginInfo | undefined {
    return this.info == null ? undefined : LoginInfo.clone(this.info)
  }
  isInRoom() : boolean {
    return this.info != null
  }

  /** called when Peer-ID confirmed */
  onPeerIdAcquired: (id:string) => void = (id) => {}
  /** called when error occured on Peer level */
  onPeerError: (err:any) => void = (err) => {}
  /** called when someone sends a message */
  onReceived: (data:Content) => void = (d) => {}
  /** called when you joined a room */
  onJoinedRoom: () => void = () => {}
  /** called when you left the room */
  onLeftRoom: () => void = () => {}
  /** called when someone joined the room you are in */
  onSomeoneJoined: (id:string) => void = (id) => {}
  /** called when someone left the room you are in */
  onSomeoneLeft: (id:string) => void = (id) => {}
  logger: (msg:string) => void = (msg) => {}

  constructor(eventHandlers?:MekikuCommEvents) {
    if (eventHandlers != null) {
      this.onPeerIdAcquired = eventHandlers.onPeerIdAcquired
      this.onPeerError = eventHandlers.onPeerError
      this.onJoinedRoom = eventHandlers.onJoinedRoom
      this.onLeftRoom = eventHandlers.onLeftRoom
      this.onReceived = eventHandlers.onReceived
      this.onSomeoneJoined = eventHandlers.onSomeoneJoined
      this.onSomeoneLeft = eventHandlers.onSomeoneLeft
      this.logger = eventHandlers.logger
    }
  }

  /**
   * Open connection with signaling server (if not opened).
   * @param key Skyway API key
   * @param debugLevel debug level (NONE=0, ERROR=1, WARN=2, FULL=3)
   * @param id [option] Explicit peer-id
   */
  open(key: string, option?:MekikuCommOpenOption) {
    if (this.peer?.open === true) {
      // Log.w('Info',`comm.open : old peer(id=${this.peer.id}) remains. destroying...`)
      this.peer.destroy()
    }
    this.openOption = { ...new MekikuCommOpenOptionClass(), ...option }
    const opt = {
      key: key,
      debug: this.openOption.debugLevel ?? 1 as any,
    }
    if (this.openOption.id != null) {
      // Log.w('Info',`comm.open : construct new peer(id=${this.openOption.id})`)
      const debugLevel = Math.min(Math.max(this.openOption.debugLevel ?? 1, 0), 3)
      this.peer = new Peer(this.openOption.id, opt)
    } else {
      // Log.w('Info',`comm.open : construct new peer(id: set by skyway)`)
      this.peer = new Peer(opt)
    }
    this.setPeerEvents(this.peer)
  }

  /**
   * Join room.
   * @param room_name name of room to join
   * @param mode connecting mode. "sfu" or "mesh" is available.
   * @returns Promise
   */
  async joinRoom(info:LoginInfo, mode="sfu") : Promise<void> {
    if (this.peer == null) {
      Log.w('Error','peer is null.')
      throw new Error('peer is null')
    }
    if (!Util.isRoomNameLegit(info.room)) {
      Log.w('Error', `Illegal room name:[${info.room}]`)
      throw new Error('Illegal room name')
    }

    const modeConnection = ((m:string) => {
      if (m === 'sfu' || m === 'mesh') return m
      return 'sfu'
    })(mode)
    const roomName = await this.makeRoomName(info.room, info.pass)
    let r: MeshRoom | SfuRoom | null
    if (modeConnection === 'mesh') {
      r = this.peer.joinRoom(roomName, {mode:'mesh'}) as MeshRoom
    } else {
      r = this.peer.joinRoom(roomName, {mode:'sfu'}) as SfuRoom
    }
    if (r == null) {
      Log.w('Error','joinRoom failed.')
      throw new Error('joinRoom failed.')
    }
    this.info = LoginInfo.clone(info)

    this.room = r
    this.setRoomEvents(this.room)
    return
  }

  private async makeRoomName(room:string, pass:string) : Promise<string> {
    if (pass === '') {
      return room
    }
    const digest = await Util.digestMessage(pass)
    return room + '*' + digest
  }

  /**
   * Leave room
   */
  leaveRoom() {
    if (this.room != null) {
      this.room.close()
    }
  }

  /**
   * send message to all room members (except self)
   * @param data object to send
   */
  send_room(data:ContentToSend) : void {
    const name = this.info?.name ?? ""
    if (this.room != null) {
      // Log.w('Info',`send data:${JSON.stringify(d)}`)
      this.room?.send(data)
    } else [
      // Log.w('Info',`(no room, not sent) data:${JSON.stringify(d)}`)
    ]
  }

  private setPeerEvents(p:Peer) {
    p.on('open', id => {
      // Log.w('Info',`peer opened id=${id}`)
      if (this.openOption?.handleOpen != null) {
        this.openOption.handleOpen(id)
        delete this.openOption
      }
      this.onPeerIdAcquired(id)
    })
    p.on('close', () => {
      // Log.w('Info',`peer closed`)
    })
    p.on('connection', conn => {
      // Log.w('Info',`peer connected from ${JSON.stringify(conn)}`)
    })
    p.on('error', err => {
      Log.w('Error',`peer error (${(err as any).type}) <${err.message}>`)
      this.onPeerError(err)
    })
  }

  private setRoomEvents(r:SfuRoom|MeshRoom) {
    r.on('open', () => {
      // Log.w('Info',`room opened`)
      this.onJoinedRoom()
    })
    r.on('peerJoin', peerId => {
      // Log.w('Info',`room : ${peerId} joined`)
      this.onSomeoneJoined(peerId)
    })
    r.on('peerLeave', peerId => {
      // Log.w('Info',`room : ${peerId} left`)
      this.onSomeoneLeft(peerId)
    })
    r.on('data', ({src,data}) => {
      const t = Date.now()
      // Log.w('Info',`room: data from ${src} : ${JSON.stringify(data)}`)
      const d = ContentClass.fromAny(src,data)
      if (d != null) {
        this.onReceived(d)
      }
    })
    r.on('close', () => {
      // Log.w('Info',`room closed`)
      delete this.room
      delete this.info
      this.peer?.destroy()
      this.onLeftRoom()
    })
  }
}

export default MekikuComm
