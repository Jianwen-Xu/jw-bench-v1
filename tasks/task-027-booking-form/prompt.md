设计一个预约表单：
- 标题"预约服务"（heading）
- 服务类型 Select（bind=serviceType，options=services）
- 日期输入框（placeholder="选择日期"，bind=bookingDate）
- 时间输入框（placeholder="选择时间"，bind=bookingTime）
- 备注输入框（placeholder="备注"，bind=notes）
- "提交预约"按钮（primary，onTap=submitBooking）+ "取消"按钮
- 整体在 Form 中