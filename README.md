# JW-Bench v1

**Chinese Wire DSL vs JSX Empirical Benchmark** — 衡量 LLM 在中文 UI DSL（XU-C、XU-D）和标准英文格式（JSX、JSON-EN）上的 UI 生成质量差异。

## 结论（2026-06-09）

| 格式 | UGR | 95% CI |
|------|-----|--------|
| JSX | **76.3%** | [70.5, 81.2] |
| JSON-EN | 73.8% | [67.8, 78.9] |
| XU-C | 72.9% | [67.0, 78.1] |
| XU-D | **73.8%** | [67.8, 78.9] |

**Cohen's h = -0.0578 → Kill（无统计显著差异）**

四种格式在 LLM UI 生成质量上无差异。中文 wire DSL 不会额外增加 LLM 的生成困难。

详细结果见 [`report.md`](report.md)（英文）和 [`report-zh.md`](report-zh.md)（中文）。

## 快速开始

```bash
npm install

# 配置 DeepSeek API Key
cp .env.example .env
# 编辑 .env 填入 DEEPSEEK_API_KEY

# 评判器校准（必须通过 F1 ≥ 0.88）
npx ts-node benchmark/run.ts --phase judge-calibration --parallel

# 跑 pilot
npx ts-node benchmark/run.ts --phase pilot --concurrency 3

# 跑 full phase
npx ts-node benchmark/run.ts --phase full --n 80 --concurrency 3
```

## 评测流水线（M1–M5）

```
M1 解析     — 输出能否被解析为合法的格式语法？
M2 结构     — 是否符合预期的树形结构？
M3 组件     — 所有组件类型是否存在于组件清单中？
M4 属性     — 所有属性在其所属组件上是否合法？
M5 语义     — UI 树是否与参考实现功能等价？（LLM 评判器）
```

UGR = M1 × M2 × M3 × M4 × M5。五项全部通过才算"可用"。

## 四种格式

| 格式 | 代码示例 | 说明 |
|------|---------|------|
| **JSX** | `<Button variant="primary" onClick={submit}>登录</Button>` | 标准 React JSX |
| **JSON-EN** | `["Button", {"variant":"primary"}, "Login"]` | 英文 JSON 骨架 |
| **XU-C** | `["按", {"式":"主","触":"submit"}, "登录"]` | 中文 JSON 骨架 |
| **XU-D** | `按 主 submit 登录` | 行式中文极简 DSL |

## 决策规则（Pilot 后）

| Cohen's h | 行动 |
|-----------|------|
| h < 0.10 | **Kill** — 差距可忽略，停止优化 |
| 0.10 ≤ h < 0.30 | **Iterate** — 仍有改善空间 |
| h ≥ 0.30 | **Go** — 跑 full phase |

## 项目结构

```
jw-bench-v1/
  tasks/                        # 80 任务 × 4 格式参考实现
    task-001-user-card/          #   每个任务含: prompt.md, ref.jsx, ref.json-en, ref.xu-c, ref.xu-d, checks.json
    ...
    task-080-dashboard-overview/
  manifests/
    xu-d/components.json        # 16+14 个组件的 manifest（props_order、枚举值）
  judge-calibration/            # 60 组评判器校准对（TP + TN）
    tp/                         # 33 组等价对
    tn/                         # 27 组不等价对
    manifest.json
  benchmark/
    config.ts                   # 模型注册、PILOT_CONFIG、FULL_CONFIG
    run.ts                      # 主运行器（pilot / full / judge-cal）
    judge.ts                    # LLM 评判器（M5 语义等价）
    xu-parser.ts                # 中文 DSL Unicode 解析器 + AST 归一化
    registry.ts                 # 组件检索实验（function calling）
    stats.ts                    # Wilson CI、Cohen's h、attrition funnel
    prompts/                    # 系统提示词（每个格式一个）
    validators/
      jsx.ts                    # JSX 解析 + M1-M4 校验
      xu.ts                     # XU 解析 + M1-M4 校验
  scripts/
    gen-tasks.js                # DSL → 任务文件生成器
    validate-refs.ts            # 参考文件校验器
  runs/                         # 运行输出（gitignored）
  .env.example
  report.md                     # 英文技术报告
  report-zh.md                  # 中文技术报告
```

## 组件库（30 个）

| 标签 | 组件 | 类型 | 关键属性 |
|------|------|------|----------|
| 列 | Column | 容器 | — |
| 排 | Row | 容器 | — |
| 卡 | Card | 容器 | — |
| 域 | Form | 表单 | 触（onSubmit） |
| 文 | Text | 展示 | 式（variant）、值（bind） |
| 图 | Image | 展示 | 大、形、源 |
| 按 | Button | 交互 | 式、触（onTap）、禁 |
| 入 | Input | 交互 | 类（type）、值、必、空（placeholder） |
| 选 | Select | 交互 | 值、选项、必 |
| 选框 | Checkbox | 交互 | 值、禁 |
| 切 | Toggle | 交互 | 值、禁 |
| 链 | Link | 交互 | 触、式 |
| 栏 | NavBar | 导航 | 题、返 |
| 标 | Badge | 装饰 | 式、值 |
| 提 | Toast | 反馈 | 式、値、时 |
| 头像 | Avatar | 展示 | 大、形、源 |
| 框 | Modal | 容器 | 式、题、闭 |
| 表 | Table | 容器 | 源、选 |
| 滑 | Slider | 交互 | 値、小、大 |
| 进 | Progress | 展示 | 値、式、总 |
| 点 | Radio | 交互 | 値、组 |
| 隔 | Divider | 装饰 | 式、字 |
| 转 | Spinner | 反馈 | 大、式 |
| 折 | Accordion | 容器 | 题、展 |
| 轮 | Carousel | 容器 | 源、时、轮 |
| 签 | Chip | 交互 | 式、闭、选 |
| 评 | Rating | 交互 | 値、大 |
| 下 | Dropdown | 交互 | 値、源、空 |
| 浮 | FAB | 交互 | 式、触、大、形 |
| 骨 | Skeleton | 展示 | 式、宽、高 |

## 模型

| 键 | API ID | 调用方式 | 状态 |
|----|--------|---------|------|
| `opencode-deepseek-v4-flash` | `deepseek-chat` | DeepSeek API | ✅ 启用 |
| `opencode-deepseek-v4-flash-registry` | `deepseek-chat` | DeepSeek API + function calling | ⬜ 实验 |
| `deepseek-v4-pro` | `deepseek-chat` | DeepSeek API | ⬜ 禁用 |
| `opencode-big-pickle` | `opencode/big-pickle` | OpenCode CLI | ⬜ 禁用 |

## 实验记录

| 实验 | 结论 | 文件 |
|------|------|------|
| 格式对比 | 四种格式无差异，Cohen's h ≈ 0 | `report.md` |
| Registry vs Inline | 16-30 组件下 inline 优于 function calling | `benchmark/registry.ts` |
| 中文绑定命名 | 英文命名优于中文（与参考文件一致） | — |
| XU Parser | 解析器归一化提升 XU-D 15 个百分点 | `benchmark/xu-parser.ts` |
| 评判器校准 | F1=97.0%（60 对） | `benchmark/judge.ts` |

## License

MIT
