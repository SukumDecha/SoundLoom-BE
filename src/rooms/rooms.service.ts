import { Injectable, Inject } from '@nestjs/common';
import { Music } from 'src/musics/entities/music.entity';
import { CacheStore } from '@nestjs/cache-manager';
import { Room } from './entities/room.entity';

@Injectable()
export class RoomsService {
  constructor(
    @Inject('CACHE_MANAGER') private readonly cacheManager: CacheStore, // Inject the cache manager
  ) {}

  private getRoomKey(roomId: string): string {
    return `room:${roomId}`; // Unique key for the room in Redis
  }

  // Create a new room in Redis (as cache)
  async createRoom(host: string, password: string): Promise<string> {
    const roomId = `${Date.now()}`; // Unique room ID (based on timestamp)
    const roomKey = this.getRoomKey(roomId);

    const roomData = {
      host,
      currentListeners: 0,
      currentMusic: null,
      queues: [],
      settings: {
        music: {
          loop: false,
          shuffle: false,
          volume: 50, // Default volume
        },
        room: {
          password,
          allowAnyoneControl: false,
        },
      },
    };

    // Save the room data in Redis (Cache)
    await this.cacheManager.set(roomKey, roomData, { ttl: 0 }); // No TTL for now, can be adjusted

    return roomId;
  }

  // Get room by ID from Redis
  async getRoomById(roomId: string): Promise<any> {
    const roomKey = this.getRoomKey(roomId);
    const roomData = (await this.cacheManager.get(roomKey)) as Room;

    if (!roomData || !roomData.host) {
      throw new Error(`Room with ID ${roomId} not found`);
    }

    return roomData;
  }

  // Update room settings in Redis
  async updateRoomSettings(
    roomId: string,
    settings: Partial<any>,
  ): Promise<any> {
    const roomKey = this.getRoomKey(roomId);
    const roomData = await this.getRoomById(roomId);

    // Merge the new settings with the existing ones
    const updatedSettings = { ...roomData.settings, ...settings };
    roomData.settings = updatedSettings;

    // Save the updated room data back in Redis
    await this.cacheManager.set(roomKey, roomData);

    return roomData;
  }

  // Add music to queue in Redis
  async addToQueue(roomId: string, music: Music): Promise<any> {
    const roomKey = this.getRoomKey(roomId);
    const roomData = await this.getRoomById(roomId);

    // Add music to the queue
    roomData.queues.push(music);
    await this.cacheManager.set(roomKey, roomData); // Save updated room data in Redis

    return roomData;
  }

  // Remove music from queue in Redis
  async removeFromQueue(roomId: string, musicId: string): Promise<any> {
    const roomKey = this.getRoomKey(roomId);
    const roomData = await this.getRoomById(roomId);

    // Remove music from the queue
    roomData.queues = roomData.queues.filter((music) => music.id !== musicId);
    await this.cacheManager.set(roomKey, roomData);

    return roomData;
  }

  // Increment listener count in Redis
  async incrementListener(roomId: string): Promise<any> {
    const roomKey = this.getRoomKey(roomId);
    const roomData = await this.getRoomById(roomId);

    roomData.currentListeners += 1;
    await this.cacheManager.set(roomKey, roomData);

    return roomData;
  }

  // Decrement listener count in Redis
  async decrementListener(roomId: string): Promise<any> {
    const roomKey = this.getRoomKey(roomId);
    const roomData = await this.getRoomById(roomId);

    if (roomData.currentListeners > 0) {
      roomData.currentListeners -= 1;
      await this.cacheManager.set(roomKey, roomData);
    }

    return roomData;
  }

  // Change room password in Redis
  async changeRoomPassword(roomId: string, newPassword: string): Promise<any> {
    const roomKey = this.getRoomKey(roomId);
    const roomData = await this.getRoomById(roomId);

    roomData.settings.room.password = newPassword;
    await this.cacheManager.set(roomKey, roomData);

    return roomData;
  }
}
