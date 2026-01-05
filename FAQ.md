# Frequently Asked Questions (FAQ)

## Forge

### Why does Forge require the game directory to be outside of Program Files?

When using KotOR Forge, you may encounter an error message like "contains system files" if you try to point it to a game directory located in `Program Files` (or `Program Files (x86)`).

**Solution:** Move your KotOR game installation to a location outside of `Program Files`, such as:
- Your Desktop
- `C:\Games\`
- `C:\Users\YourUsername\Games\`
- Any other user-accessible directory

**Why this happens:** This is a Chrome/Chromium security restriction. Browsers (and Electron apps built on Chromium) restrict access to system-protected directories like `Program Files` for security reasons. Even symlinks to these directories will not work due to these security restrictions.

**Note:** You'll need to move the entire game installation folder, not just create a copy or shortcut. After moving, update Forge to point to the new location.

