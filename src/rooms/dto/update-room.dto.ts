import { PartialType } from '@nestjs/mapped-types';
import { Room } from '../entities/room.entity';

export class UpdateRoomDto extends PartialType(Room) {}
