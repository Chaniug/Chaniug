"""
将轮播图 PNG 转换为 WebP 格式
运行: python convert-images.py
需要: pip install Pillow
"""

import os
import sys
from pathlib import Path

def convert_to_webp():
    try:
        from PIL import Image
    except ImportError:
        print("❌ 未找到 Pillow 库")
        print("请运行: pip install Pillow")
        sys.exit(1)

    images = [
        ('img/slide1.png', 'img/slide1.webp'),
        ('img/slide2.png', 'img/slide2.webp'),
        ('img/slide3.png', 'img/slide3.webp'),
    ]

    script_dir = Path(__file__).parent

    for input_path, output_path in images:
        input_full = script_dir / input_path
        output_full = script_dir / output_path

        if not input_full.exists():
            print("[skip] 文件不存在: {}".format(input_path))
            continue

        original_size = input_full.stat().st_size / 1024 / 1024

        print("[convert] 转换中: {} ...".format(input_path))

        with Image.open(input_full) as img:
            # 转换为 RGB（如果是 RGBA，WebP 支持透明度）
            if img.mode in ('RGBA', 'LA', 'P'):
                # 处理带透明度的图片
                if img.mode == 'P':
                    img = img.convert('RGBA')
                rgb_img = Image.new('RGBA', img.size)
                rgb_img.paste(img, (0, 0), img if img.mode == 'RGBA' else None)
                rgb_img.save(output_full, 'WEBP', quality=80, method=4, lossless=False)
            else:
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                img.save(output_full, 'WEBP', quality=80, method=4)

        new_size = output_full.stat().st_size / 1024 / 1024
        savings = (1 - output_full.stat().st_size / input_full.stat().st_size) * 100

        print("  [ok] {} -> {}".format(input_path, output_path))
        print("       {:.2f} MB -> {:.2f} MB (减少 {:.1f}%)".format(
            original_size, new_size, savings))

    print("\n[done] 转换完成！")

if __name__ == '__main__':
    convert_to_webp()
