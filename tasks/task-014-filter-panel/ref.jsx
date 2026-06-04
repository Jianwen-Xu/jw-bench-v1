<Card>
  <Text>筛选条件</Text>
  <Input placeholder="输入关键词" bind="keyword" />
  <Select bind="category" options="categories" />
  <Toggle label="仅显示有效" bind="showActive" />
  <Text>排序方式</Text>
  <Select bind="sortBy" options="sortOptions" />
  <Row>
    <Button variant="primary" onTap="applyFilter">应用</Button>
    <Button onTap="resetFilter">重置</Button>
  </Row>
</Card>
