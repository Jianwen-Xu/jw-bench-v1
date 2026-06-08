<Form>
  <Text variant="heading">预约服务</Text>
  <Select bind="serviceType" options="services" />
  <Input placeholder="选择日期" bind="bookingDate" />
  <Input placeholder="选择时间" bind="bookingTime" />
  <Input placeholder="备注" bind="notes" />
  <Button variant="primary" onTap="submitBooking">提交预约</Button>
  <Button onTap="cancelBooking">取消</Button>
</Form>
