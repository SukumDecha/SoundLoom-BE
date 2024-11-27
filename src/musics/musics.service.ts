import { Injectable } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs'
import { AxiosError } from 'axios'

@Injectable()
export class MusicsService {
  constructor(private readonly httpService: HttpService) {}

  async findByQuery(query: string): Promise<any> {
    console.log('ENV KEY', process.env.YOUTUBE_API_KEY)
    try {
      const { data } = await firstValueFrom(
        this.httpService.get('https://www.googleapis.com/youtube/v3/search', {
          params: {
            part: 'snippet',
            maxResults: 10,
            q: query,
            type: 'video',
            key: process.env.YOUTUBE_API_KEY,
          },
        }),
      )
      return data
    } catch (error) {
      if (error instanceof AxiosError) {
        // Customize the error response for better debugging
        throw new Error(
          `API call failed: ${error.response?.status} ${error.response?.statusText}. ${JSON.stringify(error.response?.data)}`,
        )
      }
      throw new Error(`An unexpected error occurred: ${error.message}`)
    }
  }
}
