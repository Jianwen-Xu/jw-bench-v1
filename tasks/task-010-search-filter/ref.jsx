<Row>
  <Input placeholder="搜索关键词..." bind="query" />
  <Select bind="category" options="categories" />
  <Button variant="primary" onTap="search">搜索</Button>
  <Button onTap="reset">重置</Button>
</Row>
