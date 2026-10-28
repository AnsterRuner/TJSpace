#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
生成 TJSpace 的 App 图标与启动图（纯 PIL 绘制，无外部素材）。

用法： python scripts/make-icons.py
输出：
  ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png  (1024)
  ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732*.png
  app/icon-180.png   (apple-touch-icon)
  app/favicon.png
"""
import os
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

ACCENT_TOP = (255, 170, 108)
ACCENT_BOT = (242, 108, 30)
INK = (255, 255, 255)


def draw_mark(size, ring_alpha=118, color=INK, alpha=255, ring_w=0.062, check_w=0.072):
    """返回 size×size 的透明图层：细圆环 + 居中粗对勾（圆头线帽）。"""
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    s = size

    # 细圆环
    r = s * 0.285
    d.ellipse((s * 0.5 - r, s * 0.5 - r, s * 0.5 + r, s * 0.5 + r),
              outline=color + (ring_alpha,), width=max(1, int(s * ring_w)))

    # 对勾（用 w/2 的圆点做圆头）
    w = s * check_w
    a = (s * 0.349, s * 0.514)
    b = (s * 0.450, s * 0.613)
    c = (s * 0.647, s * 0.407)
    d.line([a, b, c], fill=color + (alpha,), width=int(round(w)), joint="curve")
    for p in (a, b, c):
        d.ellipse((p[0] - w / 2, p[1] - w / 2, p[0] + w / 2, p[1] + w / 2),
                  fill=color + (alpha,))
    return layer


def make_icon(size=1024):
    # 垂直渐变底
    img = Image.new("RGB", (size, size), ACCENT_BOT)
    d = ImageDraw.Draw(img)
    for y in range(size):
        t = (y / (size - 1)) ** 0.86
        c = tuple(int(ACCENT_TOP[i] + (ACCENT_BOT[i] - ACCENT_TOP[i]) * t) for i in range(3))
        d.line([(0, y), (size, y)], fill=c)

    # 左上角柔光（必须模糊，否则会看到硬边）
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse((-size * 0.30, -size * 0.40, size * 0.70, size * 0.58),
               fill=(255, 255, 255, 62))
    glow = glow.filter(ImageFilter.GaussianBlur(size * 0.12))
    img = Image.alpha_composite(img.convert("RGBA"), glow)

    img = Image.alpha_composite(img, draw_mark(size))
    return img.convert("RGB")


def make_splash(size=2732, bg=(246, 247, 249)):
    img = Image.new("RGB", (size, size), bg)
    mark_size = int(size * 0.19)
    layer = draw_mark(mark_size, ring_alpha=110,
                      color=(242, 108, 30), alpha=255)
    img = img.convert("RGBA")
    img.alpha_composite(layer, ((size - mark_size) // 2, (size - mark_size) // 2))
    return img.convert("RGB")


def main():
    icon = make_icon(1024)
    ic_dir = os.path.join(ROOT, "ios/App/App/Assets.xcassets/AppIcon.appiconset")
    icon.save(os.path.join(ic_dir, "AppIcon-512@2x.png"), optimize=True)
    print("icon ->", os.path.join(ic_dir, "AppIcon-512@2x.png"))

    splash = make_splash(2732)
    sp_dir = os.path.join(ROOT, "ios/App/App/Assets.xcassets/Splash.imageset")
    for n in ("splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"):
        splash.save(os.path.join(sp_dir, n), optimize=True)
    print("splash ->", sp_dir)

    app_dir = os.path.join(ROOT, "app")
    icon.resize((180, 180), Image.LANCZOS).save(os.path.join(app_dir, "icon-180.png"), optimize=True)
    icon.resize((64, 64), Image.LANCZOS).save(os.path.join(app_dir, "favicon.png"), optimize=True)
    print("web icons ->", app_dir)


if __name__ == "__main__":
    main()
