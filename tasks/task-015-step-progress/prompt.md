设计一个步骤进度指示器：
- 标题"注册进度"（Text）
- 四个步骤水平排列（Row），每个步骤包含：
  - 步骤编号徽标（Badge）："1"（variant=success）、"2"（variant=success）、"3"（variant=primary/default）、"4"（variant=default）
  - 步骤标签（Text）："填写信息"、"验证邮箱"、"设置密码"、"完成"
- 底部两个导航按钮：
  - "上一步"按钮（Button，variant=default，onTap=prevStep）
  - "下一步"按钮（Button，variant=primary，onTap=nextStep）
- 整体纵向排列（Column）
