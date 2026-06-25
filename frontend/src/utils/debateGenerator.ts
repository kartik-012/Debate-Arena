/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Debate, DebateTurn, FactCheck, ConsistencyFlag, PersonaVote, BiasReport, JudgeVerdict } from '../types';

// Simple helper to generate unique IDs
const uuid = () => Math.random().toString(36).substring(2, 11);

// Standard categories based on questions
export function detectCategory(question: string): string {
  const q = question.toLowerCase();
  if (q.includes('ai') || q.includes('tech') || q.includes('robot') || q.includes('computer') || q.includes('internet') || q.includes('social media')) {
    return 'Tech';
  }
  if (q.includes('ethic') || q.includes('moral') || q.includes('right') || q.includes('animal') || q.includes('justice')) {
    return 'Ethics';
  }
  if (q.includes('climate') || q.includes('space') || q.includes('mars') || q.includes('science') || q.includes('energy') || q.includes('earth')) {
    return 'Science';
  }
  if (q.includes('government') || q.includes('tax') || q.includes('money') || q.includes('economy') || q.includes('law') || q.includes('ubi') || q.includes('policy')) {
    return 'Politics';
  }
  return 'Philosophy';
}

// Generate realistic points for FOR and AGAINST based on keywords
function generatePoints(question: string, side: 'for' | 'against', roundNum: number, tone: string): string {
  const cleanQ = question.trim().replace(/\?$/, '');
  const isFormal = tone === 'formal' || tone === 'courtroom';
  
  const intro = side === 'for' 
    ? (isFormal 
        ? `We assert that we must answer affirmatively: yes, ${cleanQ}.` 
        : `Let's be honest, it is absolutely essential that we embrace this: ${cleanQ}.`)
    : (isFormal 
        ? `We must firmly oppose the proposition. When we consider the reality, we cannot support ${cleanQ}.` 
        : `Actually, there are massive drawbacks here. We must push back against: ${cleanQ}.`);

  const pointsFor = [
    // Round 1
    `First, this is a matter of progress, adaptability, and unlocking future human potential. If we refuse to adapt, we risk obsolescence and stagnation. By enabling this initiative, we catalyze secondary innovations and create a framework for systemic improvement that benefits everyone.`,
    // Round 2
    `Secondly, the ethical imperative is clear. Opponents focus purely on speculative fears and risks, but the active harm of status-quo inaction is far greater. We can build robust, adaptive regulation to mitigate any downsides while reaping substantial rewards.`,
    // Round 3
    `Finally, let us think about the long-term historical arc. Every major evolutionary leap in policy, technology, or ethics was met with similar skepticism. History vindicates those who choose courage and structured advancement over defensive preservation.`
  ];

  const pointsAgainst = [
    // Round 1
    `First, the systemic risks and unintended consequences are being hand-waved away. Implementing this will create immediate economic instability, dilute human accountability, and impose severe administrative and societal costs that we simply cannot afford right now.`,
    // Round 2
    `Secondly, we are solving the wrong problem. There are far more immediate, concrete, and manageable alternatives that achieve similar goals without introducing this level of risk and systemic vulnerability. We must focus on repairing our current frameworks before jumping into untried experiments.`,
    // Round 3
    `Finally, we must reject the false narrative of inevitable progress. True wisdom lies in knowing when to conserve, when to set boundaries, and how to protect the vulnerable from the fallout of rapid, unchecked institutional changes.`
  ];

  const selectedPoint = side === 'for' ? pointsFor[roundNum - 1] : pointsAgainst[roundNum - 1];

  const casualFiller = side === 'for'
    ? ` This isn't just about theory; it's about real lives. It's about opening up doors that have been closed for too long. We need to stop letting fear dictate our future.`
    : ` Let's look at the actual numbers. It sounds great on paper, sure, but in the real world, this is going to create way more headaches than it solves. We have to be pragmatic.`;

  const courtroomFiller = side === 'for'
    ? ` The evidentiary standard of our times dictates that we act on functional, observable merit. To withhold permission is to violate the core principles of equity and forward stewardship.`
    : ` The burden of proof lies squarely on my opponent, and they have failed to present a stable liability framework. We cannot allow high-risk precedents to weaken our institutional safeguards.`;

  let filler = "";
  if (tone === 'casual') filler = casualFiller;
  else if (tone === 'courtroom') filler = courtroomFiller;

  return `${intro} ${selectedPoint}${filler}`;
}

