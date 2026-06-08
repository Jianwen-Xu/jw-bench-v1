设计一个收货地址表单：
- 标题"添加新地址"（Text）
  - 收件人输入框（Input，placeholder="收件人"，bind=recipient）
  - 手机号输入框（Input，type=number，placeholder="手机号"，bind=phone）
  - 省份选择器（Select，bind=province，options=provinces）
  - 详细地址输入框（Input，placeholder="详细地址"，bind=address）
  - "保存地址"按钮（primary，onTap=saveAddress）
- 整体在 Form 中