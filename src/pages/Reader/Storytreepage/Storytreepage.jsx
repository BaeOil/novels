import React, { useMemo, useState, useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import "./StoryTreePage.css";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const NODE_STATUS = {
  VISITED: "visited",
  CURRENT: "current",
  LOCKED: "locked",
  ENDING_UNLOCKED: "ending_unlocked",
  ENDING_LOCKED: "ending_locked",
};

const STATUS_STYLE = {
  [NODE_STATUS.VISITED]: { stroke: "#4CAF82", fill: "#F0FBF5", text: "#2E7A55" },
  [NODE_STATUS.CURRENT]: { stroke: "#E91E8C", fill: "#FFF0F5", text: "#E91E8C" },
  [NODE_STATUS.LOCKED]: { stroke: "#C8C3D4", fill: "#F9F9FB", text: "#9E9589" },
  [NODE_STATUS.ENDING_UNLOCKED]: { stroke: "#F7C940", fill: "#FFFDE7", text: "#8B6D00" },
  [NODE_STATUS.ENDING_LOCKED]: { stroke: "#C8C3D4", fill: "#F9F9FB", text: "#9E9589" },
};

const StoryNode = ({ data }) => {
  const currentStatus = data.computedStatus || NODE_STATUS.LOCKED;
  const style = STATUS_STYLE[currentStatus] || STATUS_STYLE[NODE_STATUS.LOCKED];

  const sceneType = data.type || "normal";
  const isLocked = currentStatus === NODE_STATUS.LOCKED || currentStatus === NODE_STATUS.ENDING_LOCKED;

  const stripHtml = (text) => {
    if (!text || typeof text !== "string") return "";
    return text.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  };

  const getPrefix = () => {
    if (sceneType === "start") return "▶ ";
    if (isLocked) return "🔒 ";
    if (sceneType === "ending") return "🏆 ";
    return "📖 ";
  };

  const sceneTitle = stripHtml(data.title || data.scene_name || data.name || data.label || data.chapter_name || `ฉากที่ ${data.id}`);
  const sceneDescription = stripHtml(data.summary || data.description || data.short_content || data.content_summary || data.content || data.Content || data.content_html || data.html_content || "อ่านต่อเพื่อค้นหาความลับในฉากนี้...");

  const chapterLabel = data.chapter_title || data.ChapterTitle || data.chapterName || data.chapter_name;
  const chapterEpisode = data.chapter_episode || data.chapterEpisode || data.episode || data.chapter_order || data.chapterOrder;
  const sceneNumber = data.scene_number || data.sceneNumber || data.order || data.scene_order || data.id;

  const footerLabel = sceneType === "start"
    ? "จุดเริ่มต้น"
    : sceneType === "ending"
      ? "ฉากจบ"
      : chapterEpisode
        ? `ตอนที่ ${chapterEpisode}`
        : chapterLabel
          ? chapterLabel
          : `ฉากที่ ${sceneNumber}`;

  return (
    <>
      <Handle type="target" position={Position.Left} isConnectable={false} style={{ opacity: 0, pointerEvents: 'none' }} />

      <div
        className={`story-node ${currentStatus === NODE_STATUS.CURRENT ? "story-node--current" : ""} ${data.isHighlightedPath ? "story-node--highlighted" : ""}`}
        style={{
          borderColor: style.stroke,
          background: style.fill,
          color: style.text,
          padding: "14px",
          width: "280px",
          minHeight: "120px",
          borderRadius: "10px",
          boxShadow: data.isHighlightedPath ? "0 0 20px rgba(233, 30, 140, 0.25)" : "0 5px 10px -2px rgba(0, 0, 0, 0.08)",
          borderWidth: "2px",
          borderStyle: "solid",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between"
        }}
      >
        <div>
          <div className="story-node__label" style={{ fontWeight: "700", fontSize: "13px", marginBottom: "8px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", textOverflow: "ellipsis" }}>
            {getPrefix()}
            {isLocked ? "เนื้อเรื่องยังไม่เปิดเผย" : sceneTitle}
          </div>

          <div className="story-node__desc" style={{ fontSize: "11px", color: isLocked ? "#a0aec0" : "#4a5568", lineHeight: "1.5", minHeight: "40px", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {isLocked ? "ผ่านเงื่อนไขในฉากก่อนหน้าเพื่อปลดล็อกแผนผังการอ่านทางเลือกนี้" : sceneDescription}
          </div>
        </div>

        <div style={{ marginTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
          <div className="story-node__chapter" style={{ fontSize: "11px", opacity: 0.75, wordBreak: "break-word", flex: 1 }}>
            {footerLabel}
          </div>
          <div style={{ fontSize: "10px", padding: "4px 8px", borderRadius: "999px", background: "rgba(233, 30, 99, 0.12)", color: "#c2185b", whiteSpace: "nowrap" }}>
            {sceneType === "start" ? "เริ่มต้น" : sceneType === "ending" ? "ฉากจบ" : `ฉากที่ ${sceneNumber}`}
          </div>
        </div>
      </div>

      <Handle type="source" position={Position.Right} isConnectable={false} style={{ opacity: 0, pointerEvents: 'none' }} />
    </>
  );
};

// 🔒 ย้ายออกมาไว้นอก Component ตามคำแนะนำใน Console เพื่อแก้ Warning สีเหลืองข้อแรกตัวบนสุดครับ
const nodeTypes = {
  storyNode: StoryNode,
};

const StoryTreePage = ({ novelId: propNovelId, userId = 0, onNavigate }) => {
  const { novelId: urlNovelId } = useParams();
  const activeNovelId = propNovelId || urlNovelId;
  const location = useLocation();
  const highlightSceneId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("highlight_scene") || params.get("highlightScene");
  }, [location.search]);

  const getCurrentUserId = () => {
    const userJson = localStorage.getItem("user");
    if (!userJson) return 0;
    try {
      const user = JSON.parse(userJson);
      return user?.id || user?.user_id || 0;
    } catch (err) {
      console.error("Failed to parse user from localStorage:", err);
      return 0;
    }
  };

  const effectiveUserId = getCurrentUserId() || userId;

  const [treeData, setTreeData] = useState(null);
  const [novelDetail, setNovelDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [restartLoading, setRestartLoading] = useState(false);
  const [restartError, setRestartError] = useState(null);

  const loadAllData = async () => {
    if (!activeNovelId || activeNovelId === "undefined") {
      setError("ไม่พบรหัสนิยายเพื่อโหลดแผนผังการอ่าน");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      try {
        const novelRes = await fetch(`${BASE_URL}/novels/${activeNovelId}`);
        if (novelRes.ok) {
          const novelJson = await novelRes.json();
          setNovelDetail(novelJson?.data?.novel || novelJson?.data || novelJson);
        }
      } catch (e) {
        console.warn("ดึงข้อมูลนิยายหลักไม่สำเร็จ:", e);
      }

      const query = effectiveUserId > 0 ? `?user_id=${effectiveUserId}` : "";
      const response = await fetch(`${BASE_URL}/novels/${activeNovelId}/story-tree${query}`);
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

    const rawNodes = treeData.nodes;
    const rawEdges = treeData.edges || [];

    const uniqueRawNodes = (() => {
      const seen = new Set();
      return rawNodes.filter((node) => {
        const id = String(node.id);
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
      });
    })();

    // Filter nodes/edges to only those that are connected (appear in any edge as source or target)
    const connectedNodeIds = new Set();
    rawEdges.forEach(e => {
      const from = String(e.from_id || e.from);
      const to = String(e.to_id || e.to);
      if (from) connectedNodeIds.add(from);
      if (to) connectedNodeIds.add(to);
    });

    // Ensure the start node is always included even if it has no edges
    const startCandidate = uniqueRawNodes.find(n => n.type === "start") || uniqueRawNodes[0] || rawNodes[0];
    const startCandidateId = startCandidate ? String(startCandidate.id) : null;
    const connectedRawNodes = uniqueRawNodes.filter(n => connectedNodeIds.has(String(n.id)) || (startCandidateId && String(n.id) === startCandidateId));
    const filteredEdges = rawEdges.filter(e => {
      const from = String(e.from_id || e.from);
      const to = String(e.to_id || e.to);
      return connectedNodeIds.has(from) && connectedNodeIds.has(to);
    });

    const startNode = connectedRawNodes.find(n => n.type === "start") || connectedRawNodes[0] || uniqueRawNodes.find(n => n.type === "start") || uniqueRawNodes[0] || rawNodes[0];
    const startNodeIdStr = startNode ? String(startNode.id) : null;
    const currentSceneIdStr = treeData.current_scene_id ? String(treeData.current_scene_id) : null;
    const hasBackendCurrent = uniqueRawNodes.some(n => n.is_current === true);

    const parentMap = {};
    filteredEdges.forEach(e => {
      const from = String(e.from_id || e.from);
      const to = String(e.to_id || e.to);
      if (!parentMap[to]) parentMap[to] = [];
      parentMap[to].push(from);
    });

    const adjList = {};
    const inDegree = {};
    // Build adjacency only for connected nodes/edges
    connectedRawNodes.forEach(n => { adjList[n.id] = []; inDegree[n.id] = 0; });
    filteredEdges.forEach(e => {
      const from = String(e.from_id || e.from);
      const to = String(e.to_id || e.to);
      if (adjList[from] && inDegree[to] !== undefined) { adjList[from].push(to); inDegree[to]++; }
    });
    const levels = {}; const queue = [];
    connectedRawNodes.forEach(n => { if (inDegree[n.id] === 0 || n.type === "start") { levels[n.id] = 0; queue.push(n.id); } });
    while (queue.length > 0) {
      const curr = queue.shift(); const currLevel = levels[curr] || 0;
      (adjList[curr] || []).forEach(child => { if (levels[child] === undefined) { levels[child] = currLevel + 1; queue.push(child); } });
    }
    const levelCounts = {};
    connectedRawNodes.forEach(n => { const lv = levels[n.id] || 0; levelCounts[lv] = (levelCounts[lv] || 0) + 1; });
    const levelCurrentTracker = {};

    const activeNodeIds = new Set();
    connectedRawNodes.forEach(n => {
      if (n.type === "start" || n.is_current || n.is_unlocked) {
        activeNodeIds.add(String(n.id));
      }
    });

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
        const edge = rawEdges.find((edgeNode) => {
          const fromId = String(edgeNode.from_id || edgeNode.from);
          const toId = String(edgeNode.to_id || edgeNode.to);
          return fromId === parentId && toId === currentId;
        });
        if (edge) {
          highlightPathEdges.add(String(edge.id || `e-${parentId}-${currentId}`));
        }
        currentId = parentId;
      }
    }

    const mappedNodes = connectedRawNodes.map((node) => {
      const nodeIdStr = String(node.id);
      const lv = levels[node.id] || 0;
      if (levelCurrentTracker[lv] === undefined) levelCurrentTracker[lv] = 0;

      const branchIndex = levelCurrentTracker[lv];
      levelCurrentTracker[lv]++;
      const xPosition = lv * 480;
      const totalInLevel = levelCounts[lv] || 1;
      const yPosition = (branchIndex - (totalInLevel - 1) / 2) * 320;

      let computedStatus = NODE_STATUS.LOCKED;
      const parents = parentMap[nodeIdStr] || [];
      const isAnyParentActive = parents.some(pId => activeNodeIds.has(pId));

      const isCurrentNode = node.is_current || (currentSceneIdStr ? nodeIdStr === currentSceneIdStr : (!hasBackendCurrent && nodeIdStr === startNodeIdStr));
      const isHighlight = highlightPathNodes.has(nodeIdStr);

      if (node.type === "start") {
        computedStatus = isCurrentNode ? NODE_STATUS.CURRENT : NODE_STATUS.VISITED;
      } else if (node.type === "ending") {
        // 🔧 เช็ค isCurrentNode สำหรับ ending node ด้วย
        if (isCurrentNode) {
          computedStatus = NODE_STATUS.CURRENT;
        } else {
          computedStatus = node.is_unlocked ? NODE_STATUS.ENDING_UNLOCKED : NODE_STATUS.ENDING_LOCKED;
        }
      } else {
        if (isCurrentNode) {
          computedStatus = NODE_STATUS.CURRENT;
        } else if (node.is_unlocked) {
          computedStatus = NODE_STATUS.VISITED;
        } else {
          computedStatus = NODE_STATUS.LOCKED;
        }
      }

      return {
        id: nodeIdStr,
        type: "storyNode",
        position: { x: xPosition + 60, y: yPosition + 220 },
        data: { ...node, computedStatus, isHighlightedPath: isHighlight },
      };
    });

    const mappedEdges = filteredEdges.map((edge, idx) => {
      const fromId = String(edge.from_id || edge.from);
      const toId = String(edge.to_id || edge.to);
      const sourceNodeMapped = mappedNodes.find(n => n.id === fromId);

      const isSourceActive = sourceNodeMapped?.data?.computedStatus === NODE_STATUS.CURRENT ||
        sourceNodeMapped?.data?.computedStatus === NODE_STATUS.VISITED;

      const edgeId = String(edge.id || `e-${fromId}-${toId}-${idx}`);
      const isHighlightedEdge = highlightPathEdges.has(edgeId);
      return {
        id: edgeId,
        source: fromId,
        target: toId,
        animated: isHighlightedEdge || isSourceActive,
        label: edge.label || edge.choice_text || edge.text || "???",
        labelStyle: { fill: "#4a5568", fontWeight: 500, fontSize: 11 },
        labelBgPadding: [4, 4],
        labelBgRadius: 4,
        labelBgStyle: { fill: "#ffffff", fillOpacity: 1, stroke: "#cbd5e1", strokeWidth: 1 },
        labelBgBorderRadius: 4,
        style: {
          stroke: isHighlightedEdge ? "#E91E8C" : isSourceActive ? "#4CAF82" : "#D0CCD7",
          strokeWidth: isHighlightedEdge ? 4 : 2,
          filter: isHighlightedEdge ? "drop-shadow(0 0 12px rgba(233, 30, 140, 0.25))" : "",
        },
        type: "smoothstep",
      };
    });

    const visitedScenesCount = mappedNodes.filter(n => n.data.computedStatus === NODE_STATUS.VISITED || n.data.computedStatus === NODE_STATUS.CURRENT).length;

    const discoveredChoicesCount = mappedEdges.filter(edge => {
      const targetNode = mappedNodes.find(n => n.id === edge.target);
      return targetNode && (
        targetNode.data.computedStatus === NODE_STATUS.VISITED ||
        targetNode.data.computedStatus === NODE_STATUS.CURRENT ||
        targetNode.data.computedStatus === NODE_STATUS.ENDING_UNLOCKED
      );
    }).length;

    const unlockedEndingsCount = mappedNodes.filter(n => n.data.computedStatus === NODE_STATUS.ENDING_UNLOCKED).length;

    return {
      computedNodes: mappedNodes,
      computedEdges: mappedEdges,
      autoStats: {
        visitedScenes: visitedScenesCount,
        totalScenes: connectedRawNodes.length,
        discoveredChoices: discoveredChoicesCount,
        totalChoices: filteredEdges.length,
        unlockedEndings: unlockedEndingsCount,
        totalEndings: connectedRawNodes.filter(n => n.type === "ending").length || 3
      }
    };
  }, [treeData]);

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

      const startSceneId = payload?.data?.start_scene_id || payload?.data?.StartSceneID || payload?.start_scene_id || payload?.startSceneId;
      setShowRestartConfirm(false);
      if (startSceneId) {
        onNavigate?.("reading", { novelId: activeNovelId, sceneId: startSceneId });
      } else {
        onNavigate?.("reading", { novelId: activeNovelId });
      }
    } catch (err) {
      setRestartError(err.message || "ไม่สามารถเริ่มอ่านใหม่ได้ในขณะนี้");
    } finally {
      setRestartLoading(false);
    }
  };

  const handleNodeClick = (_, node) => {
    const currentStatus = node.data?.computedStatus;
    const clickable = currentStatus === NODE_STATUS.CURRENT ||
      currentStatus === NODE_STATUS.VISITED ||
      currentStatus === NODE_STATUS.ENDING_UNLOCKED;

    if (!clickable) return;

    if (onNavigate) {
      onNavigate("reading", {
        novelId: activeNovelId,
        initialSceneId: node.data.id,
      });
    }
  };

  if (!effectiveUserId) {
    return (
      <div className="stp">
        <div className="stp__container">
          <div className="stp__actions">

            <button
              className="stp__back"
              onClick={() =>
                onNavigate &&
                onNavigate("novel-detail", { novelId: activeNovelId })
              }
            >
              ← กลับรายละเอียด
            </button>

            <button
              className="stp__restart-btn"
              type="button"
              onClick={handleRestartConfirmOpen}
            >
              🔄 เริ่มอ่านใหม่
            </button>

          </div>

          <div className="stp__header">
            <h1 className="stp__title">
              แผนผังการอ่าน
              <span className="stp__title-sep"> — </span>
              <span className="stp__title-novel" style={{ color: "#E91E8C" }}>{treeData?.novel_title || `นิยาย ${activeNovelId}`}</span>
            </h1>
          </div>

          <div className="stp__main">
            <div className="stp__flow-wrapper stp__placeholder-wrapper">
              <div className="stp__placeholder-card">
                <span className="stp__placeholder-tag">ล็อกอินก่อน</span>
                <h2 className="stp__placeholder-title">ล็อกอินเพื่อดูสตอรี่แมพทั้งหมด</h2>
                <p className="stp__placeholder-text">
                  ระบบจะแสดงผังโครงสร้างหน้าให้เห็นชัดเจน แต่การเปิดโหนดและสถานะต่าง ๆ จะต้องเข้าสู่ระบบก่อน
                </p>

                {typeof onNavigate === "function" ? (
                  <button className="stp__placeholder-button" onClick={() => onNavigate("login")}>ไปที่หน้าเข้าสู่ระบบ</button>
                ) : (
                  <a className="stp__placeholder-button" href="/login-register">ไปที่หน้าเข้าสู่ระบบ</a>
                )}
              </div>
            </div>

            <aside className="stp__sidebar">
              <div className="stp__stat-card stp__placeholder-sidecard">
                <div className="stp__stat-card-title">โครงสร้างหน้าสตอรี่แมพ</div>
                <div className="stp__stat-item">
                  <span className="stp__stat-label">สถานะ</span>
                  <span className="stp__stat-value stp__stat-value--pink">ล็อกอินเพื่อเปิด</span>
                </div>
                <p className="stp__placeholder-note">
                  หน้านี้จะแสดง layout และโครงสร้างผังเรื่องแบบกว้าง ๆ แต่เนื้อหาโหนดจะยังไม่เปิดจนกว่าจะเข้าสู่ระบบ
                </p>
              </div>
            </aside>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: "100px", textAlign: "center", color: "#666" }}>
        <div style={{ width: "40px", height: "40px", border: "4px solid #f3f3f3", borderTop: "4px solid #E91E8C", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 20px" }} />
        <p style={{ fontSize: "1.1rem" }}>กำลังเตรียมข้อมูลแผนผังการอ่าน...</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "60px", textAlign: "center", color: "#f44336" }}>
        <h3>💥 โหลดผังโครงสร้างไม่สำเร็จ</h3>
        <p>{error}</p>
      </div>
    );
  }

  const finalTitle = novelDetail?.title || treeData?.novel_title || "ผังโครงสร้างเนื้อเรื่อง";
  const stats = autoStats || {
    visitedScenes: 0,
    totalScenes: 0,
    discoveredChoices: 0,
    totalChoices: 0,
    unlockedEndings: 0,
    totalEndings: 0
  };

  return (
    <div className="stp">
      <div className="stp__container">
        <div className="stp__actions">

          <button
            className="stp__back"
            onClick={() =>
              onNavigate &&
              onNavigate("novel-detail", { novelId: activeNovelId })
            }
          >
            ← กลับรายละเอียด
          </button>

          <button
            className="stp__restart-btn"
            type="button"
            onClick={handleRestartConfirmOpen}
          >
            ↻ เริ่มอ่านใหม่
          </button>

        </div>

        <div className="stp__header">
          <h1 className="stp__title">
            แผนผังการอ่าน
            <span className="stp__title-sep">{" "}—{" "}</span>
            <span className="stp__title-novel" style={{ color: "#E91E8C" }}>{finalTitle}</span>
          </h1>
        </div>

        <div className="stp__main">
          {/* Top stats bar (numbers only, above the graph) */}
          <div className="stp__survey-stats">

            <div className="stp__survey-card pink">
              <div className="stp__survey-icon">
                📖
              </div>

              <div className="stp__survey-content">
                <span className="stp__survey-title">
                  เส้นทางที่ผ่านแล้ว
                </span>

                <div className="stp__survey-number">
                  <span>{stats.visitedScenes}</span>
                  <small> / {stats.totalScenes}</small>
                </div>

                <div className="stp__progress">
                  <div
                    className="stp__progress-fill pink"
                    style={{
                      width: `${stats.totalScenes
                        ? (stats.visitedScenes / stats.totalScenes) * 100
                        : 0
                        }%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="stp__survey-card green">

              <div className="stp__survey-icon">
                🧩
              </div>

              <div className="stp__survey-content">

                <span className="stp__survey-title">
                  ทางเลือกที่ค้นพบ
                </span>

                <div className="stp__survey-number">
                  <span>{stats.discoveredChoices}</span>
                  <small> / {stats.totalChoices}</small>
                </div>

                <div className="stp__progress">
                  <div
                    className="stp__progress-fill green"
                    style={{
                      width: `${stats.totalChoices
                        ? (stats.discoveredChoices / stats.totalChoices) * 100
                        : 0
                        }%`,
                    }}
                  />
                </div>

              </div>

            </div>

            <div className="stp__survey-card yellow">

              <div className="stp__survey-icon">
                🏁
              </div>

              <div className="stp__survey-content">

                <span className="stp__survey-title">
                  ฉากจบที่ปลดล็อก
                </span>

                <div className="stp__survey-number">
                  <span>{stats.unlockedEndings}</span>
                  <small> / {stats.totalEndings}</small>
                </div>

                <div className="stp__progress">
                  <div
                    className="stp__progress-fill yellow"
                    style={{
                      width: `${stats.totalEndings
                        ? (stats.unlockedEndings / stats.totalEndings) * 100
                        : 0
                        }%`,
                    }}
                  />
                </div>

              </div>

            </div>

          </div>

          <div className="stp__flow-wrapper" style={{ width: "100%", background: "#f8f9fa", borderRadius: "8px", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>


            <div className="stp__legend-floating">

              {[
                { color: "#E91E8C", label: "จุดปัจจุบัน" },
                { color: "#4CAF82", label: "ปลดล็อกแล้ว" },
                { color: "#F7C940", label: "ตอนจบปลดแล้ว" },
                { color: "#C8C3D4", label: "ยังไม่ปลดล็อก" },
              ].map(item => (

                <div
                  key={item.label}
                  className="stp__legend-floating-item"
                >
                  <span
                    className="stp__legend-floating-dot"
                    style={{
                      background: item.color
                    }}
                  />

                  <span>
                    {item.label}
                  </span>

                </div>

              ))}

            </div>

            {computedNodes.length > 0 ? (
              <ReactFlow
                nodes={computedNodes}
                edges={computedEdges}
                nodeTypes={nodeTypes}

                style={{
                  width: "100%",
                  height: "100%"
                }}

                fitView
                fitViewOptions={{
                  padding: 0.2
                }}

                zoomOnScroll
                panOnDrag
                nodesDraggable
                nodesConnectable={false}
                elementsSelectable={false}
                onNodeClick={handleNodeClick}
                proOptions={{ hideAttribution: true }}
              >
                <Background gap={24} size={1} color="#e2e8f0" />
                <Controls />
                <MiniMap
                  nodeColor={(node) => {
                    const status = node.data?.computedStatus;
                    if (status === NODE_STATUS.CURRENT) return "#E91E8C";
                    if (status === NODE_STATUS.VISITED) return "#4CAF82";
                    if (status === NODE_STATUS.ENDING_UNLOCKED) return "#F7C940";
                    return "#cbd5e1";
                  }}
                  maskColor="rgba(248, 249, 250, 0.7)"
                  style={{ borderRadius: "6px", border: "1px solid #cbd5e1" }}
                />
              </ReactFlow>
            ) : (
              <div style={{ textAlign: "center", color: "#718096", padding: "20px" }}>
                <span style={{ fontSize: "40px" }}>🍁</span>
                <p style={{ marginTop: "12px", fontSize: "15px", fontWeight: "500" }}>นิยายเรื่องนี้ยังไม่มีการเพิ่มตอนหรือฉากเนื้อเรื่อง</p>
                <p style={{ fontSize: "13px", opacity: 0.8 }}>โปรดติดตามชมแผนผังการอ่านอีกครั้งเมื่อนักเขียนเริ่มลงเนื้อหา</p>
              </div>
            )}
          </div>

        </div>
        {showRestartConfirm && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0, 0, 0, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}>
            <div style={{
              background: "#ffffff",
              padding: "32px",
              borderRadius: "18px",
              maxWidth: "420px",
              width: "90%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
              textAlign: "center"
            }}>
              <h3 style={{ marginBottom: "12px", fontSize: "1.25rem" }}>เริ่มอ่านใหม่</h3>
              <p style={{ marginBottom: "20px", color: "#4a5568", lineHeight: 1.6 }}>
                การเริ่มอ่านใหม่นี้จะคืนสถานะความคืบหน้าและผังเรื่องกลับไปยังจุดเริ่มต้น แต่จะยังเก็บตอนจบที่คุณค้นพบไว้
              </p>
              {restartError && (
                <div style={{ marginBottom: "14px", color: "#b91c1c" }}>{restartError}</div>
              )}
              <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={handleRestartConfirmClose}
                  style={{
                    padding: "12px 18px",
                    borderRadius: "12px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    color: "#334155",
                    cursor: "pointer"
                  }}
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleRestart}
                  disabled={restartLoading}
                  style={{
                    padding: "12px 18px",
                    borderRadius: "12px",
                    border: "none",
                    background: "#E91E8C",
                    color: "#ffffff",
                    fontWeight: 700,
                    cursor: restartLoading ? "not-allowed" : "pointer"
                  }}
                >
                  {restartLoading ? "กำลังเริ่มใหม่..." : "ยืนยันเริ่มอ่านใหม่"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

};

export default StoryTreePage;