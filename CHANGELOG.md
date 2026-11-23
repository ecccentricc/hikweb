# Changelog

## 1.8.2
- iPhone home-screen app: header no longer hidden under the status bar, no gap below the bottom navigation

## 1.8.1
- Mobile layout redesign: bottom navigation, "⋯" menu, slide-out camera list, full-width tiles, bottom-sheet dialogs
- iPhone full-screen support; no zoom on input focus
- Empty tiles no longer show camera buttons

## 1.8.0
- Daily NVR health report (Telegram / webhook, e.g. Home Assistant)
- Automatic logout after inactivity, with per-user exemption for wall displays

## 1.7.x
- Up to 4 cameras side by side in recordings, synchronised
- Recording type filter (motion / continuous / alarm)
- Timeline thumbnails
- NVR disk status and alert
- Installable PWA
- Detects NVRs that allow only one remote playback at a time

## 1.6.x
- WebRTC live view via go2rtc (< 1 s delay), automatic HLS fallback
- Fast clip download straight from the NVR disk (ISAPI)
- Camera online/offline status; fail fast when the NVR RTSP port is closed

## 1.5.x
- System settings in the web UI (port, listen address, site name, defaults, limits) with live port switching
- Smoother timeline seeking; graceful RTSP teardown to avoid "453 Not Enough Bandwidth"

## 1.0 – 1.4
- Live view grid, recordings search and playback, MP4 download
- Devices and users managed in the browser; roles and per-device permissions
- English / Lithuanian / Ukrainian; dark / light / blue / auto themes; logo
