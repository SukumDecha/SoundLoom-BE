export class Music {
  snippet: {
    title: string
    channelTitle: string
  }
  thumbnails: {
    [key: string]: {
      url: string
      width: number
      height: number
    }
  }
  id: {
    videoId: string
  }
}
