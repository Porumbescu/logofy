#!/usr/bin/env python3
"""
stamp-batch: Batch watermark images with a logo/watermark PNG.

Usage:
    python watermark.py ./images ./logo.png --position bottom-right --opacity 0.8 --scale 0.15
"""

import argparse
import sys
from pathlib import Path
from PIL import Image


POSITIONS = ["bottom-right", "bottom-left", "top-right", "top-left", "center"]
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff"}


def apply_watermark(
    image_path: Path,
    watermark: Image.Image,
    position: str = "bottom-right",
    opacity: float = 0.8,
    scale: float = 0.15,
    padding: float = 0.03,
) -> Image.Image:
    """Apply a watermark to a single image and return the result."""
    img = Image.open(image_path).convert("RGBA")

    # Resize watermark relative to image width
    wm_width = int(img.width * scale)
    wm_height = int(watermark.height * (wm_width / watermark.width))
    wm = watermark.resize((wm_width, wm_height), Image.LANCZOS)

    # Apply opacity
    if opacity < 1.0:
        r, g, b, a = wm.split()
        a = a.point(lambda x: int(x * opacity))
        wm = Image.merge("RGBA", (r, g, b, a))

    # Calculate position
    pad_x = int(img.width * padding)
    pad_y = int(img.height * padding)

    positions = {
        "bottom-right": (img.width - wm_width - pad_x, img.height - wm_height - pad_y),
        "bottom-left": (pad_x, img.height - wm_height - pad_y),
        "top-right": (img.width - wm_width - pad_x, pad_y),
        "top-left": (pad_x, pad_y),
        "center": ((img.width - wm_width) // 2, (img.height - wm_height) // 2),
    }

    x, y = positions[position]

    # Composite
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    layer.paste(wm, (x, y))
    result = Image.alpha_composite(img, layer)

    return result


def main():
    parser = argparse.ArgumentParser(
        prog="stamp-batch",
        description="Batch watermark images with a logo/watermark PNG.",
    )
    parser.add_argument("input", help="Directory containing images to watermark")
    parser.add_argument("watermark", help="Path to watermark/logo image (PNG recommended)")
    parser.add_argument(
        "-o", "--output",
        default=None,
        help="Output directory (default: <input>/watermarked)",
    )
    parser.add_argument(
        "-p", "--position",
        choices=POSITIONS,
        default="bottom-right",
        help="Watermark position (default: bottom-right)",
    )
    parser.add_argument(
        "--opacity",
        type=float,
        default=0.8,
        help="Watermark opacity, 0.0-1.0 (default: 0.8)",
    )
    parser.add_argument(
        "--scale",
        type=float,
        default=0.15,
        help="Watermark size as fraction of image width (default: 0.15)",
    )
    parser.add_argument(
        "--padding",
        type=float,
        default=0.03,
        help="Edge padding as fraction of image size (default: 0.03)",
    )
    parser.add_argument(
        "--format",
        choices=["png", "jpg", "webp", "original"],
        default="original",
        help="Output format (default: keep original)",
    )
    parser.add_argument(
        "--quality",
        type=int,
        default=95,
        help="JPEG/WebP quality 1-100 (default: 95)",
    )

    args = parser.parse_args()

    input_dir = Path(args.input)
    if not input_dir.is_dir():
        print(f"Error: '{input_dir}' is not a directory.", file=sys.stderr)
        sys.exit(1)

    wm_path = Path(args.watermark)
    if not wm_path.is_file():
        print(f"Error: Watermark '{wm_path}' not found.", file=sys.stderr)
        sys.exit(1)

    output_dir = Path(args.output) if args.output else input_dir / "watermarked"
    output_dir.mkdir(parents=True, exist_ok=True)

    # Load watermark once
    watermark = Image.open(wm_path).convert("RGBA")

    # Find all images
    images = sorted(
        f for f in input_dir.iterdir()
        if f.suffix.lower() in IMAGE_EXTENSIONS and f.is_file()
    )

    if not images:
        print(f"No images found in '{input_dir}'.", file=sys.stderr)
        sys.exit(1)

    print(f"Found {len(images)} images. Watermarking...")
    print(f"  Position: {args.position}")
    print(f"  Opacity:  {args.opacity}")
    print(f"  Scale:    {args.scale}")
    print(f"  Output:   {output_dir}\n")

    for i, img_path in enumerate(images, 1):
        try:
            result = apply_watermark(
                img_path, watermark,
                position=args.position,
                opacity=args.opacity,
                scale=args.scale,
                padding=args.padding,
            )

            # Determine output format
            if args.format == "original":
                ext = img_path.suffix
            else:
                ext = f".{args.format}"

            out_path = output_dir / f"{img_path.stem}{ext}"

            # Save
            if ext.lower() in (".jpg", ".jpeg"):
                result.convert("RGB").save(out_path, quality=args.quality)
            elif ext.lower() == ".webp":
                result.save(out_path, quality=args.quality)
            else:
                result.save(out_path)

            pct = int(i / len(images) * 100)
            bar = "█" * (pct // 4) + "░" * (25 - pct // 4)
            print(f"\r  [{bar}] {pct:3d}% ({i}/{len(images)}) {img_path.name}", end="", flush=True)

        except Exception as e:
            print(f"\n  ⚠ Skipped {img_path.name}: {e}", file=sys.stderr)

    print(f"\n\n✓ Done! {len(images)} images saved to {output_dir}")


if __name__ == "__main__":
    main()
