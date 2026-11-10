# 地图高清素材

生成方式：内置 image_gen 工具（非 CLI）。2026-11-10。

- `ground-hd.webp`：1536×1024，三列地表；378,378 字节。
- `props-hd.webp`：1536×1024，三列两行、带透明通道的独立障碍物；496,126 字节。
- 列顺序：奇幻森林、废土农场、赛博都市。障碍物上排为大型物件，下排为岩石/机械/花坛。
- `world.mjs` 定义物件位置和实体碰撞；`world-view.mjs` 使用同一组物件绘制，地表使用镜像铺砖消除接缝。
- WebP 保留生成图细节和透明度，仅进行格式压缩。地表按原尺寸铺设，独立物件缩小绘制；不再拉伸旧的背景插画。

## Ground prompt

Use case: stylized-concept. Asset type: high definition seamless ground texture atlas for overhead mobile RPG, landscape 1536x1024. Exactly three equal vertical columns, each 512x1024 pixels, hard straight boundaries at one-third and two-thirds width, no gutters. LEFT COLUMN: lush short emerald and sage meadow grass, subtle tiny clover and sparse tiny white flowers, gently mottled soft grass. MIDDLE COLUMN: weathered warm ochre farm dirt, fine gravel, very sparse tiny dry grasses. RIGHT COLUMN: dark blue-grey futuristic pavement, fine square stone-metal panels with rare thin understated cyan inlaid seams. Each column has uniform top-down orthographic scale and lighting, and should repeat seamlessly on both axes when used independently as a tile. Premium crisp detailed hand-painted cartoon game texture, readable low contrast ground for bright characters, no blur. Flat walkable surfaces ONLY. No trees, rocks, buildings, big flowers, objects, perspective, text, shadows from objects, borders, logos, UI, paths, dramatic lighting. All features tiny relative to the tile, tranquil and tasteful.

## Props prompt

Use case: stylized-concept. Asset type: production 2D top-down game transparent sprite atlas, 1536x1024 landscape, exactly 3 columns and 2 rows of equal 512x512 cells, no grid lines. Six isolated high definition hand-painted cartoon environment props for an anime fantasy survivor game. Top row from left: lush emerald broadleaf fantasy tree with thick short visible trunk and spreading roots, weathered golden hay bale pile with rusty farm scrap, compact dark cyberpunk utility kiosk with cyan neon. Bottom row from left: mossy grey boulder with small blue crystals, abandoned rusty farm tractor engine block with weeds, futuristic silver planter containing violet ornamental tree. Each object entirely within its own cell, centered horizontally, lowest solid base at 85 percent cell height, full object within 8 to 92 percent cell width and 8 to 85 percent height. Consistent three-quarter overhead RPG camera, crisp intricate textures, clean readable silhouettes, premium cute polished game illustration, soft ambient light. No ground tiles, no background, no UI, no lettering, no characters, no borders, genuinely transparent canvas around all objects. Do not let any object extend into another cell.

