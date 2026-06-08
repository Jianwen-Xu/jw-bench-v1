设计一个邀请成员表单：
- 标题"邀请成员"（heading）
- 邮箱输入框（type=email，必填，placeholder="请输入对方邮箱"，bind=inviteEmail）
- 角色 Select（bind=inviteRole，options=roles）
- 附言输入框（bind=inviteMessage）
- "发送邀请"按钮（primary，onTap=sendInvite）+ "取消"按钮
- 整体在 Form 中