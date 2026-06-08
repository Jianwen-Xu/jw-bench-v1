<Card>
  <Column>
    <Row>
      <Avatar size="medium" shape="circle" src="user" />
      <Column>
        <Text variant="heading">张三</Text>
        <Text variant="caption">2小时前</Text>
      </Column>
    </Row>
    <Text>今天去了新开的餐厅，环境很棒！</Text>
    <Row>
      <Button variant="ghost" onTap="like">点赞</Button>
      <Button variant="ghost" onTap="comment">评论</Button>
      <Link onTap="share">分享</Link>
    </Row>
  </Column>
</Card>
