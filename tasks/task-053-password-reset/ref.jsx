<Form>
  <Text variant="heading">重置密码</Text>
  <Text>请输入注册邮箱以接收重置链接。</Text>
  <Input type="email" required placeholder="注册邮箱" bind="resetEmail" />
  <Button variant="primary" onTap="sendResetLink">发送重置链接</Button>
  <Link onTap="backToLogin">返回登录</Link>
</Form>
