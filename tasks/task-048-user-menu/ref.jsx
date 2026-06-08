<Card>
  <Column>
    <Row>
      <Avatar size="medium" shape="circle" src="admin" />
      <Column>
        <Text variant="heading">admin</Text>
        <Text variant="caption">管理员</Text>
      </Column>
    </Row>
    <Link onTap="goProfile">个人资料</Link>
    <Link onTap="goAccountSettings">账户设置</Link>
    <Link onTap="goMessages">消息中心</Link>
    <Link onTap="logout" variant="subtle">退出登录</Link>
  </Column>
</Card>
