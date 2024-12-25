import { Controller, Get, Query } from '@nestjs/common'
import { MusicsService } from './musics.service'

@Controller('musics')
export class MusicsController {
  constructor(private readonly musicsService: MusicsService) {}

  @Get()
  async findOne(@Query('query') query: string) {
    return await this.musicsService.findByQuery(query)
  }
}
