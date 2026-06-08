<Form>
  <Text>编辑资料</Text>
  <Avatar size="medium" />
  <Input placeholder="请输入昵称" bind="nickname" />
  <Input placeholder="介绍一下自己..." bind="bio" />
  <Select bind="gender" options="genders" />
  <Button variant="primary" onTap="saveProfile">保存</Button>
  <Button onTap="cancelEdit">取消</Button>
</Form>
