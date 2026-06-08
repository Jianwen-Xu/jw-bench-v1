<Card>
  <Column>
    <Text variant="heading">选择支付方式</Text>
    <Row>
      <Checkbox bind="payWechat">微信支付</Checkbox>
    </Row>
    <Row>
      <Checkbox bind="payAlipay">支付宝</Checkbox>
    </Row>
    <Row>
      <Checkbox bind="payCard">银行卡</Checkbox>
    </Row>
    <Button variant="primary" onTap="confirmPayment">确认支付</Button>
  </Column>
</Card>
