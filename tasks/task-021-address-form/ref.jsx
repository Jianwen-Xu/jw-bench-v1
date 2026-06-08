<Form>
  <Text>添加新地址</Text>
  <Input placeholder="收件人姓名" bind="recipient" />
  <Input type="number" placeholder="手机号" bind="phone" />
  <Select bind="province" options="provinces" />
  <Input placeholder="详细地址" bind="address" />
  <Button variant="primary" onTap="saveAddress">保存地址</Button>
</Form>
