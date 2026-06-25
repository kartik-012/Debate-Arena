/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface FactCheck {
  id: string;
  turn_id: string;
  claim_text: string;
  verdict: 'verified' | 'unverified' | 'false';
  source_url: string;
  explanation: string;
}

export interface ConsistencyFlag {
  id: string;
  turn_id: string;
  contradicts_turn_id: string;
  explanation: string;
}

export interface DebateTurn {
  id: string;
  debate_id: string;
  side: 'for' | 'against';
  round_number: number;
  content: string;
  strength_score: number; // 0.0 to 10.0
  is_user_submitted: boolean;
  created_at: string;
  fact_checks?: FactCheck[];
  consistency_flags?: ConsistencyFlag[];
}

export interface JudgeVerdict {
  id: string;
  debate_id: string;
  winning_side: 'for' | 'against';
  reasoning: string;
  persona: string; // 'single_judge' or others
  is_order_swapped: boolean;
  created_at: string;
}

export interface PersonaVote {
  id: string;
  debate_id: string;
  persona_name: 'Student' | 'Skeptic' | 'Professor' | 'Optimist' | 'Parent';
  voted_side: 'for' | 'against';
  reasoning: string;
}

export interface BiasReport {
  id: string;
  debate_id: string;
  original_winner: 'for' | 'against';
  swapped_winner: 'for' | 'against';
  bias_detected: boolean;
  explanation: string;
}

export interface Debate {
  id: string;
  question: string;
  status: 'in_progress' | 'judging' | 'complete' | 'error';
  rounds_total: number; // 1, 3, or 5
  current_round: number;
  tone: 'formal' | 'casual' | 'courtroom';
  model_for: string;
  model_against: string;
  model_judge: string;
  winning_side: 'for' | 'against' | null;
  parent_debate_id?: string; // For chained debates
  created_at: string;
  updated_at: string;
  category: string; // 'Philosophy' | 'Tech' | 'Politics' | 'Ethics' | 'Science'
  turns: DebateTurn[];
  judge_verdicts: JudgeVerdict[];
  persona_votes?: PersonaVote[];
  bias_report?: BiasReport;
  autopsy?: string;
}
