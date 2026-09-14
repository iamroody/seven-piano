# 七音

面向零基础用户的七键钢琴。直接用浏览器打开 index.html，或在此目录执行 `python3 -m http.server 5173` 后访问 http://localhost:5173。

支持数字 1–7、鼠标、触屏多点弹奏；十首数字简谱或经典片段、下一音提示、试听、音量控制。无依赖，无需联网。声音使用本地内置的 FluidR3_GM 原声钢琴采样（C4–B4 七个音），保留击弦起音和自然衰减；松键后柔和收音。来源与许可见 AUDIO-CREDITS.md。

## 练习与曲库

首页默认《小星星》，直接显示当前一句和琴键。支持「跟谱练习 / 自由弹」切换，自由弹隐藏简谱且不推进跟弹进度。可以切换上一句 / 下一句，或查看全谱并点选一句。进度保存在当前浏览器会话中。

独立曲库为 `songs.html`，支持搜索、展开全谱和「练这首」返回练习。新增简谱只需更新 `songs.js`，提供唯一且稳定的 `id`、`title` 和 `phrases`；仅支持 1–7，不支持高低八度或休止符。`5:2` 表示两拍，`5:0.5` 表示半拍，`5:1.5` 表示附点节奏。曲库和钢琴共用这一份数据。

## 曲目范围

固定 C4–B4 七个白键，不做自动八度切换。影视曲只选连续短片段，可整体移调，但不把单个高低音折回同八度。《生日快乐》为移调后的前两句；《卡农》是基于 I–V–vi–iii–IV–I–IV–V 和声的新编分解和弦练习，不是原作主旋律。其余新增曲目在标题中注明节选范围。

选段核对参考：
- 蜜雪冰城：https://www.acgmuse.com/d/1955
- 永远同在：https://www.flutenotes.ph/2011/11/always-with-me-spirited-away-ost-flute.html
- 散步：https://www.kalimbatabs.net/kalimba-tabs-tutorials/さんぽ-sanpo-stroll-となりのトトロtonari-no-totoro-op/
- 天空之城：https://www.wikizero.org/wiki/en/LAPUTA%3A_Castle_in_the_Sky （开头旋律记谱）
- 加勒比海盗：https://www.singing-bell.com/how-to-play-pirates-caribbean-piano-tutorial-notes-keys-sheet-music/

仅录入单声部短练习片段，不附歌词或转载谱图。
