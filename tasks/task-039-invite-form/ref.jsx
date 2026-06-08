<Form>
  <Text variant="heading">邀请成员</Text>
  <Input type="email" required placeholder="请输入对方邮箱" bind="inviteEmail" />
  <Select bind="inviteRole" options="roles" />
  <Input placeholder="添加附言..." bind="inviteMessage" />
  <Button variant="primary" onTap="sendInvite">发送邀请</Button>
  <Button onTap="cancelInvite">取消</Button>
</Form>
