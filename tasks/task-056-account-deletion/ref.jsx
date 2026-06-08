<Card>
  <Column>
    <Badge variant="danger">⚠</Badge>
    <Text variant="heading">注销账户</Text>
    <Text variant="body">此操作不可撤销。</Text>
    <Input placeholder="输入'确认删除'以继续" bind="confirmDelete" />
    <Row>
      <Button variant="primary" onTap="confirmDeletion">确认注销</Button>
      <Button variant="ghost" onTap="cancelDeletion">取消</Button>
    </Row>
  </Column>
</Card>
