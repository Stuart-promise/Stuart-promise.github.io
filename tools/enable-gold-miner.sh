#!/bin/sh
/opt/pet234/venv/bin/python - <<'PET234_GOLD_MINER'
import ast
import asyncio
import fcntl
import json
import os
import secrets
import shutil
import subprocess
import tempfile
import time
from pathlib import Path
from urllib.request import urlopen
from websockets import connect

service = Path("/opt/pet234")
source = service / "game_relay.py"
name, version = "gold-miner", "234-gold-miner-v1-"

def patched(data):
    assignments = [node.value for node in ast.parse(data).body
                   if isinstance(node, ast.Assign) and any(
                       isinstance(target, ast.Name) and target.id == "RULES" for target in node.targets)]
    if len(assignments) != 1 or not isinstance(assignments[0], ast.Dict):
        raise RuntimeError("Expected one literal RULES dictionary")
    node = assignments[0]
    rules = ast.literal_eval(node)
    if name in rules:
        if rules[name] != version:
            raise RuntimeError("A different gold-miner protocol is configured")
        return data
    # AST columns count UTF-8 bytes. Insert immediately after the opening brace.
    offset = sum(map(len, data.splitlines(True)[:node.lineno-1])) + node.col_offset
    if data[offset:offset+1] != b"{":
        raise RuntimeError("Unexpected RULES layout")
    result = data[:offset+1] + (repr(name) + ": " + repr(version) + ", ").encode() + data[offset+1:]
    compile(result, str(source), "exec")
    return result

async def relay_check():
    for attempt in range(3):
        room = str(secrets.randbelow(900000) + 100000)
        url = f"ws://127.0.0.1:18100/v1/relay/{name}/{room}?rules={version}&seat="
        kwargs = dict(origin="https://stuart-promise.github.io", open_timeout=3, close_timeout=1)
        async with connect(url + "host", **kwargs) as host:
            try:
                ready = json.loads(await asyncio.wait_for(host.recv(), 3))
            except Exception as error:
                if getattr(error, "reason", "") == "unavailable-id" and attempt < 2:
                    continue
                raise
            if ready.get("event") != "ready":
                raise RuntimeError("Host was not admitted")
            async with connect(url + "guest", **kwargs) as guest:
                for ws, event in [(guest,"ready"),(host,"paired"),(guest,"paired")]:
                    if json.loads(await asyncio.wait_for(ws.recv(), 3)).get("event") != event:
                        raise RuntimeError("Relay pair failed")
                packet = {"kind":"deployment-test","nonce":secrets.token_hex(8)}
                await host.send(json.dumps(packet))
                if json.loads(await asyncio.wait_for(guest.recv(), 3)) != {"event":"data","value":packet}:
                    raise RuntimeError("Relay delivery failed")
                return

def healthy():
    for attempt in range(20):
        try:
            with urlopen("http://127.0.0.1:18100/health", timeout=2) as response:
                if json.load(response).get("ok"):
                    return
        except OSError:
            pass
        time.sleep(.5)
    raise RuntimeError("Local health check failed")

def restart():
    subprocess.run(["systemctl","restart","pet234"], check=True, timeout=60)
    healthy()

lock = os.open(service, os.O_RDONLY)
fcntl.flock(lock, fcntl.LOCK_EX)
original = source.read_bytes()
updated = patched(original)
if original == updated:
    healthy()
    asyncio.run(relay_check())
    print("Gold Miner is already live; service was not restarted.")
else:
    healthy()
    releases = service / "releases"
    releases.mkdir(exist_ok=True)
    backup = Path(tempfile.mkdtemp(prefix="gold-miner-",dir=releases)) / source.name
    shutil.copy2(source, backup)
    with tempfile.TemporaryDirectory(prefix=".gold-miner-",dir=service) as staging:
        new = Path(staging) / source.name
        def install(contents):
            st = source.stat()
            new.write_bytes(contents)
            os.chown(new, st.st_uid, st.st_gid)
            os.chmod(new, st.st_mode & 0o7777)
            os.replace(new, source)
        if source.read_bytes() != original:
            raise RuntimeError("Relay source changed during staging")
        install(updated)
        try:
            restart()
            asyncio.run(relay_check())
        except BaseException:
            if source.read_bytes() != updated:
                raise RuntimeError(f"Concurrent relay edit; backup at {backup}")
            install(backup.read_bytes())
            restart()
            print("Original relay restored", flush=True)
            raise
    print("Gold Miner ready. Original relay backup:", backup)
PET234_GOLD_MINER
