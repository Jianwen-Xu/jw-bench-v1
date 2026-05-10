# JW-Bench v1 — Pre-Registration Document

> **状态**: 草稿（实验开始前需打 git tag `pre-reg-v1` 冻结）
> **日期**: 2026-05-09
> **禁止**: 跑完数据后修改任何阈值或假设。

---

## 模型版本（运行前填写精确 ID）

| 模型键 | API Model ID | 冻结日期 |
|---|---|---|
| claude-sonnet-4-6 | `claude-sonnet-4-6` | _填写运行前日期_ |
| claude-opus-4-7 | `claude-opus-4-7` | _填写运行前日期_ |
| deepseek-v4-pro | `deepseek-chat` | _填写运行前日期_ |
| deepseek-v4-flash | `deepseek-chat` | _填写运行前日期_ |

> 若任一模型在实验期间更新 API 标识符，按以下策略处理：
> - Phase 2 完成 < 50%：重启，前期样本标注为 `preview`
> - Phase 2 完成 ≥ 50%：继续，在 `results.csv` 的 `model_version` 列分版本记录，最终报告含敏感性分析

---

## H1（Confirmatory，预注册）

**唯一 Confirmatory 对比**: XU-CN-D vs JSX

- **H1 原假设 H0₁**: UGR(XU-CN-D) ≤ UGR(JSX)
- **统计检验**: Two-proportion z-test（辅以混合效应 logistic regression）
- **显著性水平**: α = 0.05（双侧，无需 Holm 校正，仅 1 个 confirmatory 对比）
- **目标功效**: 0.80

**Go 准则（以下均需满足）**:
1. p < 0.05（Two-proportion z-test）
2. Cohen's h ≥ 0.30（约 ≥ 15pp 差异）
3. Claude 与 DeepSeek 效应方向一致（同向）

**Pilot 三档决策阈值（不可事后修改）**:

| 观察到的 |ĥ| | 行动 |
|---|---|
| < 0.10 | **Kill** — 停止 XU 中文 wire 路线 |
| 0.10 – 0.30 | **Iterate** — 改进 prompt/教学后重跑 Pilot |
| ≥ 0.30 | **Go to Full** |

---

## H2（Secondary，不做 p-value 判定）

- **描述**: 在 UGR > 0 的子集上，Token(XU-CN-D) / Token(JSX) < 0.40
- **检验**: Mann-Whitney U（非正态分布，右偏）
- **报告**: ratio 的 95% bootstrap CI（B=10000）
- **阈值 justification**:
  - 理想下界：0.13×（§3.2 微观例子）
  - 工程上限：0.5×（迁移成本摊平需要）
  - 中位线：0.40×（本预注册阈值）
  - 若落在 0.40–0.50× 区间 → Scope-down（非 Kill）

---

## H3（Patch 协议，Confirmatory for §3.8）

- **原假设 H0₃**: UGR(XU-patch) < UGR(JSX-full) 或 token 节省 < 80%
- **统计检验**: 独立做一次 H1 流程（α=0.05），token 节省用配对 Wilcoxon signed-rank
- **场景**: Scenario B（增量 patch 编辑）

---

## Judge Calibration 门槛（Block 准则）

- **必须在主体 Pilot 开始前完成**
- **判定模型**: claude-sonnet-4-6
- **数据集**: 30 TP + 30 TN = 60 条 ground-truth spec pair
- **通过门槛**: F1 ≥ 0.90
- **若不通过**: 重写 `benchmark/judge.ts` 中的 JUDGE_SYSTEM_PROMPT，重新标定，**不得跳过**

---

## 控制变量声明（不可跑完再改）

1. **温度**: 主实验 temperature=0，稳健性检验 temperature=0.7
2. **每 task 独立 session**: 不复用上下文
3. **Few-shot**: 每 format 3 个等价示例（已写入 system prompt）
4. **教学等价性**: 4 份 system prompt 覆盖等价信息量（§2.3 控制变量 #2）
5. **信息量对齐**: 遵循附录 C 的 in-scope / out-of-scope 清单

---

## 样本量计划（由 Pilot ĥ 决定）

| Pilot |ĥ| | Full n/cell | 总调用（4×4×2×n×3） | 预算估算 |
|---|---|---|---|
| < 0.10 | Kill | — | — |
| 0.10–0.20 | 800 | 61440 | ~$700 |
| 0.20–0.30 | 200 | 19200 | ~$400 |
| 0.30–0.50 | 80 | 7680 | ~$280 |
| > 0.50 | 50 | 4800 | ~$180 |

---

## Exploratory 分析（不影响 H1 判定）

以下分析不预注册，不做 p-value 决策，仅供描述和 v2 研究问题参考：
- 教学维度（zero-shot / few-shot-3 / few-shot-3+manifest）对 UGR 的影响
- 任务难度（L1/L2/L3）的分层效应
- Latency vs UGR 相关
- Claude 内部尺寸缩放（Opus vs Sonnet）
- DeepSeek 内部尺寸缩放（Pro vs Flash）

---

## Secondary Descriptive 对比（报告点估计和 95% CI，不做 p-value 判定）

- XU-CN-C vs JSX
- JSON-EN vs JSX
- XU-CN-D vs XU-CN-C
- XU-CN-D vs JSON-EN
- 重量级配对：Claude Opus vs DeepSeek V4 Pro（剥离中文亲和度效应）
- 轻量级配对：Claude Sonnet vs DeepSeek V4 Flash

---

## 签名 / 冻结指令

```
# 冻结本文件（实验前执行）：
git add pre-registration.md
git commit -m "pre-registration: freeze hypotheses before pilot run"
git tag pre-reg-v1
git push origin pre-reg-v1
```

**冻结后不得修改任何阈值或假设描述。** 若有方法论更新，另建 `pre-registration-v2.md`，注明变更原因。
