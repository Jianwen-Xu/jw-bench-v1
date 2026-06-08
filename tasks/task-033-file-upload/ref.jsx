<Card>
  <Column>
    <Text variant="heading">上传文件</Text>
    <Button variant="primary" onTap="selectFile">选择文件</Button>
    <Row>
      <Text>报告.pdf</Text>
      <Text variant="caption">2.5 MB</Text>
      <Badge variant="success">已上传</Badge>
      <Link onTap="removeFile">删除</Link>
    </Row>
    <Button variant="primary" onTap="submitFiles">提交</Button>
  </Column>
</Card>
