import { SharedModule } from './shared/shared.module'
import { Module } from '@nestjs/common'
import { MusicsModule } from './modules/musics/musics.module'
import { RoomsModule } from './modules/rooms/rooms.module'

@Module({
  imports: [MusicsModule, RoomsModule, SharedModule],
})
export class AppModule {}
