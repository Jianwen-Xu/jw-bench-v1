<Form>
  <Text variant="heading">二次验证</Text>
  <Text>请输入6位验证码</Text>
  <Input type="number" placeholder="6位验证码" bind="verificationCode" />
  <Button variant="primary" onTap="verifyCode">验证</Button>
  <Link onTap="resendCode">重新发送</Link>
  <Text variant="caption">60秒后可重新发送</Text>
</Form>
