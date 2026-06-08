<Card>
  <Row>
    <Checkbox bind="taskDone" />
    <Column>
      <Text variant="heading">完成报告</Text>
      <Text variant="caption">截止：2026-01-20</Text>
    </Column>
    <Badge variant="danger">高</Badge>
    <Button variant="ghost" onTap="deleteTask">删除</Button>
  </Row>
</Card>
