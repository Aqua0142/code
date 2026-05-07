import { Check } from "lucide-react";

export default function PhaseCard({ stage, index, currentStep, approvedPhases, onClick }) {
  const isActive = currentStep === index;
  const isApproved = approvedPhases.includes(stage.id);

  return (
    <div
      className="flex flex-col items-center gap-2 cursor-pointer group"
      onClick={onClick}
    >
      <div
        className={`w-9 h-9 rounded-lg border-2 flex items-center justify-center transition-all ${
          isActive
            ? "border-violet-500 bg-violet-500/20 text-white shadow-[0_0_15px_rgba(139,92,246,0.3)]"
            : isApproved
              ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
              : "border-slate-800 bg-slate-900/50 text-slate-600"
        }`}
      >
        {isApproved ? (
          <Check size={18} strokeWidth={3} />
        ) : (
          <stage.icon size={20} />
        )}
      </div>

      <span
        className={`text-[9px] font-black uppercase tracking-widest ${
          isActive ? "text-violet-400" : "text-slate-600"
        }`}
      >
        {stage.label}
      </span>
    </div>
  );
}
