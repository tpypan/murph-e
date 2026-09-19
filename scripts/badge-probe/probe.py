"""Day-one badge checks over USB serial. Run: uv run --with pyserial probe.py [push|listen|apps]"""
import glob, sys, time, serial

def find_port():
    ports = sorted(glob.glob("/dev/cu.usbmodem*"))
    if not ports:
        sys.exit("no /dev/cu.usbmodem* port; is the badge plugged in with a data cable?")
    return ports[0]

def wait_for(ser, token, timeout, log=True):
    buf, t0 = b"", time.time()
    while time.time() - t0 < timeout:
        chunk = ser.read(ser.in_waiting or 1)
        if chunk:
            buf += chunk
            if log:
                sys.stdout.write(chunk.decode("utf-8", "replace")); sys.stdout.flush()
            if token.encode() in buf:
                return buf.decode("utf-8", "replace")
    raise TimeoutError(f"no {token!r} within {timeout}s; got {buf[-300:]!r}")

def send(ser, line):
    ser.write((line + "\r").encode())

def prompt(ser, timeout=3):
    ser.reset_input_buffer()
    send(ser, "")
    return wait_for(ser, "badge> ", timeout)

def cmd(ser, line, timeout=5):
    ser.reset_input_buffer()
    send(ser, line)
    return wait_for(ser, "badge> ", timeout)

def put(ser, remote, data: bytes):
    ser.reset_input_buffer()
    send(ser, f"put {remote} {len(data)}")
    wait_for(ser, "READY", 5)
    send_bytes(ser, data)
    wait_for(ser, f"OK {len(data)}", 20)

def send_bytes(ser, data: bytes, chunk=128, pause=0.02):
    # The badge's RX ring is 256 bytes; one big write wedges cmd_put.
    for i in range(0, len(data), chunk):
        ser.write(data[i:i + chunk])
        if i + chunk < len(data):
            time.sleep(pause)

def resync(ser, pending: int):
    # Feed a wedged put the bytes it is still waiting for, then find the prompt.
    if pending > 0:
        send_bytes(ser, bytes(pending))
    for _ in range(3):
        try:
            return prompt(ser, 1.5)
        except TimeoutError:
            pass
    raise TimeoutError("badge did not resync")

def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "apps"
    port = find_port()
    print(f"[probe] port {port}")
    ser = serial.Serial(port, 115200, timeout=0.1)
    t0 = time.time()
    if mode == "listen":
        print("[probe] listening 60 s; open the app and press buttons")
        end = time.time() + 60
        while time.time() < end:
            chunk = ser.read(ser.in_waiting or 1)
            if chunk:
                sys.stdout.write(chunk.decode("utf-8", "replace")); sys.stdout.flush()
        return
    prompt(ser)
    print(f"\n[probe] prompt answered in {time.time()-t0:.2f}s")
    if mode == "apps":
        cmd(ser, "apps")
        return
    if mode == "resync":
        resync(ser, int(sys.argv[2]) if len(sys.argv) > 2 else 0)
        print("\n[probe] resynced")
        return
    if mode == "push":
        slug = "arcadetest"
        d = f"/littlefs/apps/{slug}"
        cmd(ser, f"mkdir {d}")
        for name in ("manifest.cfg", "main.lua"):
            put(ser, f"{d}/{name}", open(name, "rb").read())
            print(f"\n[probe] pushed {name}")
        ser.reset_input_buffer()
        send(ser, "reload")
        wait_for(ser, "reload:", 8)
        print(f"\n[probe] push + reload done in {time.time()-t0:.2f}s")

main()
