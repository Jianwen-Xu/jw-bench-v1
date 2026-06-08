<Card>
  <Row>
    <Image size="medium" src="product" />
    <Column>
      <Text variant="heading">商品名称</Text>
      <Text variant="price">¥99.00</Text>
      <Input type="number" bind="quantity" placeholder="1" />
      <Button variant="secondary" onTap="removeItem">删除</Button>
    </Column>
  </Row>
</Card>
