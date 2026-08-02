import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  useReactFlow,
  ReactFlowProvider,
} from "reactflow";
import "reactflow/dist/style.css";
import "./StoryTreePage.css";

import EndingCollection from "../../../components/EndingCollection/EndingCollection";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

// Shared pink accent — keep in sync with --pink in BookshelfPage.css / HistoryPage.css
const PINK = "#F526A2";

// Tree layout constants (used both for laying out nodes and for centering the viewport on one)
const LEVEL_GAP_X = 480;
const LEVEL_GAP_Y = 320;
const NODE_START_X = 60;
const NODE_START_Y = 220;
// Offset from a node's top-left position to its visual center, used when calling setCenter()
const NODE_CENTER_OFFSET = { x: 140, y: 60 };

const NODE_STATUS = {
  VISITED: "visited",
  CURRENT: "current",
  LOCKED: "locked",
  ENDING_UNLOCKED: "ending_unlocked",
  ENDING_LOCKED: "ending_locked",
};

const formatDate = (dateStr) => {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return null;
  }
};

const stripHtml = (text) => {
  if (!text || typeof text !== "string") return "";
  return text.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
};

const StoryNode = ({ data }) => {
  const currentStatus = data.computedStatus || NODE_STATUS.LOCKED;
  const sceneType = data.type || "normal";
  
  const isLocked = !data.isAdmin && (currentStatus === NODE_STATUS.LOCKED || currentStatus === NODE_STATUS.ENDING_LOCKED);

  const getPrefix = () => {
    if (sceneType === "start") return "▶ ";
    if (isLocked) return "🔒 ";
    if (sceneType === "ending") return "🏆 ";
    return "📖 ";
  };

  let rawTitle = stripHtml(data.title || data.scene_name || data.name || data.label || data.chapter_name || "เนื้อเรื่อง");
  if (rawTitle === "เนื้อเรื่องยังไม่เปิดเผย" && data.isAdmin) {
    rawTitle = stripHtml(data.chapter_title || data.chapterName || `ฉากที่ ${data.id}`);
  }
  const sceneTitle = rawTitle;

  let rawDesc = stripHtml(data.summary || data.description || data.short_content || data.content_summary || data.content || "อ่านต่อเพื่อค้นหาความลับในฉากนี้...");
  if (rawDesc.includes("ผ่านเงื่อนไขในฉากก่อนหน้า") && data.isAdmin) {
    rawDesc = "รายละเอียดฉากเนื้อเรื่อง";
  }
  const sceneDescription = rawDesc;

  const chapterLabel = data.chapter_title || data.ChapterTitle || data.chapterName || data.chapter_name;
  const chapterEpisode = data.chapter_episode || data.chapterEpisode || data.episode || data.chapter_order || data.chapterOrder;

  const footerLabel = sceneType === "start"
    ? "จุดเริ่มต้น"
    : chapterEpisode
      ? `ตอนที่ ${chapterEpisode}`
      : chapterLabel || "";

  const nodeStatusClass = `story-node--${currentStatus}`;
  const highlightedClass = data.isHighlightedPath ? "story-node--highlighted" : "";

  // React Flow only wires up click/hover on the node wrapper it renders around this component,
  // so keyboard activation has to bubble up to that wrapper's own click handler.
  const handleKeyDown = (event) => {
    if (isLocked) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.currentTarget.closest(".react-flow__node")?.click();
    }
  };

  return (
    <>
      <Handle type="target" position={Position.Left} isConnectable={false} className="stp-handle" />

      <div
        className={`story-node ${nodeStatusClass} ${highlightedClass}`}
        tabIndex={isLocked ? -1 : 0}
        role="button"
        aria-label={isLocked ? "ฉากที่ยังไม่ปลดล็อก" : sceneTitle}
        aria-disabled={isLocked}
        onKeyDown={handleKeyDown}
      >
        <div>
          <div className="story-node__label">
            {getPrefix()}
            {isLocked ? "เนื้อเรื่องยังไม่เปิดเผย" : sceneTitle}
          </div>

          <div className="story-node__desc">
            {isLocked ? "ผ่านเงื่อนไขในฉากก่อนหน้าเพื่อปลดล็อกแผนผังการอ่านทางเลือกนี้" : sceneDescription}
          </div>
        </div>

        <div className="story-node__footer">
          <div className="story-node__chapter">
            {footerLabel}
          </div>
          
          {sceneType === "start" && (
            <div className="story-node__badge">เริ่มต้น</div>
          )}
          {sceneType === "ending" && !isLocked && (
            <div className="story-node__badge">ฉากจบ</div>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Right} isConnectable={false} className="stp-handle" />
    </>
  );
};

