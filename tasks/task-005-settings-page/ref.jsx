<Column>
  <Card>
    <Text variant="section-title">个人资料</Text>
    <Avatar size="medium" />
    <Input bind="name" placeholder="请输入姓名" />
    <Button variant="primary" onTap="save_profile">保存</Button>
  </Card>
  <Card>
    <Text variant="section-title">通知偏好</Text>
    <Row>
      <Text>邮件通知</Text>
      <Toggle bind="email_notif" />
    </Row>
    <Row>
      <Text>短信通知</Text>
      <Toggle bind="sms_notif" />
    </Row>
    <Row>
      <Text>推送通知</Text>
      <Toggle bind="push_notif" />
    </Row>
  </Card>
  <Card>
    <Text variant="section-title">账户操作</Text>
    <Button variant="secondary" onTap="deactivate">注销账户</Button>
  </Card>
</Column>
