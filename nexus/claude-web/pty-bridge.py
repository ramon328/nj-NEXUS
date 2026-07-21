#!/usr/bin/env python3
# pty-bridge.py — Crea un PTY real y ejecuta un comando dentro, haciendo de puente
# entre stdin/stdout (pipes desde Node) y el PTY. Así Node <-> (pipes) <-> Python
# <-> (PTY real) <-> claude. Sin dependencias (módulo `pty` de la stdlib).
#
# Uso:  python3 pty-bridge.py <cols> <rows> <cmd> [args...]
import os, sys, pty, select, struct, fcntl, termios, signal

cols = max(20, min(400, int(sys.argv[1])))
rows = max(10, min(200, int(sys.argv[2])))
cmd = sys.argv[3:] or ["/bin/bash", "-l"]

pid, fd = pty.fork()
if pid == 0:
    # Hijo: fija el tamaño de la ventana del PTY y ejecuta el comando.
    try:
        fcntl.ioctl(0, termios.TIOCSWINSZ, struct.pack("HHHH", rows, cols, 0, 0))
    except Exception:
        pass
    os.environ["TERM"] = os.environ.get("TERM", "xterm-256color")
    try:
        os.execvp(cmd[0], cmd)
    except Exception as e:
        sys.stderr.write("exec falló: %s\n" % e)
        os._exit(127)

# Padre: fija el tamaño en el master y relaya master <-> stdin/stdout (pipes de Node).
try:
    fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack("HHHH", rows, cols, 0, 0))
except Exception:
    pass

STDIN, STDOUT = 0, 1
try:
    while True:
        r, _, _ = select.select([fd, STDIN], [], [])
        if fd in r:
            try:
                data = os.read(fd, 65536)
            except OSError:
                break
            if not data:
                break
            os.write(STDOUT, data)
        if STDIN in r:
            try:
                data = os.read(STDIN, 65536)
            except OSError:
                break
            if not data:
                break
            os.write(fd, data)
except KeyboardInterrupt:
    pass
finally:
    try:
        os.kill(pid, signal.SIGKILL)
    except Exception:
        pass
