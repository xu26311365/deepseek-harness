# DSH Desktop · Windows x64 · 社区个人版

- 上游基线: deepseek-ai/deepseek-harness @ `4b399c39`（构建版本 0.2.3-alpha.2；构建 SHA、安装器与日志见页首 Build 段）

## 本轮改动

1. **dsh-market-panel 取代 @vibeinging/dsh-desktop-shell**: 保留"把 dshmarket 插件市场提为首页一级面板"功能，删除左下角分享与 Star 整块（footer 注入 / StarIcon / ShareIcon / 菜单与 CSS），更名为 `dsh-market-panel@0.2.0`（本地 vendor tarball，MIT），全仓引用点与 file: override 同步。
2. **删除 @linxin666/dsh-client-ui-task-board**: 全仓引用点（cli deps / web 模板 / spec）干净移除。

## 累计改动（自上游基线 4b399c39）

- 官方壳 main.js: 后台化 startBackend + 立即开窗 loading 占位页（BOOT 注入，backend ready 后 loadURL 换页）
- 品牌: DSH Desktop（productName / 窗口标题 / 卸载显示名 / wordmark）
- 遥测与官方更新: DSH_TELEMETRY_DISABLED=1，unsigned test 部署 origin，删除应用菜单「检查更新」项
- 构建管线（fork 侧 .github/workflows/dsh-win-unsigned-public.yml）: 公共 windows-2025 runner、仅上传 NSIS exe、每日自动发布 GitHub Release
- 运行时文件策略: 点条目（dot entries）从封存清单剔除，修复 ASAR integrity 校验

## 集成的插件（web profile 开箱即用）

| 包 | 版本 | 来源 |
| --- | --- | --- |
| @benrong/dsh-prompt-polish | 0.2.6 | registry |
| @liustack/modlens | 3.27.5 | registry |
| @michengai/dsh-archive-manager | 1.4.1 | registry |
| dsh-better-sidebar | 0.33.0 | registry |
| dsh-market-panel | 0.2.0 | 本地 vendor tarball |
| dsh-context | 0.87.1 | registry |
| dsh-multimedia-webui-input | 0.1.0 | registry |
| ds-harness-remote | 0.6.8 | registry |
| dshmarket | 1.84.1 | registry |
| meow-memory | 0.33.2 | registry |

## 注意事项

- 未签名社区构建: SmartScreen / 杀毒按常规处理（NSIS 报"未知发布者"）。
- 存量 profile 不会自动升级: 已装旧版本的用户，profile 目录里的 dsh.profile.bundles 冻结在首启清单；新插件需在插件页手动启用，或删 profile 目录重建（会丢数据）。
- 上游升级: `git pull origin master` 后跑 `pnpm install --frozen-lockfile`（lockfile-only 兜底），重新 dispatch 本 workflow 出包。
