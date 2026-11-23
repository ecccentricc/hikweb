# Security policy

HikWeb handles credentials for your cameras and NVR, so please treat security issues seriously.

## Reporting a vulnerability

Please **do not open a public issue**. Instead use GitHub's
[private vulnerability reporting](../../security/advisories/new) for this repository.
Include steps to reproduce and the affected version. You should get a reply within a few days.

## Recommended deployment

- Run HikWeb only inside your local network, or reach it through a VPN (Tailscale, WireGuard).
- If you publish it through a reverse proxy, always use HTTPS and enable *Secure cookies*.
- Use a dedicated NVR account with live view and playback rights only.
- Keep `config.json` private (it is created with mode `600` and listed in `.gitignore`).
- Keep go2rtc's API bound to `127.0.0.1` (the provided installer does this).
