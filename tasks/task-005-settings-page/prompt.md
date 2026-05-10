设计一个设置页面，包含 3 个 section：

**Section 1 — 个人资料**
- 头像（中等尺寸）
- 姓名输入框（绑定 name 状态，placeholder="请输入姓名"）
- "保存"主按钮（触发 save_profile action）

**Section 2 — 通知偏好**
- 邮件通知 toggle（绑定 email_notif 状态）
- 短信通知 toggle（绑定 sms_notif 状态）
- 推送通知 toggle（绑定 push_notif 状态）

**Section 3 — 账户操作**
- "注销账户"次要危险按钮（触发 deactivate action）

整体在纵向列中，各 section 用卡片包裹。
