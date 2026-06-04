<Column>
  <Text>通知中心</Text>
  <Toast variant="success" bind="toastSuccess">操作成功</Toast>
  <Button onTap="toastSuccess">显示成功提示</Button>
  <Toast variant="error" bind="toastError">操作失败</Toast>
  <Button onTap="toastError">显示错误提示</Button>
  <Toast variant="warning" bind="toastWarning">请确认信息</Toast>
  <Button onTap="toastWarning">显示警告提示</Button>
  <Text>点击按钮查看对应提示</Text>
</Column>
