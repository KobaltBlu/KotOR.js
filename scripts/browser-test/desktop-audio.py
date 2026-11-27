"""Run ONLY inside the disposable VS Code computer-use desktop, not on the host.
No packages, privileges, host audio devices, network listeners or browser flags.
The desktop/container lifecycle owns cleanup of these three user processes.
"""
import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import time

CORE = '''
context.properties = { core.daemon = true core.name = pipewire-0 link.max-buffers = 16 default.clock.min-quantum = 1024 }
context.spa-libs = {
 audio.convert.* = audioconvert/libspa-audioconvert
 api.alsa.* = alsa/libspa-alsa
 api.v4l2.* = v4l2/libspa-v4l2
 support.* = support/libspa-support
}
context.modules = [
 { name = libpipewire-module-rt args = { nice.level = -11 } flags = [ ifexists nofail ] }
 { name = libpipewire-module-protocol-native }
 { name = libpipewire-module-profiler }
 { name = libpipewire-module-metadata }
 { name = libpipewire-module-spa-device-factory }
 { name = libpipewire-module-spa-node-factory }
 { name = libpipewire-module-client-node }
 { name = libpipewire-module-client-device }
 { name = libpipewire-module-portal flags = [ ifexists nofail ] }
 { name = libpipewire-module-access args = {} }
 { name = libpipewire-module-adapter }
 { name = libpipewire-module-link-factory }
 { name = libpipewire-module-session-manager }
]
context.objects = [
 { factory = adapter args = { factory.name = support.null-audio-sink node.name = kotor-null node.description = "KOTOR Software Audio" media.class = "Audio/Sink" audio.position = "FL,FR" } }
 { factory = spa-node-factory args = { factory.name = support.node.driver node.name = Dummy-Driver node.group = pipewire.dummy priority.driver = 20000 } }
 { factory = spa-node-factory args = { factory.name = support.node.driver node.name = Freewheel-Driver node.group = pipewire.freewheel priority.driver = 19000 node.freewheel = true } }
]
context.exec = []
'''
PULSE = '''
context.properties = { core.daemon = false }
context.spa-libs = { audio.convert.* = audioconvert/libspa-audioconvert support.* = support/libspa-support }
context.modules = [
 { name = libpipewire-module-protocol-native }
 { name = libpipewire-module-client-node }
 { name = libpipewire-module-adapter }
 { name = libpipewire-module-metadata }
 { name = libpipewire-module-protocol-pulse args = { server.address = [ "unix:SOCKET_PATH" ] } }
]
'''
SESSION = '''
context.properties = { default-profile.restore-bluetooth = false }
context.spa-libs = { api.bluez5.* = bluez5/libspa-bluez5 api.alsa.* = alsa/libspa-alsa api.v4l2.* = v4l2/libspa-v4l2 api.libcamera.* = libcamera/libspa-libcamera }
context.modules = [
 { name = libpipewire-module-rtkit args = {} flags = [ ifexists nofail ] }
 { name = libpipewire-module-protocol-native }
 { name = libpipewire-module-client-node }
 { name = libpipewire-module-client-device }
 { name = libpipewire-module-adapter }
 { name = libpipewire-module-metadata }
 { name = libpipewire-module-session-manager }
]
session.modules = {
 default = [ flatpak portal v4l2 suspend-node policy-node metadata default-nodes default-profile default-routes streams-follow-default restore-stream ]
 with-audio = [ metadata default-nodes default-profile default-routes alsa-seq alsa-monitor ]
 with-alsa = [ with-audio ]
 with-jack = [ with-audio ]
 with-pulseaudio = [ with-audio bluez5 bluez5-autoswitch logind restore-stream streams-follow-default ]
}
'''

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--confirm-isolated-desktop', action='store_true', required=True)
    parser.parse_args()
    if os.geteuid() == 0 or not os.environ.get('DISPLAY'):
        raise SystemExit('Requires an ordinary desktop user with DISPLAY; do not run as root.')
    for name in ['pipewire', 'pipewire-media-session', 'pw-cli']:
        if not shutil.which(name):
            raise SystemExit(f'Missing installed desktop dependency: {name}')
    root = Path(tempfile.mkdtemp(prefix='kotor-audio-'))
    run = root / 'run'
    run.mkdir(mode=0o700)
    (root / 'pipewire.conf').write_text(CORE)
    (root / 'pulse.conf').write_text(PULSE.replace('SOCKET_PATH', str(run / 'pulse-native')))
    (root / 'media-session.d').mkdir()
    (root / 'media-session.d' / 'media-session.conf').write_text(SESSION)
    env = dict(os.environ, XDG_RUNTIME_DIR=str(run))
    processes = []
    def launch(name, argv, extra=None):
        with (root / f'{name}.log').open('wb') as log:
            p = subprocess.Popen(argv, env=dict(env, **(extra or {})), stdout=log, stderr=log, start_new_session=True)
        processes.append(p)
        return p
    def wait_socket(filename):
        for _ in range(100):
            if any(p.poll() is not None for p in processes):
                raise RuntimeError(f'Audio process exited; inspect {root}')
            if filename.exists():
                return
            time.sleep(0.1)
        raise RuntimeError(f'Audio socket timeout: {filename}')
    try:
        launch('core', ['pipewire', '-c', str(root / 'pipewire.conf')])
        wait_socket(run / 'pipewire-0')
        launch('session', ['pipewire-media-session'], {'PIPEWIRE_CONFIG_DIR': str(root)})
        launch('pulse', ['pipewire', '-c', str(root / 'pulse.conf')])
        wait_socket(run / 'pulse-native')
        time.sleep(1)
        nodes = subprocess.run(['pw-cli', 'ls', 'Node'], env=env, capture_output=True, text=True, timeout=10, check=True).stdout
        if 'kotor-null' not in nodes:
            raise RuntimeError('Software sink not present')
        config = Path.home() / '.config' / 'pulse'
        config.mkdir(parents=True, exist_ok=True)
        client = config / 'client.conf'
        if client.exists():
            shutil.copyfile(client, root / 'previous-client.conf')
        client.write_text(f'default-server = unix:{run}/pulse-native\nautospawn = no\n')
        receipt = {'root': str(root), 'pids': [p.pid for p in processes], 'sink': 'kotor-null', 'pulseServer': f'unix:{run}/pulse-native'}
        (root / 'receipt.json').write_text(json.dumps(receipt, indent=2))
        print(json.dumps(receipt, indent=2))
        print('Software audio ready. Quit/relaunch Firefox normally to reread its Pulse client settings; do not disable sandboxing. Verify AudioContext reaches running after a real click.')
    except BaseException:
        for p in processes:
            if p.poll() is None:
                p.terminate()
        for p in processes:
            try:
                p.wait(timeout=5)
            except subprocess.TimeoutExpired:
                p.kill()
                p.wait()
        raise

if __name__ == '__main__':
    main()
