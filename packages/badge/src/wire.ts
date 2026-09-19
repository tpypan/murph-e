import { SerialPort } from 'serialport'

// The seam under the hub. A Wire is one open byte stream to a badge console;
// a Transport lists badges and opens wires to them. SerialTransport is the
// real thing; FakeTransport (fake.ts) speaks the same protocol in-process.

export interface Wire {
  readonly path: string
  readonly isOpen: boolean
  /** Resolves once the bytes have left the process (drained). */
  write(buf: Uint8Array): Promise<void>
  onData(fn: (chunk: string) => void): void
  onClose(fn: () => void): void
  close(): Promise<void>
}

export interface PortInfo {
  path: string
  /** The badge's MAC from the USB descriptor, or the fake's serial. */
  serial: string
}

export interface Transport {
  readonly name: string
  list(): Promise<PortInfo[]>
  open(path: string): Promise<Wire>
}

// Espressif's USB JTAG/serial debug unit, which is what an ESP32-C3 badge is.
const VENDOR_ID = '303a'
const PRODUCT_ID = '1001'
const BAUD = 115200

export class SerialWire implements Wire {
  readonly path: string
  private port: SerialPort
  private dataHandlers = new Set<(chunk: string) => void>()
  private closeHandlers = new Set<() => void>()
  private closed = false

  private constructor(path: string, port: SerialPort) {
    this.path = path
    this.port = port
    port.on('data', (buf: Buffer) => {
      const text = buf.toString('utf8')
      for (const h of this.dataHandlers) h(text)
    })
    port.on('close', () => this.handleClose())
    port.on('error', () => this.handleClose())
  }

  static open(path: string): Promise<SerialWire> {
    return new Promise((resolve, reject) => {
      const port = new SerialPort({ path, baudRate: BAUD, autoOpen: false })
      port.open((err) => (err ? reject(err) : resolve(new SerialWire(path, port))))
    })
  }

  get isOpen(): boolean {
    return !this.closed && this.port.isOpen
  }

  write(buf: Uint8Array): Promise<void> {
    return new Promise((resolve, reject) => {
      this.port.write(Buffer.from(buf), (err) =>
        err ? reject(err) : this.port.drain(() => resolve()),
      )
    })
  }

  onData(fn: (chunk: string) => void): void {
    this.dataHandlers.add(fn)
  }

  onClose(fn: () => void): void {
    this.closeHandlers.add(fn)
  }

  private handleClose(): void {
    if (this.closed) return
    this.closed = true
    for (const h of this.closeHandlers) h()
  }

  close(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.port.isOpen) return resolve()
      this.port.close(() => resolve())
    })
  }
}

export class SerialTransport implements Transport {
  readonly name = 'serial'

  async list(): Promise<PortInfo[]> {
    const ports = await SerialPort.list()
    return (
      ports
        .filter(
          (p) =>
            (p.vendorId ?? '').toLowerCase() === VENDOR_ID &&
            (p.productId ?? '').toLowerCase() === PRODUCT_ID,
        )
        // macOS lists tty.*; cu.* is the right one to open (no carrier wait).
        .map((p) => ({
          path: p.path.replace('/dev/tty.', '/dev/cu.'),
          serial: p.serialNumber ?? '',
        }))
    )
  }

  open(path: string): Promise<Wire> {
    return SerialWire.open(path)
  }
}