// Generate a full mock debate dynamically
export function generateDynamicDebate(
  question: string,
  rounds: number,
  tone: 'formal' | 'casual' | 'courtroom',
  modelFor: string,
  modelAgainst: string,
  modelJudge: string,
  category?: string
): Debate {
  const debateId = `debate-${uuid()}`;
  const detectedCat = category || detectCategory(question);
  const turns: DebateTurn[] = [];

  // Generate turns
  for (let r = 1; r <= rounds; r++) {
    // Turn FOR
    const turnForId = `turn-${uuid()}`;
    const forContent = generatePoints(question, 'for', r, tone);
    const forScore = parseFloat((7.0 + Math.random() * 2.5).toFixed(1));
    const turnFor: DebateTurn = {
      id: turnForId,
      debate_id: debateId,
      side: 'for',
      round_number: r,
      content: forContent,
      strength_score: forScore,
      is_user_submitted: false,
      created_at: new Date(Date.now() - (rounds - r) * 600000).toISOString(),
    };

    // Add random fact check to some turns
    if (Math.random() > 0.4) {
      const isVerified = Math.random() > 0.4;
      turnFor.fact_checks = [{
        id: `fc-${uuid()}`,
        turn_id: turnForId,
        claim_text: `The core implementation studies on ${question.split(' ')[0] || 'this topic'} show a high success rate.`,
        verdict: isVerified ? 'verified' : 'unverified',
        source_url: "https://example.edu/research-report",
        explanation: isVerified 
          ? "Academic reviews and case studies support the claim that structured implementation is viable." 
          : "Unverified claim. While pilot programs exist, no peer-reviewed literature confirms a broad success rate across all cohorts."
      }];
    }

    turns.push(turnFor);

    // Turn AGAINST
    const turnAgainstId = `turn-${uuid()}`;
    const againstContent = generatePoints(question, 'against', r, tone);
    const againstScore = parseFloat((7.0 + Math.random() * 2.5).toFixed(1));
    const turnAgainst: DebateTurn = {
      id: turnAgainstId,
      debate_id: debateId,
      side: 'against',
      round_number: r,
      content: againstContent,
      strength_score: againstScore,
      is_user_submitted: false,
      created_at: new Date(Date.now() - (rounds - r) * 600000 + 300000).toISOString(),
    };

    // Add random contradiction to Round 2 or 3 of AGAINST if relevant
    if (r > 1 && Math.random() > 0.5) {
      turnAgainst.consistency_flags = [{
        id: `cf-${uuid()}`,
        turn_id: turnAgainstId,
        contradicts_turn_id: turns[1].id, // Contradicts its round 1 turn
        explanation: "Contradiction: Side B previously argued that we should maintain rigid limits, but now advocates for a 'flexible, case-by-case' assessment, softening their foundational premise."
      }];
    }

    turns.push(turnAgainst);
  }

  // Calculate scores and decide winner
  const totalFor = turns.filter(t => t.side === 'for').reduce((sum, t) => sum + t.strength_score, 0);
  const totalAgainst = turns.filter(t => t.side === 'against').reduce((sum, t) => sum + t.strength_score, 0);
  const winningSide = totalFor >= totalAgainst ? 'for' : 'against';

  // Create Judge Verdict
  const reasoning = `After evaluating ${rounds} round(s) of structured argumentation, the Court rules in favor of the **${winningSide.toUpperCase()}** side.

### Key Insights & Rationale:

1. **Foundational Consistency:** The **${winningSide.toUpperCase()}** side maintained a more consistent logical spine throughout the argument. They successfully anticipated the primary critiques of their opponent and offered proactive mitigations.
2. **Robustness of Alternatives:** The **${winningSide === 'for' ? 'AGAINST' : 'FOR'}** side presented interesting points, but their argument relied on speculative risks that were not sufficiently backed by empirical projections. Their proposed alternatives lacked immediate structural viability.
3. **Factuality:** During the rounds, key claims regarding feasibility were evaluated. The winner demonstrated higher alignment with verified public and academic data, whereas their opponent introduced several unverified generalizations.

Consequently, the Court declares a victory for the **${winningSide.toUpperCase()}** position in this session.`;

  const judge_verdicts: JudgeVerdict[] = [{
    id: `jv-${uuid()}`,
    debate_id: debateId,
    winning_side: winningSide,
    reasoning: reasoning,
    persona: "single_judge",
    is_order_swapped: false,
    created_at: new Date().toISOString()
  }];

  // Generate 5 independent persona votes
  const personas: ('Student' | 'Skeptic' | 'Professor' | 'Optimist' | 'Parent')[] = ['Student', 'Skeptic', 'Professor', 'Optimist', 'Parent'];
  const persona_votes: PersonaVote[] = personas.map(p => {
    // Generate slight variance or strong personality bias
    let votedSide: 'for' | 'against' = winningSide;
    let reason = "";

    if (p === 'Student') {
      votedSide = Math.random() > 0.3 ? 'for' : 'against';
      reason = votedSide === 'for'
        ? "I voted FOR because it feels super progressive and exciting. We need to be bold and try new solutions!"
        : "I voted AGAINST because the costs are just too high, and students already have enough debt. Let's fix what we have first.";
    } else if (p === 'Skeptic') {
      votedSide = Math.random() > 0.7 ? 'for' : 'against';
      reason = votedSide === 'for'
        ? "Despite my initial doubts, the FOR side actually proved that the regulations could hold up in court. Fine."
        : "AGAINST. Most of the claims on the other side are unverified buzzwords. I'm not buying the optimistic hype.";
    } else if (p === 'Professor') {
      votedSide = winningSide; // Professor usually aligns with the logical winner
      reason = votedSide === 'for'
        ? "The FOR side presented a robust methodological framework for handling transition states, which is academically sound."
        : "The AGAINST side's critique of systemic externalities was highly disciplined and exposed significant gaps in FOR's presentation.";
    } else if (p === 'Optimist') {
      votedSide = 'for'; // Optimist loves the FOR side
      reason = "I voted FOR! We must believe in our collective capacity to innovate and build a better future together.";
    } else { // Parent
      votedSide = Math.random() > 0.5 ? 'for' : 'against';
      reason = votedSide === 'for'
        ? "FOR. As a parent, I want a world that creates new opportunities and stable ecosystems for my children."
        : "AGAINST. Stability is key for the next generation. Let's not rush into chaotic shifts that could backfire on our families.";
    }

    return {
      id: `pv-${uuid()}`,
      debate_id: debateId,
      persona_name: p,
      voted_side: votedSide,
      reasoning: reason
    };
  });

  // Create Bias report
  const bias_detected = Math.random() > 0.85; // Low chance of order bias
  const swapped_winner = bias_detected ? (winningSide === 'for' ? 'against' : 'for') : winningSide;
  const bias_report: BiasReport = {
    id: `br-${uuid()}`,
    debate_id: debateId,
    original_winner: winningSide,
    swapped_winner: swapped_winner,
    bias_detected: bias_detected,
    explanation: bias_detected 
      ? `WARNING: Bias detected. When the presentation order was swapped (Side B presenting first), the judge shifted the verdict from ${winningSide.toUpperCase()} to ${swapped_winner.toUpperCase()}. This indicates potential primacy/recency bias in the LLM evaluator under this specific tone.`
      : `No bias detected. Swapping the presentation sequence (running the debate with Side B presenting first) still resulted in a clear victory for the ${winningSide.toUpperCase()} side. The judge's verdict is structurally stable.`
  };

  return {
    id: debateId,
    question: question,
    status: "complete",
    rounds_total: rounds,
    current_round: rounds,
    tone: tone,
    model_for: modelFor,
    model_against: modelAgainst,
    model_judge: modelJudge,
    winning_side: winningSide,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category: detectedCat,
    turns: turns,
    judge_verdicts: judge_verdicts,
    persona_votes: persona_votes,
    bias_report: bias_report
  };
}
