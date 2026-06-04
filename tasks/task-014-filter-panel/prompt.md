设计一个筛选面板卡片（Card）：
- 标题"筛选条件"（Text）
- 关键词输入框（Input，placeholder="输入关键词"，bind=keyword）
- 分类选择器（Select，bind=category，options=categories）
- 状态切换（Toggle，label="仅显示有效"，bind=showActive）
- 标签"排序方式"（Text）+ 排序选择器（Select，bind=sortBy，options=sortOptions）
- 底部两个按钮：
  - "应用"按钮（variant=primary，onTap=applyFilter）
  - "重置"按钮（variant=default，onTap=resetFilter）
