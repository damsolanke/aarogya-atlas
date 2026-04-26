# Gamma Deck

**Live URL:** https://gamma.app/docs/lm9dmpvz2bj6ysy

10 cards, 16:9, no images, content preserved from `SCRIPTS.md`.

## ⚠️ Theme override needed

Gamma generated with the default light theme (blue accent). To match brand:

1. Open the deck → click **Theme** in the top toolbar
2. Pick a dark theme (anything dark/black/serif)
3. Override accent color to **`#E8923D` saffron** in the theme editor
4. Set background to **`#070A12` deep ink**
5. (Optional) Heading font → **Instrument Serif**, body → **Geist**

Or just open the editor and let Gamma's "Restyle" / "Try a different theme" suggest a darker variant.

## Backup if Gamma is down

Open `docs/pitch/backup.html` in any browser:

```bash
open /Users/adesolanke/code/hacknation-2026/docs/pitch/backup.html
```

Or serve it locally for sharing:

```bash
cd /Users/adesolanke/code/hacknation-2026/docs/pitch
python3 -m http.server 8888
# then open http://localhost:8888/backup.html
```

The backup is brand-perfect (saffron palette + Devanagari + Instrument Serif loaded from Google Fonts CDN). Reveal.js controls: arrow keys to advance, `o` for overview, `f` for fullscreen, `s` for speaker notes window.

## PDF export

Open `backup.html` in Chrome → File → Print → Save as PDF → "Background graphics" ON. Save as `docs/pitch/aarogya_finalist.pdf`.

For Gamma: open the deck → Share → Export → PDF.

Either works as the always-works fallback.
