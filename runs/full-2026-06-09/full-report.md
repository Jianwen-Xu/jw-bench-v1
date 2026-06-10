# JW-Bench v1 — Full Report

Generated: 2026-06-09T09:13:50.937Z

> Token counts are estimated via cl100k_base (gpt-tokenizer) for non-opencode models.
> opencode model token counts are exact (NDJSON step_finish).

## UGR Summary

| Format | UGR | 95% CI (Wilson) | n |
|---|---|---|---|
| jsx | 76.3% | [70.5, 81.2] | 240 |
| json-en | 73.8% | [67.8, 78.9] | 240 |
| xu-c | 72.9% | [67.0, 78.1] | 240 |
| xu-d | 73.8% | [67.8, 78.9] | 240 |

## H1: XU-CN-D vs JSX

- UGR(XU-CN-D) = 73.8%
- UGR(JSX)     = 76.3%
- Cohen's h    = -0.0578
- **Decision**: Kill

## Attrition Funnels

```
Cell: jsx
────────────────────────────────────────────────────────────────────────
Stage                       Pass%             95% CI   Cumul.UGR
M1 Parse                   100.0%     [98.4, 100.0]      100.0%
M2 Schema                  100.0%     [98.4, 100.0]      100.0%
M3 Component Exists        100.0%     [98.4, 100.0]      100.0%
M4 Prop Valid               98.3%      [95.8, 99.4]       98.3%
M5 Semantic Equiv           77.5%      [71.8, 82.4]       76.3%
```

```
Cell: json-en
────────────────────────────────────────────────────────────────────────
Stage                       Pass%             95% CI   Cumul.UGR
M1 Parse                   100.0%     [98.4, 100.0]      100.0%
M2 Schema                  100.0%     [98.4, 100.0]      100.0%
M3 Component Exists        100.0%     [98.4, 100.0]      100.0%
M4 Prop Valid              100.0%     [98.4, 100.0]      100.0%
M5 Semantic Equiv           73.8%      [67.8, 78.9]       73.8%
```

```
Cell: xu-c
────────────────────────────────────────────────────────────────────────
Stage                       Pass%             95% CI   Cumul.UGR
M1 Parse                   100.0%     [98.4, 100.0]      100.0%
M2 Schema                  100.0%     [98.4, 100.0]      100.0%
M3 Component Exists        100.0%     [98.4, 100.0]      100.0%
M4 Prop Valid               96.3%      [93.0, 98.0]       96.3%
M5 Semantic Equiv           75.8%      [69.8, 80.8]       72.9%
```

```
Cell: xu-d
────────────────────────────────────────────────────────────────────────
Stage                       Pass%             95% CI   Cumul.UGR
M1 Parse                   100.0%     [98.4, 100.0]      100.0%
M2 Schema                  100.0%     [98.4, 100.0]      100.0%
M3 Component Exists        100.0%     [98.4, 100.0]      100.0%
M4 Prop Valid              100.0%     [98.4, 100.0]      100.0%
M5 Semantic Equiv           73.8%      [67.8, 78.9]       73.8%
```

## Token Economics (median input+output)

| Format | Median Tokens |
|---|---|
| jsx | 744 |
| json-en | 676 |
| xu-c | 993 |
| xu-d | 1158 |
