<Form>
  <Text variant="heading">联系我们</Text>
  <Input placeholder="姓名" bind="contactName" />
  <Input type="email" placeholder="邮箱" bind="contactEmail" />
  <Input type="number" placeholder="电话" bind="contactPhone" />
  <Input placeholder="留言内容" bind="contactMessage" />
  <Button variant="primary" onTap="sendMessage">发送</Button>
</Form>
