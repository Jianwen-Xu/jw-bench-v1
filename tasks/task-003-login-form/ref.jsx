<Form>
  <Input type="email" required placeholder="请输入邮箱" bind="email" />
  <Input type="password" required placeholder="请输入密码" bind="password" />
  <Checkbox bind="rememberMe">记住我</Checkbox>
  <Button variant="primary" onTap="submit">登录</Button>
  <Link onTap="forgot">忘记密码？</Link>
</Form>
