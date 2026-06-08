设计一个双因素认证表单：
- 标题"二次验证"（heading）
- 说明文字
- 验证码输入框（type=number，placeholder="6位验证码"，bind=verificationCode）
- "验证"按钮（primary，onTap=verifyCode）
- "重新发送"链接（onTap=resendCode）
- "60秒后可重新发送"（caption）
- 整体在 Form 中