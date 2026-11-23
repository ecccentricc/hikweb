#!/bin/bash
# HikWeb installer for Debian / Ubuntu / Raspberry Pi OS
#   sudo bash install.sh            – install or update into /opt/hikweb
#   PORT=8090 sudo bash install.sh  – choose the web port for a fresh install
set -e

if [ "$(id -u)" != "0" ]; then echo "Please run as root (sudo bash install.sh)"; exit 1; fi

SRC="$(cd "$(dirname "$0")" && pwd)"
DEST=/opt/hikweb
PORT=${PORT:-8080}

echo "→ Installing packages (nodejs, ffmpeg)…"
apt-get update -qq
apt-get install -y -qq nodejs ffmpeg >/dev/null

NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "✗ Node.js $NODE_MAJOR is too old (18+ required). Install a newer one, e.g. from https://deb.nodesource.com"
  exit 1
fi

echo "→ Copying files to $DEST…"
mkdir -p "$DEST"
if [ "$SRC" != "$DEST" ]; then
  # config.json is never overwritten
  cp -r "$SRC"/server.js "$SRC"/package.json "$SRC"/public "$SRC"/install-go2rtc.sh "$SRC"/config.example.json "$DEST"/
fi

id hikweb >/dev/null 2>&1 || useradd -r -s /usr/sbin/nologin hikweb

FRESH=0
if [ ! -f "$DEST/config.json" ]; then
  FRESH=1
  PASS=$(head -c 12 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 12)
  cat > "$DEST/config.json" <<EOF
{
  "port": $PORT,
  "bind": "0.0.0.0",
  "users": [ { "username": "admin", "password": "$PASS", "role": "admin" } ],
  "devices": []
}
EOF
fi
chown -R hikweb:hikweb "$DEST"
chmod 600 "$DEST/config.json"

cat > /etc/systemd/system/hikweb.service <<EOF
[Unit]
Description=HikWeb – Hikvision camera & NVR web viewer
After=network-online.target
Wants=network-online.target

[Service]
User=hikweb
Group=hikweb
WorkingDirectory=$DEST
ExecStart=$(command -v node) $DEST/server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable hikweb >/dev/null 2>&1
systemctl restart hikweb
sleep 2

PORT_NOW=$(node -p "require('$DEST/config.json').port || 8080")
IP=$(hostname -I 2>/dev/null | awk '{print $1}')
if systemctl is-active --quiet hikweb; then
  echo
  echo "✓ HikWeb is running: http://${IP:-localhost}:$PORT_NOW"
  if [ "$FRESH" = "1" ]; then
    echo "  Login: admin / $PASS   (change it in Settings → My password)"
    echo "  Add your NVR / cameras in Settings → Cameras and NVRs."
  fi
  echo "  Logs: journalctl -u hikweb -f"
  echo "  Optional low-latency WebRTC: sudo bash $DEST/install-go2rtc.sh"
else
  echo "✗ HikWeb did not start. Check: journalctl -u hikweb -n 30 --no-pager"
  exit 1
fi
