<Row>
  <Input placeholder="搜索..." bind="searchQuery" />
  <Select bind="filter" options="filterOptions" />
  <Button variant="primary" onTap="addNew">添加</Button>
  <Button variant="secondary" onTap="exportData">导出</Button>
</Row>
