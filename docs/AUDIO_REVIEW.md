# 游戏声音检查与真人发音替换

检查日期：2026-10-23。候选分支：`codex/wikimedia-word-audio`。52 个 Lisa 单词及打字机 CAT、SUN、HELLO 已全部匹配真人录音（53 个不同单词），代码尚未合并或发布。真人发音的主观试听和 iPad Safari 真机扬声器验证仍待复核。

## 生产版本盘点

通过 HTTPS 读取正式网站 Lisa 的 `audio/manifest.js` 和打字机 `game.mjs`，与本次修改前 main 完全一致。下表描述此次改动前的生产版本；本分支的修正见下节。

| 游戏 | 现有声音 | 检查结论 |
| --- | --- | --- |
| Lisa 字母冒险 | 52 个英文词、16 段提示语、5 个音效；加载失败时曾回退设备语音 | 单词来自 Miriam / eleven_multilingual_v2 合成素材，清单均 `pronunciation_listened: false`。11 个旧 Commons MP3 尚在仓库但原映射不使用它们，复习另写了一套 Iris 路径。 |
| 纸上电报局 | CAT、SUN、HELLO，8 段完整短句，提示语与机械音 | 独立单词是词典录音替换对象。完整短句保留连贯录音，不把零散单词拼成句子。 |
| 数学路径怪探 | 16 段中英文提示语、2 个音效 | 无独立单词教学音轨，保留提示语。 |
| 数字合成 | 14 段中英文提示语、2 个音效 | 无独立单词教学音轨，保留提示语。 |
| Lisa 奇妙大楼 | Web Audio 音效，可选系统语音读整句；英文 en-US，中文 zh-CN | 声音默认关闭；音色依设备而异，不能用词典片段替代整句情境提示。 |
| 华容道 | 未发现语音或音效播放实现 | 无单词录音需要替换。 |
| 射击科普 | Web Audio 机械与发射音效 | 无教学单词；默认静音，存在开启、音量及后台暂停逻辑。 |
| 柔柔 | 原创小舞曲 | “跳支小舞”漏音乐问题已在前一项任务发布修复，本次未改动。 |

首次盘点的 146 个 MP3 全部能被 FFmpeg 解码（含跨游戏复用素材，不是 146 个不同词）。Lisa 原合成单词平均电平约 -35.7 至 -21.2 dBFS，相差 14.5 dB。缺少试听记录、能够解码均不等于证明某词读错或正确，自动检查不能判断自然度和口音质量。

## 本分支实现

- 52 个 Lisa 单词全部改为 Wikimedia Commons 真人录音；逐条保存作者、许可链接、来源页面及修订号、原始 SHA-1/SHA-256、发布 MP3 的 SHA-256 和转换说明。
- 以美式为主。根据用户明确选择，igloo 使用英式，unicorn、yak 使用澳式；学习卡片、看图复习和来源页直接标明口音。其他 49 个 Lisa 词使用美式；打字机的三个词均为美式。
- 通过 Commons API 读取许可及文件信息，使用维基词典核对命名不同的录音和口音。elephant、fish 的机器可读作者字段为空，已从对应文件说明的具体修订中核对 Muke Tever、Dvortygirl 的署名。没有把上传者自动当成作者。
- Lisa 52 个素材的许可分布：42 个 CC BY-SA 3.0、5 个 CC BY-SA 4.0、2 个 CC0 1.0、1 个 CC BY 4.0、2 个 PD-self 公有领域。HELLO 另为 Dvortygirl 的 PD-self 录音。页面保留逐项状态，不笼统宣称全部同一许可。
- 原始媒体先验证 Commons SHA-1，再转为 44.1 kHz 单声道 MP3，仅施加固定增益；不剪切、不变速、不变调、不做动态压缩。目标整段 RMS 约 -24 dBFS，以峰值预留量优先，限制最大提升。结果约 -30.45 至 -23.95 dBFS，峰值最高 -3.9 dBFS；并非每个词的主观响度都完全一致。
- 教学、重听、复习、答错提示共用单词映射；启动复习时取消尚未完成的旧教学解码，避免串音。
- 加载失败会提示重听并清除失败缓存，允许下一次点击重新获取；不再自动换成设备合成声音。
- 来源页可逐词试听，一次只播放一段，切后台暂停。玩法提示继续使用原 Iris 录音。
- 关联打字机草稿：<https://github.com/LSDLyu/typewriter-game/pull/1>。共享 CAT/SUN 的 MP3 与署名记录，HELLO 另行导入；完整短句保留原声音。

## 获取与复现

三个所需域名已配置并完成实际 GET 检查：en.wiktionary.org、commons.wikimedia.org、upload.wikimedia.org 均 HTTP 200。录音已下载并验证解码。连续获取曾收到 Wikimedia HTTP 429，导入器停止后按每次请求至少 3 秒的间隔完成获取；没有绕过代理、换镜像或关闭 TLS 验证。

需要 Python 3、curl、FFmpeg/ffprobe。选择表 `tests/lisa/commons-selection.json` 明确指定文件与口音，避免猜测同名文件或静默混用语言：

```sh
python3 tests/lisa/import-commons-audio.py
python3 tests/lisa/build-english.py
python3 tests/lisa/check-word-audio.py
# 在独立打字机仓库接入同一来源：
python3 tests/lisa/import-commons-audio.py --root /workspace/typewriter-game/public --words cat sun hello
node /workspace/typewriter-game/scripts/build-word-credits.mjs
```

`check-word-audio.py` 的默认完整检查现已通过，不需要 `--allow-pending`。下载校验失败、许可不明或文件缺失均停止处理。原 Iris 包保留用于来源追溯及试听对比。

## 本次验证与限制

- 数字路径/Lisa：pnpm 11.19.0 下 `vitest run --maxWorkers=1` 的 53 项测试通过，TypeScript/Vite 生产构建通过。覆盖全部单词的教学/复习一致映射、英澳口音标记、下载失败后的重新获取及不调用设备语音。
- 完整文件检查：52 个实际 MP3 的格式、时长、校验和、口音及来源修订全部通过。55 份游戏单词 MP3 对应 53 个不同词。
- 打字机：10 项 Node 测试通过，覆盖 11 个目标的文件映射、3 个真人单词的哈希及中英资源路由。
- 浏览器使用 Chromium 原生媒体解码/播放和真实按钮操作，要求用户手势解锁；Lisa 通过测试响应中注入的入口调用原始函数。模拟一次 HTTP 503 验证重试，不模拟成功的媒体播放。
- 10 项原生浏览器检查通过，包含两种语言的教学/答错队列/静音、下载失败重试且不换设备声音、52 个词解码、口音文字、手机/iPad 尺寸的来源页布局及单路试听，以及打字机三个单词的连续播放。
- 另在 390×844 中文手机与 1024×768 英文 iPad 视口实际点击开始、关闭教程，显示 igloo、unicorn、yak 的学习卡片；口音标记均可见、未被遮挡且未溢出屏幕，并检查了截图。
- 不是 iPad Safari 真机或人工逐词试听认证。`pronunciation_listened: false` 如实保留；提供 53 组原合成录音/真人录音离线对比页供试听。大楼、射击及其他游戏的硬件声音和触感也未由这些测试验证。

本仓库 main 更新会自动发布 GitHub Pages，并由现有目录转发影响正式游戏。本次只更新代码与 PR，没有合并、部署或修改 Cloudflare 路由/绑定。
