import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  X,
  AlertCircle,
  Link as LinkIcon,
  Bookmark,
  BookmarkCheck,
  FileUp,
  Globe,
  HardDrive,
} from "lucide-react";
import { PHASE_REPO_CONFIG } from "../../../utils/constants";

export default function EditableArtefactList({
  title,
  list,
  color,
  type,
  entryMode,
  entryValue,
  setEntryValue,
  onAddClick,
  onConfirm,
  onDelete,
  onToggle,
  repoUrl,
  targetCodeRepo,
  targetDocRepo,
  activeId,
  updateField,
}) {
  const [linkingIdx, setLinkingIdx] = useState(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [tempSource, setTempSource] = useState({ type: "repo", value: "" });
  const [isExploring, setIsExploring] = useState(false);
  const [repoContents, setRepoContents] = useState([]);
  const [currentDir, setCurrentDir] = useState("");
  const [loadingRepo, setLoadingRepo] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [urlInput, setUrlInput] = useState("");

  const localFileInputRef = useRef(null);
  const needs = PHASE_REPO_CONFIG[activeId] || [];

  const formatPath = (url) => {
    if (!url || typeof url !== "string") return "not-set";
    const repoName = url.split("/").pop().replace(".git", "");
    return `/${repoName}/${activeId}`;
  };

  const fetchRepoFiles = async (path = "") => {
    const activeUrl = repoUrl;
    if (!activeUrl) {
      setErrorMessage("No source repository (Project Files) found.");
      return;
    }

    setLoadingRepo(true);
    try {
      const response = await fetch("http://localhost:5000/api/github-explorer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: activeUrl, path }),
      });

      const data = await response.json();
      if (response.ok && Array.isArray(data)) {
        setRepoContents(data);
        setCurrentDir(path);
      } else {
        setErrorMessage(data.error || "Failed to load files.");
      }
    } catch (error) {
      setErrorMessage("Could not connect to backend server.");
    } finally {
      setLoadingRepo(false);
    }
  };

  const attachSource = (idx) => {
    const newList = [...list];
    newList[idx].source = tempSource;
    updateField(type, newList);
    setLinkingIdx(null);
    setTempSource({ type: "repo", value: "" });
  };

  const createWithSource = () => {
    if (!entryValue.trim()) return alert("Please enter a name for the element.");
    const newItem = {
      text: entryValue.trim(),
      isMandatory: false,
      source: tempSource.value ? tempSource : null,
    };
    updateField(type, [...list, newItem]);
    setEntryValue("");
    setIsCreatingNew(false);
    setTempSource({ type: "repo", value: "" });
  };

  return (
    <div className="flex flex-col gap-3 min-h-0 relative">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 whitespace-nowrap">
            {title}
          </h4>
          {type === "outputs" && activeId !== "p4" && (
            <div className="flex items-center gap-2">
              {needs.includes("code") && (
                <div
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-violet-500/5 border border-violet-500/10 cursor-help"
                  title={formatPath(targetCodeRepo)}
                >
                  <HardDrive size={10} className="text-violet-400" />
                  <code className="text-[9px] text-violet-300 font-mono truncate max-w-[120px]">
                    {formatPath(targetCodeRepo)}
                  </code>
                </div>
              )}
              {needs.includes("doc") && (
                <div
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/5 border border-emerald-500/10 cursor-help"
                  title={formatPath(targetDocRepo)}
                >
                  <FileUp size={10} className="text-emerald-400" />
                  <code className="text-[9px] text-emerald-300 font-mono truncate max-w-[120px]">
                    {formatPath(targetDocRepo)}
                  </code>
                </div>
              )}
            </div>
          )}
        </div>

        {!entryMode && !isCreatingNew && (
          <button
            onClick={() => {
              setTempSource({ type: "repo", value: "" });
              setEntryValue("");
              setIsCreatingNew(true);
            }}
            className="p-1 hover:bg-white/10 rounded-md text-violet-400"
          >
            <Plus size={14} strokeWidth={3} />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2 overflow-y-auto pr-1 max-h-[220px] custom-scrollbar no-scrollbar">
        {list.length > 3 ? (
          <div className="grid grid-cols-3 gap-2">
            {list.map((item, idx) => (
              <div
                key={idx}
                onClick={() => {
                  if (type === "inputs") {
                    setLinkingIdx(idx);
                    item.source ? setTempSource(item.source) : setTempSource({ type: "repo", value: "" });
                  }
                }}
                className={`flex items-center justify-between bg-[#1a1d24] border rounded-xl p-2 transition-all cursor-pointer relative min-w-0 
                  ${linkingIdx === idx ? "border-violet-500 ring-1 ring-violet-500/20" : "border-white/5"}`}
              >
                <div className="flex items-center gap-1.5 overflow-hidden min-w-0">
                  <div className={`w-0.5 h-2 rounded-full shrink-0 ${color === "emerald" ? "bg-emerald-500" : "bg-violet-500"}`} />
                  <span className={`text-[9px] font-bold truncate ${item.isMandatory || item.isBookmarked ? "text-orange-500" : "text-slate-400"}`}>
                    {item.text}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggle(idx);
                  }}
                  className={`shrink-0 ${item.isMandatory || item.isBookmarked ? "text-orange-500" : "text-slate-600"}`}
                >
                  {item.isMandatory || item.isBookmarked ? <BookmarkCheck size={10} /> : <Bookmark size={10} />}
                </button>
                {!item.isMandatory && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(idx);
                    }}
                    className="text-slate-600 hover:text-rose-500 transition-colors"
                  >
                    <X size={11} />
                  </button>
                )}
                {linkingIdx === idx && (
                  <motion.div layoutId="activePointer" className="absolute -right-2 top-1/2 -translate-y-1/2 z-[110]">
                    <div className="w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-r-[6px] border-r-violet-500" />
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        ) : (
          list.map((item, idx) => (
            <div
              key={idx}
              onClick={() => {
                if (type === "inputs") {
                  setLinkingIdx(idx);
                  item.source ? setTempSource(item.source) : setTempSource({ type: "repo", value: "" });
                }
              }}
              className={`flex items-center justify-between bg-[#1a1d24] border rounded-xl p-3 w-full group transition-all cursor-pointer relative 
                ${linkingIdx === idx ? "border-violet-500 ring-1 ring-violet-500/20" : "border-white/5"}`}
            >
              <div className="flex items-center gap-2 overflow-hidden flex-1">
                <div className={`w-1 h-3 rounded-full shrink-0 ${color === "emerald" ? "bg-emerald-500" : "bg-violet-500"}`} />
                <span className={`text-[11px] font-bold truncate ${item.isMandatory || item.isBookmarked ? "text-orange-500" : "text-slate-300"}`}>
                  {item.text}
                </span>

                {activeId === "p4" &&
                  type === "outputs" &&
                  (item.text.toLowerCase().includes("code") || item.text.toLowerCase().includes("test")) && (
                    <div className="ml-auto mr-2 shrink-0">
                      <div
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-violet-500/10 border border-violet-500/20 cursor-help"
                        title={formatPath(targetCodeRepo)}
                      >
                        <HardDrive size={8} className="text-violet-400" />
                        <span className="text-[7px] text-violet-300 font-mono uppercase tracking-tighter truncate max-w-[80px]">
                          {formatPath(targetCodeRepo)}
                        </span>
                      </div>
                    </div>
                  )}

                <div className="flex items-center gap-1.5 shrink-0">
                  {type === "inputs" && !item.source && <AlertCircle size={14} className="text-rose-500 animate-pulse" />}
                  {item.source && <LinkIcon size={10} className="text-emerald-500" />}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggle(idx);
                  }}
                  className={`${item.isMandatory || item.isBookmarked ? "text-orange-500" : "text-slate-600 hover:text-orange-400"}`}
                >
                  {item.isMandatory || item.isBookmarked ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                </button>
                {!item.isMandatory && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(idx);
                    }}
                    className="text-slate-600 hover:text-rose-500"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {linkingIdx === idx && (
                <motion.div layoutId="activePointer" className="absolute -right-3 top-1/2 -translate-y-1/2 z-[110]">
                  <div className="w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[8px] border-r-violet-500" />
                </motion.div>
              )}
            </div>
          ))
        )}
      </div>

      <AnimatePresence>
        {(linkingIdx !== null || isCreatingNew) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, x: type === "outputs" ? -20 : 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.95, x: type === "outputs" ? -20 : 20 }}
            className={`absolute top-0 z-[100] w-[350px] bg-[#0c0c0e] rounded-3xl border border-violet-500/40 p-6 flex flex-col gap-4 shadow-[0_30px_60px_rgba(0,0,0,0.9)] 
              ${type === "outputs" ? "right-[0%]" : "left-[103%]"}`}
          >
            <div className="flex justify-between items-center relative z-10">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-violet-400">
                  {isExploring ? "File Explorer" : isCreatingNew ? "Configure New Element" : "Link Source"}
                </span>
                {linkingIdx !== null && (
                  <span className="text-[11px] text-white font-bold truncate max-w-[240px]">{list[linkingIdx]?.text}</span>
                )}
              </div>
              <X
                size={16}
                className="cursor-pointer text-slate-500 hover:text-white"
                onClick={() => {
                  setLinkingIdx(null);
                  setIsCreatingNew(false);
                  setIsExploring(false);
                }}
              />
            </div>

            {!isExploring ? (
              <>
                <div className="grid grid-cols-3 gap-2 relative z-10">
                  {["repo", "file", "text"].map((m) => (
                    <button
                      key={m}
                      onClick={() => setTempSource({ ...tempSource, type: m })}
                      className={`py-2 text-[8px] font-black uppercase rounded-lg border transition-all ${
                        tempSource.type === m
                          ? "bg-violet-600 border-violet-400 text-white"
                          : "bg-black border-white/5 text-slate-500"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                <div className="flex flex-col gap-2 bg-black/40 p-4 rounded-xl border border-white/5 relative z-10">
                  {tempSource.type === "repo" ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[7px] text-slate-500 uppercase truncate max-w-[150px]">
                          Base: {repoUrl || "Not Set"}
                        </span>
                        <button
                          onClick={() => {
                            setIsExploring(true);
                            fetchRepoFiles("");
                          }}
                          className="text-[8px] font-bold text-violet-400 hover:text-violet-300 underline"
                        >
                          EXPLORE REPO
                        </button>
                      </div>
                      <input
                        className="bg-black border border-white/10 rounded-lg p-2 text-[11px] text-white outline-none"
                        placeholder="Path to file..."
                        value={tempSource.value}
                        readOnly
                      />
                    </div>
                  ) : tempSource.type === "file" ? (
                    <div
                      className="flex flex-col items-center justify-center gap-3 py-6 border-2 border-white/10 rounded-xl hover:border-violet-500/40 transition-all cursor-pointer bg-black/20"
                      onClick={() => localFileInputRef.current?.click()}
                    >
                      <FileUp size={24} className="text-violet-400" />
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-bold text-white uppercase tracking-tight">
                          {tempSource.value ? tempSource.value : "Select Local File"}
                        </span>
                        <span className="text-[8px] text-slate-500 uppercase mt-1">Click to browse system</span>
                      </div>
                      <input
                        type="file"
                        ref={localFileInputRef}
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) setTempSource({ ...tempSource, value: file.name });
                        }}
                      />
                    </div>
                  ) : (
                    <textarea
                      className="h-24 bg-black border border-white/10 rounded-lg p-2 text-[11px] text-white outline-none resize-none"
                      placeholder="Enter manually..."
                      value={tempSource.value}
                      onChange={(e) => setTempSource({ ...tempSource, value: e.target.value })}
                    />
                  )}
                </div>

                {isCreatingNew && (
                  <div className="flex flex-col gap-1.5 pt-1 border-t border-white/5 relative z-10">
                    <label className="text-[8px] font-black uppercase text-slate-500 px-1">Element Label</label>
                    <input
                      autoFocus
                      value={entryValue}
                      onChange={(e) => setEntryValue(e.target.value)}
                      placeholder="e.g. BRD Document..."
                      className="bg-black border border-violet-500/30 rounded-lg p-2 text-[11px] text-white outline-none"
                    />
                  </div>
                )}

                <button
                  onClick={() => (isCreatingNew ? createWithSource() : attachSource(linkingIdx))}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase shadow-lg transition-all"
                >
                  {isCreatingNew ? "Create Element" : "Update Source"}
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-4 relative z-10">
                <button onClick={() => setIsExploring(false)} className="text-[10px] text-violet-400 text-left">
                  ← Back
                </button>
                <div className="bg-black border border-white/10 rounded-xl max-h-[250px] overflow-y-auto custom-scrollbar">
                  {loadingRepo ? (
                    <div className="p-10 text-center text-slate-500 text-[10px] animate-pulse">Connecting to GitHub...</div>
                  ) : errorMessage ? (
                    <div className="p-10 text-center text-rose-500 text-[10px] leading-relaxed">{errorMessage}</div>
                  ) : (
                    <>
                      {currentDir && (
                        <div
                          onClick={() => fetchRepoFiles(currentDir.split("/").slice(0, -1).join("/"))}
                          className="p-3 text-[10px] text-violet-400 border-b border-white/5 cursor-pointer hover:bg-white/5"
                        >
                          📁 .. (Back)
                        </div>
                      )}
                      {repoContents.map((file) => (
                        <div
                          key={file.sha}
                          onClick={() => {
                            if (file.type === "dir") fetchRepoFiles(file.path);
                            else {
                              setTempSource({ ...tempSource, value: file.path });
                              setIsExploring(false);
                            }
                          }}
                          className="p-3 text-[10px] text-slate-300 hover:bg-violet-500/20 cursor-pointer border-b border-white/5 last:border-0 flex items-center gap-2"
                        >
                          {file.type === "dir" ? "📁" : "📄"} {file.name}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
