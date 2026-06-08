<Column>
  <Text variant="heading">消息通知</Text>
  <Row>
    <Badge variant="info">系统</Badge>
    <Text>订单已发货</Text>
    <Text variant="caption">10分钟前</Text>
    <Link onTap="viewNotif">详情</Link>
  </Row>
  <Row>
    <Badge variant="success">活动</Badge>
    <Text>优惠券可用</Text>
    <Text variant="caption">1小时前</Text>
    <Link onTap="viewNotif">详情</Link>
  </Row>
  <Row>
    <Badge variant="warning">提醒</Badge>
    <Text>会员即将过期</Text>
    <Text variant="caption">昨天</Text>
    <Link onTap="viewNotif">详情</Link>
  </Row>
  <Link onTap="markAllRead">全部已读</Link>
</Column>
