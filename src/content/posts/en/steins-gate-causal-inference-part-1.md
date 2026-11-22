---
title: "Steins;Gate and Causal Inference (Part I)"
date: 2026-11-22
lang: en
translationKey: steins-gate-causal-inference-part-1
tags: ["Causal Inference", "Anime / Otaku Culture", "Games", "Experiments", "Causal Inference in Imaginary Worlds"]
draft: false
---

## Where It All Began

This is my very first blog post. But before getting into the actual topic, I'd like to go off on a little tangent.

Long before I settled on the topic of this post, I'd been thinking about starting a somewhat unusual blog series. So far, I've come up with two possible names: *Causal Inference in Worlds That Don't Exist* and *Causal Inference in Imaginary Worlds*. I still haven't decided which one I prefer. Maybe I'll think of something better later!

The idea came from my interest in exploring questions that would be difficult, if not impossible, to investigate in the real world, but that might become possible in fictional settings. In reality, **we cannot observe the outcomes of different interventions for the same individual at the same time**. We get to see what actually happened, but not what would have happened under a different intervention. This is one of the fundamental problems of causal inference, and much of the field is devoted to finding ways around it. But in video games, anime, movies, and other fictional worlds, things don't always have to work that way.

A good example is *X-Men: Days of Future Past*. The movie shows us two different histories: one in which Raven (Mystique) succeeds in assassinating Trask, and another in which the assassination is prevented. We can think of whether the assassination succeeds as an intervention. The movie then shows us two possible outcomes under these different conditions: a future in which mutants face extinction, and another in which they manage to survive.

This got me thinking: If we could observe counterfactual outcomes that are impossible to observe in reality, or carry out interventions that would be impossible in the real world, what could we actually learn about causality? Would the methods we use for causal inference still apply? Could these unusual conditions help us identify causal relationships that would otherwise remain out of reach?

To be honest, I don't know the answers yet. But my intuition tells me that things would probably be a little different. And if I want to find out how, I'll have to explore these ideas further. Writing them down seems like a good place to start. Hopefully, the process of putting my thoughts into words, working through them, and discovering new questions along the way will help me come to some interesting conclusions. That's really why I wanted to start this series in the first place. Well, I suppose you could just call it a collection of thought experiments set in fictional worlds.

Of course, some of the ideas and arguments I put forward here may turn out to be right, and others may be wrong. I hope you'll cut me a little slack. I'm still just a graduate student, after all. I'm not saying that to excuse my mistakes, but I do think it would be pretty strange to go through this stage of learning without getting things wrong every now and then.

As for what comes next, I already have a few ideas. For example, the second entry in this series might explore gender-swapping in anime and the interesting questions it raises for causal inference. But I'll save the details for another time. You'll just have to wait until I get around to writing it!

## Okabe Rintaro Is a Damn Cheater at Causal Inference!

<figure>
  <img src="/individual-blog/images/steins-gate-meme.webp" alt="A famous Steins;Gate convention meme" width="650" loading="eager" decoding="async" />
  <figcaption>Note: This is a very famous Steins;Gate meme. There's no particular reason for including it here. I just wanted to post it. Interestingly, tracing the image back to its original source once sparked quite a bit of online discussion and detective work. I like to call this “cyber archaeology.”</figcaption>
</figure>

Anyway, back to the topic. The inspiration for this post comes from an anime I watched about five or six years ago: *Steins;Gate*, which was adapted from a visual novel of the same name.

I'm not going to go through the entire plot here. If you're interested, you can look it up yourself. The now half-dead Moegirl Wiki is probably still a decent place to start.

For our purposes, all you need to know is that the story follows Okabe Rintaro (or, as he insists on calling himself, Hououin Kyouma), who uses time-leaping technology to travel back into the past again and again, trying different actions in an attempt to save his childhood friend, Mayuri Shiina, from her seemingly inevitable death.

By the way, I'll be calling Mayuri “Tuturu” from now on. Why? Because I like the name. That's it. No further explanation.

And yes, I know some fans will probably point out that the story also involves saving his beloved “Assistant,” Kurisu Makise. But that's a story for later, and it isn't what I want to focus on here.

So why am I bringing up *Steins;Gate* in a post about causal inference?

