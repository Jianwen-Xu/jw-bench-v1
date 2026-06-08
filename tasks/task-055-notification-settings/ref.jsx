<Column>
  <Text variant="heading">通知设置</Text>
  <Card>
    <Column>
      <Row>
        <Text>评论回复</Text>
        <Toggle bind="notifComment" />
      </Row>
      <Row>
        <Text>新粉丝</Text>
        <Toggle bind="notifFollower" />
      </Row>
      <Row>
        <Text>系统公告</Text>
        <Toggle bind="notifSystem" />
      </Row>
    </Column>
  </Card>
  <Button variant="primary" onTap="saveNotifSettings">保存设置</Button>
</Column>
