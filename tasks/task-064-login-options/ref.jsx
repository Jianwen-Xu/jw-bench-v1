<Column>
  <Text variant="heading">欢迎回来</Text>
  <Row>
    <Button variant="secondary" onTap="wechatLogin">微信登录</Button>
    <Button variant="secondary" onTap="qqLogin">QQ登录</Button>
    <Button variant="secondary" onTap="weiboLogin">微博登录</Button>
  </Row>
  <Text>或使用账号密码</Text>
  <Input type="email" placeholder="邮箱" bind="loginEmail" />
  <Input type="password" placeholder="密码" bind="loginPassword" />
  <Button variant="primary" onTap="loginSubmit">登录</Button>
  <Link onTap="goRegister">注册账号</Link>
</Column>