Well, as I've learned more about causal inference and the potential outcomes framework, I've started looking back at the story from a different perspective. And something rather interesting occurred to me.

Hey, wait a minute. From a causal inference perspective, <strong>Okabe is basically cheating!</strong>

Think about it. Throughout the story, he can repeatedly return to the past, try different interventions under similar historical conditions, and observe whether those interventions lead to different potential outcomes!

<figure>
  <img src="/individual-blog/images/okabe-shouting.webp" alt="Okabe Rintaro in the Steins;Gate anime" width="504" loading="lazy" decoding="async" />
</figure>

Let's try putting this into the language of the potential outcomes framework.

In the real world, we cannot observe both the factual and counterfactual outcomes for the same individual under different interventions. Suppose we have an individual $i$ and an intervention $A$, where $A=1$ means receiving the intervention and $A=0$ means not receiving it.

We can use $Y_i(1)$ and $Y_i(0)$ to represent the individual's potential outcomes under these two conditions. The individual treatment effect (ITE) we're interested in is:

$$
\tau_i=Y_i(1)-Y_i(0)
$$

The problem is that, for any given individual, **we can observe only one of $Y_i(1)$ and $Y_i(0)$**, never both. As a result, we cannot directly calculate that individual's treatment effect. This is what we call the *Fundamental Problem of Causal Inference*.

So how do we deal with this problem in the real world?

One widely recognized gold standard is the randomized experiment. The basic idea is to use random assignment to create comparable treatment and control groups. Under random assignment, the distributions of potential outcomes across the two groups are the same in expectation.

In other words, even though we cannot find two perfectly identical people, random assignment allows us to **make the two groups statistically comparable**. We can then use the control group as a counterfactual reference for what would have happened to the treatment group without the intervention.

Under appropriate experimental conditions, we can therefore estimate the average treatment effect (ATE) by comparing the average outcomes of the two groups:

$$
\begin{aligned}
ATE &= \mathbb{E}[Y_i(1)-Y_i(0)]\\
&= \mathbb{E}[Y_i(1)]-\mathbb{E}[Y_i(0)]
\end{aligned}
$$

In a randomized experiment, we can estimate this quantity using the difference between the observed sample means:

$$
\widehat{ATE}=\overline{Y}_{A=1}-\overline{Y}_{A=0}
$$

Because random assignment makes the two groups comparable in expectation, we have a basis for attributing differences in their average outcomes to the intervention rather than to systematic differences that existed beforehand.

This is one of the central ideas behind modern experimental causal inference.

But now, let's go back to Okabe. His situation is completely different!

For our little thought experiment, let's define the outcome as whether Tuturu dies, with death coded as 1 and survival as 0.

Thanks to his time-leaping ability, Okabe can keep returning to the same point in the past, try different actions, and observe whether those actions produce different outcomes for Tuturu.

<figure>
  <img src="/individual-blog/images/mayuri-tutturu.webp" alt="Mayuri Shiina (Tuturu) in the Steins;Gate anime" width="500" loading="lazy" decoding="async" />
</figure>

Just think about the experimental conditions he has access to. The environment is essentially the same, the external historical circumstances are the same, and <strong>even the experimental subject is the exact same Tuturu!</strong>

This is practically a dream come true for anyone studying causal inference!

After all, even in a randomized experiment, random assignment cannot guarantee that the treatment and control groups will be perfectly balanced in every single experiment. Especially with small samples, chance imbalances between the groups can still arise, increasing uncertainty in our estimates of causal effects.

But Okabe seems to have found a way around this problem entirely!

He doesn't need to find other people to construct a counterfactual comparison. Instead, he has the opportunity to directly observe both of Tuturu's potential outcomes, $Y_i(1)$ and $Y_i(0)$, under different interventions, and calculate:

$$
\tau_i=Y_i(1)-Y_i(0)
$$

That's obviously much more direct than estimating causal effects through randomized experiments in the real world.

In other words, the fundamental problem of causal inference doesn't seem to trouble Okabe at all! He can actually see what happens to Tuturu under different interventions and **directly identify her individual treatment effect (ITE)!**

For God's sake! Isn't that basically cheating at causal inference?
