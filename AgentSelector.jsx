import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Lock, Plus, Minus, Users, X, UserPlus } from "lucide-react";
import { AGENT_MAPPING, ICON_BASE_URL, ICON_MAP, MODEL_DATA, MODEL_LIST } from "../../../utils/constants";

export default function AgentSelector({
  activeId,
  activeData,
  updateField,
  toggleAgentSelection,
  updateAgentSetting,
  executionMode,
  frameworkMode,
  entryMode,
  setEntryMode,
}) {
  const [focusedAgent, setFocusedAgent] = useState(null);

  const addHumanToPhase = (name) => {
    if (!name.trim()) return;
    const current = activeData.humanTeam || [];
    updateField("humanTeam", [...current, name.trim()]);
  };

  const removeHumanFromPhase = (idx) => {
    const current = activeData.humanTeam || [];
    updateField("humanTeam", current.filter((_, i) => i !== idx));
  };

  return (
    <div className="flex flex-col gap-4 bg-[#08080a] border border-white/10 rounded-3xl p-6 shadow-2xl relative">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />

      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          {executionMode === "hybrid" ? (
            <>
              <Users size={20} className="text-amber-500" />
              <label className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-500">
                Hybrid Team Selection
              </label>
            </>
          ) : (
            <>
              <Users size={20} className="text-emerald-500" />
              <label className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-400">
                Agent Selection Pool
              </label>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-x-4 gap-y-10 py-4 relative">
        {[
          ...(AGENT_MAPPING[activeId] || []),
          { name: "Doc Maker", isMandatory: true },
          { name: "SAGE", isMandatory: true },
        ]
          .filter((agent) => {
            if (["p1", "p2", "p3"].includes(activeId) && agent.name === "SAGE") return false;
            if (frameworkMode === "classic" && agent.name === "SAGE") return false;
            return true;
          })
          .map((agent, index) => {
            const isMandatory = agent.isMandatory;
            const isSelected = isMandatory ? true : activeData.selectedAgents.includes(agent.name);
            const isFocused = focusedAgent === agent.name;
            const agentConfig = activeData.agentConfigs[agent.name]?.[0] || { model: "GPT-4o", instances: 1 };
            const isLastInRow = (index + 1) % 4 === 0;

            return (
              <div key={agent.name} className={`relative flex flex-col items-center ${isFocused ? "z-50" : "z-10"}`}>
                <div
                  onClick={() => !isMandatory && toggleAgentSelection(agent.name)}
                  className={`relative group cursor-pointer transition-all duration-300 ${isFocused ? "scale-110" : "scale-100"}`}
                >
                  <div
                    className={`w-20 h-20 rounded-[1.8rem] border-2 flex items-center justify-center relative transition-all duration-500 
                    ${
                      isSelected
                        ? isMandatory
                          ? "bg-black border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                          : "bg-black border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                        : "bg-zinc-900/40 border-white/5 hover:border-white/20"
                    }`}
                  >
                    <img
                      src={`${ICON_BASE_URL}/${encodeURIComponent(ICON_MAP[agent.name] || ICON_MAP["default"])}`}
                      alt={agent.name}
                      className={`w-16 h-16 transition-all ${isSelected ? "opacity-100" : "opacity-50 grayscale group-hover:grayscale-0"}`}
                      onError={(e) => (e.target.src = `${ICON_BASE_URL}/UAT.png`)}
                    />

                    {isSelected && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setFocusedAgent(isFocused ? null : agent.name);
                          }}
                          className={`absolute -bottom-1 -left-1 w-7 h-7 rounded-xl border-2 border-black text-white flex items-center justify-center z-10 transition-colors ${
                            isMandatory ? "bg-amber-600 hover:bg-amber-500" : "bg-emerald-600 hover:bg-emerald-500"
                          }`}
                        >
                          <Settings size={14} className={isFocused ? "rotate-90" : ""} />
                        </button>

                        {!isMandatory && (
                          <div className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-600 rounded-full border-2 border-black flex items-center justify-center z-10 shadow-lg shadow-emerald-900/40">
                            <span className="text-[10px] font-black text-white">{agentConfig.instances}</span>
                          </div>
                        )}

                        {isMandatory && (
                          <div className="absolute -top-1 -right-1 w-6 h-6 bg-amber-600 rounded-full border-2 border-black flex items-center justify-center z-10 shadow-lg shadow-amber-900/40">
                            <Lock size={10} className="text-white" />
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <span
                    className={`mt-2 text-[9px] font-black uppercase tracking-tighter text-center block ${
                      isSelected ? (isMandatory ? "text-amber-500" : "text-white") : "text-zinc-600"
                    }`}
                  >
                    {agent.name}
                  </span>
                </div>

                <AnimatePresence>
                  {isFocused && (
                    <motion.div
                      initial={{ opacity: 0, x: isLastInRow ? 10 : -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.9, x: isLastInRow ? 10 : -10 }}
                      className={`absolute top-0 z-[100] w-[220px] border rounded-2xl p-4 shadow-2xl backdrop-blur-md 
                        ${isLastInRow ? "right-[110%]" : "left-[110%]"} 
                        ${isMandatory ? "bg-[#0e0a05] border-amber-500/30" : "bg-[#0c0c0e] border-emerald-500/30"}`}
                    >
                      <div
                        className={`absolute top-8 w-3 h-3 rotate-45 border-l border-b 
                          ${isLastInRow ? "-right-[6px] rotate-[225deg]" : "-left-[6px]"} 
                          ${isMandatory ? "bg-[#0e0a05] border-amber-500/30" : "bg-[#0c0c0e] border-emerald-500/30"}`}
                      />

                      <div className="relative space-y-4">
                        {agent.name === "Doc Maker" ? (
                          <div className="space-y-3">
                            <span className="text-[7px] font-black uppercase text-amber-500 tracking-[0.3em] block text-center">
                              Documentation Engine
                            </span>
                            <select
                              value={agentConfig.model}
                              onChange={(e) => {
                                e.stopPropagation();
                                updateAgentSetting(agent.name, "model", e.target.value);
                              }}
                              className="w-full bg-black border border-white/10 rounded-lg py-2 px-2 text-[9px] font-black uppercase outline-none text-amber-400"
                            >
                              {MODEL_LIST.map((m) => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </select>
                            <div className="flex justify-between items-center px-1">
                              <span className="text-[8px] text-zinc-500 uppercase font-bold">Est. Cost</span>
                              <span className="text-[10px] text-amber-400 font-mono font-bold">
                                ${MODEL_DATA[agentConfig.model]?.cost}/hr
                              </span>
                            </div>
                          </div>
                        ) : agent.name === "SAGE" ? (
                          <div className="space-y-3">
                            <span className="text-[10px] font-black uppercase text-rose-500 tracking-[0.3em] block text-center">
                              Security Firewall
                            </span>
                          </div>
                        ) : (
                          <>
                            <div className="space-y-2">
                              <span className="text-[8px] font-black uppercase text-zinc-500 tracking-widest block">
                                Agent Count
                              </span>
                              <div className="flex items-center justify-between bg-black rounded-lg p-1 border border-white/5">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateAgentSetting(agent.name, "instances", Math.max(1, agentConfig.instances - 1));
                                  }}
                                  className="p-1 hover:text-emerald-400 transition-colors"
                                >
                                  <Minus size={12} />
                                </button>
                                <span className="text-sm font-black font-mono text-white">{agentConfig.instances}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateAgentSetting(agent.name, "instances", agentConfig.instances + 1);
                                  }}
                                  className="p-1 hover:text-emerald-400 transition-colors"
                                >
                                  <Plus size={12} />
                                </button>
                              </div>
                            </div>

                            <div className="space-y-2 pt-2 border-t border-white/5">
                              <div className="flex justify-between items-end mb-1">
                                <span className="text-[8px] font-black uppercase text-zinc-500 tracking-widest">
                                  Model & Cost
                                </span>
                                <span className="text-[10px] text-emerald-400 font-mono font-bold">
                                  ${MODEL_DATA[agentConfig.model]?.cost}
                                </span>
                              </div>
                              <select
                                value={agentConfig.model}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  updateAgentSetting(agent.name, "model", e.target.value);
                                }}
                                className="w-full bg-[#121214] border border-white/10 rounded-lg py-2 px-2 text-[9px] font-black uppercase outline-none text-emerald-400 focus:border-emerald-500/50 transition-all"
                              >
                                {MODEL_LIST.map((m) => (
                                  <option key={m} value={m}>{m}</option>
                                ))}
                              </select>
                            </div>
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

        {executionMode === "hybrid" && (
          <>
            {(activeData.humanTeam || []).map((human, hIdx) => (
              <div key={`human-${hIdx}`} className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
                <div className="w-20 h-20 rounded-[1.8rem] border-2 border-amber-500/40 bg-amber-500/5 flex items-center justify-center relative group">
                  <Users size={32} className="text-amber-500/80" />
                  <button
                    onClick={() => removeHumanFromPhase(hIdx)}
                    className="absolute -top-1 -right-1 w-6 h-6 bg-rose-600 rounded-full border-2 border-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={12} className="text-white" />
                  </button>
                </div>
                <span className="mt-3 text-[9px] font-black uppercase text-amber-200 tracking-tighter truncate w-20 text-center">
                  {human}
                </span>
              </div>
            ))}

            <div className="flex flex-col items-center">
              {entryMode === "add-human" ? (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-20 h-20 rounded-[1.8rem] border-2 border-amber-500 bg-black flex flex-col items-center justify-center p-2"
                >
                  <input
                    autoFocus
                    className="w-full bg-transparent text-[10px] text-white text-center outline-none font-bold"
                    placeholder="ID/Name"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        addHumanToPhase(e.target.value);
                        setEntryMode(null);
                      }
                      if (e.key === "Escape") setEntryMode(null);
                    }}
                    onBlur={() => setEntryMode(null)}
                  />
                  <span className="text-[7px] text-amber-500 font-black mt-1 uppercase">Enter</span>
                </motion.div>
              ) : (
                <div
                  onClick={() => setEntryMode("add-human")}
                  className="w-20 h-20 rounded-[1.8rem] border-2 border-zinc-400 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all cursor-pointer flex flex-col items-center justify-center group"
                >
                  <UserPlus size={24} className="text-zinc-300 group-hover:text-amber-500 transition-colors" />
                </div>
              )}
              <span className="mt-3 text-[9px] font-black uppercase text-zinc-300 tracking-tighter">Add Human</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
