---
layout: layouts/article.njk
title: "Abraham Greenberg - Showcase: Arch of Titus Essay"
articleType: "Showcase: Arch of Titus Essay"
bannerSrc: "assets/article-6-banner.avif"
bannerAlt: "[Describe banner image]"
bannerCaption: >-
    The Arch of Titus; Photo by <a href="https://unsplash.com/@jacegrandinetti?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText">Jace &amp; Afsoon</a> on <a href="https://unsplash.com/photos/low-angel-photography-of-concrete-mansion-9HzFq3-cHPg?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText">Unsplash</a>
articleDateIso: "2026-04-22"
articleDateDisplay: "April 22, 2026"
articleIntro: >-
    This is a submission for a class I took called Arch of Titus with Prof. Steven Fine. This essay was one trying to tackle the question, why are there some many differing accounts to do with Titus' death? More midrashic interpretations suggest a divine retribution, while historical accounts lean towards political intrigue. The reason I have included it is I try to deploy some exploratory techniques discussed. Although the essay is structured more traditionally with a thesis-based approach, its resolution attempts to build some exploratory techniquues within it. Also note that the reference format was chicago, hence the use of "Bibliography" and not "References".
---

{% from "components/link.njk" import link %}
{% from "components/summary.njk" import bibliography, biblio, ref %}
{% from "components/standout.njk" import quoteblock %}

## Tales of Titus

### A Death Divided by Accounts

<p class="lead">Titus’ death sent shockwaves throughout the Roman world and the broader ancient world. One question rose to Roman and Jewish scholars alike: how could Titus have died so abruptly? Yet they both came up with seemingly wildly different theories to explain what could have happened. An average Jewish scholar would say to you that it was G-d finally giving Titus his deserved retribution for an utter desecration of the Temple and exile of the Jewish people. His Roman counterpart would disagree; instead, it was cold-blooded politics by the cruel-hearted Domitian, seeking revenge and power over Rome. Both are speaking to different audiences, so each requires a different answer.</p>

Roman theories seem to range from circumstance to deep conspiracy. Plutarch suggests simply that Titus died of natural means because he refused to eat before taking a bath{{ ref("ref6-3", "1", false, true) }}. Suetonius blames the scheming Domitian, who didn’t necessarily have a direct effect, but didn’t intervene to heal Titus when he fell ill{{ ref("ref6-3", "2", false, true) }}. The Greek sophist Philostratus, a century later, claims Domitian outright poisoned Titus using a sea-hare. Such dramatic power struggles would not have been new to an average Roman citizen. Just a few years earlier, in the year of the 4 emperors the Roman Empire, caused by the suicide of Nero, had seen a catastrophic power struggle in which Vespasian eventually became victorious.

Unlike Titus, Domitian was very much disapproved of in public opinion. Ironically, his bad reputation may have helped secure Titus’ legacy. Titus was the one who finally dealt with the Jewish rebels in Judea. Titus, the noble hero who continued Vespasian’s legacy of increased stability and rebuilding of Rome. It brought to life the depiction of an angelic Titus rising to heaven on the back of an Eagle engraved into the top of the Arch of Titus. To secure Titus’ fate, a suitable story is needed: a plot involving Titus the martyr and the conniving Domitian.

A Jewish Scholar would be much less concerned about the ins and outs of Roman politics than the deeper theological issue at hand. How could it be that someone as evil as Titus, who defiled a Sefer Torah in the Temple using two concubines, got away scot-free? The sons of Aaron were immediately swallowed by a fire for bringing unnecessary incense{{ ref("ref6-1", "3", false, true) }}. The ten spies and Antiochos all had punishment exacted in the form of “urinary” problems. Surely such a defilement would also deserve a cruel and immediate punishment.

A midrash can solve this issue for us. Titus was indeed punished immediately in the form of a gnat. It flew into his nose, made its way to his brain, and grew cancerously into a bird; this eventually killed Titus. Perhaps the most damaging to Titus is actually the medium of this punishment, the feeble Gnat:

{% call quoteblock() %}When the Torah discusses the laws of kosher animals, followed by human impurity, Rashi cites the Midrash: R’ Smilai said: Just as the fashioning of man came after all animals, so too he explained the law of human impurity is explained after that of animals. The Talmud asks how that could be so, if the purpose of creation is indeed for mankind, why is he left for last? The sages resolve this in Sanhedrin (38a): if one is righteous, it is as if he were created first. If one is haughty and undeserving, then we tell him, “Why are you acting so important? Even a small insect was created before you!”{{ ref("ref6-4", "4", false, true) }}{% endcall %}

There is another teaching from the sages that further explains their reasoning:

{% call quoteblock() %}Even things that you consider wholly unnecessary for the creation of the world, like fleas, gnats, and flies, are integral to the creation of the world. The Holy One, blessed be He, carries out His missions through everything, even through the snake, scorpion, gnat, and frog.{{ ref("ref6-3", "5", false, true) }}
{% endcall %}


A Jewish scholar gazing into the same engraving of Titus on the back of an eagle would have seen the persecutor of a violent and cruel war. Rome had terrorized the Judeans for years before the rebellion, collecting excessive taxes and impoverishing the population. The Judeans were constantly under the watchful eye of the Romans, who gave harsh punishment for anyone who disagreed with the Roman powers. During the Jewish Rebellion, the Romans besieged Jerusalem, and Josephus describes scenes of cannibalism that took place. Titus was a proud, boastful, and cruel warlord. He totally desecrated the temple and marched all the way to Rome, proudly boasting about the prized menorah he stole. A gnat is as humiliating as you can get for a Roman dictator who needs to be taken down a few notches.

So why the wildly different stories? Because there are two different narratives. Titus the hero versus Titus HaRasha. Titus the peace maker versus Titus the warlord. Titus the divine versus Titus who was taken down by the Gnat. These fundamental assumptions and worldviews lead to very different outcomes. To the Roman, Titus’death was a natural step in the “Roman” way of politics, and Titus’ natural progression from leader to Divine. To the Jew, Titus’ death is a punishment that is exact, immediate, and humiliating, brought about by divine retribution.

{% call bibliography() %}
    {{ biblio("ref6-1", "Bible.", "Vayikra 10", "Al Hatora, " ~ link("https://mg.alhatorah.org/Full/Vayikra/10.1#e0n6") ~ ".") }}
    {{ biblio("ref6-2", "Bulley, Tony, dir.", "Imperium - Vespasian: The Path to Power", "2017, " ~ link("https://www.youtube.com/watch?v=bUdotxA0ws8") ~ ".") }}
    {{ biblio("ref6-3", "Fine, Steven.", "Why was Titus killed by a gnat? Reflections on a rabbinic legend", "n.d. In Emet Le-Ya'akov: Facing the Truths of History: Essays in Honor of Jacob J. Schacter, edited by Zev Eleff and Shaul Seidler-Feller, 544 - 568. Boston: Academic Studies Press. Accessed April 22, 2026. " ~ link("https://repository.yu.edu/items/0a97b365-55c4-4a81-a15f-689ec50f9833") ~ ".") }}
    {{ biblio("ref6-4", "Weiss, Yosaif A.", "A Daily Dose of Torah: [Limud Yomi]: A Torah Theme for Every Day of Every Week from All Areas of Torah Literature, Collected for Daily Study: Series Two", "2008. Rahway: Mesorah Publications.") }}
{% endcall %}