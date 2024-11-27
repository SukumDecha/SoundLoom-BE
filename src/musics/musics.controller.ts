import { Controller, Get, Param } from '@nestjs/common'
import { MusicsService } from './musics.service'

@Controller('musics')
export class MusicsController {
  constructor(private readonly musicsService: MusicsService) {}

  @Get()
  findOne(@Param('query') query: string) {
    return this.musicsService.findByQuery(query)
  }
}
