# Extension Icons

To complete the browser extension, you need to add icon files.

## Required Icons

Create these icon sizes and add them to the `icons/` folder:

- `icon16.png` - 16x16 pixels (browser toolbar)
- `icon48.png` - 48x48 pixels (extension management page)
- `icon128.png` - 128x128 pixels (Chrome Web Store)

## Design Recommendations

- **Style**: Modern, minimalist lock/key symbol
- **Colors**: Purple gradient (matching WorldPass brand: #667eea to #764ba2)
- **Background**: Transparent PNG
- **Visual**: Clean, recognizable at small sizes

## Quick Creation Methods

### Option 1: Design Tools
- Use Figma, Sketch, or Canva
- Export as PNG with transparent background
- Ensure crisp edges at all sizes

### Option 2: Online Icon Generator
- Use a service like https://realfavicongenerator.net/
- Upload a 512x512 source image
- Generate all required sizes

### Option 3: Emoji/Unicode (Quick Dev Solution)
You can temporarily use an emoji or Unicode character:
- 🔐 (lock with key)
- 🔒 (lock)
- 🗝️ (key)

Take a screenshot, crop to square, resize to needed dimensions.

## Placeholder Icons

For development, you can use solid color squares:
```bash
# Generate placeholder icons (requires ImageMagick)
magick -size 16x16 xc:#667eea icons/icon16.png
magick -size 48x48 xc:#667eea icons/icon48.png
magick -size 128x128 xc:#667eea icons/icon128.png
```

Remember to replace these with proper branded icons before publishing!
