---
title: "冷藏饼干面团会让饼干更小吗？一次随机实验"
date: 2026-11-22
lang: zh
translationKey: cookie-refrigeration-randomized-experiment
tags: ["实验"]
draft: false
---

这是我在 Donald P. Green 的《Experimental Methods》课程上完成的一份实验报告。我想研究一个看起来不那么学术、却很适合拿来做随机实验的问题：**烤饼干之前一直把面团放在冰箱里，和提前拿出来在室温下回温，究竟会不会影响烤出来的饼干直径？**

Donald 最后给了我 97 分，一个相当 decent 的分数，好到我甚至觉得有些受之有愧。不过，从分数和他的反馈来看，至少说明这次实验的设计、执行和报告写作得到了相当不错的评价。所以我也终于有了一点底气，把它放在这里。如果你是个烘焙爱好者，或许会觉得这个实验有些意思。

关于冷藏饼干面团是否会影响烘焙时的延展，此前已经有过一些研究和烘焙测试（例如 [Hamel, 2015](https://www.kingarthurbaking.com/blog/2015/05/17/chilling-cookie-dough) 和 [Cho & Liang, 2021](https://ojs.library.ubc.ca/index.php/expedition/article/view/196120)）。它们都倾向于认为，冷藏会让饼干在烤制过程中延展得更少，最终直径也更小。我肯定不是把这个问题研究得最好的人，但我对此也有一些借口：我没有那么多资金，也没有多么理想的烘焙条件。我的烤箱甚至不够大，没法一次烤 20 块饼干。

不过，我这次有一个不太一样的地方：我没有自己制作面团，而是直接买了 Pillsbury 的商品预制面团。这和之前主要使用自制面团的测试不完全一样，结果也未必能够直接比较。

更有意思的是，这次实验并没有得到此前研究以及我的本科导师兼烘焙大师 Wilfred Chow 所预期的结果：**冷藏三小时的面团，与先冷藏一个半小时、再放在室温下回温一个半小时的面团，烤出来的饼干在直径上并没有表现出统计显著的差异。** 两组平均直径只差约 0.16 毫米，随机化检验的 $p$ 值为 0.690。

当然，这不等于我证明了冷藏完全没有作用，更谈不上推翻之前的研究。我的样本只有 32 块饼干，而且用的还是单一品牌的商品面团。至于为什么这次没有得到预期中的差异，我也没法完全解释清楚。商品面团的配方是否有关系？或者，是因为两组面团其实都先经历了一段冷藏？这些目前都只是猜测。如果有烘焙爱好者对其中的机制有什么看法，我很乐意听。

下面保留我的英文实验报告正文（不包含 Appendix）。完整的预注册材料、附录、实验照片、原始数据和 R 代码都可以在文末的 GitHub 仓库中找到。

---

*This experiment was preregistered at [AsPredicted #324567](https://aspredicted.org/8b3y59.pdf).*

## 1. Introduction

### 1.1 Motivation

Previous baking tests suggest that chilling homemade cookie dough reduces spreading. Hamel (2015) observed less spreading in chilled chocolate-chip dough, while Cho and Liang (2021) found that longer chilling resulted in smaller cookie diameters. However, it remains unclear whether these findings apply to commercially prepared, ready-to-bake dough, which is typically sold refrigerated. This experiment therefore examines whether keeping commercial cookie dough refrigerated until baking, rather than allowing it to warm at room temperature beforehand, affects the diameter of the baked cookies.

### 1.2 Hypothesis

**H1 (two-sided):** Mean baked cookie diameter differs between dough kept refrigerated until baking and dough allowed to warm at room temperature beforehand.

## 2. Experimental Design

The experiment used 32 pre-portioned pieces of Pillsbury Ready to Bake Sugar Cookie Dough from two packages. Each cookie served as both the unit of randomization and the unit of analysis. On November 14, 2026, the cookies were baked in two batches of 16, with eight cookies on each oven rack.

Random assignment was blocked by baking batch and oven rack to account for potential differences in baking conditions. Each of the four blocks contained four treatment and four control cookies, allowing comparisons within similar baking environments and potentially improving the precision of the estimated treatment effect. Positions within each tray were also randomized to reduce systematic differences in heat exposure (see the GitHub repository for the randomized assignments).

Treatment cookies (T) remained refrigerated for 180 minutes, while control cookies (C) were refrigerated for 90 minutes before being left at room temperature for another 90 minutes. Within each batch, both groups were baked simultaneously at 350°F for 17 minutes. After cooling on the baking trays for five minutes, two perpendicular diameters were measured across the bottom of each cookie to the nearest 0.1 cm. The average of these two measurements served as the preregistered outcome.

## 3. Core Assumptions

The design sought to satisfy three core assumptions. First, random assignment followed a predetermined within-block allocation, independent of the cookies' potential outcomes. Second, non-interference was supported by spacing cookies apart during baking, preventing them from merging and reducing the likelihood that one cookie's spreading would affect another's diameter. Third, excludability was supported by applying identical baking, cooling, and measurement procedures across treatment conditions, reducing the possibility that assignment would affect outcomes through pathways other than the intended temperature treatment.

## 4. Results

### 4.1 Descriptive Statistics

The mean baked cookie diameter was 5.8781 cm in the treatment group and 5.8625 cm in the control group, indicating a very small difference. As shown in Figure 1, the two groups' outcome distributions largely overlap, although the treatment group exhibited slightly greater variation (SD = 0.1064 cm) than the control group (SD = 0.0742 cm).

![Individual Cookie Diameters by Treatment Condition.](https://raw.githubusercontent.com/AbyssScott/POLS4724-Practicum-Experiment/main/result/cookie_outcomes.png)

*Individual Cookie Diameters by Treatment Condition.*

### 4.2 Statistical Inference

The preregistered estimand was the sample average treatment effect (ATE) of continued refrigeration relative to pre-baking warming. I estimated it using a blocked difference-in-means estimator, weighting each block's treatment-minus-control difference by its share of the total sample:

$$
\widehat{\mathrm{ATE}}_{\mathrm{blocked}}
=\sum_{b=1}^{4}\frac{N_b}{N}
\left(\bar{Y}_{Tb}-\bar{Y}_{Cb}\right).
$$

Because all four blocks had equal sizes and treatment proportions, the blocked estimate was identical to the pooled difference in means.

Table 1 reports an estimated ATE of +0.0156 cm (approximately 0.16 mm), indicating that refrigerated cookies were slightly wider on average. The conservative Neyman standard error was 0.0309 cm, reflecting the estimated variability of the blocked estimator across hypothetical random assignments. Since the standard error is nearly twice the magnitude of the estimated effect, the observed difference is small relative to its statistical uncertainty.

The normal-approximation 95% confidence interval [−0.0449, 0.0762] cm includes zero, indicating that the data are compatible with either a small negative or positive treatment effect. Across hypothetical repeated random assignments, approximately 95% of confidence intervals constructed using this procedure would contain the true sample ATE. Since the interval includes zero, we cannot reject a zero average treatment effect at the 5% significance level.

**Table 1. Main Experimental Results**

| Statistic | Estimate |
| --- | ---: |
| Treatment mean (T; $n = 16$) | 5.8781 cm |
| Control mean (C; $n = 16$) | 5.8625 cm |
| Blocked ATE (T − C) | +0.0156 cm |
| Conservative Neyman SE | 0.0309 cm |
| Normal-approximation 95% CI | [−0.0449, 0.0762] cm |
| Two-sided Fisher RI $p$-value | 0.690 |
| Total observations | 32 |

A two-sided Fisher randomization test examined the sharp null hypothesis that treatment had no effect on any individual cookie:

$$
H_0^{\mathrm{sharp}}:\quad Y_i(1)=Y_i(0),\quad \forall i.
$$

Under this null hypothesis, I simulated 10,000 random reassignments, preserving four treatment and four control cookies within each block. The resulting p-value was 0.690, indicating that approximately 69.0% of simulated assignments produced absolute treatment-effect estimates at least as large as the observed estimate. Thus, the observed difference was not unusual under the sharp null, which we fail to reject at the 5% significance level. Figure 2 presents the estimated ATE and its confidence interval. The randomization distribution is available in the GitHub repository.

![Estimated Treatment Effect with 95% Confidence Interval.](https://raw.githubusercontent.com/AbyssScott/POLS4724-Practicum-Experiment/main/result/treatment_effect_ci.png)

*Estimated Treatment Effect with 95% Confidence Interval.*

## 5. Discussion and Conclusion

The estimated effect was slightly positive, in contrast to the reduced spreading associated with chilling in previous studies of homemade dough. However, the difference was too small and statistically uncertain to establish a contradictory finding. One possible explanation is that both groups began with refrigerated dough, which may have limited the contrast between treatment conditions, although this possibility was not directly tested.

The small sample size limits statistical precision, while the use of a single brand restricts generalizability. Future experiments could improve on this design by including larger samples and multiple brands, while retaining blocked randomization to examine whether treatment effects vary across products.

## References

Cho, K., & Liang, J. (2021). Examination of the effects of chilling time on the spreading of cookies. *The Expedition, 11*.  
<https://ojs.library.ubc.ca/index.php/expedition/article/view/196120>

Hamel, P. J. (2015). *Chilling cookie dough: Does it make a difference?* King Arthur Baking.  
<https://www.kingarthurbaking.com/blog/2015/05/17/chilling-cookie-dough>

---

## 补记：关于盲法（Blinding）

Donald 在报告的 *Core Assumptions* 一节旁边写了一句：“What about blinding?” 这一点我确实没有交代清楚：**实验并没有正式设计盲法**，也没有让一个不知道分组情况的独立观察者来测量饼干。

在这个实验里，我觉得缺乏盲法最可能影响结果的地方，是测量时我会不会因为知道某块饼干属于哪一组，而有意或无意地改变读数。不过，我当时是按照饼干在烤盘上的摆放顺序逐个测量和记录的，测量时也刻意不去对照它们的组别。更何况，两组烤出来的饼干几乎长得一模一样，所以我个人认为，这种影响应该不大。

但这仍不等于严格意义上的盲测，也不能仅凭我自己认为没有受到影响，就完全排除观察者偏差。如果重新做一次，最好让不知道处理分组的人根据饼干编号独立完成测量。

**[GitHub：完整实验报告、Appendix、实验数据与分析代码](https://github.com/AbyssScott/POLS4724-Practicum-Experiment)**
