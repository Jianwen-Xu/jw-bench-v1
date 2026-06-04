<Form>
  <Input type="text" required placeholder="请输入用户名" bind="username" />
  <Input type="email" required placeholder="请输入邮箱" bind="email" />
  <Input type="password" required placeholder="请设置密码" bind="password" />
  <Select bind="country" options="countries" />
  <Button variant="primary" onTap="register">注册</Button>
  <Link onTap="login">已有账号？登录</Link>
</Form>
