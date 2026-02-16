declare module '@mhaberler/capacitor-zeroconf-nsd' {
  /**
   * Values commonly found inside DNS-SD TXT records.
   * Keep flexible to match runtime variations from different platforms.
   */
  export type TxtRecordValue = string | number | boolean | string[] | Record<string, string> | null
  export type ZeroConfTxtRecord = Record<string, TxtRecordValue>

  /** Core service object returned by the native plugin. */
  export interface ZeroConfService {
    name?: string
    type?: string
    domain?: string
    fullname?: string
    hostname?: string
    host?: string
    port?: number
    ipv4Addresses?: string[]
    ipv6Addresses?: string[]
    addresses?: string[]
    txtRecord?: ZeroConfTxtRecord
    rawTxt?: string[]
    subtypes?: string[]
    interfaceIndex?: number
    // vendor-specific extras allowed
    [key: string]: any
  }

  /** Possible watch actions emitted by the plugin. */
  export type ZeroConfAction = 'added' | 'resolved' | 'removed' | 'updated'

  /** Options object used when starting a watcher. */
  export interface ZeroConfWatchOptions {
    type: string
    domain?: string
    addressFamily?: 'ipv4' | 'ipv6' | 'any' | string
    interfaceIndex?: number
    timeout?: number
  }

  export interface ZeroConfEvent {
    action: ZeroConfAction
    service: ZeroConfService
  }

  /** Start watching for services. Callback receives add/resolve/remove events. */
  export function watch(
    opts: ZeroConfWatchOptions,
    callback: (event: ZeroConfEvent | null) => void
  ): Promise<void>

  /** Stop watching previously-watched types. */
  export function unwatch(opts: { type: string; domain?: string }): Promise<void> | void

  export const ZeroConf: {
    watch: typeof watch
    unwatch: typeof unwatch
  }

  export default ZeroConf
}
