---
title: "Does Chilling Cookie Dough Make Cookies Smaller?"
date: 2026-11-22
lang: en
translationKey: cookie-refrigeration-randomized-experiment
tags: ["Experiments"]
draft: false
---

This is a report I wrote for Donald P. Green's *Experimental Methods* course. It examines whether keeping cookie dough refrigerated before baking, rather than letting it warm up at room temperature, affects the diameter of the baked cookies. Don gave the report a pretty decent grade, so decent that I almost felt I didn't deserve it. Still, judging from the grade I received and his feedback, I think my experimental design and execution were reasonably rigorous, so I feel a bit more confident about sharing the report here. If you enjoy baking, you might find this experiment interesting.

One thing to note: this was originally a course report with a word limit of around 750 words, so there were some points I didn't go into much detail about.

There have already been some studies and baking tests on whether chilling cookie dough affects the diameter of the baked cookies (for example, [Hamel, 2015](https://www.kingarthurbaking.com/blog/2015/05/17/chilling-cookie-dough) and [Cho & Liang, 2021](https://ojs.library.ubc.ca/index.php/expedition/article/view/196120)). I'm certainly not the person who has studied this question most thoroughly, but I do have a few excuses: I didn't have much money to spend or particularly good baking conditions. My oven wasn't even big enough to bake 20 cookies at once. One fairly obvious difference between my experiment and earlier studies, though, is that I used store-bought, ready-to-bake dough rather than making the dough myself.

Interestingly, my experiment didn't produce the result suggested by earlier research, or the one Don and my undergraduate advisor and baking master Wilfred Chow had expected. If you're curious what happened, you can read the report below. As for why it turned out this way, I can't fully explain the mechanism myself. If any baking enthusiasts have insights, please let me know.

---

## Effect of Continued Refrigeration Relative to Pre-Baking Warming on Cookie Diameter: A Randomized Experiment

Xiang Lian  
POLS GU4724 | Experimental Methods | Fall 2026

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

## A Note on Blinding

Donald pointed out in his feedback that I hadn't discussed blinding. Indeed, this experiment did not formally use blinding, so measurement bias was possible. However, I measured and recorded the cookies in the order they were arranged on the trays, deliberately avoiding checking which group each cookie belonged to. The cookies from the two groups also looked almost identical. For these reasons, I think the lack of blinding probably had only a limited effect on the measurements.

**[GitHub: Full report, appendices, experimental data, and R code](https://github.com/AbyssScott/POLS4724-Practicum-Experiment)**
