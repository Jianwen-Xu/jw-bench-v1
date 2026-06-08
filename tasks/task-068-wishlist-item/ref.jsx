<Card>
  <Row>
    <Image size="medium" src="wishlist-item" />
    <Column>
      <Text variant="heading">时尚背包</Text>
      <Text variant="price">¥299</Text>
      <Badge variant="success">有货</Badge>
    </Column>
    <Column>
      <Button variant="primary" onTap="addToCart">加入购物车</Button>
      <Link onTap="removeWishlist">移除</Link>
    </Column>
  </Row>
</Card>
