import React, { useState, useRef } from "react";
import html2pdf from "html2pdf.js";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronDown,
  Check,
  ArrowRight,
  Rocket,
  Sparkles,
  X,
  PencilLine,
  FileUp,
  UserPlus,
  Trash2,
  Shield,
  Calendar,
  Server,
  Cpu,
  Plus,
  Globe,
} from "lucide-react";
import { STAGES, STAGE_IO_DEFAULTS, AGENT_MAPPING, phaseDependencies } from "../../../utils/constants";
import PhaseCard from "./PhaseCard";
import AgentSelector from "./AgentSelector";
import EditableArtefactList from "./EditableArtefactList";

// --- CONSTANTS ---



export default function PhaseStudio() {
  const navigate = useNavigate();

  const location = useLocation();

  const projectName = location.state?.draft?.projectName || "Untitled Pipeline";

  const fileInputRef = useRef(null);
  const summaryRef = useRef(null);

  const [currentStep, setCurrentStep] = useState(0);

  const [config, setConfig] = useState(() => {
    const initial = {};

    STAGES.forEach((s) => {
      const ioDefaults = STAGE_IO_DEFAULTS[s.id] || { inputs: [], outputs: [] };

      initial[s.id] = {
        inputs: ioDefaults.inputs,

        outputs: ioDefaults.outputs,

        context: "",

        reviewers: [],

        assets: [],

        agentConfigs: {},

        selectedAgents: AGENT_MAPPING[s.id]?.map((a) => a.name) || [],

        requirements: { compliance: [] },

        planning: { sprints: 0, points: 0, duration: 0 },

        development: { environment: "" },

        testing: { env: "Staging" },
      };

      const allPossibleAgents = [
        ...(AGENT_MAPPING[s.id] || []),

        { name: "Doc Maker" },

        { name: "SAGE" },
      ];

      allPossibleAgents.forEach((a) => {
        initial[s.id].agentConfigs[a.name] = [
          { model: "GPT-4o", instances: 1 },
        ];
      });

      AGENT_MAPPING[s.id]?.forEach((a) => {
        initial[s.id].agentConfigs[a.name] = [
          { model: "GPT-4o", instances: 1 },
        ];
      });
    });

    return initial;
  });

  const [approvedPhases, setApprovedPhases] = useState([]);

  const [urlInput, setUrlInput] = useState("");

  const [entryMode, setEntryMode] = useState(null);
  const [entryValue, setEntryValue] = useState("");

  const activeId = STAGES[currentStep].id;

  const activeLabel = STAGES[currentStep].label;

  const activeData = config[activeId];

  const currentPath = `/root/env-production/${activeLabel.toLowerCase().replace(/\s+/g, "-")}`;

  const isPhaseSelected = approvedPhases.includes(activeId);

  const isPhaseFilled = activeData.reviewers.length > 0;



  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);

  const sprintCount = config.p2?.planning?.sprints || 0;
  const weeksPerSprint = config.p2?.planning?.duration || 0;
  const totalProjectWeeks = sprintCount * weeksPerSprint;
  const displayDuration = totalProjectWeeks || 12;



  const updateField = (field, value) => {
    setConfig((prev) => ({
      ...prev,
      [activeId]: { ...prev[activeId], [field]: value },
    }));
  };
  const getActiveInputs = () => {
    // 🟢 Use 'activeId' instead of 'activePhase.id'
    const currentPhaseId = activeId;

    // 🟢 Match the dependency key to your activeLabel
    const previousPhaseLabel = phaseDependencies[activeLabel.toLowerCase()];

    // Find the actual stage ID for the previous phase (e.g., 'Requirements' -> 'p1')
    const previousStage = STAGES.find(
      (s) => s.label.toLowerCase() === previousPhaseLabel,
    );
    const previousStageId = previousStage?.id;

    // 🟢 Use 'config' instead of 'phases'
    if (previousStageId && config[previousStageId]?.outputs?.length > 0) {
      return config[previousStageId].outputs.map((output) => ({
        ...output,
        isMandatory: true, // This ensures the text turns Orange
      }));
    }

    // Fallback to the current phase's default inputs
    return activeData.inputs;
  };
  const addItemToList = (type) => {
    if (!entryValue.trim()) return;

    const newItem = { text: entryValue.trim(), isMandatory: false };

    updateField(type, [...activeData[type], newItem]);

    setEntryValue("");
    setEntryMode(null);
  };

  const togglePhaseSelection = () => {
    if (isPhaseSelected) {
      setApprovedPhases((prev) => prev.filter((id) => id !== activeId));
    } else {
      setApprovedPhases((prev) => [...new Set([...prev, activeId])]);
    }
  };

  const toggleAgentSelection = (agentName) => {
    const currentSelected = activeData.selectedAgents;
    if (currentSelected.includes(agentName)) {
      if (currentSelected.length <= 1) return;
      updateField("selectedAgents", currentSelected.filter((a) => a !== agentName));
    } else {
      updateField("selectedAgents", [...currentSelected, agentName]);
    }
  };

  const updateAgentSetting = (agentName, key, value) => {
    const newConfigs = { ...activeData.agentConfigs };
    newConfigs[agentName][0][key] = value;
    updateField("agentConfigs", newConfigs);
  };

  const [isInstructionsExpanded, setIsInstructionsExpanded] = useState(true);

  const [showFinalModal, setShowFinalModal] = useState(false);

  // Helper to calculate total cost based on selected phases and their default agents

  const calculateTotalCost = (targetPhases) => {
    let totalCost = 0;

    targetPhases.forEach((pId) => {
      const agentsInPhase = AGENT_MAPPING[pId] || [];

      agentsInPhase.forEach(() => {
        // Using GPT-4o base cost from your MODEL_DATA (12.50)

        const tokenWeight = pId === "p5" || pId === "p6" ? 0.25 : 0.1;

        totalCost += 1.5 * tokenWeight * 12.5;
      });
    });

    // Add Mandatory Agents cost (SAGE ~9.00 + Tech Writer ~3.75 based on your logic)

    return (totalCost + 12.75).toFixed(2);
  };

  const getPhaseValidationState = () => {
    if (!isPhaseSelected) return "skipped";

    const hasReviewers = activeData.reviewers.length > 0;

    let hasMandatoryFields = true;

    if (activeId === "p2") {
      const { sprints, duration, points } = activeData.planning;

      // 🟢 Mandatory check: Values must be > 0

      hasMandatoryFields = sprints > 0 && duration > 0 && points > 0;
    } else if (activeId === "p4") {
      // 🟢 Mandatory check: Environment must be selected

      hasMandatoryFields =
        !!activeData.development.environment &&
        activeData.development.environment !== "1";
    } else if (["p5", "p6", "p7", "p8"].includes(activeId)) {
      hasMandatoryFields = !!activeData.testing?.env;
    }

    return hasReviewers && hasMandatoryFields ? "ready" : "pending";
  };

  const handleSaveNextAction = () => {
    const state = getPhaseValidationState();

    // 🟢 Deactivate if phase is not selected

    if (state === "skipped") return;

    if (state === "pending") {
      alert(
        "Incomplete Metadata: Please assign a Human Reviewer and fill all mandatory phase parameters (*).",
      );

      return;
    }

    // Mark as approved and move forward

    setApprovedPhases((prev) => [...new Set([...prev, activeId])]);

    if (currentStep < STAGES.length - 1) setCurrentStep((prev) => prev + 1);
  };

  const handleSkipAction = () => {
    if (activeId === "p8") {
      // For deployment skip: Open modal with currently approved phases only

      setShowFinalModal(true);
    } else {
      setApprovedPhases((prev) => prev.filter((id) => id !== activeId));

      if (currentStep < STAGES.length - 1) setCurrentStep((prev) => prev + 1);
    }
  };

  const handleStartPipelineAction = () => {
    const state = getPhaseValidationState();

    if (state === "skipped") return;

    if (state === "pending") {
      alert(
        "Incomplete Metadata: Please assign a Human Reviewer and fill mandatory Deployment fields.",
      );

      return;
    }
    // For deployment start: Ensure p8 is in approved list then open modal
    const finalApproved = [...new Set([...approvedPhases, activeId])];
    setApprovedPhases(finalApproved);
    setShowFinalModal(true);
  };

  // Inside PhaseStudio component
  const createAndNavigateProject = (finalPhases) => {
    const projectId = Date.now().toString(); // Consistent with ID type in router

    const newProject = {
      id: projectId,
      name: projectName,
      // finalPhases contains the IDs like ["p1", "p2", "p4"]
      selectedPhaseIds: finalPhases,
      phaseConfigs: config,
      totalCost: calculateTotalCost(finalPhases),
      cost: `${calculateTotalCost(finalPhases)}`,
      status: "New",
      stage: STAGES.find((s) => finalPhases.includes(s.id))?.label || "None",
      created: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    };

    // 1. Persist to LocalStorage so the Router Wrapper/Details page can find it
    const existingProjects = JSON.parse(
      localStorage.getItem("projects") || "[]",
    );
    localStorage.setItem(
      "projects",
      JSON.stringify([newProject, ...existingProjects]),
    );

    // 2. Navigate using the project ID route
    // We pass the project object in state as a backup for immediate rendering
    navigate(`/project/${projectId}`, {
      state: { project: newProject, phaseConfigs: config },
    });
  };

  const projectDuration = config.p2?.planning?.duration || 12;

  const downloadPDF = () => {
    const element = summaryRef.current;
    if (!element) return;

    const opt = {
      margin: [0.3, 0.3],
      filename: `${projectName}_Summary.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: "#161920", // Keeps your professional dark theme
      },
      jsPDF: { unit: "in", format: "a3", orientation: "landscape" },
    };

    html2pdf().set(opt).from(element).save();
  };

  // --- Dynamic Right Sidebar Content ---

  const renderPhaseSpecificFields = () => {
    switch (activeId) {
      case "p1": // Requirements
        return (
          <div className="space-y-3 p-4 bg-white/5 rounded-2xl border border-white/5">
            <label className="text-[9px] font-black uppercase text-violet-400 flex items-center gap-2">
              <Shield size={12} /> Compliance Standards
            </label>

            <div className="grid grid-cols-2 gap-2">
              {["HIPAA", "SOC2", "GDPR", "PCI-DSS"].map((std) => (
                <button
                  key={std}
                  onClick={() => {
                    const current = activeData.requirements.compliance;

                    const next = current.includes(std)
                      ? current.filter((c) => c !== std)
                      : [...current, std];

                    updateField("requirements", {
                      ...activeData.requirements,
                      compliance: next,
                    });
                  }}
                  className={`px-3 py-2 rounded-lg text-[10px] font-bold border transition-all ${activeData.requirements.compliance.includes(std) ? "bg-violet-500/20 border-violet-500 text-white" : "bg-black/20 border-white/5 text-slate-500 hover:border-white/20"}`}
                >
                  {std}
                </button>
              ))}
            </div>
          </div>
        );

      case "p2": // Planning
        return (
          <div className="space-y-4 p-4 bg-white/5 rounded-2xl border border-white/5">
            <label className="text-[9px] font-black uppercase text-violet-400 flex items-center gap-2">
              <Calendar size={12} /> Sprint Configuration{" "}
              <span className="text-[10px] text-rose-500">*</span>
            </label>

            <div className="space-y-3">
              {[
                { l: "Number of Sprints", k: "sprints" },
                { l: "Points / Sprint", k: "points" },
                { l: "Duration / Sprint (Weeks)", k: "duration" }, // 🟢 Syncs with 'weeksPerSprint'
              ].map((item) => (
                <div
                  key={item.k}
                  className="flex justify-between items-center bg-black/20 p-2 rounded-xl border border-white/5"
                >
                  <span className="text-[10px] text-slate-400 font-bold">
                    {item.l}
                  </span>

                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    className="bg-transparent text-right w-12 outline-none text-white font-mono text-xs placeholder:text-slate-600"
                    value={activeData.planning[item.k]}
                    onChange={(e) => {
                      const val = Math.max(0, parseInt(e.target.value) || 0);
                      updateField("planning", {
                        ...activeData.planning,
                        [item.k]: val,
                      });
                    }}
                  />
                </div>
              ))}

              {/* 🟢 VISUAL FEEDBACK: Calculated Total Cycle */}
              <div className="pt-2 border-t border-white/10 flex justify-between items-center px-1">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
                  Estimated Cycle
                </span>
                <span className="text-[11px] font-black text-emerald-400 font-mono">
                  {displayDuration} Weeks
                </span>
              </div>
            </div>
          </div>
        );

      case "p3": // 🟢 NEW: Architecture
        return (
          <div className="space-y-4 p-4 bg-white/5 rounded-2xl border border-white/5">
            <label className="text-[9px] font-black uppercase text-violet-400 flex items-center gap-2">
              <Cpu size={12} /> Technology Preference
            </label>

            <div className="space-y-2">
              <input
                type="text"
                placeholder="e.g. FastAPI, PostgreSQL, Tailwind..."
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-[11px] text-white outline-none focus:border-violet-500/50 transition-all"
                value={activeData.architecture?.techStack || ""}
                onChange={(e) =>
                  updateField("architecture", {
                    ...activeData.architecture,
                    techStack: e.target.value,
                  })
                }
              />

              <p className="text-[8px] text-slate-500 px-1 uppercase tracking-tight">
                Specify framework or library preferences for the agents.
              </p>
            </div>
          </div>
        );

      case "p4": // Development
        return (
          <div className="space-y-4 p-4 bg-white/5 rounded-2xl border border-white/5">
            <label className="text-[9px] font-black uppercase text-violet-400 flex items-center gap-2">
              <Server size={12} /> Hosting Infrastructure{" "}
              <span className="text-[10px] text-rose-500">*</span>
            </label>

            <div className="space-y-3">
              <select
                className={`w-full bg-black/40 border rounded-xl p-2.5 text-[10px] font-bold outline-none focus:border-violet-500/50 transition-all ${activeData.development.environment ? "text-white border-white/10" : "text-slate-500 border-rose-500/30"}`}
                value={activeData.development.environment || ""}
                onChange={(e) =>
                  updateField("development", {
                    ...activeData.development,
                    environment: e.target.value,
                  })
                }
              >
                <option value="" disabled>
                  Select Infrastructure...
                </option>

                <option value="GCP">GCP</option>

                <option value="AWS">AWS</option>

                <option value="Docker">Docker</option>

                <option value="Kubernetes">Kubernetes</option>
              </select>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#0f1115] text-slate-100 font-sans overflow-hidden flex-col">
      <div className="h-24 border-b border-white/5 bg-[#161920] flex items-center px-12 shadow-2xl z-20 shrink-0">
        <div className="flex items-center justify-between w-full max-w-7xl mx-auto">
          {STAGES.map((stage, idx) => (
            <React.Fragment key={stage.id}>
              <PhaseCard
                stage={stage}
                index={idx}
                currentStep={currentStep}
                approvedPhases={approvedPhases}
                onClick={() => {
                  setCurrentStep(idx);
                  setEntryMode(null);
                }}
              />
              {idx !== STAGES.length - 1 && (
                <div
                  className={`flex-1 h-[1px] mx-4 rounded-full ${approvedPhases.includes(STAGES[idx].id) ? "bg-emerald-500/50" : "bg-slate-800"}`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <main className="flex-1 flex px-12 py-6 gap-8 overflow-hidden bg-[radial-gradient(#ffffff03_1px,transparent_1px)] [background-size:40px_40px]">
        <div className="flex-1 flex flex-col gap-6 overflow-y-auto no-scrollbar pr-4 custom-scrollbar">
          <div className="flex items-center justify-between shrink-0">
            <div className="flex flex-col">
              <h1 className="text-2xl font-black uppercase tracking-tighter text-white flex items-center gap-3">
                {activeLabel}{" "}
                <Sparkles size={24} className="text-violet-500 animate-pulse" />
              </h1>
            </div>

            {/* 🟢 NEW TOGGLE SWITCH COMPONENT */}

            <div className="flex items-center gap-4 bg-white/5 px-6 py-3 rounded-3xl border border-white/20">
              <span
                className={`text-[10px] font-black uppercase tracking-widest transition-colors ${isPhaseSelected ? "text-emerald-400" : "text-slate-300"}`}
              >
                {isPhaseSelected ? "Phase Selected" : "Select Phase "}
              </span>

              <div
                onClick={togglePhaseSelection}
                className={`relative w-14 h-7 rounded-full cursor-pointer transition-all duration-300 p-1 ${
                  isPhaseSelected
                    ? "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                    : "bg-slate-700"
                }`}
              >
                <motion.div
                  animate={{ x: isPhaseSelected ? 28 : 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="w-5 h-5 bg-white rounded-full shadow-lg flex items-center justify-center"
                >
                  {isPhaseSelected ? (
                    <Check
                      size={12}
                      className="text-emerald-600"
                      strokeWidth={4}
                    />
                  ) : (
                    <X size={12} className="text-slate-400" strokeWidth={4} />
                  )}
                </motion.div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <EditableArtefactList
              title="Phase Inputs"
              list={getActiveInputs()}
              color="violet"
              type="inputs"
              entryMode={entryMode}
              entryValue={entryValue}
              setEntryValue={setEntryValue}
              onAddClick={() => setEntryMode("inputs")}
              onConfirm={() => addItemToList("inputs")}
              onDelete={(idx) =>
                updateField(
                  "inputs",
                  activeData.inputs.filter((_, i) => i !== idx),
                )
              }
              onToggle={(idx) => {
                const newList = [...activeData.inputs];

                if (
                  newList[idx].isMandatory &&
                  newList.filter((i) => i.isMandatory).length <= 1
                )
                  return;

                newList[idx].isMandatory = !newList[idx].isMandatory;

                updateField("inputs", newList);
              }}
              // 🟢 NEW PROPS

              repoUrl={location.state?.draft?.repoUrl}
              updateField={updateField}
            />

            <EditableArtefactList
              title="Phase Deliverables"
              list={activeData.outputs}
              color="emerald"
              type="outputs"
              entryMode={entryMode}
              entryValue={entryValue}
              setEntryValue={setEntryValue}
              onAddClick={() => setEntryMode("outputs")}
              onConfirm={() => addItemToList("outputs")}
              onDelete={(idx) =>
                updateField(
                  "outputs",
                  activeData.outputs.filter((_, i) => i !== idx),
                )
              }
              onToggle={(idx) => {
                const newList = [...activeData.outputs];

                newList[idx].isMandatory = !newList[idx].isMandatory;

                updateField("outputs", newList);
              }}
              repoUrl={location.state?.draft?.repoUrl} // 🟢 Source for fetching
              targetCodeRepo={location.state?.draft?.codeRepoUrl} // 🟢 Target Code
              targetDocRepo={location.state?.draft?.docRepoUrl} // 🟢 Target Docs
              activeId={activeId}
              updateField={updateField}
            />
          </div>

          <AgentSelector
            activeId={activeId}
            activeData={activeData}
            updateField={updateField}
            toggleAgentSelection={toggleAgentSelection}
            updateAgentSetting={updateAgentSetting}
            executionMode={location.state?.draft?.executionMode}
            frameworkMode={location.state?.draft?.frameworkMode}
            entryMode={entryMode}
            setEntryMode={setEntryMode}
          />
        </div>

        <div className="w-[320px] flex flex-col gap-6 shrink-0 overflow-y-auto no-scrollbar custom-scrollbar pr-1">
          <div className="flex flex-col gap-4 bg-gradient-to-br from-[#1a1d24] to-[#161920] border border-violet-500/20 rounded-3xl p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex flex-col">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400">
                  Human Reviewer <span className="text-rose-500 ml-0.5">*</span>
                </label>
                <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">
                  Assign members
                </span>
              </div>

              <button
                onClick={() =>
                  setEntryMode(entryMode === "reviewers" ? null : "reviewers")
                }
                className="p-1.5 rounded-lg bg-violet-600 text-white"
              >
                <UserPlus size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-2 max-h-[140px] overflow-y-auto no-scrollbar">
              <AnimatePresence>
                {entryMode === "reviewers" && (
                  <motion.form
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!entryValue) return;

                      updateField("reviewers", [
                        ...activeData.reviewers,
                        entryValue,
                      ]);

                      setEntryValue("");
                      setEntryMode(null);
                    }}
                    className="mb-1"
                  >
                    <input
                      autoFocus
                      value={entryValue}
                      onChange={(e) => setEntryValue(e.target.value)}
                      placeholder="Enter Name or Emp ID..."
                      className="w-full bg-black border border-violet-500/50 rounded-xl py-2 px-3 text-xs outline-none text-white font-bold"
                    />
                  </motion.form>
                )}
              </AnimatePresence>

              {/* 🟢 DYNAMIC SIZING: Shrinks all cards when the 2nd name is added */}
              {activeData.reviewers.length > 1 ? (
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {activeData.reviewers.map((name, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-white/[0.03] border border-white/5 px-2 py-1.5 rounded-lg group hover:border-violet-500/30"
                    >
                      <span className="text-[10px] font-bold text-slate-400 truncate">
                        {name}
                      </span>
                      <button
                        onClick={() =>
                          updateField(
                            "reviewers",
                            activeData.reviewers.filter((_, idx) => idx !== i),
                          )
                        }
                        className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-rose-500 transition-colors"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                activeData.reviewers.map((name, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-white/[0.03] border border-white/5 px-3 py-2 rounded-xl group hover:border-violet-500/30"
                  >
                    <span className="text-xs font-bold text-slate-200">
                      {name}
                    </span>

                    <button
                      onClick={() =>
                        updateField(
                          "reviewers",
                          activeData.reviewers.filter((_, idx) => idx !== i),
                        )
                      }
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-500 transition-all"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 🟢 NEW PHASE SPECIFIC FIELDS CARD */}

          {renderPhaseSpecificFields()}

          <div className="bg-[#1a1d24] border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden shrink-0 transition-all duration-300">
            {/* Header / Toggle Trigger */}

            <button
              onClick={() => setIsInstructionsExpanded(!isInstructionsExpanded)}
              className="w-full p-5 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-2">
                <PencilLine size={14} className="text-violet-500" />

                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Instructions
                </span>
              </div>

              <motion.div
                animate={{ rotate: isInstructionsExpanded ? 0 : -90 }}
                transition={{ duration: 0.2 }}
                className="text-slate-600"
              >
                <ChevronDown size={16} />
              </motion.div>
            </button>

            {/* Collapsible Content */}

            <AnimatePresence>
              {isInstructionsExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  <div className="px-5 pb-5 flex flex-col gap-5 border-t border-white/5 pt-5">
                    <div className="flex flex-col gap-3">
                      <textarea
                        value={activeData.context}
                        onChange={(e) => updateField("context", e.target.value)}
                        placeholder="Define phase-specific guidelines..."
                        className="h-24 bg-black/40 border border-white/5 rounded-xl p-3 text-xs text-slate-300 outline-none focus:border-violet-500/50 transition-all resize-none overflow-y-auto custom-scrollbar"
                      />
                    </div>

                    <div className="flex flex-col gap-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 flex items-center gap-2 px-1">
                        Upload Inputs
                      </label>

                      <div className="flex flex-row gap-2 items-stretch">
                        <div className="flex items-center bg-black/40 border border-white/5 rounded-xl px-3 py-2">
                          <Globe size={14} className="text-slate-600 mr-2" />

                          <input
                            type="text"
                            placeholder="Add source link"
                            className="bg-transparent text-[11px] w-full outline-none text-slate-200"
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                          />

                          <button
                            onClick={() => {
                              if (!urlInput) return;
                              updateField("assets", [
                                ...activeData.assets,
                                { type: "link", value: urlInput },
                              ]);
                              setUrlInput("");
                            }}
                            className="ml-2 text-violet-400 hover:text-white"
                          >
                            <Plus size={16} />
                          </button>
                        </div>

                        <button
                          onClick={() => fileInputRef.current.click()}
                          className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-white/5 rounded-xl text-slate-300 text-[11px] font-bold flex items-center justify-center gap-2 whitespace-nowrap"
                        >
                          <FileUp size={14} /> Attach File
                        </button>

                        <input
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          onChange={(e) =>
                            e.target.files[0] &&
                            updateField("assets", [
                              ...activeData.assets,
                              { type: "file", value: e.target.files[0].name },
                            ])
                          }
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      <footer className="h-20 border-t border-white/5 bg-[#161920] flex items-center justify-between px-12 z-30 shrink-0">
        {/* 🟢 UPDATED: "Back" navigation replaced with "Previous" step logic */}

        <button
          onClick={() => {
            if (currentStep > 0) {
              setCurrentStep((prev) => prev - 1);
            } else {
              navigate(-1);
            }
          }}
          className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 hover:text-white transition-colors flex items-center gap-3 group"
        >
          <ChevronLeft
            size={16}
            className="group-hover:-translate-x-1 transition-transform"
          />

          {currentStep > 0 ? "Previous Phase" : "Back to Setup"}
        </button>

        <div className="flex items-center gap-4">
          {/* Dynamic Skip Button */}

          <button
            onClick={handleSkipAction}
            className="px-8 py-3 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] bg-slate-800 text-slate-400 hover:bg-slate-700 transition-all"
          >
            {activeId === "p8" ? "Skip & Run" : "Skip Phase"}
          </button>

          {/* Dynamic Action Button (Save & Next / Start Pipeline) */}

          {activeId === "p8" ? (
            <button
              onClick={handleStartPipelineAction}
              className={`px-10 py-3 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] shadow-lg transition-all flex items-center gap-3  

                ${
                  getPhaseValidationState() === "ready"
                    ? "bg-emerald-600 text-white"
                    : getPhaseValidationState() === "pending"
                      ? "bg-orange-500 text-white"
                      : "bg-slate-900 text-slate-600 grayscale opacity-50"
                }`}
            >
              Start Pipeline <Rocket size={16} />
            </button>
          ) : (
            <button
              onClick={handleSaveNextAction}
              className={`px-10 py-3 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] shadow-lg transition-all flex items-center gap-3  

                ${
                  getPhaseValidationState() === "ready"
                    ? "bg-emerald-600 text-white"
                    : getPhaseValidationState() === "pending"
                      ? "bg-orange-500 text-white"
                      : "bg-slate-900 text-slate-600 grayscale opacity-50"
                }`}
            >
              Save & Next <ArrowRight size={16} />
            </button>
          )}
        </div>
      </footer>

      <AnimatePresence>
        {showFinalModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              ref={summaryRef}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{
                opacity: 1,
                scale: 1,
                width: isDetailsExpanded ? "95vw" : "1000px",
                height: "85vh",
              }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0c0c0e] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden flex flex-col transition-all duration-500"
            >
              <div className="absolute top-0 left-1/4 right-1/4 h-[2px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent shadow-[0_0_20px_#10b981] shrink-0" />

              <div className="flex flex-col h-full gap-6">
                <div className="flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <Rocket size={20} />
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-3">
                        <h2 className="text-xl font-black uppercase tracking-[0.15em] text-white italic leading-none">
                          Project Timeline Summary
                        </h2>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadPDF();
                          }}
                          className="p-2 rounded-full bg-white/5 border border-white/10 text-emerald-400 hover:bg-emerald-500 hover:text-black transition-all shadow-lg"
                          title="Download Summary PDF"
                        >
                          <FileUp size={18} />
                        </button>
                      </div>
                      <span className="text-[12px] text-emerald-500/60 font-black uppercase tracking-[0.4em] mt-2">
                        {projectName}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <button
                      onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
                      className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all border ${
                        isDetailsExpanded
                          ? "bg-white/5 border-white/10 text-slate-400"
                          : "bg-emerald-500 text-black border-emerald-400 shadow-[0_0_20px_#10b98144]"
                      }`}
                    >
                      {isDetailsExpanded ? "Hide Details" : "View Node Details"}
                      <motion.div
                        animate={{ rotate: isDetailsExpanded ? 180 : 0 }}
                      >
                        <ChevronDown size={16} />
                      </motion.div>
                    </button>
                    <div className="text-right border-l border-white/10 pl-8">
                      <span className="text-[10px] font-black text-slate-500 uppercase block mb-1">
                        Estimated Cycle
                      </span>
                      <span className="text-xl font-black text-emerald-400 font-mono tracking-tighter">
                        {displayDuration} Weeks
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar pr-2 min-h-0">
                  <div className="flex gap-10 items-start overflow-hidden">
                    <motion.div
                      animate={{ width: isDetailsExpanded ? "45%" : "100%" }}
                      className="flex flex-col gap-2 shrink-0"
                    >
                      <div className="flex flex-col gap-4 mb-4">
                        <span className="text-[14px] font-black text-violet-400 uppercase tracking-widest italic px-1">
                          Gantt Chart
                        </span>
                        <div className="grid grid-cols-[160px_1fr] border-b border-white/5 pb-4">
                          <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center">
                            Phase Node
                          </span>
                          <div className="flex justify-between px-2 gap-1">
                            {Array.from(
                              { length: displayDuration },
                              (_, i) => i + 1,
                            ).map((w) => (
                              <span
                                key={w}
                                className="text-[8px] font-black text-white w-full text-center py-1 bg-violet-600/40 rounded-[4px] border border-violet-500/20 shadow-sm shadow-violet-900/20"
                              >
                                W{w}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1 relative">
                        <div className="absolute inset-0 grid grid-cols-[160px_1fr] pointer-events-none">
                          <div className="bg-transparent border-r border-white/5" />
                          <div className="flex justify-between px-1 h-full">
                            {Array.from({ length: displayDuration }).map(
                              (_, i) => (
                                <div
                                  key={i}
                                  className={`w-full h-full ${
                                    i % 2 === 0
                                      ? "bg-white/[0.05]"
                                      : "bg-transparent"
                                  }`}
                                />
                              ),
                            )}
                          </div>
                        </div>

                        {(() => {
                          {
                            /* 🟢 DYNAMIC SHIFT LOGIC */
                          }
                          let currentOffset = 2; // Start margin
                          const sortedApproved = [...approvedPhases].sort(
                            (a, b) =>
                              STAGES.findIndex((s) => s.id === a) -
                              STAGES.findIndex((s) => s.id === b),
                          );

                          return sortedApproved.map((id) => {
                            let width = 15;
                            const reqWidth = 15;
                            const planWidth = 18;
                            const archWidth = 15;
                            const devWidth = archWidth * 1.25;
                            const testWidth = devWidth * 0.75;
                            const nfrWidth = 8;

                            let marginLeft = currentOffset;

                            if (id === "p1") width = reqWidth;
                            if (id === "p2") width = planWidth;
                            if (id === "p3") width = archWidth;
                            if (id === "p4") {
                              width = devWidth;
                              // Start dev slightly earlier (overlap) if architecture exists
                              if (approvedPhases.includes("p3")) {
                                marginLeft -= archWidth * 0.25;
                              }
                            }
                            if (id === "p5") {
                              width = testWidth;
                              // Start test mid-dev if dev exists
                              if (approvedPhases.includes("p4")) {
                                marginLeft -= devWidth * 0.5;
                              }
                            }
                            if (id === "p6") width = nfrWidth;
                            if (id === "p7") width = nfrWidth;
                            if (id === "p8") width = nfrWidth;

                            // Update offset for the next bar based on this bar's end position
                            currentOffset = marginLeft + width;

                            return (
                              <div
                                key={id}
                                className={`grid grid-cols-[160px_1fr] ${
                                  isDetailsExpanded ? "h-14" : "h-8"
                                } group items-center relative z-10`}
                              >
                                <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-white/[0.05] pointer-events-none" />
                                <div className="flex items-center px-2 h-full">
                                  <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mr-3 shadow-[0_0_10px_#8b5cf6]" />
                                  <span className="text-[10px] font-black uppercase text-slate-300 truncate">
                                    {STAGES.find((s) => s.id === id)?.label}
                                  </span>
                                </div>
                                <div className="relative flex items-center px-1 h-full">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${width}%` }}
                                    className={`${
                                      isDetailsExpanded ? "h-3" : "h-4"
                                    } -full bg-gradient-to-r from-violet-600 to-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.3)] relative z-10`}
                                    style={{ marginLeft: `${marginLeft}%` }}
                                  />
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </motion.div>

                    <AnimatePresence>
                      {isDetailsExpanded && (
                        <motion.div
                          initial={{ width: 0, opacity: 0, x: 50 }}
                          animate={{ width: "55%", opacity: 1, x: 0 }}
                          exit={{ width: 0, opacity: 0, x: 50 }}
                          className="bg-black/20 border border-white/5 rounded-[2rem] p-6 overflow-hidden shadow-inner mt-2"
                        >
                          <table className="w-full text-left border-separate border-spacing-y-2">
                            <thead>
                              <tr className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                                <th className="px-4 pb-2">Source Artifacts</th>
                                <th className="px-4 pb-2">Resource Cost</th>
                                <th className="px-4 pb-2">Agent Squad</th>
                                <th className="px-4 pb-2 text-right">
                                  Human Reviewer
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {[...approvedPhases]
                                .sort(
                                  (a, b) =>
                                    STAGES.findIndex((s) => s.id === a) -
                                    STAGES.findIndex((s) => s.id === b),
                                )
                                .map((id) => {
                                  const phaseData = config[id];
                                  const linkedSources = phaseData.inputs.filter(
                                    (inp) => inp.source,
                                  );
                                  return (
                                    <tr
                                      key={id}
                                      className="h-14 bg-white/[0.02] hover:bg-white/[0.04] transition-all rounded-2xl"
                                    >
                                      <td className="px-4 rounded-l-2xl">
                                        {linkedSources.length > 0 ? (
                                          <div className="flex flex-col gap-1 max-h-12 overflow-y-auto no-scrollbar py-1">
                                            {linkedSources.map((src, sIdx) => (
                                              <div
                                                key={sIdx}
                                                className="text-[9px] text-emerald-400 font-bold truncate max-w-[150px] underline underline-offset-2 hover:text-emerald-300 transition-colors"
                                                title={src.source.value}
                                              >
                                                {src.source.value
                                                  .split("/")
                                                  .pop()}
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <span className="text-[9px] text-slate-600 italic">
                                            No docs attached
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-4">
                                        <span className="text-[11px] font-black text-white font-mono tracking-tighter">
                                          $
                                          {(
                                            parseFloat(
                                              calculateTotalCost([id]),
                                            ) - 12.75
                                          ).toFixed(2)}
                                        </span>
                                      </td>
                                      <td className="px-4">
                                        <div className="flex flex-wrap gap-1.5">
                                          {phaseData.selectedAgents.map(
                                            (a, i) => {
                                              const agentCfg = phaseData
                                                .agentConfigs[a]?.[0] || {
                                                model: "GPT-4o",
                                                instances: 1,
                                              };
                                              return (
                                                <div
                                                  key={i}
                                                  className="flex items-center gap-1 px-2 py-0.5 bg-black/40 border border-white/10 rounded-lg"
                                                >
                                                  <span className="text-[8px] font-black text-slate-400">
                                                    {agentCfg.instances}x
                                                  </span>
                                                  <span className="text-[8px] font-black text-white uppercase tracking-tighter">
                                                    {
                                                      agentCfg.model.split(
                                                        " ",
                                                      )[0]
                                                    }
                                                  </span>
                                                </div>
                                              );
                                            },
                                          )}
                                        </div>
                                      </td>
                                      <td className="px-4 rounded-r-2xl text-right">
                                        <span className="text-[9px] font-black text-slate-500 uppercase">
                                          {phaseData.reviewers[0] || "---"}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                            </tbody>
                          </table>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="flex gap-5 pt-6 border-t border-white/5 shrink-0 mt-auto bg-[#0c0c0e]">
                  <button
                    onClick={() => setShowFinalModal(false)}
                    className="px-10 py-4 rounded-2xl bg-white/5 border border-white/10 text-slate-500 text-[12px] font-black uppercase tracking-widest hover:text-white transition-all"
                  >
                    Cancel Engine
                  </button>
                  <button
                    onClick={() => createAndNavigateProject(approvedPhases)}
                    className="flex-1 py-4 rounded-2xl bg-emerald-500 text-black text-[13px] font-black uppercase tracking-[0.2em] hover:bg-emerald-400 transition-all shadow-[0_10px_30px_#10b98133]"
                  >
                    Initialize {projectName || "Neuroas"} Pipeline
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <style
        dangerouslySetInnerHTML={{
          __html: ` 

        .no-scrollbar::-webkit-scrollbar { display: none; } 

        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } 

      `,
        }}
      />
    </div>
  );
}