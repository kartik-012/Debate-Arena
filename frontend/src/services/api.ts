import { Debate } from '../types';

export const api = {
  async startDebate(config: {
    question: string;
    rounds_total: number;
    tone: string;
    model_for: string;
    model_against: string;
    model_judge: string;
  }): Promise<Debate> {
    const res = await fetch('/debate/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    
    if (!res.ok) {
      throw new Error(`Failed to start debate: ${res.statusText}`);
    }
    
    const debateRaw = await res.json();
    return {
      ...debateRaw,
      current_round: 1,
      category: debateRaw.category || 'Uncategorized',
      turns: [],
      judge_verdicts: []
    };
  },

  async getDebate(id: string): Promise<Debate> {
    const res = await fetch(`/debate/${id}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch debate: ${res.statusText}`);
    }
    const data = await res.json();
    
    // Calculate current round
    let current_round = 1;
    if (data.turns && data.turns.length > 0) {
      const maxRound = Math.max(...data.turns.map((t: any) => t.round_number));
      current_round = maxRound;
    }

    return {
      ...data.debate,
      current_round,
      category: data.debate?.category || 'Uncategorized',
      turns: data.turns || [],
      judge_verdicts: data.verdicts || [],
      fact_checks: data.fact_checks || [],
      consistency_flags: data.consistency_flags || [],
      persona_votes: data.persona_votes || [],
      bias_report: data.bias_report || undefined,
      autopsy: data.debate?.autopsy || undefined
    };
  },
  
  async listDebates(): Promise<Debate[]> {
    const res = await fetch('/debates');
    if (!res.ok) {
      throw new Error(`Failed to list debates: ${res.statusText}`);
    }
    const data = await res.json();
    
    // Map the list. Since it only returns the debate rows, we return them with empty arrays for details.
    return data.debates.map((d: any) => ({
      ...d,
      current_round: d.rounds_total,
      category: d.category || 'Uncategorized',
      turns: [],
      judge_verdicts: []
    }));
  },

  async getAnalytics(): Promise<any> {
    const res = await fetch('/debate/analytics');
    if (!res.ok) throw new Error('Failed to fetch analytics');
    return res.json();
  },

  async runBiasCheck(debateId: string): Promise<any> {
    const res = await fetch(`/debate/${debateId}/bias-check`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to run bias check');
    return res.json();
  },

  async getQuota(): Promise<any> {
    const res = await fetch('/health/quota');
    if (!res.ok) throw new Error('Failed to fetch quota');
    return res.json();
  },

  async getChainedSuggestions(debateId: string): Promise<string[]> {
    try {
      const res = await fetch(`/debate/${debateId}/chained-suggestions`);
      if (!res.ok) throw new Error('Failed to fetch suggestions');
      const data = await res.json();
      return data.suggestions || [];
    } catch {
      return [];
    }
  }
};
