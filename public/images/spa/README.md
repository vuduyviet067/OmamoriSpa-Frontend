# Spa images

Drop real spa photographs into the matching folder and they will be picked up automatically by the homepage.

## Expected layout

```
public/images/spa/
  hero-spa.jpg

  services/
    massage.jpg          # Massage thư giãn
    facial.jpg           # Chăm sóc da mặt
    hot-stone.jpg        # Liệu pháp đá nóng
    head-spa.jpg         # Gội đầu dưỡng sinh

  cosmetics/
    serum.jpg            # Serum phục hồi
    moisturizer.jpg      # Kem dưỡng ẩm
    lavender-oil.jpg     # Tinh dầu oải hương
    detox-mask.jpg       # Mặt nạ thải độc

  therapists/
    ha-linh.jpg          # Hà Linh
    thao-vy.jpg          # Thảo Vy
    minh-anh.jpg         # Minh Anh
    khanh-chi.jpg        # Khánh Chi
```

## Placeholder generation

A pure-Node script (`scripts/generate-spa-placeholders.mjs`) writes 13 valid
JPEG placeholders into this folder so the homepage never falls back to the
soft ivory placeholder. Run it once:

```bash
node scripts/generate-spa-placeholders.mjs
```

The script has no external dependencies (no `sharp`, no network calls).

## Fallback behaviour

If a file is missing, the shared `Image` component falls back to a soft ivory
placeholder so the page never shows a broken-image icon.

Recommended: JPG or WebP, ≥ 1200px on the long edge, sRGB, ~70–85% quality.