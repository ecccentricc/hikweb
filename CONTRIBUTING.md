# Contributing

Thanks for helping! A few guidelines:

- **Zero dependencies** – the server uses only Node.js built-ins, the front-end is plain HTML/CSS/JS. Please keep it that way.
- Run `node --check server.js public/*.js` before submitting.
- Every user-facing string goes through translations: `public/i18n.js` (UI) and `MSG` in `server.js` (server messages). Add all languages, or at least English.
- Never log or send device passwords to the browser; mask RTSP URLs (`rtsp://***@…`) in errors.
- Old NVRs are fragile: avoid extra RTSP sessions and always stop ffmpeg gracefully (SIGTERM).
- Describe which NVR / camera model and firmware you tested with.

## Reporting bugs
Please include: HikWeb version (Settings → System → Status), NVR/camera model and firmware,
browser, and the relevant part of `journalctl -u hikweb -n 50` (remove IP addresses if you like).
