# Yohaku.

A minimal text editor.

[日本語](./README.ja.md)

![Thumbnail](./assets/yohaku_samune.png)

![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

- Two-column layout (file explorer + text editor)
- Auto-save (1-second debounce)
- Text search and replace (Ctrl+F)
- Keyword search within directory
- Directory workspace management
- Global hotkey support (configurable)

## Download

Download Windows (.exe) / Linux (.AppImage) from [Releases](https://github.com/umeneru/yohaku/releases).

## Development

### Requirements

- Node.js 22+
- npm

### Setup

```bash
git clone https://github.com/umeneru/yohaku.git
cd yohaku
npm install
```

### Start development server

```bash
npm run dev
```

### Build

```bash
npm run build          # Production build
npm run dist           # Create distributable packages (all platforms)
npm run dist:win       # Create Windows distributable package
```

## Tech Stack

- **Electron** - Desktop application framework
- **React 19** - UI library
- **electron-vite** - Build tool with hot reload
- **CSS Modules** - Scoped styling

## Project Structure

```
src/
├── main/            # Main process (file operations, IPC, window management)
├── preload/         # Preload script (contextBridge API)
└── renderer/        # Renderer process (React UI)
    └── src/
        ├── components/
        │   ├── FileExplorer/   # File tree, search, context menu
        │   ├── TextEditor/     # Editor, search bar
        │   └── Resizer/        # Column resize
        ├── context/            # AppContext (useReducer + Context API)
        └── App.jsx
```

## License

[MIT](LICENSE)
