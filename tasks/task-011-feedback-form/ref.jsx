<Form>
  <Text>意见反馈</Text>
  <Select bind="type" options="feedbackTypes" />
  <Input placeholder="请详细描述您的问题或建议..." bind="content" />
  <Input placeholder="手机号或邮箱（选填）" bind="contact" />
  <Button variant="primary" onTap="submitFeedback">提交反馈</Button>
  <Button onTap="cancel">取消</Button>
</Form>
