设计一个个人资料编辑表单：
- 标题"编辑资料"（Text）
- 用户头像（Avatar，中等尺寸）
- 昵称输入框（Input，placeholder="请输入昵称"，bind=nickname）
- 简介输入框（Input，placeholder="介绍一下自己..."，bind=bio）
- 性别选择器（Select，bind=gender，options=genders）
- "保存"主按钮（Button，variant=primary，onTap=saveProfile）
- "取消"按钮（Button，onTap=cancelEdit）
- 整体包裹在 Form 中。