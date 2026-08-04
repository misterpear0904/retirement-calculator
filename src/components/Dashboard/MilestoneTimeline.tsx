import React from 'react';
import { TimelineMilestone, YearlyProjection } from '../../types/retirement';
import { Calendar, GraduationCap, Home, Palmtree, Landmark } from 'lucide-react';

interface Props {
  yearlyProjections: YearlyProjection[];
  onSelectSection?: (sectionId: string) => void;
}

export const MilestoneTimeline: React.FC<Props> = ({ yearlyProjections, onSelectSection }) => {
  const allMilestones: { age: number; year: number; milestone: TimelineMilestone }[] = [];

  yearlyProjections.forEach((p) => {
    if (p.milestones && p.milestones.length > 0) {
      p.milestones.forEach((m) => {
        allMilestones.push({ age: p.age, year: p.year, milestone: m });
      });
    }
  });

  const getSectionIdForCategory = (category: string) => {
    switch (category) {
      case 'education': return 'dependents';
      case 'housing': return 'housing';
      case 'retirement': return 'demographics';
      case 'income': return 'location';
      default: return 'demographics';
    }
  };

  const handleMilestoneClick = (category: string) => {
    const sectionId = getSectionIdForCategory(category);
    if (onSelectSection) {
      onSelectSection(sectionId);
    }
    const elem = document.getElementById(sectionId);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

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
    <div className="glass-panel p-6 sm:p-7 rounded-2xl space-y-5">
      <h3 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
        <Calendar className="w-4.5 h-4.5 text-blue-400 shrink-0" /> Dynamic Milestone Event Timeline
      </h3>

      <div className="relative border-l border-slate-800 ml-4 pl-6 space-y-5">
        {allMilestones.map((item, idx) => (
          <div key={idx} className="relative group">
            {/* Timeline Dot Marker */}
            <div className="absolute -left-[37px] top-1.5 p-1.5 rounded-full bg-slate-900 border border-slate-700 shadow-sm">
              {getIconComponent(item.milestone.category)}
            </div>

            <div
              onClick={() => handleMilestoneClick(item.milestone.category)}
              className="bg-slate-900/60 p-4 sm:p-5 rounded-xl border border-slate-800 hover:border-blue-500/50 hover:bg-slate-900 cursor-pointer transition-all space-y-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-bold text-slate-100 text-sm group-hover:text-blue-400 transition-colors">
                  {item.milestone.title}
                </span>
                <span className="text-xs font-semibold text-blue-400 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 shrink-0">
                  Age {item.age} ({item.year})
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{item.milestone.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
