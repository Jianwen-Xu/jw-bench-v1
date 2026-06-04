设计一个反馈表单，包含：
- 标题"意见反馈"（Text）
- 反馈类型选择器（Select，bind=type，options=feedbackTypes）
- 反馈内容输入框（Input，placeholder="请详细描述您的问题或建议..."，bind=content）
- 联系方式输入框（Input，type=text，placeholder="手机号或邮箱（选填）"，bind=contact）
- "提交反馈"按钮（Button，variant=primary，onTap=submitFeedback）
- "取消"按钮（Button，variant=default，onTap=cancel）

所有内容包裹在 Form（域）中。