const nodeTypes = {
  storyNode: StoryNode,
};

// Shared page shell so guest/loading/error/main states don't each redeclare the same wrapper —
// this also means loading/error now consistently get the page background instead of sitting bare.
const StoryTreeShell = ({ children }) => (
  <div className="stp">
    <div className="stp__container">{children}</div>
  </div>
);

const StoryTreeInner = ({ activeNovelId, effectiveUserId, onNavigate }) => {
  const reactFlowInstance = useReactFlow();
  const location = useLocation();
  const navigate = useNavigate();

  const checkIsAdmin = () => {
    try {
      const userJson = localStorage.getItem("user");
      if (userJson) {
        const u = JSON.parse(userJson);
        const r = (u?.role || u?.user_role || u?.role_name || "").toString().toLowerCase();
        if (r === "admin" || u?.is_admin === true || u?.isAdmin === true) return true;
      }
    } catch {}
    try {
      const token = localStorage.getItem("token");
      if (token) {
        const parts = token.split(".");
        if (parts.length === 3) {
          let payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
          while (payload.length % 4) payload += "=";
          const decoded = atob(payload);
          const json = decodeURIComponent(decoded.split("").map((c) => `%${("00" + c.charCodeAt(0).toString(16)).slice(-2)}`).join(""));
          const parsed = JSON.parse(json);
          const r = (parsed?.role || parsed?.user_role || "").toString().toLowerCase();
          if (r === "admin" || parsed?.is_admin === true || parsed?.isAdmin === true) return true;
        }
      }
    } catch {}
    return false;
  };

  const isAdmin = checkIsAdmin();

  const highlightSceneId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("highlight_scene") || params.get("highlightScene");
  }, [location.search]);

  const [treeData, setTreeData] = useState(null);
  const [novelDetail, setNovelDetail] = useState(null);
  const [endings, setEndings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEndingModal, setShowEndingModal] = useState(false);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [restartLoading, setRestartLoading] = useState(false);
  const [restartError, setRestartError] = useState(null);

  const [hoveredNode, setHoveredNode] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const hoverTimerRef = useRef(null);
  const isTouchDeviceRef = useRef(
    typeof window !== "undefined" &&
      ("ontouchstart" in window || navigator.maxTouchPoints > 0)
  );

  const loadAllData = async () => {
    if (!activeNovelId || activeNovelId === "undefined") {
      setError("ไม่พบรหัสนิยายเพื่อโหลดแผนผังการอ่าน");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const headers = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const query = (effectiveUserId > 0 && !isAdmin) ? `?user_id=${effectiveUserId}` : "";

      try {
        const novelRes = await fetch(`${BASE_URL}/novels/${activeNovelId}${query}`, { headers });
        if (novelRes.ok) {
          const novelJson = await novelRes.json();
          const payloadData = novelJson?.data || novelJson || {};
          setNovelDetail(payloadData?.novel || payloadData);
          
          if (Array.isArray(payloadData?.endings)) {
            setEndings(payloadData.endings);
          }
        }
      } catch (e) {
        console.warn("ดึงข้อมูลนิยายหลักไม่สำเร็จ:", e);
      }

      const response = await fetch(`${BASE_URL}/novels/${activeNovelId}/story-tree${query}`, { headers });
      if (!response.ok) {
        throw new Error("ไม่สามารถเรียกดูแผนผังนิยายกิ่งไม้จากฐานข้อมูลได้");
      }

      const resData = await response.json();
      const actualTreeData = resData.data || resData;
      if (actualTreeData) {
        setTreeData(actualTreeData);
      } else {
        throw new Error("รูปแบบ JSON ของผังต้นไม้ที่ระบบส่งมาไม่ถูกต้อง");
      }
    } catch (err) {
      console.error("StoryTree Fetch Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [activeNovelId, effectiveUserId]);

  const { computedNodes, computedEdges, autoStats } = useMemo(() => {
    if (!treeData || !treeData.nodes) return { computedNodes: [], computedEdges: [], autoStats: null };

    const rawNodes = treeData.nodes || [];
    const rawEdges = treeData.edges || [];

    const endingsList = treeData.endings || treeData.ending_list || [];
    const unlockedEndingsMap = {};
    endingsList.forEach(e => {
      if (e.is_unlocked) {
        unlockedEndingsMap[String(e.scene_id || e.id)] = e;
      }
    });

    const publishedNodes = rawNodes.filter(n => n.is_published !== false && n.status !== "draft");
    
    const startCandidate = publishedNodes.find(n => n.type === "start") || publishedNodes[0];
    const startCandidateId = startCandidate ? String(startCandidate.id) : null;
    const reachableNodeIds = new Set();
    
    if (startCandidateId) {
      const queue = [startCandidateId];
      reachableNodeIds.add(startCandidateId);
      
      while (queue.length > 0) {
        const currId = queue.shift();
        const outgoingEdges = rawEdges.filter(e => String(e.from_id || e.from) === currId);
        
        outgoingEdges.forEach(e => {
          const toId = String(e.to_id || e.to);
          if (!reachableNodeIds.has(toId) && publishedNodes.some(n => String(n.id) === toId)) {
            reachableNodeIds.add(toId);
            queue.push(toId);
          }
        });
      }
    }

    const connectedRawNodes = publishedNodes.filter(n => reachableNodeIds.has(String(n.id)));
    const connectedNodeIds = new Set(connectedRawNodes.map(n => String(n.id)));

    const filteredEdges = rawEdges.filter(e => {
      const from = String(e.from_id || e.from);
      const to = String(e.to_id || e.to);
      return connectedNodeIds.has(from) && connectedNodeIds.has(to);
    });

    const startNodeIdStr = startCandidateId;
    const currentSceneIdStr = treeData.current_scene_id ? String(treeData.current_scene_id) : null;
    const hasBackendCurrent = connectedRawNodes.some(n => n.is_current === true);

    const parentMap = {};
    const adjList = {};
    const inDegree = {};
    
    connectedRawNodes.forEach(n => { adjList[n.id] = []; inDegree[n.id] = 0; });
    
    filteredEdges.forEach(e => {
      const from = String(e.from_id || e.from);
      const to = String(e.to_id || e.to);
      if (!parentMap[to]) parentMap[to] = [];
      parentMap[to].push(from);
      if (adjList[from] && inDegree[to] !== undefined) { 
        adjList[from].push(to); 
        inDegree[to]++; 
      }
    });

    const levels = {};
    const queue = [];
    connectedRawNodes.forEach(n => { if (inDegree[n.id] === 0 || n.type === "start") { levels[n.id] = 0; queue.push(n.id); } });
    while (queue.length > 0) {
      const curr = queue.shift();
      const currLevel = levels[curr] || 0;
      (adjList[curr] || []).forEach(child => { if (levels[child] === undefined) { levels[child] = currLevel + 1; queue.push(child); } });
    }

    const levelCounts = {};
    connectedRawNodes.forEach(n => { const lv = levels[n.id] || 0; levelCounts[lv] = (levelCounts[lv] || 0) + 1; });
    const levelCurrentTracker = {};

    const highlightId = highlightSceneId ? String(highlightSceneId) : null;
    const highlightPathNodes = new Set();
    const highlightPathEdges = new Set();
    if (highlightId) {
      let currentId = highlightId;
      highlightPathNodes.add(currentId);
      while (currentId) {
        const parents = parentMap[currentId] || [];
        if (!parents.length) break;
        const parentId = String(parents[0]);
        highlightPathNodes.add(parentId);
        const edge = filteredEdges.find((edgeNode) => {
          const fromId = String(edgeNode.from_id || edgeNode.from);
          const toId = String(edgeNode.to_id || edgeNode.to);
          return fromId === parentId && toId === currentId;
        });
        if (edge) highlightPathEdges.add(String(edge.id || `e-${parentId}-${currentId}`));
        currentId = parentId;
      }
    }

    const mappedNodes = connectedRawNodes.map((node) => {
      const nodeIdStr = String(node.id);
      const lv = levels[node.id] || 0;
      if (levelCurrentTracker[lv] === undefined) levelCurrentTracker[lv] = 0;

      const branchIndex = levelCurrentTracker[lv];
      levelCurrentTracker[lv]++;
      const xPosition = lv * LEVEL_GAP_X;
      const totalInLevel = levelCounts[lv] || 1;
      const yPosition = (branchIndex - (totalInLevel - 1) / 2) * LEVEL_GAP_Y;

      const isCurrentNode = node.is_current || (currentSceneIdStr ? nodeIdStr === currentSceneIdStr : (!hasBackendCurrent && nodeIdStr === startNodeIdStr));
      const isHighlight = highlightPathNodes.has(nodeIdStr);

      const endingData = unlockedEndingsMap[nodeIdStr];
      const isNodeUnlocked = node.is_unlocked || node.is_visited || !!endingData;
      
      const finalVisitedDate = endingData?.unlocked_at || 
                               endingData?.reached_at || 
                               endingData?.discovered_at || 
                               node.visited_at || 
                               node.read_at || 
                               node.unlocked_at;

      let computedStatus = NODE_STATUS.LOCKED;

      if (isAdmin) {
        if (node.type === "start") {
          computedStatus = isCurrentNode ? NODE_STATUS.CURRENT : NODE_STATUS.VISITED;
        } else if (node.type === "ending") {
          computedStatus = isCurrentNode ? NODE_STATUS.CURRENT : NODE_STATUS.ENDING_UNLOCKED;
        } else {
          computedStatus = isCurrentNode ? NODE_STATUS.CURRENT : NODE_STATUS.VISITED;
        }
      } else if (node.type === "start") {
        computedStatus = isCurrentNode ? NODE_STATUS.CURRENT : NODE_STATUS.VISITED;
      } else if (node.type === "ending") {
        if (isCurrentNode) {
          computedStatus = NODE_STATUS.CURRENT;
        } else {
          computedStatus = isNodeUnlocked ? NODE_STATUS.ENDING_UNLOCKED : NODE_STATUS.ENDING_LOCKED;
        }
      } else {
        if (isCurrentNode) {
          computedStatus = NODE_STATUS.CURRENT;
        } else if (isNodeUnlocked) {
          computedStatus = NODE_STATUS.VISITED;
        } else {
          computedStatus = NODE_STATUS.LOCKED;
        }
      }

      return {
        id: nodeIdStr,
        type: "storyNode",
        position: { x: xPosition + NODE_START_X, y: yPosition + NODE_START_Y },
        data: { ...node, computedStatus, isHighlightedPath: isHighlight, finalVisitedDate, isAdmin },
      };
    });

    const mappedEdges = filteredEdges.map((edge, idx) => {
      const fromId = String(edge.from_id || edge.from);
      const toId = String(edge.to_id || edge.to);
      const sourceNodeMapped = mappedNodes.find(n => n.id === fromId);
      const targetNodeMapped = mappedNodes.find(n => n.id === toId);

      const isSourceVisited = sourceNodeMapped?.data?.computedStatus === NODE_STATUS.VISITED || sourceNodeMapped?.data?.computedStatus === NODE_STATUS.CURRENT;
      const isTargetVisited = targetNodeMapped?.data?.computedStatus === NODE_STATUS.VISITED || targetNodeMapped?.data?.computedStatus === NODE_STATUS.CURRENT || targetNodeMapped?.data?.computedStatus === NODE_STATUS.ENDING_UNLOCKED;

      const isWalkedPath = isSourceVisited && isTargetVisited;
      const edgeId = String(edge.id || `e-${fromId}-${toId}-${idx}`);
      const isHighlightedEdge = highlightPathEdges.has(edgeId);

      return {
        id: edgeId,
        source: fromId,
        target: toId,
        animated: isHighlightedEdge || isWalkedPath,
        label: edge.label || edge.choice_text || edge.text || "",
        labelStyle: { fill: "#4a5568", fontWeight: 500, fontSize: 11 },
        labelBgPadding: [4, 4],
        labelBgRadius: 4,
        labelBgStyle: { fill: "#ffffff", fillOpacity: 0.95, stroke: "#cbd5e1", strokeWidth: 1 },
        labelBgBorderRadius: 4,
        style: {
          stroke: isHighlightedEdge || isWalkedPath ? PINK : "#CBD5E1",
          strokeWidth: isHighlightedEdge || isWalkedPath ? 3 : 2,
          pointerEvents: "none",
        },
        type: "smoothstep",
      };
    });

    // 🟢 แก้ไขตรงนี้: เพิ่ม ENDING_UNLOCKED เข้าไปในฉากที่ค้นพบแล้ว
    const visitedScenesCount = mappedNodes.filter(
      (n) =>
        n.data.computedStatus === NODE_STATUS.VISITED ||
        n.data.computedStatus === NODE_STATUS.CURRENT ||
        n.data.computedStatus === NODE_STATUS.ENDING_UNLOCKED
    ).length;

    const discoveredChoicesCount = mappedEdges.filter((edge) => {
      const targetNode = mappedNodes.find((n) => n.id === edge.target);
      return (
        targetNode &&
        (targetNode.data.computedStatus === NODE_STATUS.VISITED ||
          targetNode.data.computedStatus === NODE_STATUS.CURRENT ||
          targetNode.data.computedStatus === NODE_STATUS.ENDING_UNLOCKED)
      );
    }).length;

    const unlockedEndingsCount = mappedNodes.filter(
      (n) => n.data.computedStatus === NODE_STATUS.ENDING_UNLOCKED
    ).length;

    return {
      computedNodes: mappedNodes,
      computedEdges: mappedEdges,
      autoStats: {
        visitedScenes: visitedScenesCount,
        discoveredChoices: discoveredChoicesCount,
        unlockedEndings: unlockedEndingsCount,
      },
    };
  }, [treeData, highlightSceneId, isAdmin]);

  const endingsForModal = useMemo(() => {
    if (endings && endings.length > 0) {
      return endings;
    }

    const rawList = treeData?.endings || treeData?.ending_list || [];
    return rawList.map((item) => ({
      ...item,
      id: item.id || item.ending_id,
      scene_id: item.scene_id || item.sceneId || item.id,
      title: item.title || item.ending_title || item.name || "ฉากจบ",
      description: stripHtml(item.description || item.ending_description || item.summary || item.content || ""),
      type: item.type || item.ending_type || "ending",
      is_unlocked: item.is_unlocked ?? item.unlocked ?? true,
    }));
  }, [endings, treeData]);

  const handleFocusCurrent = useCallback(() => {
    const currentNode = computedNodes.find(n => n.data?.computedStatus === NODE_STATUS.CURRENT);
    if (currentNode && reactFlowInstance) {
      reactFlowInstance.setCenter(
        currentNode.position.x + NODE_CENTER_OFFSET.x,
        currentNode.position.y + NODE_CENTER_OFFSET.y,
        { zoom: 1.1, duration: 800 }
      );
    }
  }, [computedNodes, reactFlowInstance]);

  const handleOpenEndingModal = () => setShowEndingModal(true);

  const handleGoToDetail = () => {
    if (onNavigate) {
      onNavigate("novel-detail", { novelId: activeNovelId });
    } else {
      navigate(`/novels/${activeNovelId}`);
    }
  };

  const handleRestartConfirmOpen = () => {
    setRestartError(null);
    setShowRestartConfirm(true);
  };

  const handleRestartConfirmClose = () => {
    setRestartError(null);
    setShowRestartConfirm(false);
    setRestartLoading(false);
  };

  const handleRestart = async () => {
    if (!activeNovelId) return;
    const token = localStorage.getItem("token");
    if (!token) {
      setRestartError("กรุณาเข้าสู่ระบบก่อนเริ่มอ่านใหม่");
      return;
    }

    setRestartLoading(true);
    setRestartError(null);

    try {
      const response = await fetch(`${BASE_URL}/novels/${activeNovelId}/restart`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || `${response.status} ${response.statusText}`);
      }

      const startSceneId = payload?.data?.start_scene_id || payload?.data?.StartSceneID || payload?.start_scene_id;
      setShowRestartConfirm(false);
      if (onNavigate) {
        onNavigate("reading", { novelId: activeNovelId, sceneId: startSceneId });
      } else {
        navigate(`/read/${activeNovelId}${startSceneId ? `?sceneId=${startSceneId}` : ""}`);
      }
    } catch (err) {
      setRestartError(err.message || "ไม่สามารถเริ่มอ่านใหม่ได้ในขณะนี้");
    } finally {
      setRestartLoading(false);
    }
  };

  const handleNodeClick = async (event, node) => {
    const targetNode = node.data ? node : { data: node };
    const currentStatus = targetNode.data?.computedStatus;
    const clickable = isAdmin || currentStatus === NODE_STATUS.CURRENT ||
      currentStatus === NODE_STATUS.VISITED ||
      currentStatus === NODE_STATUS.ENDING_UNLOCKED;

    if (!clickable) return;

    // Touch devices have no hover, so onNodeMouseEnter never fires there. The first tap on a
    // node reveals the tooltip instead (title/episode/discovered date); tapping the node again,
    // or the "อ่านอีกครั้ง" button inside the tooltip, proceeds to reading.
    if (isTouchDeviceRef.current && hoveredNode?.id !== targetNode.id) {
      if (event?.currentTarget) {
        const rect = event.currentTarget.getBoundingClientRect();
        setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top - 12 });
      }
      setHoveredNode(targetNode);
      return;
    }

    const targetSceneId = targetNode.data?.id || targetNode.id;

    try {
      const token = localStorage.getItem("token");
      if (token) {
        await fetch(`${BASE_URL}/history/progress`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            novel_id: Number(activeNovelId),
            scene_id: Number(targetSceneId),
          }),
        });
      }
    } catch (err) {
      console.error("เกิด Error ตอนอัปเดตความคืบหน้า:", err);
    }

    if (onNavigate) {
      onNavigate("reading", { novelId: activeNovelId, initialSceneId: targetSceneId });
    } else {
      navigate(`/reading/${activeNovelId}/${targetSceneId}`);
    }
  };

  const handleNodeMouseEnter = (event, node) => {
    if (isTouchDeviceRef.current) return; // handled by tap-to-show in handleNodeClick instead
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    const status = node.data?.computedStatus;
    
    if (!isAdmin && (status === NODE_STATUS.LOCKED || status === NODE_STATUS.ENDING_LOCKED)) return;

    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top - 12 });
    setHoveredNode(node);
  };

  const handleNodeMouseLeave = () => {
    hoverTimerRef.current = setTimeout(() => setHoveredNode(null), 250);
  };

  const handleTooltipMouseEnter = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
  };
  const handleTooltipMouseLeave = () => setHoveredNode(null);

  if (!effectiveUserId) {
    return (
      <StoryTreeShell>
        <div className="stp__actions">
          <button className="stp__back" onClick={handleGoToDetail}>← กลับรายละเอียด</button>
          {!isAdmin && (
            <button className="stp__restart-btn" type="button" onClick={handleRestartConfirmOpen}>↻ เริ่มอ่านใหม่</button>
          )}
        </div>
        <div className="stp__header">
          <h1 className="stp__title">แผนผังการอ่าน<span className="stp__title-sep"> — </span><span className="stp__title-novel">{treeData?.novel_title || `นิยาย ${activeNovelId}`}</span></h1>
          <p className="stp__subtitle">สำรวจทางเลือกที่คุณเคยเดินผ่านมา</p>
        </div>
        <div className="stp__main">
          <div className="stp__flow-wrapper stp__placeholder-wrapper">
            <div className="stp__placeholder-card">
              <span className="stp__placeholder-tag">ล็อกอินก่อน</span>
              <h2 className="stp__placeholder-title">ล็อกอินเพื่อดูสตอรี่แมพทั้งหมด</h2>
              <p className="stp__placeholder-text">ระบบจะแสดงผังโครงสร้างหน้าให้เห็นชัดเจน แต่การเปิดโหนดและสถานะต่าง ๆ จะต้องเข้าสู่ระบบก่อน</p>
              <button className="stp__placeholder-button" onClick={() => onNavigate ? onNavigate("login") : navigate("/login")}>ไปที่หน้าเข้าสู่ระบบ</button>
            </div>
          </div>
        </div>
      </StoryTreeShell>
    );
  }

  if (loading) {
    return (
      <StoryTreeShell>
        <div className="stp__loading-state">
          <div className="stp__spinner" />
          <p>กำลังเตรียมข้อมูลแผนผังการอ่าน...</p>
        </div>
      </StoryTreeShell>
    );
  }

  if (error) {
    return (
      <StoryTreeShell>
        <div className="stp__error-state">
          <h3>💥 โหลดผังโครงสร้างไม่สำเร็จ</h3>
          <p>{error}</p>
          <button type="button" className="stp__retry-btn" onClick={loadAllData}>
            ↻ ลองใหม่อีกครั้ง
          </button>
        </div>
      </StoryTreeShell>
    );
  }

  const finalTitle = novelDetail?.title || treeData?.novel_title || "ผังโครงสร้างเนื้อเรื่อง";
  const stats = autoStats || { visitedScenes: 0, discoveredChoices: 0, unlockedEndings: 0 };
  const formattedVisitedDate = formatDate(hoveredNode?.data?.finalVisitedDate);

  return (
    <StoryTreeShell>
        <div className="stp__actions">
          <div className="stp__actions-group">
            <button className="stp__back" onClick={handleGoToDetail}>← กลับรายละเอียด</button>
          </div>
          <div className="stp__actions-group">
            <button className="stp__focus-btn" type="button" onClick={handleFocusCurrent}>🎯 โฟกัสจุดปัจจุบัน</button>
            {stats.unlockedEndings > 0 && (
              <button className="stp__ending-btn" type="button" onClick={handleOpenEndingModal}>🏆 ดูคลังฉากจบ</button>
            )}
            {!isAdmin && (
              <button className="stp__restart-btn" type="button" onClick={handleRestartConfirmOpen}>↻ เริ่มอ่านใหม่</button>
            )}
          </div>
        </div>

        <div className="stp__header">
          <h1 className="stp__title">แผนผังการอ่าน<span className="stp__title-sep">{" "}—{" "}</span><span className="stp__title-novel">{finalTitle}</span></h1>
          <p className="stp__subtitle">สำรวจทางเลือกที่คุณเคยเดินผ่านมา</p>
        </div>

        <div className="stp__main">
          <div className="stp__survey-stats">
            <div className="stp__survey-card pink">
              <div className="stp__survey-icon">📖</div>
              <div className="stp__survey-content"><span className="stp__survey-title">ฉากที่ค้นพบ</span><div className="stp__survey-number"><span>{stats.visitedScenes}</span></div></div>
            </div>
            <div className="stp__survey-card green">
              <div className="stp__survey-icon">🧩</div>
              <div className="stp__survey-content"><span className="stp__survey-title">ทางเลือกที่ค้นพบ</span><div className="stp__survey-number"><span>{stats.discoveredChoices}</span></div></div>
            </div>
            <div className="stp__survey-card yellow">
              <div className="stp__survey-icon">🏁</div>
              <div className="stp__survey-content"><span className="stp__survey-title">ฉากจบ</span><div className="stp__survey-number"><span>{stats.unlockedEndings}</span></div></div>
            </div>
          </div>

          <div className="stp__flow-wrapper">
            <div className="stp__legend-floating">
              {[
                { color: PINK, label: "จุดปัจจุบัน" },
                { color: "#4CAF82", label: "ค้นพบแล้ว" },
                { color: "#C8C3D4", label: "ยังไม่ค้นพบ" },
                { color: "#F7C940", label: "ฉากจบ" },
              ].map(item => (
                <div key={item.label} className="stp__legend-floating-item">
                  <span className="stp__legend-floating-dot" style={{ background: item.color }} />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>

            {computedNodes.length > 0 ? (
              <ReactFlow
                nodes={computedNodes}
                edges={computedEdges}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                zoomOnScroll
                panOnDrag
                nodesDraggable
                nodesConnectable={false}
                elementsSelectable={false}
                onNodeClick={handleNodeClick}
                onNodeMouseEnter={handleNodeMouseEnter}
                onNodeMouseLeave={handleNodeMouseLeave}
                proOptions={{ hideAttribution: true }}
              >
                <Background gap={24} size={1} color="#e2e8f0" />
                <Controls />
                <MiniMap
                  nodeColor={(node) => {
                    const status = node.data?.computedStatus;
                    if (status === NODE_STATUS.CURRENT) return PINK;
                    if (status === NODE_STATUS.VISITED) return "#4CAF82";
                    if (status === NODE_STATUS.ENDING_UNLOCKED) return "#F7C940";
                    return "#cbd5e1";
                  }}
                  maskColor="rgba(248, 249, 250, 0.7)"
                />
              </ReactFlow>
            ) : (
              <div className="stp__empty-state">
                <span className="stp__empty-icon">🍁</span>
                <p className="stp__empty-title">นิยายเรื่องนี้ยังไม่มีการเพิ่มตอนหรือฉากเนื้อเรื่องที่เผยแพร่</p>
                <p className="stp__empty-sub">โปรดติดตามชมแผนผังการอ่านอีกครั้งเมื่อนักเขียนเริ่มลงเนื้อหา</p>
              </div>
            )}

            {hoveredNode && (
              <div
                className="stp__hover-tooltip"
                style={{ top: tooltipPos.y, left: tooltipPos.x }}
                onMouseEnter={handleTooltipMouseEnter}
                onMouseLeave={handleTooltipMouseLeave}
              >
                <div className="stp__hover-title">{hoveredNode.data?.chapter_title || hoveredNode.data?.title || "ฉากเนื้อเรื่อง"}</div>
                <div className="stp__hover-episode">{hoveredNode.data?.chapter_episode ? `ตอนที่ ${hoveredNode.data.chapter_episode}` : hoveredNode.data?.chapter_name || ""}</div>
                
                {formattedVisitedDate && <div className="stp__hover-date">ค้นพบเมื่อ {formattedVisitedDate}</div>}
                
                <button
                  type="button"
                  className="stp__hover-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNodeClick(null, hoveredNode);
                    setHoveredNode(null);
                  }}
                >
                  อ่านอีกครั้ง
                </button>
              </div>
            )}
          </div>
        </div>

        <EndingCollection
          isOpen={showEndingModal}
          endings={endingsForModal}
          onClose={() => setShowEndingModal(false)}
          onViewStoryMap={(sceneId) => {
            setShowEndingModal(false);
            if (sceneId && reactFlowInstance) {
              const targetNode = computedNodes.find(n => String(n.id) === String(sceneId));
              if (targetNode) {
                reactFlowInstance.setCenter(
                  targetNode.position.x + NODE_CENTER_OFFSET.x,
                  targetNode.position.y + NODE_CENTER_OFFSET.y,
                  { zoom: 1.1, duration: 800 }
                );
              }
            }
          }}
        />

        {showRestartConfirm && (
          <div className="stp__modal-overlay">
            <div className="stp__modal-card">
              <h3 className="stp__modal-title">เริ่มอ่านใหม่</h3>
              <p className="stp__modal-desc">การเริ่มอ่านใหม่นี้จะคืนสถานะความคืบหน้าและผังเรื่องกลับไปยังจุดเริ่มต้น แต่จะยังเก็บตอนจบที่คุณค้นพบไว้</p>
              {restartError && <div className="stp__modal-error">{restartError}</div>}
              <div className="stp__modal-actions">
                <button type="button" className="stp__modal-cancel" onClick={handleRestartConfirmClose}>ยกเลิก</button>
                <button type="button" className="stp__modal-confirm" onClick={handleRestart} disabled={restartLoading}>
                  {restartLoading ? "กำลังเริ่มใหม่..." : "ยืนยันเริ่มอ่านใหม่"}
                </button>
              </div>
            </div>
          </div>
        )}
    </StoryTreeShell>
  );
};

const StoryTreePage = (props) => {
  const { novelId: urlNovelId } = useParams();
  const activeNovelId = props.novelId || urlNovelId;

  const getCurrentUserId = () => {
    const userJson = localStorage.getItem("user");
    if (!userJson) return 0;
    try {
      const user = JSON.parse(userJson);
      return user?.id || user?.user_id || 0;
    } catch {
      return 0;
    }
  };

  const effectiveUserId = getCurrentUserId() || props.userId || 0;

  return (
    <ReactFlowProvider>
      <StoryTreeInner {...props} activeNovelId={activeNovelId} effectiveUserId={effectiveUserId} />
    </ReactFlowProvider>
  );
};

export default StoryTreePage;