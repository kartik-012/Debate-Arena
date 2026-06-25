/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Search, Filter, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { Debate } from '../types';

interface LibraryViewProps {
  debates: Debate[];
  onSelectDebate: (id: string) => void;
}

export default function LibraryView({ debates, onSelectDebate }: LibraryViewProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = ['Ethics', 'Tech', 'Science', 'Politics', 'Philosophy'];

  const filteredDebates = debates.filter((debate) => {
    const matchesSearch = debate.question.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory ? debate.category === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#09090b] p-6 overflow-y-auto">
      <div className="max-w-6xl mx-auto w-full space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-zinc-100 font-sans tracking-tight">Debate Library</h1>
            <p className="text-sm text-zinc-400 mt-1">Review past verdicts and live arguments.</p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search debates..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border bg-zinc-900 border-zinc-800 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              selectedCategory === null ? 'bg-blue-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
            }`}
          >
            All Categories
          </button>
          {categories.map(cat => {
            const count = debates.filter(d => d.category === cat).length;
            if (count === 0 && cat !== selectedCategory) return null;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  selectedCategory === cat ? 'bg-blue-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                {cat}
                <span className="bg-black/20 px-1.5 py-0.5 rounded text-[10px]">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDebates.length === 0 ? (
            <div className="col-span-full py-12 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-2xl">
              No debates found matching your filters.
            </div>
          ) : (
            filteredDebates.map(debate => (
              <button
                key={debate.id}
                onClick={() => onSelectDebate(debate.id)}
                className="text-left group flex flex-col p-5 rounded-2xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800/80 hover:border-zinc-700 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-[9px] font-mono uppercase tracking-widest text-zinc-400">
                    {debate.category}
                  </span>
                  {debate.status === 'complete' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <span className="flex h-3 w-3 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                    </span>
                  )}
                </div>

                <h3 className="font-sans font-bold text-zinc-100 text-sm md:text-base leading-snug line-clamp-3 mb-4 group-hover:text-blue-100 transition-colors">
                  {debate.question}
                </h3>

                <div className="mt-auto pt-4 border-t border-zinc-800/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {debate.winning_side ? (
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        debate.winning_side === 'for' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'
                      }`}>
                        Winner: Side {debate.winning_side === 'for' ? 'A' : 'B'}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-400">
                        {debate.status.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 transform group-hover:translate-x-1 transition-all" />
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
