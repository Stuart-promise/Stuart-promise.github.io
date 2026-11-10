# 宠物立绘

使用内置 image_gen 分别生成 30 种动物的幼年、青年和成年立绘，共 90 张。完整的物种、阶段和风格提示词组成见 [prompts.json](./prompts.json)。最终逐张使用的完整提示词见 [generation-prompts.json](./generation-prompts.json)。每个文件对应一次独立生成，非表情符号或同图放大。

风格：可爱的伪 3D 质感，柔和光影，完整身体，透明背景。幼年以大头、短肢、圆润体态表现；青年更活泼；成年展现完整体态、尾羽或鳍与成熟花纹。

网页使用同目录的 `{species}-{baby|young|adult}.webp`，最大边 640 像素，保留透明度。仅加载当前宠物和当前选择页的预览，选择列表采用延迟加载。

生成原始 PNG 保存在本地 `D:/ai_codex_it/pet234-account-service/pet-art-source/`，网页实际使用资源位于本目录。
