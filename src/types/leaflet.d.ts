declare module 'leaflet' {
  export class Icon {
    static Default: {
      mergeOptions(options: {
        iconRetinaUrl?: string
        iconUrl?: string
        shadowUrl?: string
      }): void
    }
  }
}