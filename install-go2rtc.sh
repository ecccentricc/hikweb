#!/bin/bash
# go2rtc diegimas HikWeb greitam tiesioginiam vaizdui (WebRTC).
# Naudojimas (kaip root):  bash /opt/hikweb/install-go2rtc.sh
set -e

if [ "$(id -u)" != "0" ]; then echo "Paleiskite kaip root"; exit 1; fi

case "$(uname -m)" in
  x86_64)  A=amd64 ;;
  aarch64) A=arm64 ;;
  armv7l)  A=arm ;;
  armv6l)  A=armv6 ;;
  i386|i686) A=i386 ;;
  *) echo "Nežinoma architektūra: $(uname -m)"; exit 1 ;;
esac

WEBRTC_PORT=${WEBRTC_PORT:-8556}
API_PORT=${API_PORT:-1984}

for p in $API_PORT $WEBRTC_PORT; do
  if ss -ltnu 2>/dev/null | grep -q ":$p "; then
    if ! systemctl is-active --quiet go2rtc; then
      echo "Prievadas $p jau užimtas. Paleiskite su kitu, pvz.: WEBRTC_PORT=8557 API_PORT=1985 bash $0"
      exit 1
    fi
  fi
done

echo "→ Atsisiunčiamas go2rtc ($A)…"
curl -fL --progress-bar -o /usr/local/bin/go2rtc.new "https://github.com/AlexxIT/go2rtc/releases/latest/download/go2rtc_linux_$A"
chmod +x /usr/local/bin/go2rtc.new
mv /usr/local/bin/go2rtc.new /usr/local/bin/go2rtc
/usr/local/bin/go2rtc -version 2>/dev/null || true

mkdir -p /etc/go2rtc
if [ ! -f /etc/go2rtc/go2rtc.yaml ]; then
  cat > /etc/go2rtc/go2rtc.yaml <<EOF
# go2rtc nustatymai HikWeb programai.
# API pasiekiamas TIK iš šio serverio (kamerų slaptažodžiai neišeina į tinklą).
api:
  listen: "127.0.0.1:$API_PORT"
rtsp:
  listen: ""          # RTSP serveris nereikalingas
webrtc:
  listen: ":$WEBRTC_PORT"   # šį prievadą turi pasiekti naršyklės (TCP ir UDP)
log:
  level: warn
EOF
fi

id go2rtc >/dev/null 2>&1 || useradd -r -s /usr/sbin/nologin go2rtc

cat > /etc/systemd/system/go2rtc.service <<EOF
[Unit]
Description=go2rtc (WebRTC HikWeb programai)
After=network-online.target
Wants=network-online.target

[Service]
User=go2rtc
ExecStart=/usr/local/bin/go2rtc -config /etc/go2rtc/go2rtc.yaml
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable go2rtc >/dev/null 2>&1
systemctl restart go2rtc
sleep 2

if curl -fs "http://127.0.0.1:$API_PORT/api" >/dev/null; then
  echo "✓ go2rtc veikia (API http://127.0.0.1:$API_PORT, WebRTC prievadas $WEBRTC_PORT)"
  if command -v ufw >/dev/null && ufw status | grep -q active; then
    ufw allow $WEBRTC_PORT/tcp >/dev/null; ufw allow $WEBRTC_PORT/udp >/dev/null
    echo "✓ ufw: atidarytas prievadas $WEBRTC_PORT (tcp/udp)"
  fi
  echo
  echo "Dabar HikWeb: Nustatymai → Sistema → pažymėkite „Greitas tiesioginis vaizdas (WebRTC per go2rtc)“"
  [ "$API_PORT" != "1984" ] && echo "ir įrašykite go2rtc adresą: http://127.0.0.1:$API_PORT"
else
  echo "✗ go2rtc nepasileido. Žurnalas: journalctl -u go2rtc -n 30 --no-pager"
  exit 1
fi
