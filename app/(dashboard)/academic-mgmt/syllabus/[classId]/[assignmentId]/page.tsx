"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus, Loader2, AlertCircle, Trash2, Edit2, CheckCircle2,
  ChevronRight, ChevronDown, BookOpen, User, Calendar,
  BarChart3, ArrowLeft, Upload, FileText, Globe, Lock, GraduationCap,
  Play, Download, Eye, History, Trash, Link2, Check, ExternalLink, X, Info
} from "lucide-react";

// Custom YouTube SVG Icon
const Youtube = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={props.className}
  >
    <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.517 3.545 12 3.545 12 3.545s-7.517 0-9.388.508a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.871.508 9.388.508 9.388.508s7.517 0 9.388-.508a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);
import { Modal } from "@/app/components/ui/modal";
import { useSyllabus, SyllabusNode, SyllabusHistoryEntry, SyllabusAttachment, SyllabusResource } from "@/app/hooks/useSyllabus";
import { useAuth } from "@/app/context/auth";
import { getAuthHeaders } from "@/lib/utils/session";

const NODE_TYPES = ["unit", "chapter", "topic", "sub_topic", "learning_outcome", "resource", "other"];

export default function SyllabusDetailsPage() {
  const router = useRouter();
  const params = useParams<{ classId: string, assignmentId: string }>();
  const classId = params?.classId || "";
  const syllabusId = params?.assignmentId || ""; // represents syllabus _id or assignmentId fallback

  const { user } = useAuth();
  const isAdmin = user?.role === "school_admin" || user?.role === "super_admin";
  const isTeacher = user?.role === "teacher";
  const isStudentOrParent = user?.role === "student" || user?.role === "parent";
  const isWritable = isAdmin || isTeacher;

  const {
    syllabus,
    isLoading,
    error,
    getSyllabusDetails,
    updateSyllabus,
    restoreVersion
  } = useSyllabus();

  const [activeSyllabus, setActiveSyllabus] = useState<any>(null);

  // Tree UI expand/collapse states
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  // Tree manipulation modal states
  const [isNodeModalOpen, setIsNodeModalOpen] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [editingNode, setEditingNode] = useState<SyllabusNode | null>(null);
  const [nodeTitle, setNodeTitle] = useState("");
  const [nodeDescription, setNodeDescription] = useState("");
  const [nodeType, setNodeType] = useState<SyllabusNode["type"]>("chapter");
  
  // Custom resources inside node modal
  const [nodeResources, setNodeResources] = useState<SyllabusResource[]>([]);
  const [resTitle, setResTitle] = useState("");
  const [resType, setResType] = useState<SyllabusResource["type"]>("link");
  const [resUrl, setResUrl] = useState("");

  // Syllabus attachments & reference links states
  const [isMetaModalOpen, setIsMetaModalOpen] = useState(false);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDesc, setMetaDesc] = useState("");
  const [metaVisibility, setMetaVisibility] = useState<"Public" | "Internal" | "Restricted">("Public");
  
  // Attachments form
  const [attachments, setAttachments] = useState<SyllabusAttachment[]>([]);
  const [attachFilename, setAttachFilename] = useState("");
  const [attachUrl, setAttachUrl] = useState("");
  
  // Reference links
  const [refLinks, setRefLinks] = useState<string[]>([]);
  const [refLinkInput, setRefLinkInput] = useState("");

  // Version history states
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<SyllabusHistoryEntry | null>(null);
  const [isHistoryViewOpen, setIsHistoryViewOpen] = useState(false);
  const [restoreRemarks, setRestoreRemarks] = useState("");

  // Form submitting states
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setErrorMsg("");
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setSuccessMsg("");
    setTimeout(() => setErrorMsg(""), 5000);
  };

  const loadDetails = useCallback(async () => {
    if (syllabusId) {
      const details = await getSyllabusDetails(syllabusId);
      if (details) {
        setActiveSyllabus(details);
        setAttachments(details.attachments || []);
        setRefLinks(details.reference_links || []);
        // Expand top level units by default
        const initialExpand: Record<string, boolean> = {};
        (details.nodes || []).forEach((n: any) => {
          initialExpand[n.id] = true;
        });
        setExpandedNodes(initialExpand);
      }
    }
  }, [syllabusId, getSyllabusDetails]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  // Expand / collapse helper
  const toggleNode = (id: string) => {
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Helper to recursive find and add/edit/delete tree nodes
  const addNodeToTree = (nodes: SyllabusNode[], parentId: string, newNode: SyllabusNode): boolean => {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].id === parentId) {
        if (!nodes[i].children) nodes[i].children = [];
        nodes[i].children!.push(newNode);
        return true;
      }
      if (nodes[i].children && nodes[i].children!.length > 0) {
        const found = addNodeToTree(nodes[i].children!, parentId, newNode);
        if (found) return true;
      }
    }
    return false;
  };

  const updateNodeInTree = (nodes: SyllabusNode[], nodeId: string, updatedNode: Partial<SyllabusNode>): boolean => {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].id === nodeId) {
        nodes[i] = { ...nodes[i], ...updatedNode };
        return true;
      }
      if (nodes[i].children && nodes[i].children!.length > 0) {
        const found = updateNodeInTree(nodes[i].children!, nodeId, updatedNode);
        if (found) return true;
      }
    }
    return false;
  };

  const deleteNodeFromTree = (nodes: SyllabusNode[], nodeId: string): boolean => {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].id === nodeId) {
        nodes.splice(i, 1);
        return true;
      }
      if (nodes[i].children && nodes[i].children!.length > 0) {
        const found = deleteNodeFromTree(nodes[i].children!, nodeId);
        if (found) return true;
      }
    }
    return false;
  };

  // Node form operations
  const handleOpenAddNode = (parentId: string | null) => {
    setSelectedParentId(parentId);
    setEditingNode(null);
    setNodeTitle("");
    setNodeDescription("");
    setNodeType(parentId ? "chapter" : "unit");
    setNodeResources([]);
    setIsNodeModalOpen(true);
  };

  const handleOpenEditNode = (node: SyllabusNode) => {
    setSelectedParentId(null);
    setEditingNode(node);
    setNodeTitle(node.title);
    setNodeDescription(node.description || "");
    setNodeType(node.type);
    setNodeResources(node.resources || []);
    setIsNodeModalOpen(true);
  };

  const handleAddResource = () => {
    if (!resTitle || !resUrl) return;
    setNodeResources(prev => [...prev, { title: resTitle, type: resType, url: resUrl }]);
    setResTitle("");
    setResUrl("");
  };

  const handleRemoveResource = (index: number) => {
    setNodeResources(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nodeTitle) return;
    setSubmitting(true);

    const treeCopy = JSON.parse(JSON.stringify(activeSyllabus.nodes || []));

    if (editingNode) {
      // Edit mode
      updateNodeInTree(treeCopy, editingNode.id, {
        title: nodeTitle,
        description: nodeDescription,
        type: nodeType,
        resources: nodeResources
      });
    } else {
      // Add Mode
      const newNode: SyllabusNode = {
        id: "node_" + Math.random().toString(36).substr(2, 9),
        title: nodeTitle,
        description: nodeDescription,
        type: nodeType,
        children: [],
        resources: nodeResources
      };

      if (selectedParentId) {
        addNodeToTree(treeCopy, selectedParentId, newNode);
        // Automatically expand parent node
        setExpandedNodes(prev => ({ ...prev, [selectedParentId]: true }));
      } else {
        treeCopy.push(newNode);
      }
    }

    const res = await updateSyllabus(activeSyllabus._id, { nodes: treeCopy });
    setSubmitting(false);

    if (res.success) {
      setIsNodeModalOpen(false);
      showSuccess("Curriculum tree node saved successfully.");
      loadDetails();
    } else {
      showError(res.message || "Failed to update curriculum structure.");
    }
  };

  const handleDeleteNode = async (nodeId: string) => {
    if (!confirm("Are you sure you want to delete this topic and all its subtopics?")) return;
    setSubmitting(true);
    const treeCopy = JSON.parse(JSON.stringify(activeSyllabus.nodes || []));
    deleteNodeFromTree(treeCopy, nodeId);

    const res = await updateSyllabus(activeSyllabus._id, { nodes: treeCopy });
    setSubmitting(false);

    if (res.success) {
      showSuccess("Node deleted successfully.");
      loadDetails();
    } else {
      showError(res.message || "Failed to delete tree node.");
    }
  };

  // Attachment adding
  const handleAddAttachment = () => {
    if (!attachFilename || !attachUrl) return;
    setAttachments(prev => [...prev, { filename: attachFilename, file_url: attachUrl }]);
    setAttachFilename("");
    setAttachUrl("");
  };

  // Reference Links adding
  const handleAddRefLink = () => {
    if (!refLinkInput.trim()) return;
    setRefLinks(prev => [...prev, refLinkInput.trim()]);
    setRefLinkInput("");
  };

  // Metadata properties save
  const handleOpenMetaEdit = () => {
    setMetaTitle(activeSyllabus.title);
    setMetaDesc(activeSyllabus.description || "");
    setMetaVisibility(activeSyllabus.visibility);
    setIsMetaModalOpen(true);
  };

  const handleSaveMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      title: metaTitle,
      description: metaDesc,
      visibility: metaVisibility,
      attachments,
      reference_links: refLinks
    };

    const res = await updateSyllabus(activeSyllabus._id, payload);
    setSubmitting(false);

    if (res.success) {
      setIsMetaModalOpen(false);
      showSuccess("Curriculum settings updated successfully.");
      loadDetails();
    } else {
      showError(res.message || "Failed to update settings.");
    }
  };

  const handleRestoreVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHistory) return;
    setSubmitting(true);

    const res = await restoreVersion(activeSyllabus._id, selectedHistory.version, restoreRemarks);
    setSubmitting(false);

    if (res.success) {
      setIsHistoryViewOpen(false);
      setIsHistoryOpen(false);
      setSelectedHistory(null);
      setRestoreRemarks("");
      showSuccess(`Successfully restored curriculum to version ${selectedHistory.version}`);
      loadDetails();
    } else {
      showError(res.message || "Failed to restore version snapshot.");
    }
  };

  // Recursive tree renderer
  const renderTreeNode = (node: SyllabusNode, level: number) => {
    const isExpanded = !!expandedNodes[node.id];
    const hasChildren = node.children && node.children.length > 0;
    const resources = node.resources || [];

    // Badge styling mapping
    const typeBadge = {
      unit: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400 border-indigo-200/50",
      chapter: "bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-405 border-blue-200/50",
      topic: "bg-teal-50 text-teal-700 dark:bg-teal-950/20 dark:text-teal-400 border-teal-200/50",
      sub_topic: "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border-amber-200/50",
      learning_outcome: "bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400 border-purple-200/50",
      resource: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-200/50",
      other: "bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200/50"
    }[node.type] || "bg-slate-50 text-slate-600";

    return (
      <div key={node.id} className="space-y-1 mt-1 text-left font-normal animate-in fade-in duration-200">
        <div 
          className={`flex items-start md:items-center justify-between p-3 border border-border rounded-xl transition-all duration-200 ${
            node.type === "unit" ? "bg-slate-50/50 dark:bg-slate-900/60 font-bold border-l-4 border-l-indigo-500 shadow-sm" :
            node.type === "chapter" ? "bg-slate-50/20 dark:bg-slate-900/30 font-semibold border-l-4 border-l-blue-400" :
            "bg-white dark:bg-slate-950/40"
          }`}
          style={{ marginLeft: `${level * 16}px` }}
        >
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            <button 
              onClick={() => toggleNode(node.id)}
              disabled={!hasChildren}
              className={`p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors shrink-0 ${!hasChildren ? "opacity-0 cursor-default" : "cursor-pointer"}`}
            >
              {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
            </button>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-2 py-0.5 border rounded text-[10px] uppercase font-bold tracking-wider shrink-0 ${typeBadge}`}>
                  {node.type.replace("_", " ")}
                </span>
                <span className="text-[14px] text-slate-900 dark:text-white leading-snug">{node.title}</span>
              </div>
              {node.description && (
                <p className="text-xs text-slate-450 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">{node.description}</p>
              )}

              {/* Node specific links/resources */}
              {resources.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {resources.map((res, rIdx) => (
                    <a 
                      key={rIdx}
                      href={res.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] bg-slate-100/60 dark:bg-slate-800 hover:text-primary transition-colors text-slate-550 dark:text-slate-350"
                    >
                      {res.type === "youtube" ? <Youtube className="w-3.5 h-3.5 text-red-500" /> :
                       res.type === "drive" ? <Play className="w-3.5 h-3.5 text-emerald-500" /> :
                       <Link2 className="w-3.5 h-3.5" />}
                      <span className="max-w-[120px] truncate">{res.title}</span>
                      <ExternalLink className="w-3 h-3 opacity-60" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action triggers */}
          {isWritable && (
            <div className="flex items-center gap-1.5 ml-3 shrink-0">
              <button 
                onClick={() => handleOpenAddNode(node.id)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer"
                title="Add Subsection"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button 
                onClick={() => handleOpenEditNode(node)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer"
                title="Edit Topic"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button 
                onClick={() => handleDeleteNode(node.id)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                title="Delete"
              >
                <Trash className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Children Render */}
        {hasChildren && isExpanded && (
          <div className="space-y-1">
            {node.children!.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading || !activeSyllabus) {
    return (
      <div className="flex flex-col items-center justify-center py-60 gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="font-semibold text-sm animate-pulse">Loading curriculum mapping...</p>
      </div>
    );
  }

  const subjectName = activeSyllabus.subject_master_id?.name || "Subject";
  const classLabel = `${activeSyllabus.class_id?.name || "Class"} ${activeSyllabus.section_id?.name ? `(${activeSyllabus.section_id.name})` : ""}`;
  const teacherName = activeSyllabus.teacher_id?.name || "Not Assigned";
  const isPublished = activeSyllabus.status === "Published";

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6 text-left">
      {/* Header and Breadcrumbs */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <Link href={`/academic-mgmt/syllabus/${classId}`} className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors animate-in fade-in">
              <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </Link>
            Curriculum Planner
          </h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-2 font-normal">
            <Link href="/academic-mgmt/syllabus" className="hover:text-primary transition-colors">Syllabus</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href={`/academic-mgmt/syllabus/${classId}`} className="hover:text-primary transition-colors">
              {classLabel}
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-900 dark:text-white font-medium">{subjectName}</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* History / Versions button */}
          <button
            onClick={() => setIsHistoryOpen(true)}
            className="btn btn-outline flex items-center gap-2"
          >
            <History className="w-4 h-4 text-slate-400" /> Version History (v{activeSyllabus.version})
          </button>
          
          {isWritable && (
            <button
              onClick={handleOpenMetaEdit}
              className="btn btn-primary"
            >
              Curriculum Settings
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Left Side: Tree Structure */}
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow overflow-hidden">
            {/* Header info */}
            <div className="p-5 border-b border-border bg-slate-50/50 dark:bg-slate-800/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-left">
              <div>
                <h3 className="font-bold text-[16px] text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{activeSyllabus.title}</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                    isPublished ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 border-emerald-250" : "bg-slate-50 text-slate-600 dark:bg-slate-800 border-border"
                  }`}>
                    {activeSyllabus.status}
                  </span>
                </h3>
                {activeSyllabus.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-405 mt-1 font-medium">{activeSyllabus.description}</p>
                )}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                  <span className="flex items-center gap-1.5"><GraduationCap className="w-4 h-4 text-slate-400" /> Class: <span className="text-slate-700 dark:text-slate-300">{classLabel}</span></span>
                  <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4 text-slate-400" /> Subject: <span className="text-slate-700 dark:text-slate-300">{subjectName} ({activeSyllabus.subject_master_id?.subject_code || "—"})</span></span>
                  <span className="flex items-center gap-1.5"><User className="w-4 h-4 text-slate-400" /> Faculty: <span className="text-slate-700 dark:text-slate-300">{teacherName}</span></span>
                </div>
              </div>

              {isWritable && (
                <button
                  onClick={() => handleOpenAddNode(null)}
                  className="px-4 py-2 border border-primary text-primary hover:bg-primary/5 text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Root Unit
                </button>
              )}
            </div>

            {/* Tree hierarchy container */}
            <div className="p-6">
              {activeSyllabus.nodes && activeSyllabus.nodes.length > 0 ? (
                <div className="space-y-2 border-l border-slate-100 dark:border-slate-800/80 pl-2">
                  {activeSyllabus.nodes.map((node: any) => renderTreeNode(node, 0))}
                </div>
              ) : (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400 text-center max-w-sm mx-auto">
                  <BookOpen className="w-12 h-12 opacity-20 mb-3" />
                  <h4 className="font-bold text-slate-700 dark:text-slate-300">Empty Curriculum Structure</h4>
                  <p className="text-xs text-slate-500 mt-1">Syllabus segments have not been defined yet. You can create units, chapters, topics, subtopics, and resources recursively.</p>
                  {isWritable && (
                    <button 
                      onClick={() => handleOpenAddNode(null)} 
                      className="mt-4 px-4 py-2 text-xs font-bold bg-primary text-white rounded-lg cursor-pointer"
                    >
                      Create First Unit
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Attachments and Reference Links */}
        <div className="space-y-6">
          {/* Metadata Card */}
          <div className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow p-5 text-left font-medium space-y-4">
            <h3 className="text-[14px] font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-border pb-3">
              <Info className="w-4 h-4 text-primary" /> General Reference Details
            </h3>

            {/* Visibility / Status indicators */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-855 rounded-xl border border-border">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Visibility</span>
                <span className="font-bold mt-1 inline-flex items-center gap-1.5">
                  {activeSyllabus.visibility === "Public" ? <Globe className="w-3.5 h-3.5 text-emerald-500" /> : <Lock className="w-3.5 h-3.5 text-amber-500" />}
                  {activeSyllabus.visibility || "Public"}
                </span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-855 rounded-xl border border-border">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Curriculum Version</span>
                <span className="font-bold text-slate-800 dark:text-slate-205 mt-1 block">v{activeSyllabus.version}</span>
              </div>
            </div>

            {/* Reference Links list */}
            <div className="space-y-2 border-t border-border pt-3">
              <h4 className="text-[12px] font-bold text-slate-450 uppercase tracking-wider">Reference Web Links</h4>
              {refLinks.length > 0 ? (
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                  {refLinks.map((link, idx) => (
                    <a 
                      key={idx}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-50/50 dark:bg-slate-855 hover:text-primary transition-colors text-[13px] font-semibold text-slate-650 dark:text-slate-350"
                    >
                      <span className="truncate max-w-[200px]">{link}</span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-60" />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No reference links configured.</p>
              )}
            </div>

            {/* Attachments Section */}
            <div className="space-y-2 border-t border-border pt-3">
              <h4 className="text-[12px] font-bold text-slate-450 uppercase tracking-wider">Course Attachments</h4>
              {attachments.length > 0 ? (
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                  {attachments.map((file, idx) => (
                    <div 
                      key={idx}
                      className="p-3 border border-border rounded-xl bg-white dark:bg-slate-950/60 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[140px]">{file.filename}</p>
                          <span className="text-[10px] text-slate-400 block font-mono mt-0.5">Mime: {file.mime_type || "document"}</span>
                        </div>
                      </div>
                      <a 
                        href={file.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-primary transition-colors cursor-pointer"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No attached materials.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Node Add/Edit Modal */}
      <Modal isOpen={isNodeModalOpen} onClose={() => setIsNodeModalOpen(false)} title={editingNode ? "Edit Topic Structure" : "Add Subsection node"}>
        <form onSubmit={handleSaveNode} className="space-y-4 text-left font-normal">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-3 flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-205">Title <span className="text-red-500">*</span></label>
              <input 
                type="text"
                required
                value={nodeTitle}
                onChange={(e) => setNodeTitle(e.target.value)}
                placeholder="e.g. Unit 1: Introduction to Mechanics"
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] bg-white dark:bg-slate-900 text-foreground outline-none focus:border-primary/50"
              />
            </div>
            
            <div className="md:col-span-1 flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-205">Level Type <span className="text-red-500">*</span></label>
              <select
                value={nodeType}
                onChange={(e) => setNodeType(e.target.value as any)}
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] bg-white dark:bg-slate-900 text-foreground outline-none focus:border-primary/50"
              >
                {NODE_TYPES.map(type => <option key={type} value={type}>{type.replace("_", " ")}</option>)}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-205">Topic Description / Objectives</label>
            <textarea
              rows={2}
              value={nodeDescription}
              onChange={(e) => setNodeDescription(e.target.value)}
              placeholder="Provide context, references or learning requirements for this node..."
              className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] bg-white dark:bg-slate-900 text-foreground outline-none"
            />
          </div>

          {/* Inner Node Links / Resources */}
          <div className="p-4 bg-slate-50 dark:bg-slate-855 rounded-xl border border-border space-y-3">
            <h4 className="text-[12px] font-bold text-slate-450 uppercase tracking-wider">Node Resources (YouTube, Google Drive, Links)</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <div className="md:col-span-1 flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-slate-400 uppercase">Type</label>
                <select
                  value={resType}
                  onChange={(e) => setResType(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 border border-border rounded-lg text-xs bg-white dark:bg-slate-900 text-foreground outline-none"
                >
                  <option value="link">Web Link</option>
                  <option value="youtube">YouTube</option>
                  <option value="drive">Google Drive</option>
                  <option value="file">File URL</option>
                </select>
              </div>

              <div className="md:col-span-1 flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-slate-400 uppercase">Name</label>
                <input 
                  type="text"
                  value={resTitle}
                  onChange={(e) => setResTitle(e.target.value)}
                  placeholder="Link Title"
                  className="w-full px-2.5 py-1.5 border border-border rounded-lg text-xs bg-white dark:bg-slate-900 text-foreground outline-none"
                />
              </div>

              <div className="md:col-span-1.5 flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-slate-400 uppercase">URL</label>
                <input 
                  type="text"
                  value={resUrl}
                  onChange={(e) => setResUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-2.5 py-1.5 border border-border rounded-lg text-xs bg-white dark:bg-slate-900 text-foreground outline-none"
                />
              </div>

              <div className="md:col-span-0.5">
                <button
                  type="button"
                  onClick={handleAddResource}
                  className="w-full py-1.5 bg-primary text-white text-xs font-bold rounded-lg cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
            </div>

            {/* List added Resources */}
            {nodeResources.length > 0 && (
              <div className="divide-y divide-border border-t border-border pt-2 text-xs">
                {nodeResources.map((res, idx) => (
                  <div key={idx} className="py-2 flex items-center justify-between">
                    <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      {res.type === "youtube" ? <Youtube className="w-4 h-4 text-red-500" /> : <Link2 className="w-4 h-4 text-slate-400" />}
                      {res.title}
                    </span>
                    <button 
                      type="button"
                      onClick={() => handleRemoveResource(idx)}
                      className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 p-1 rounded cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
            <button 
              type="button" 
              onClick={() => setIsNodeModalOpen(false)}
              className="px-5 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-[13px] font-bold rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={submitting}
              className="px-5 py-2.5 bg-primary hover:bg-[var(--primary-hover)] text-[13px] font-bold rounded-lg text-white shadow-sm flex items-center gap-2 cursor-pointer"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Node
            </button>
          </div>
        </form>
      </Modal>

      {/* Curriculum Settings Modal */}
      <Modal isOpen={isMetaModalOpen} onClose={() => setIsMetaModalOpen(false)} title="Update Curriculum Settings">
        <form onSubmit={handleSaveMeta} className="space-y-4 text-left font-normal max-h-[500px] overflow-y-auto pr-1">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-205">Title <span className="text-red-500">*</span></label>
            <input 
              type="text"
              required
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] bg-white dark:bg-slate-900 text-foreground outline-none focus:border-primary/50"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-205">Syllabus Description</label>
            <textarea
              rows={2}
              value={metaDesc}
              onChange={(e) => setMetaDesc(e.target.value)}
              className="w-full px-3.5 py-2 border border-border rounded-lg text-[13px] bg-white dark:bg-slate-900 text-foreground outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-205">Visibility</label>
            <select
              value={metaVisibility}
              onChange={(e) => setMetaVisibility(e.target.value as any)}
              className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] bg-white dark:bg-slate-900 text-foreground outline-none"
            >
              <option value="Public">Public (Students & Parents)</option>
              <option value="Internal">Internal (Teachers Only)</option>
              <option value="Restricted">Restricted</option>
            </select>
          </div>

          {/* Reference links configuration */}
          <div className="p-4 bg-slate-50 dark:bg-slate-855 rounded-xl border border-border space-y-3 text-xs">
            <h4 className="text-[12px] font-bold text-slate-450 uppercase tracking-wider">Configure Web References</h4>
            
            <div className="flex items-center gap-2">
              <input 
                type="text"
                value={refLinkInput}
                onChange={(e) => setRefLinkInput(e.target.value)}
                placeholder="https://google.com"
                className="flex-1 px-3 py-2 border border-border rounded-lg outline-none bg-white dark:bg-slate-900 text-foreground"
              />
              <button 
                type="button"
                onClick={handleAddRefLink}
                className="px-3.5 py-2 bg-primary text-white font-bold rounded-lg cursor-pointer"
              >
                Add Link
              </button>
            </div>

            {refLinks.length > 0 && (
              <div className="divide-y divide-border border-t border-border pt-2 max-h-[120px] overflow-y-auto">
                {refLinks.map((link, idx) => (
                  <div key={idx} className="py-2 flex items-center justify-between">
                    <span className="truncate max-w-[200px] font-semibold text-slate-700 dark:text-slate-300">{link}</span>
                    <button 
                      type="button"
                      onClick={() => setRefLinks(prev => prev.filter((_, i) => i !== idx))}
                      className="text-rose-500 p-1 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Attachments Upload */}
          <div className="p-4 bg-slate-50 dark:bg-slate-855 rounded-xl border border-border space-y-3 text-xs">
            <h4 className="text-[12px] font-bold text-slate-450 uppercase tracking-wider">Syllabus PDF / PowerPoint Materials</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Material Name</label>
                <input 
                  type="text"
                  value={attachFilename}
                  onChange={(e) => setAttachFilename(e.target.value)}
                  placeholder="Semester Homework PDF"
                  className="w-full px-2.5 py-1.5 border border-border rounded-lg outline-none bg-white dark:bg-slate-900 text-foreground"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Link URL</label>
                <input 
                  type="text"
                  value={attachUrl}
                  onChange={(e) => setAttachUrl(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full px-2.5 py-1.5 border border-border rounded-lg outline-none bg-white dark:bg-slate-900 text-foreground"
                />
              </div>

              <button
                type="button"
                onClick={handleAddAttachment}
                className="py-1.5 bg-primary text-white font-bold rounded-lg cursor-pointer"
              >
                Add Document
              </button>
            </div>

            {attachments.length > 0 && (
              <div className="divide-y divide-border border-t border-border pt-2 max-h-[120px] overflow-y-auto">
                {attachments.map((file, idx) => (
                  <div key={idx} className="py-2 flex items-center justify-between">
                    <span className="font-bold text-slate-700 dark:text-slate-350">{file.filename}</span>
                    <button 
                      type="button"
                      onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                      className="text-rose-500 p-1 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
            <button 
              type="button" 
              onClick={() => setIsMetaModalOpen(false)}
              className="px-5 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-[13px] font-bold rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={submitting}
              className="px-5 py-2.5 bg-primary hover:bg-[var(--primary-hover)] text-[13px] font-bold rounded-lg text-white shadow-sm flex items-center gap-2 cursor-pointer"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Settings
            </button>
          </div>
        </form>
      </Modal>

      {/* Version History Drawer Modal */}
      <Modal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} title="Restore Previous Syllabus versions" size="lg">
        <div className="space-y-4 text-left font-normal max-h-[500px] overflow-y-auto pr-1">
          <p className="text-xs text-slate-500 dark:text-slate-405 leading-relaxed font-semibold">
            Every update to settings or topics creates a historical snapshot. You can preview or restore any of the listed versions below:
          </p>

          <div className="space-y-3.5 divide-y divide-border/60">
            {activeSyllabus.history && activeSyllabus.history.length > 0 ? (
              activeSyllabus.history.map((entry: any, index: number) => (
                <div key={index} className="flex items-center justify-between pt-3 text-xs font-semibold">
                  <div className="text-left space-y-1">
                    <p className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="font-mono bg-slate-150 dark:bg-slate-855 px-2 py-0.5 rounded text-[11px]">Version {entry.version}</span>
                      {entry.title}
                    </p>
                    <p className="text-slate-450">{entry.remarks || "No comments written"}</p>
                    <p className="text-[10px] text-slate-400 font-bold">Snapshotted on {new Date(entry.updated_at).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setSelectedHistory(entry);
                        setIsHistoryViewOpen(true);
                      }}
                      className="px-3 py-1.5 border border-border rounded-lg text-[11px] font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Preview Tree
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-10 text-center text-slate-400 italic">No historical snapshots saved for this document.</div>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t border-border/50">
            <button 
              type="button" 
              onClick={() => setIsHistoryOpen(false)}
              className="px-5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-[13px] font-bold rounded-lg cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* Historical Tree Preview Modal */}
      <Modal isOpen={isHistoryViewOpen} onClose={() => { setIsHistoryViewOpen(false); setSelectedHistory(null); }} title={`Preview Snapshot: Version ${selectedHistory?.version}`} size="lg">
        <form onSubmit={handleRestoreVersion} className="space-y-4 text-left font-normal max-h-[500px] overflow-y-auto pr-1">
          <div className="p-4 bg-amber-500/10 border border-amber-300/40 rounded-xl flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-xs text-amber-800 dark:text-amber-400">Snapshot Mode</p>
              <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">You are previewing Version {selectedHistory?.version}. Restoring this snapshot will save your current structure and copy these nodes back.</p>
            </div>
          </div>

          {/* Historical Tree Nodes list */}
          <div className="p-4 border border-border rounded-xl max-h-[220px] overflow-y-auto divide-y divide-border">
            {selectedHistory?.nodes && selectedHistory.nodes.length > 0 ? (
              selectedHistory.nodes.map((node, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-700 dark:text-slate-300">[{node.type.toUpperCase()}] {node.title}</span>
                    {node.description && <p className="text-slate-450 truncate max-w-sm">{node.description}</p>}
                  </div>
                  <span className="text-[10px] text-slate-400">{node.children?.length || 0} subtopics</span>
                </div>
              ))
            ) : (
              <p className="text-xs italic text-slate-400 text-center py-6">Empty tree structure in this version.</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5 pt-2">
            <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-205">Rollback remarks / reason <span className="text-red-500">*</span></label>
            <input 
              type="text"
              required
              value={restoreRemarks}
              onChange={(e) => setRestoreRemarks(e.target.value)}
              placeholder="e.g. Reverting due to curriculum modifications revision"
              className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] bg-white dark:bg-slate-900 outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
            <button 
              type="button" 
              onClick={() => { setIsHistoryViewOpen(false); setSelectedHistory(null); }}
              className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-[13px] font-bold rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-[13px] font-bold rounded-lg shadow-sm flex items-center gap-2 cursor-pointer"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Restore This version
            </button>
          </div>
        </form>
      </Modal>

      {/* Toast Feedbacks */}
      {successMsg && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-600 text-white shadow-lg animate-in slide-in-from-bottom-5 duration-300">
          <CheckCircle2 className="w-4 h-4 shrink-0 stroke-[3]" />
          <span className="text-[13px] font-semibold">{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-rose-600 text-white shadow-lg animate-in slide-in-from-bottom-5 duration-300">
          <AlertCircle className="w-4 h-4 shrink-0 stroke-[3]" />
          <span className="text-[13px] font-semibold">{errorMsg}</span>
        </div>
      )}
    </div>
  );
}
