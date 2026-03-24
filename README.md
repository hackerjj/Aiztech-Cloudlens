# Aiztech CloudLens

AI-powered photo wall for the AI Immersion Roadshow 2026 event.

## What is CloudLens?

CloudLens is an interactive photo wall application built for live events. Attendees scan a QR code, register with their Amazon alias and role, then take or upload photos. Each photo gets an automatic event overlay with logos, the author's name, and role. All photos appear on a live wall display that rotates through submissions in real-time.

## Features

- Multi-language support (English, Spanish, Portuguese)
- Event registration with Amazon alias and ProServe role
- Camera capture directly from mobile browser
- Aspect ratio selection (9:16 or 16:9)
- Automatic event overlay with logos and author info
- Auto-generated titles and hashtags per photo
- Live wall view for projector display with QR code
- Photo gallery with author, title, and hashtags
- Real-time updates every 3-4 seconds

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JS |
| Backend | Node.js 20, Express.js |
| Image Processing | node-canvas (server-side overlay) |
| File Uploads | Multer |
| Storage | Local filesystem (processed/) + JSON (local-data.json) |
| Tunnel/Hosting | Render.com / localtunnel / local network |

## ProServe Roles Supported

PAL, PSM, PAE, PCA, PADL, DPM, DC, EM, DS, MLD, Other

## Project Structure

```
├── server.js              # Express server with upload, registration, image processing
├── package.json           # Dependencies
├── public/                # Frontend SPA
│   └── index.html         # All views: register, home, upload, gallery, wall
├── Imagenes/              # Event logos for overlay
│   ├── Aiztekblanco.png
│   ├── Aizteknegro.png
│   └── LogoProserve.png
├── processed/             # Output directory for processed photos (gitignored)
├── ARCHITECTURE.md        # Detailed architecture documentation
└── TECH-STACK.md          # Technology stack details
```

## Quick Start

```bash
npm install
node server.js
```

- Mobile view: http://localhost:3000 (registration + upload)
- Wall view: http://localhost:3000/wall (projector display with QR)

## How It Works

1. Attendee scans QR code displayed on the wall screen
2. Registers with Amazon alias, role, and event expectations
3. Takes a photo or selects from gallery (9:16 or 16:9)
4. Server applies event overlay (logos, author name, role)
5. Server generates a title and hashtags
6. Photo appears on the live wall and in the gallery

## Event

AI Immersion Roadshow 2026 - Mexico
Organized by AWS ProServe
