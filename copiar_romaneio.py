import time
import sys
import os
import ctypes
import psutil
import win32gui
import win32process
import win32con
import pyperclip
import subprocess

user32 = ctypes.windll.user32
ARQUIVO_TEMP = os.path.join(os.environ['TEMP'], 'romaneio_copiado.txt')

def encontrar_hwnd_notepad():
    resultado = []
    def callback(hwnd, _):
        if win32gui.IsWindowVisible(hwnd):
            _, pid = win32process.GetWindowThreadProcessId(hwnd)
            try:
                if psutil.Process(pid).name().lower() == 'notepad.exe':
                    resultado.append(hwnd)
            except:
                pass
    win32gui.EnumWindows(callback, None)
    return resultado[0] if resultado else None

def copiar_conteudo(hwnd):
    user32.ShowWindow(hwnd, win32con.SW_MINIMIZE)
    time.sleep(0.05)
    user32.ShowWindow(hwnd, win32con.SW_RESTORE)
    time.sleep(0.15)
    user32.SetForegroundWindow(hwnd)
    time.sleep(0.1)

    # Ctrl+A
    user32.keybd_event(0x11, 0, 0, 0)
    user32.keybd_event(0x41, 0, 0, 0)
    user32.keybd_event(0x41, 0, 2, 0)
    user32.keybd_event(0x11, 0, 2, 0)
    time.sleep(0.08)

    # Ctrl+C
    user32.keybd_event(0x11, 0, 0, 0)
    user32.keybd_event(0x43, 0, 0, 0)
    user32.keybd_event(0x43, 0, 2, 0)
    user32.keybd_event(0x11, 0, 2, 0)
    time.sleep(0.1)

    return pyperclip.paste()

def fechar_aba(hwnd):
    """Fecha apenas a aba ativa com Ctrl+W — sem diálogo de salvar."""
    user32.SetForegroundWindow(hwnd)
    time.sleep(0.05)

    # Ctrl+W
    user32.keybd_event(0x11, 0, 0, 0)
    user32.keybd_event(0x57, 0, 0, 0)
    user32.keybd_event(0x57, 0, 2, 0)
    user32.keybd_event(0x11, 0, 2, 0)

def main():
    hwnd = encontrar_hwnd_notepad()

    if not hwnd:
        subprocess.Popen(['notepad.exe'])
        time.sleep(0.8)
        hwnd = encontrar_hwnd_notepad()

    if not hwnd:
        sys.exit(1)

    conteudo = copiar_conteudo(hwnd)
    fechar_aba(hwnd)

    with open(ARQUIVO_TEMP, 'w', encoding='utf-8') as f:
        f.write(conteudo or '')

if __name__ == '__main__':
    main()