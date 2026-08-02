import React from 'react';
import { TimelineMilestone, YearlyProjection } from '../../types/retirement';
import { Calendar, GraduationCap, Home, Palmtree, Landmark } from 'lucide-react';

interface Props {
  yearlyProjections: YearlyProjection[];
}

export const MilestoneTimeline: React.FC<Props> = ({ yearlyProjections }) => {
  const allMilestones: { age: number; year: number; milestone: TimelineMilestone }[] = [];

  yearlyProjections.forEach((p) => {
    if (p.milestones && p.milestones.length > 0) {
      p.milestones.forEach((m) => {
        allMilestones.push({ age: p.age, year: p.year, milestone: m });
      });
    }
  });

  if (allMilestones.length === 0) {
    return (
      <div className="glass-panel p-5 rounded-2xl text-center text-xs text-slate-400">
        No specific milestone events triggered in current horizon.
      </div>
    );
  }

  const getIconComponent = (category: string) => {
    switch (category) {
      case 'education':
        return <GraduationCap className="w-4 h-4 text-blue-400" />;
      case 'housing':
        return <Home className="w-4 h-4 text-emerald-400" />;
      case 'retirement':
        return <Palmtree className="w-4 h-4 text-purple-400" />;
      case 'income':
        return <Landmark className="w-4 h-4 text-amber-400" />;
      default:
        return <Calendar className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="glass-panel p-5 rounded-2xl space-y-4">
      <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-blue-400" /> Dynamic Milestone Event Timeline
      </h3>

      <div className="relative border-l border-slate-800 ml-3 pl-5 space-y-4">
        {allMilestones.map((item, idx) => (
          <div key={idx} className="relative group">
            {/* Timeline Dot Marker */}
            <div className="absolute -left-[27px] top-1 p-1 rounded-full bg-slate-900 border border-slate-700">
              {getIconComponent(item.milestone.category)}
            </div>

            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-slate-200">{item.milestone.title}</span>
                <span className="text-[11px] font-semibold text-blue-400 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
                  Age {item.age} ({item.year})
                </span>
              </div>
              <p className="text-xs text-slate-400">{item.milestone.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
