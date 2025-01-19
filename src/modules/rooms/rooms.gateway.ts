import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { RoomsService } from './rooms.service'
import { CreateRoomDto } from './dto/create-room.dto'
import { UpdateRoomDto } from './dto/update-room.dto'
import { Music } from 'src/modules/musics/entities/music.entity'

@WebSocketGateway(4001, {
  namespace: 'rooms',
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
})
export class RoomGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private clientRooms: Map<string, string> = new Map() // Tracks client-to-room associations

  constructor(private readonly roomService: RoomsService) { }

  @WebSocketServer() server: Server

  // Connection Handling
  async handleConnection(client: Socket) {
    console.log('Client connected', client.id)
  }

  async handleDisconnect(client: Socket) {
    console.log('Client disconnected', client.id)

    // Optional: Remove listener from room if applicable
    const roomId = this.clientRooms.get(client.id)

    if (roomId) {
      const updatedRoom = await this.roomService.decrementListener(roomId)

      await this.roomService.saveOnExit(roomId)

      // Update room members with the new listener count
      this.server.emit('roomUpdated', updatedRoom)

      // Remove client from the tracking map
      this.clientRooms.delete(client.id)
    }
  }

  // Room Creation
  @SubscribeMessage('createRoom')
  async createRoom(client: Socket, payload: CreateRoomDto) {
    try {
      const roomId = await this.roomService.createRoom(payload)


      client.join(roomId)

      client.emit('roomCreated', { roomId })

      this.server.emit('newRoomCreated', { roomId })
      return { roomId }
    } catch (error) {
      client.emit('error', { message: error.message })
    }
  }

  // Delete Room
  @SubscribeMessage('deleteRoom')
  async deleteRoom(client: Socket, roomId: string) {
    try {
      await this.roomService.deleteRoom(roomId)

      this.server.to(roomId).emit('roomDeleted', { roomId })

      this.server.emit('roomDeleted', roomId)
    } catch (error) {
      client.emit('error', { message: error.message })
    }
  }

  @SubscribeMessage('deleteAllRooms')
  async deleteAllRooms(client: Socket) {
    try {
      await this.roomService.deleteAllRooms()

      this.server.emit('allRoomsDeleted')
    } catch (error) {
      client.emit('error', { message: error.message })
    }
  }

  // Get All Rooms
  @SubscribeMessage('getAllRooms')
  async getAllRooms(client: Socket) {
    try {
      const rooms = await this.roomService.getAllRooms()
      client.emit('allRooms', rooms)

      return rooms
    } catch (error) {
      client.emit('error', { message: error.message })
    }
  }

  // Join Room
  @SubscribeMessage('joinRoom')
  async joinRoom(
    client: Socket,
    payload: { roomId: string; password?: string },
  ) {
    try {
      const room = await this.roomService.getRoomById(payload.roomId)

      // Check password if set
      if (
        room.settings.room.password &&
        room.settings.room.password !== payload.password
      ) {
        client.emit('error', { message: 'Incorrect room password' })
        return
      }

      // Join room and increment listeners
      client.join(payload.roomId)
      this.clientRooms.set(client.id, payload.roomId)

      const updatedRoom = await this.roomService.incrementListener(
        payload.roomId,
      )

      // Broadcast to other room members
      // this.server.to(payload.roomId).emit('userJoined', {
      //   clientId: client.id,
      // })

      // Update to client
      // client.emit('joinedRoom', updatedRoom)

      // Update room members with the new listener count
      this.server.emit('roomUpdated', updatedRoom)

      client.emit('joinedRoom', room)
      return room
    } catch (error) {
      client.emit('error', { message: error.message })
    }
  }

  // Leave Room
  @SubscribeMessage('leaveRoom')
  async leaveRoom(client: Socket, roomId: string) {
    try {
      // Leave room and decrement listeners
      client.leave(roomId)
      this.clientRooms.delete(client.id)

      const updatedRoom = await this.roomService.decrementListener(roomId)

      await this.roomService.saveOnExit(roomId)

      // Broadcast to other room members
      // this.server.to(roomId).emit('listenerLeft', { clientId: client.id })

      // Broadcast updated room to all users
      this.server.emit('roomUpdated', updatedRoom)

      client.emit('roomLeft')
    } catch (error) {
      client.emit('error', { message: error.message })
    }
  }

  // Update Room Settings
  @SubscribeMessage('updateRoom')
  async updateRoom(client: Socket, payload: UpdateRoomDto) {
    try {
      const room = await this.roomService.getRoomById(payload.roomId)

      const updatedRoom = await this.roomService.updateRoom({
        roomId: payload.roomId,
        newRoom: {
          ...room,
          ...payload.updatedRoom,
        },
      })

      // Broadcast settings update to all room members
      // this.server.to(payload.roomId).emit('roomUpdated', updatedRoom)

      // Broadcast updated room to all users
      this.server.emit('roomUpdated', updatedRoom)

      return updatedRoom
    } catch (error) {
      client.emit('error', { message: error.message })
    }
  }

  // Add Music to Queue
  @SubscribeMessage('addToQueue')
  async addToQueue(client: Socket, payload: { roomId: string; music: Music }) {
    try {
      const updatedRoom = await this.roomService.addToQueue(
        payload.roomId,
        payload.music,
      )

      // Broadcast queue update to all room members
      this.server.to(payload.roomId).emit('queueUpdated', updatedRoom)

      // Broadcast updated room to all users
      this.server.emit('roomUpdated', updatedRoom)

      return updatedRoom
    } catch (error) {
      client.emit('error', { message: error.message })
    }
  }

  // Remove Music from Queue
  @SubscribeMessage('removeFromQueue')
  async removeFromQueue(
    client: Socket,
    payload: { roomId: string; musicId: string },
  ) {
    try {
      const updatedRoom = await this.roomService.removeFromQueue(
        payload.roomId,
        payload.musicId,
      )

      // Broadcast queue update to all room members
      this.server.to(payload.roomId).emit('queueUpdated', updatedRoom)

      // Broadcast updated room to all users
      this.server.emit('roomUpdated', updatedRoom)

      return updatedRoom
    } catch (error) {
      client.emit('error', { message: error.message })
    }
  }

  // Clear Queue
  @SubscribeMessage('clearQueue')
  async clearQueue(client: Socket, roomId: string) {
    try {
      const updatedRoom = await this.roomService.clearQueue(roomId)

      // Broadcast queue update to all room members
      this.server.to(roomId).emit('queueUpdated', updatedRoom)

      // Broadcast updated room to all users
      this.server.emit('roomUpdated', updatedRoom)

      return updatedRoom
    } catch (error) {
      client.emit('error', { message: error.message })
    }
  }

  @SubscribeMessage('playNextMusic')
  async playNextMusic(client: Socket, roomId: string) {
    try {
      const updatedRoom = await this.roomService.playNextMusic(roomId)

      // Broadcast next music to all room members
      this.server.to(roomId).emit('nextMusicReady', updatedRoom)

      // Broadcast updated room to all users
      this.server.emit('roomUpdated', updatedRoom)

      return updatedRoom
    } catch (error) {
      client.emit('error', { message: error.message })
    }
  }

  // @SubscribeMessage('startPlaying')
  // async startPlaying(client: Socket, roomId: string) {
  //   try {
  //     const updatedRoom = await this.roomService.startPlaying(roomId)

  //     console.log("startPlaying", updatedRoom.settings.music.startTimestamp)

  //     // Broadcast to all clients in the room
  //     this.server.to(roomId).emit('musicStarted', { startTimestamp: updatedRoom.settings.music.startTimestamp })

  //     return updatedRoom
  //   } catch (error) {
  //     client.emit('error', { message: error.message })
  //   }
  // }

  // @SubscribeMessage('pausePlaying')
  // async pausePlaying(client: Socket, roomId: string) {
  //   try {
  //     const updatedRoom = await this.roomService.pausePlaying(roomId)

  //     // Broadcast to all clients in the room
  //     this.server.to(roomId).emit('musicPaused')

  //     return updatedRoom
  //   } catch (error) {
  //     client.emit('error', { message: error.message })
  //   }
  // }

  @SubscribeMessage('updatePlayback')
  async updatePlayback(client: Socket, payload: {
    roomId: string;
    currentTime: number;
    isPlaying: boolean;
  }) {
    try {
      const updatedRoom = await this.roomService.updatePlayback(payload.roomId, payload.currentTime, payload.isPlaying)

      // Broadcast to all clients in room except sender
      this.server.emit('roomUpdated', updatedRoom)

      this.server.to(payload.roomId).emit('playbackUpdated', {
        currentTime: payload.currentTime,
        isPlaying: payload.isPlaying,
        startTimestamp: updatedRoom.settings.music.startTimestamp,
      })


      return updatedRoom.settings.music.startTimestamp
    } catch (error) {
      client.emit('error', { message: error.message })
    }
  }


  // Change Room Password
  // @SubscribeMessage('changeRoomPassword')
  // async changeRoomPassword(
  //   client: Socket,
  //   payload: { roomId: string; newPassword: string },
  // ) {
  //   try {
  //     const updatedRoom = await this.roomService.changeRoomPassword(
  //       payload.roomId,
  //       payload.newPassword,
  //     )

  //     // Broadcast password change to all room members
  //     this.server.to(payload.roomId).emit('roomPasswordChanged', updatedRoom)

  //     // Broadcast updated room to all users
  //     this.server.emit('roomSettingsUpdated', updatedRoom)

  //     return updatedRoom
  //   } catch (error) {
  //     client.emit('error', { message: error.message })
  //   }
  // }
}
