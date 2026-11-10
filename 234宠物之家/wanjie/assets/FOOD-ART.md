# 蔬果采集图集

使用内置 imagegen 生成并编辑透明背景；未使用 CLI。最终游戏素材：`produce.webp`，512×384、4列3行，86,802字节，RGBA解码约0.75 MiB。Sharp仅裁切固定格、缩放、排版并压缩为WebP，没有重绘内容。

行序：卷心菜/胡萝卜/番茄/玉米；南瓜/蘑菇/苹果/梨；莓果/蜜桃/葡萄/菠萝。地图、库存和菜谱共用同一图集。

完整生成提示：

Use case: stylized-concept. Production high-quality transparent food resource sprite atlas for a cute anime fantasy restaurant survival game. Landscape1536x1024, EXACTLY FOUR equal columns and THREE equal rows, twelve isolated ingredient clusters, genuinely transparent background. Clear overhead three-quarter view, polished colorful hand-painted game art, crisp recognizable silhouettes even at32px, no text or grid. Each cluster centered in its own384x341 cell, wholly inside with generous padding, no overlap. Row1 left-to-right: fresh leafy green cabbage; orange carrots with green tops; ripe red tomatoes on leafy stem; golden corn ears with green husks. Row2: small orange pumpkin with green vine; plump edible brown mushrooms; glossy red apples with leaves; golden-green pears with leaves. Row3: cluster of blueberries and raspberries on a tiny leafy bush; ripe pink peaches with leaves; purple grapes bunch with vine leaf; small golden pineapple with spiky green crown. Each shows2-3 fruits/vegetables of the same kind as a harvestable cluster, except cabbage/pumpkin/pineapple can be single. Small roots/leaves allowed, no pots, no packaging, no plate, no big ground patches, no shadows, no scenery, no typography, no watermark. All objects use matching scale/lighting and genuine alpha transparency.

透明背景编辑提示：

Use case: background-extraction. Remove all white/off-white and tinted background around these twelve food sprites to fully transparent alpha0. Preserve exact fruits/vegetables, colors, detail, shapes, positions and 1536x1024 canvas with4columns3rows. Keep pale mushroom stalks and bright produce highlights intact. No background haze, no shadows, no change to the objects, no text. Genuine transparent PNG suitable for a game atlas, not translucent white.
