import { CreateRoomDto } from './dto/create-room.dto'
import { Injectable, Inject } from '@nestjs/common'
import { Music } from 'src/modules/musics/entities/music.entity'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Room } from './entities/room.entity'
import { Cache } from 'cache-manager'

@Injectable()
export class RoomsService {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache, // Inject the cache manager
  ) { }

  private getRoomKey(roomId: string): string {
    return `room:${roomId}` // Unique key for the room in Redis
  }

  // Create a new room in Redis (as cache)
  async createRoom(payload: CreateRoomDto): Promise<string> {
    if (!payload.host) {
      throw new Error('Host is required to create a room')
    }

    const existRoom = await this.getRoomByHost(payload.host)
    if (existRoom) {
      throw new Error('A room already exists for this host')
    }

    const roomId = `${Date.now()}`
    const roomKey = this.getRoomKey(roomId)

    const roomData: Room = {
      id: roomId,
      host: payload.host,
      currentListeners: 0,
      currentMusic: null,
      queues: [],
      previousMusic: [],
      settings: {
        music: {
          loop: false,
          shuffle: false,
          playing: false,
          startTimestamp: null,
        },
        room: {
          password: payload.password || null,
          allowAnyoneControl: false,
        },
      },
    }

    await this.cacheManager.set(roomKey, roomData, 0)
    return roomId
  }

  async deleteRoom(roomId: string): Promise<void> {
    const roomKey = this.getRoomKey(roomId)
    await this.cacheManager.del(roomKey)
  }

  async deleteAllRooms(): Promise<void> {
    const roomKeys = await this.cacheManager.store.keys('room:*')
    for (const roomKey of roomKeys) {
      await this.cacheManager.del(roomKey)
    }
  }

  async getRoomById(roomId: string): Promise<Room | null> {
    const roomKey = this.getRoomKey(roomId)
    const roomData = (await this.cacheManager.get(roomKey)) as Room

    if (!roomData || !roomData.host) {
      return null
    }

    if (roomData.settings.music.playing && roomData.settings.music.startTimestamp) {
      const elapsedTime = (Date.now() - roomData.settings.music.startTimestamp) / 1000

      roomData.settings.music.startTimestamp = Date.now() - (elapsedTime * 1000)
      await this.cacheManager.set(roomKey, roomData)
    }

    return roomData
  }

  async getRoomByHost(host: string): Promise<Room | null> {
    const roomKeys = await this.cacheManager.store.keys('room:*')

    for (const roomKey of roomKeys) {
      const roomData = (await this.cacheManager.get(roomKey)) as Room
      if (roomData?.host === host) {
        return roomData
      }
    }

    return null
  }

  async getAllRooms(): Promise<Room[]> {
    const roomKeys = await this.cacheManager.store.keys('room:*')
    const rooms: Room[] = []

    for (const roomKey of roomKeys) {
      const roomData = (await this.cacheManager.get(roomKey)) as Room
      rooms.push(roomData)
    }

    return rooms
  }

  // Update room in Redis
  async updateRoom(payload: {
    roomId: string
    newRoom: Partial<Room>
  }): Promise<any> {
    const { roomId } = payload

    const roomKey = this.getRoomKey(roomId)
    const roomData = await this.getRoomById(roomId)

    // Merge the new settings with the existing ones
    const updatedRoom = {
      ...roomData,
      ...payload.newRoom,
    }

    // Save the updated room data back in Redis
    await this.cacheManager.set(roomKey, updatedRoom)

    return updatedRoom
  }

  // Add music to queue in Redis
  async addToQueue(roomId: string, music: Music): Promise<any> {
    const roomKey = this.getRoomKey(roomId)
    const roomData = await this.getRoomById(roomId)

    // Check if song is already in the queue
    if (roomData.queues.find((m) => m.id === music.id)) {
      throw new Error('Music is already in the queue')
    }

    // Add music to the queue
    if (!roomData.currentMusic) {
      roomData.currentMusic = music
    } else {
      roomData.queues.push(music)
    }

    await this.cacheManager.set(roomKey, roomData) // Save updated room data in Redis

    return roomData
  }

  // Remove music from queue in Redis
  async removeFromQueue(roomId: string, musicId: string): Promise<any> {
    const roomKey = this.getRoomKey(roomId)
    const roomData = await this.getRoomById(roomId)

    // Remove music from the queue
    roomData.queues = roomData.queues.filter((music: Music) => music.id.videoId !== musicId)
    await this.cacheManager.set(roomKey, roomData)

    return roomData
  }

  async clearQueue(roomId: string): Promise<any> {
    const roomKey = this.getRoomKey(roomId)
    const roomData = await this.getRoomById(roomId)

    roomData.queues = []
    await this.cacheManager.set(roomKey, roomData)

    return roomData
  }

  // Increment listener count in Redis
  async incrementListener(roomId: string): Promise<any> {
    const roomKey = this.getRoomKey(roomId)
    const roomData = await this.getRoomById(roomId)

    roomData.currentListeners += 1
    await this.cacheManager.set(roomKey, roomData)

    return roomData
  }

  // Decrement listener count in Redis
  async decrementListener(roomId: string): Promise<Room | null> {
    const roomKey = this.getRoomKey(roomId)
    const roomData = await this.getRoomById(roomId)

    if (roomData.currentListeners > 0) {
      roomData.currentListeners -= 1
      await this.cacheManager.set(roomKey, roomData)
    }

    return roomData
  }

  // Change room password in Redis
  // async changeRoomPassword(roomId: string, newPassword: string): Promise<any> {
  //   const roomKey = this.getRoomKey(roomId)
  //   const roomData = await this.getRoomById(roomId)

  //   roomData.settings.room.password = newPassword
  //   await this.cacheManager.set(roomKey, roomData)

  //   return roomData
  // }

  async playPreviousMusic(roomId: string): Promise<Room | null> {
    const roomKey = this.getRoomKey(roomId)
    const roomData = await this.getRoomById(roomId)

    if (roomData.previousMusic.length === 0) {
      return null
    }

    const previousMusic = roomData.previousMusic.pop()
    roomData.queues.unshift(roomData.currentMusic)
    roomData.currentMusic = previousMusic

    await this.cacheManager.set(roomKey, roomData)
    return roomData
  }

  async playNextMusic(roomId: string): Promise<Room | null> {
    const roomKey = this.getRoomKey(roomId)
    const roomData = await this.getRoomById(roomId)

    if (!roomData.settings.music.loop && roomData.currentMusic) {
      roomData.previousMusic.push(roomData.currentMusic)
    }

    console.log("Queue length: ", roomData.queues.length)

    if (roomData.queues.length === 0) {
      roomData.currentMusic = null
      roomData.settings.music.playing = false
      roomData.settings.music.startTimestamp = null

      await this.cacheManager.set(roomKey, roomData)
      return null
    }

    let nextMusic: Music

    if (roomData.settings.music.loop) {
      nextMusic = roomData.currentMusic
    } else {
      if (roomData.settings.music.shuffle) {
        // Use Fisher-Yates shuffle for better randomization
        for (let i = roomData.queues.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
            ;[roomData.queues[i], roomData.queues[j]] = [
              roomData.queues[j],
              roomData.queues[i],
            ]
        }
      }

      nextMusic = roomData.queues.shift()
    }

    roomData.currentMusic = nextMusic

    await this.cacheManager.set(roomKey, roomData)
    return roomData
  }

  async updatePlayback(
    roomId: string,
    currentTime: number,
    isPlaying: boolean,

  ) {

    const roomKey = this.getRoomKey(roomId)
    const roomData = await this.getRoomById(roomId)

    // Only update timestamp when starting playback
    if (isPlaying) {
      roomData.settings.music.startTimestamp = Date.now() - (currentTime * 1000)
    } else if (!isPlaying) {
      // Store the current position when pausing

      roomData.settings.music.startTimestamp = currentTime
    }

    roomData.settings.music.playing = isPlaying
    await this.cacheManager.set(roomKey, roomData)
    return roomData
  }

  async continuePlayback(
    roomId: string,
    isPlaying: boolean,
  ) {

    const roomKey = this.getRoomKey(roomId)
    const roomData = await this.getRoomById(roomId)

    roomData.settings.music.playing = isPlaying

    if (roomData.settings.music.startTimestamp === null) {
      roomData.settings.music.startTimestamp = Date.now()
    }

    await this.cacheManager.set(roomKey, roomData)
    return roomData
  }

  async handleSeek(roomId: string, currentTime: number) {
    const roomKey = this.getRoomKey(roomId)
    const roomData = await this.getRoomById(roomId)

    if (roomData.settings.music.playing) {
      roomData.settings.music.startTimestamp = Date.now() - (currentTime * 1000)
    } else {
      roomData.settings.music.startTimestamp = currentTime
    }

    await this.cacheManager.set(roomKey, roomData)
    return roomData
  }

  async saveOnExit(roomId: string) {
    const roomKey = this.getRoomKey(roomId)
    const roomData = await this.getRoomById(roomId)

    console.log("Saving playback state on exit")
    if (roomData.currentListeners === 0) {
      // Save playback state when the room becomes empty

      const currentTime = roomData.settings.music.playing
        ? (Date.now() - roomData.settings.music.startTimestamp) / 1000
        : 0

      roomData.settings.music.startTimestamp = currentTime
      roomData.settings.music.playing = false

      console.log(`Last user left room ${roomId}. Playback saved at ${currentTime}s.`)
      await this.cacheManager.set(roomKey, roomData)

      setTimeout(async () => {
        const roomData = await this.getRoomById(roomId)

        console.log("Room data: ", roomData)
        if (roomData && roomData.currentListeners === 0) {
          await this.deleteRoom(roomId)
          console.log(`Room ${roomId} deleted due to inactivity.`)
        }
      }, 60000) // Delete room after 60 seconds of no activity
    }
  }
}
