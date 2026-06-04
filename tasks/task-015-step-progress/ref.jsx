<Column>
  <Text>注册进度</Text>
  <Row>
    <Badge variant="success">1</Badge>
    <Text>填写信息</Text>
    <Badge variant="success">2</Badge>
    <Text>验证邮箱</Text>
    <Badge>3</Badge>
    <Text>设置密码</Text>
    <Badge>4</Badge>
    <Text>完成</Text>
  </Row>
  <Row>
    <Button onTap="prevStep">上一步</Button>
    <Button variant="primary" onTap="nextStep">下一步</Button>
  </Row>
</Column>
