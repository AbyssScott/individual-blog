# Developer Mode（个人编辑器）

本功能为静态 GitHub Pages 网站上的管理员编辑界面，不是独立私有服务器。页面地址、程序代码、已发布文章、已提交到公开仓库的文件及 Git 历史均公开。隐藏入口和 noindex 不是权限控制。GitHub API 实际控制写入权限；页面另外检查仓库所有者身份。

## 使用

1. 打开 GitHub fine-grained token 设置：https://github.com/settings/personal-access-tokens/new 。
2. Resource owner 选择 AbyssScott，Repository access 选择 Only select repositories → individual-blog。Repository permissions 只需要 Contents: Read and write（Metadata 自动授予）；如果要查看构建状态，可额外授予 Actions: Read。设置有限有效期。不要授予 Workflows、Administration 等权限。
3. 打开博客 /developer/，或者在文章网址末尾添加 #edit，也可在文章页面按 Alt+Shift+E。
4. 直接在管理页面输入 token，不要在聊天、仓库、URL 或配置文件中填写 token。令牌只保留在页面内存中，刷新或退出需要重新输入。
5. 编辑完整 Markdown 源码（包括 YAML），切换预览；预览忽略原始 HTML，屏蔽外部图片和链接，因此与 Astro 正式页面不完全一致。
6. 保存并发布后，使用现有 GitHub Actions 发布。提交成功不代表部署已经完成；可手动检查状态。若 GitHub 返回 SHA 冲突，先下载草稿再重新加载，不要覆盖其他版本。
7. 新建中英文文章时，使用同一 translationKey 可以关联两个版本，不自动翻译。

## 私人草稿与安全

- 草稿由 Web Crypto AES-GCM 加密后存于当前浏览器 localStorage，密钥由当前高熵 fine-grained token 派生。令牌不持久化。更换令牌后原草稿无法解密，因此先下载需要保留的草稿。浏览器隐私设置或存储限制也可能阻止自动保存。
- 公开仓库即使标记 draft: true 仍可被读取。编辑器不会把私人草稿提交到 GitHub。图片上传及文章删除会立即提交，历史内容仍可能公开。请勿上传私人图片。
- 管理页面不加载评论、外部字体或第三方脚本，限制网络访问至 GitHub API，并对 Markdown 预览先进行净化再渲染 KaTeX。不要在不可信设备使用；同源脚本或浏览器扩展被攻破仍可能带来风险。
- 只有 GitHub 账号凭证和仓库写入权限才能发布。客户端身份检查并非服务器级访问控制。需要真正非公开的后台网址及 OAuth 登录时，应改为独立受保护的服务。
- 图片管理支持上传和插入已有图片，暂不支持删除以免破坏文章引用。
