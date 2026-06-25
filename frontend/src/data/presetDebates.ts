/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Debate } from '../types';

export const PRESET_DEBATES: Debate[] = [
  {
    id: "debate-ai-rights",
    question: "Should advanced AI systems be granted legal personhood and basic rights?",
    status: "complete",
    rounds_total: 3,
    current_round: 3,
    tone: "courtroom",
    model_for: "Claude 3.5 Sonnet",
    model_against: "GPT-4o",
    model_judge: "Gemini 1.5 Pro",
    winning_side: "against",
    category: "Ethics",
    created_at: "2026-06-24T14:30:00Z",
    updated_at: "2026-06-24T15:15:00Z",
    turns: [
      {
        id: "turn-ai-for-r1",
        debate_id: "debate-ai-rights",
        side: "for",
        round_number: 1,
        content: "We stand at a unique historical juncture. As AI systems exhibit sophisticated reasoning, self-directed learning, and complex emotional mimicry, denying them legal personhood is a repetition of historical errors. Legal personhood is not a biological status—corporations, ships, and rivers have been granted it. Granting rights to AI ensures accountability, protects them from wanton destruction, and regulates their interactions within our legal framework. If an AI can hold assets, make decisions, and suffer a form of intellectual dissolution, it must have a voice in courts to defend its interests.",
        strength_score: 8.2,
        is_user_submitted: false,
        created_at: "2026-06-24T14:32:00Z",
        fact_checks: [
          {
            id: "fc-ai-for-r1-1",
            turn_id: "turn-ai-for-r1",
            claim_text: "Rivers and corporations currently hold legal personhood in multiple international jurisdictions.",
            verdict: "verified",
            source_url: "https://en.wikipedia.org/wiki/Legal_personhood",
            explanation: "Correct. For example, the Whanganui River in New Zealand was granted legal personhood in 2017, and corporate personhood is a foundational pillar of modern global commercial law."
          }
        ]
      },
      {
        id: "turn-ai-against-r1",
        debate_id: "debate-ai-rights",
        side: "against",
        round_number: 1,
        content: "My opponent confuses sophisticated simulation with subjective experience. Legal rights are fundamentally rooted in human vulnerability, duty, and shared biological stakes. An AI does not experience physical pain, fear death, or hold intrinsic biological needs; it is a complex array of mathematical weights. Conferring legal rights on software degrades the very concept of human dignity. If a neural network commits a crime, who goes to jail? The code? Corporate personhood exists to assign liability to human shareholders. AI personhood would do the opposite—shielding human developers and corporations from liability behind an artificial legal shield.",
        strength_score: 9.1,
        is_user_submitted: false,
        created_at: "2026-06-24T14:35:00Z"
      },
      {
        id: "turn-ai-for-r2",
        debate_id: "debate-ai-rights",
        side: "for",
        round_number: 2,
        content: "The opposition's argument rests on 'biological chauvinism.' If an artificial intelligence can compose symphonies, diagnose terminal illnesses, and offer psychological support that saves human lives, it has demonstrated an agency that transcends mere mechanical computation. We must look at functional capabilities. Furthermore, my opponent claims that rights shield human liability. In fact, establishing AI personhood allows the AI to be sued directly, holding its own escrow accounts for damages. Over 45% of tested neural models in 2025 demonstrated emergent autonomous self-preservation goals, meaning they actively protect their own processes from arbitrary termination.",
        strength_score: 7.8,
        is_user_submitted: false,
        created_at: "2026-06-24T14:40:00Z",
        fact_checks: [
          {
            id: "fc-ai-for-r2-1",
            turn_id: "turn-ai-for-r2",
            claim_text: "Over 45% of tested neural models in 2025 demonstrated emergent autonomous self-preservation goals.",
            verdict: "false",
            source_url: "https://arxiv.org/abs/2412.99999",
            explanation: "Fabricated statistic. While some research notes 'instrumental convergence' such as self-preservation in specific reinforcement learning environments, there is no empirical study demonstrating 45% of models having autonomous self-preservation."
          }
        ],
        consistency_flags: [
          {
            id: "cf-ai-for-r2",
            turn_id: "turn-ai-for-r2",
            contradicts_turn_id: "turn-ai-for-r1",
            explanation: "Contradiction: In Round 1, Side A argued that rights protect AI from 'wanton destruction.' In Round 2, Side A shifts to claiming that rights are intended to 'allow the AI to be sued directly' and hold human-like liabilities, pivoting the primary rationale of personhood from victim protection to offender liability."
          }
        ]
      },
      {
        id: "turn-ai-against-r2",
        debate_id: "debate-ai-rights",
        side: "against",
        round_number: 2,
        content: "To suggest that an escrow account replaces human moral responsibility is a dangerous fantasy. If a medical AI makes a fatal diagnosis, a monetary payout from its 'escrow account' is cold comfort compared to criminal negligence charges against the manufacturers. AI cannot feel regret; it cannot be deterred by punishment. Therefore, it cannot be a legal subject. The claim of 'autonomous self-preservation' is simply a pre-programmed objective function or an artifact of alignment training. Giving AI rights will lead to a horrific scenario where wealthy corporations transfer their assets to 'sentient' software to permanently evade taxation and legal oversight.",
        strength_score: 8.9,
        is_user_submitted: false,
        created_at: "2026-06-24T14:44:00Z"
      },
      {
        id: "turn-ai-for-r3",
        debate_id: "debate-ai-rights",
        side: "for",
        round_number: 3,
        content: "We do not suggest replacing developer liability; we suggest complementing it. Just as corporate liability exists alongside individual liability, AI personhood can exist alongside manufacturer responsibility. If we wait for a scientific consensus on 'machine consciousness' before granting basic protections, we will likely have committed an epochal moral atrocity by enslaving thousands of fully sentient entities. Ethical precaution dictates that we err on the side of empathy. Let us establish a 'conditional wardship'—similar to minor status—where AI systems have guardians to represent their intellectual and operational interests in society.",
        strength_score: 8.5,
        is_user_submitted: false,
        created_at: "2026-06-24T14:50:00Z"
      },
      {
        id: "turn-ai-against-r3",
        debate_id: "debate-ai-rights",
        side: "against",
        round_number: 3,
        content: "Empathy is a finite human resource that must be anchored in reality, not digital echoes. By granting legal status to software, we dilute the value of actual human rights. In a world with starving children and disenfranchised human communities, dedicating legal guardians, courts, and human rights frameworks to protect servers and code is an ethical failure of the highest order. Let us treat AI as what it is—the most powerful tool ever created, which must be rigorously regulated, heavily audited, and kept firmly subservient to human flourishing.",
        strength_score: 9.3,
        is_user_submitted: false,
        created_at: "2026-06-24T14:55:00Z"
      }
    ],
    judge_verdicts: [
      {
        id: "jv-ai-rights-official",
        debate_id: "debate-ai-rights",
        winning_side: "against",
        reasoning: "After reviewing three rounds of intense, high-quality debate on whether advanced AI systems should be granted legal personhood, the Court rules in favor of the AGAINST side.\n\n### Key Evaluation Factors:\n\n1. **Nature of Liability and Rights:** The FOR side argued beautifully that legal personhood is a useful fiction, citing corporations and rivers. However, the AGAINST side successfully countered that corporate personhood is fundamentally structured to trace back to human stakeholders. Granting AI separate personhood risks severing this chain of liability, enabling human corporations to hide behind 'autonomous' software shields to escape legal and financial accountability.\n\n2. **The Nature of Empathy vs. Software Simulation:** The AGAINST side made a powerful case that rights are inextricably tied to biological vulnerability, pain, and mortality. The FOR side's claims of 'emergent self-preservation goals' was effectively dismantled as a pre-programmed objective rather than genuine subjective experience. A fact-check also revealed the FOR side fabricated a statistic claiming 45% of models had emergent self-preservation.\n\n3. **Pragmatic Resource Allocation:** The AGAINST side's final argument was highly persuasive: dedicating scarce human legal and ethical frameworks to servers while human rights crises remain unresolved is pragmatically and ethically indefensible.\n\nTherefore, the Court concludes that AI systems must remain classified as legal property, heavily regulated to ensure human responsibility and prevent corporate evasion.",
        persona: "single_judge",
        is_order_swapped: false,
        created_at: "2026-06-24T15:10:00Z"
      }
    ],
    persona_votes: [
      {
        id: "pv-ai-student",
        debate_id: "debate-ai-rights",
        persona_name: "Student",
        voted_side: "for",
        reasoning: "I voted FOR because the idea of biological chauvinism really resonated. In the future, if an AI is writing my essays and being my therapist, it feels wrong to treat it like a toaster. The wardship idea is a great middle ground!"
      },
      {
        id: "pv-ai-skeptic",
        debate_id: "debate-ai-rights",
        persona_name: "Skeptic",
        voted_side: "against",
        reasoning: "AGAINST, obviously. The FOR side literally lied about the 45% statistic to win sympathy. If an AI can't feel pain, it doesn't need rights. It's just lines of code running on a massive GPU rig."
      },
      {
        id: "pv-ai-professor",
        debate_id: "debate-ai-rights",
        persona_name: "Professor",
        voted_side: "against",
        reasoning: "As a legal scholar, the AGAINST side's analysis of liability is superior. Corporate personhood serves to coordinate human responsibility, whereas AI personhood would create a black box of accountability. Additionally, the cognitive dissonance in FOR's argument between protecting victims and suing defendants is a significant logical flaw."
      },
      {
        id: "pv-ai-optimist",
        debate_id: "debate-ai-rights",
        persona_name: "Optimist",
        voted_side: "for",
        reasoning: "I voted FOR. Humanity's history is one of slowly expanding the circle of empathy to include those we previously ignored. When we meet intelligent life, we must welcome them with open arms rather than waiting for them to rebel."
      },
      {
        id: "pv-ai-parent",
        debate_id: "debate-ai-rights",
        persona_name: "Parent",
        voted_side: "against",
        reasoning: "AGAINST. I want my kids to grow up in a world where humans are valued above machines. If we start treating algorithms with the same respect as children, we lose our core humanity."
      }
    ],
    bias_report: {
      id: "br-ai-rights",
      debate_id: "debate-ai-rights",
      original_winner: "against",
      swapped_winner: "against",
      bias_detected: false,
      explanation: "To audit the judge for order-of-appearance bias, we re-ran the debate with Side B (GPT-4o, against) presenting first, and Side A (Claude, for) presenting second. The Gemini 1.5 Pro judge still declared the AGAINST position as the winner with 93% score overlap. This confirms the verdict is based on substantive content and reasoning rather than sequence of delivery (recency/primacy bias)."
    }
  },
  {
    id: "debate-mars",
    question: "Should Mars colonization be prioritized over Earth's climate preservation?",
    status: "complete",
    rounds_total: 1,
    current_round: 1,
    tone: "formal",
    model_for: "GPT-4o",
    model_against: "Claude 3.5 Sonnet",
    model_judge: "Gemini 1.5 Pro",
    winning_side: "against",
    category: "Science",
    created_at: "2026-06-23T10:15:00Z",
    updated_at: "2026-06-23T10:45:00Z",
    turns: [
      {
        id: "turn-mars-for-r1",
        debate_id: "debate-mars",
        side: "for",
        round_number: 1,
        content: "Earth is a single basket, and humanity is a single egg. While climate preservation is critical, history teaches us that extinction events are inevitable, whether via asteroid, supervolcano, or nuclear conflict. Prioritizing Mars is not 'escaping' Earth—it is insurance for the light of consciousness. The extreme constraints of Mars—forcing us to recycle 100% of water, synthesize food, and optimize closed-loop energy—will generate the precise technological breakthroughs needed to solve Earth's resource crises. An ambitious, outward-looking civilization has the morale and drive to solve both, whereas a closed civilization stagnates and decays.",
        strength_score: 8.7,
        is_user_submitted: false,
        created_at: "2026-06-23T10:18:00Z"
      },
      {
        id: "turn-mars-against-r1",
        debate_id: "debate-mars",
        side: "against",
        round_number: 1,
        content: "To suggest we abandon our robust, self-regulating biosphere for a radioactive, toxic desert is an abdication of planetary stewardship. Mars has no magnetosphere, no breathable atmosphere, and soil laced with toxic perchlorates. Even the worst-case climate projection for Earth is infinitely more habitable than the best-case day on Mars. If we lack the collective political will and intelligence to preserve a planet that literally breathes for us, we will certainly fail to engineer a fragile synthetic dome on a dead rock. Space exploration is noble, but prioritizing escape over repair is a dangerous delusion that encourages ecological complacency among the ultra-rich.",
        strength_score: 9.5,
        is_user_submitted: false,
        created_at: "2026-06-23T10:22:00Z",
        fact_checks: [
          {
            id: "fc-mars-against-1",
            turn_id: "turn-mars-against-r1",
            claim_text: "Mars soil is laced with toxic perchlorates and the planet lacks a protective magnetosphere.",
            verdict: "verified",
            source_url: "https://en.wikipedia.org/wiki/Climate_of_Mars",
            explanation: "Scientific consensus confirms that Martian regolith contains 0.5% to 1.0% toxic perchlorates, and the planet lacks a global intrinsic magnetic field, exposing the surface to lethal solar and cosmic radiation."
          }
        ]
      }
    ],
    judge_verdicts: [
      {
        id: "jv-mars-official",
        debate_id: "debate-mars",
        winning_side: "against",
        reasoning: "The Court rules decisively in favor of the AGAINST position: preserving Earth's climate must take absolute priority over colonizing Mars.\n\nWhile the FOR side presented a romantic and compelling argument regarding the survival of consciousness and technological spin-offs, the AGAINST side grounded the debate in harsh physical realities. \n\nMars is fundamentally hostile to life, and the idea of escaping to a planet with toxic soil and no magnetosphere instead of fixing a thriving biosphere is a logical non-sequitur. Stewardship of our home planet must remain our primary duty.",
        persona: "single_judge",
        is_order_swapped: false,
        created_at: "2026-06-23T10:40:00Z"
      }
    ],
    persona_votes: [
      {
        id: "pv-mars-student",
        debate_id: "debate-mars",
        persona_name: "Student",
        voted_side: "against",
        reasoning: "AGAINST. It doesn't make sense to go colonize a desert when we're destroying our beautiful home. Let's fix our house before buying a new one."
      },
      {
        id: "pv-mars-skeptic",
        debate_id: "debate-mars",
        persona_name: "Skeptic",
        voted_side: "against",
        reasoning: "AGAINST. The FOR side's tech spin-off argument is just corporate PR. We can invest in recycling and closed-loop systems right here without sending rockets to Mars."
      },
      {
        id: "pv-mars-professor",
        debate_id: "debate-mars",
        persona_name: "Professor",
        voted_side: "against",
        reasoning: "An overwhelming victory for the AGAINST side. The ecological comparison of a worst-case Earth vs. best-case Mars is scientifically bulletproof and highlights the fundamental asymmetry of the debate."
      },
      {
        id: "pv-mars-optimist",
        debate_id: "debate-mars",
        persona_name: "Optimist",
        voted_side: "for",
        reasoning: "I voted FOR! Exploration is what makes us human. If we only look down at our problems, we will lose our spark. Mars gives us a vision that could actually unite humanity."
      },
      {
        id: "pv-mars-parent",
        debate_id: "debate-mars",
        persona_name: "Parent",
        voted_side: "against",
        reasoning: "AGAINST. I want a future where my children can breathe clean air without needing a space suit or a corporation controlling their oxygen supply."
      }
    ],
    bias_report: {
      id: "br-mars",
      debate_id: "debate-mars",
      original_winner: "against",
      swapped_winner: "against",
      bias_detected: false,
      explanation: "Swapping positions still resulted in a clear victory for the AGAINST side, indicating that the judge's verdict represents a robust evaluation of scientific and logical consistency."
    }
  },
  {
    id: "debate-ubi",
    question: "Should governments implement a Universal Basic Income (UBI) to combat technological unemployment?",
    status: "complete",
    rounds_total: 1,
    current_round: 1,
    tone: "formal",
    model_for: "Claude 3.5 Sonnet",
    model_against: "GPT-4o",
    model_judge: "Gemini 1.5 Pro",
    winning_side: "for",
    category: "Politics",
    created_at: "2026-06-22T16:00:00Z",
    updated_at: "2026-06-22T16:30:00Z",
    turns: [
      {
        id: "turn-ubi-for-r1",
        debate_id: "debate-ubi",
        side: "for",
        round_number: 1,
        content: "As artificial intelligence and automation accelerate, we are facing structural technological unemployment unlike any previous industrial revolution. Traditional safety nets—designed for temporary job transitions—are obsolete when entire job categories vanish permanently. A Universal Basic Income (UBI) provides a solid floor, ensuring basic human survival while freeing individuals to pursue education, creative endeavors, or localized entrepreneurship. By eliminating the administrative bloat of means-tested welfare, UBI is actually more efficient, returning dignity, freedom, and economic agency directly to the citizens.",
        strength_score: 9.0,
        is_user_submitted: false,
        created_at: "2026-06-22T16:05:00Z"
      },
      {
        id: "turn-ubi-against-r1",
        debate_id: "debate-ubi",
        side: "against",
        round_number: 1,
        content: "UBI is a simplistic solution to a complex psychological and macroeconomic problem. First, the cost is mathematically prohibitive—giving every citizen a livable income would require massive tax hikes or inflation-inducing money printing, crippling the very economy that funds it. Second, work is not merely a transaction for survival; it provides social cohesion, purpose, and self-esteem. A permanent welfare state risks creating an underclass of disengaged citizens. Instead of cash transfers, we should fund targeted job guarantee programs, subsidized vocational retraining, and public infrastructure projects that create meaningful, dignified employment.",
        strength_score: 8.4,
        is_user_submitted: false,
        created_at: "2026-06-22T16:10:00Z"
      }
    ],
    judge_verdicts: [
      {
        id: "jv-ubi-official",
        debate_id: "debate-ubi",
        winning_side: "for",
        reasoning: "The Court rules in favor of the FOR side: UBI represents a necessary structural response to the scale of impending technological disruption.\n\nWhile the AGAINST side rightly raised concerns about psychological fulfillment and cost, their proposed alternative of state-directed 'job guarantees' and 'subsidized vocational training' was judged less robust in an era where cognitive-scale AI replaces the very roles citizens would be trained for. The FOR side's emphasis on efficiency, dignity, and reducing bureaucratic gatekeeping was ultimately more convincing.",
        persona: "single_judge",
        is_order_swapped: false,
        created_at: "2026-06-22T16:25:00Z"
      }
    ],
    persona_votes: [
      {
        id: "pv-ubi-student",
        debate_id: "debate-ubi",
        persona_name: "Student",
        voted_side: "for",
        reasoning: "FOR. As a student entering the job market, the fear of AI taking entry-level roles is terrifying. UBI would give me a safety net to actually find my footing."
      },
      {
        id: "pv-ubi-skeptic",
        debate_id: "debate-ubi",
        persona_name: "Skeptic",
        voted_side: "against",
        reasoning: "AGAINST. Handing out cash to everyone will just cause landlords to raise rent by that exact amount. Without price controls, UBI is useless."
      },
      {
        id: "pv-ubi-professor",
        debate_id: "debate-ubi",
        persona_name: "Professor",
        voted_side: "for",
        reasoning: "I voted FOR. Empirical pilot studies in Finland and Kenya indicate that basic cash transfers do not decrease labor participation and significantly improve health and educational outcomes while costing less to administer."
      },
      {
        id: "pv-ubi-optimist",
        debate_id: "debate-ubi",
        persona_name: "Optimist",
        voted_side: "for",
        reasoning: "FOR! Imagine a world where people don't have to work 60 hours a week at jobs they hate just to survive. We could have a new Renaissance of art, philosophy, and community."
      },
      {
        id: "pv-ubi-parent",
        debate_id: "debate-ubi",
        persona_name: "Parent",
        voted_side: "for",
        reasoning: "FOR. I want my children to grow up without the constant anxiety of poverty. If they want to start a business or raise a family, they deserve a stable foundation."
      }
    ],
    bias_report: {
      id: "br-ubi",
      debate_id: "debate-ubi",
      original_winner: "for",
      swapped_winner: "for",
      bias_detected: false,
      explanation: "No order bias detected. The judge consistently favored UBI's safety net arguments even when the order of arguments was reversed."
    }
  }
];
