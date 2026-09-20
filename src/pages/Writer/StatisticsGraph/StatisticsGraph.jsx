import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReactFlow, {
  Handle,
  Position,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  MarkerType,
} from "reactflow";
import { ArrowLeft, ChevronUp, ChevronDown } from "lucide-react";
import axios from "axios";
import "reactflow/dist/style.css";
import "./StatisticsGraph.css";
import LoadingScreen from "../../../components/LoadingScreen/LoadingScreen";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const NODE_WIDTH = 260;
const NODE_HEIGHT = 118;
const NODE_HORIZONTAL_GAP = 360;
const NODE_VERTICAL_GAP = 250;
const CANVAS_MARGIN = 80;

const VISITOR_SHADES = {
  HIGH: { bg: "#FCE7F3", border: "#EC4899", text: "#9D174D", label: "ผู้ชมสูง" },
  MEDIUM: { bg: "#FFF1F2", border: "#FDA4AF", text: "#BE185D", label: "ผู้ชมปานกลาง" },
  LOW: { bg: "#F8FAFC", border: "#E2E8F0", text: "#475569", label: "ผู้ชมน้อย" },
};

// ---------------------------------------------------------------------------
// Formatters and Safety Helpers
// ---------------------------------------------------------------------------
const formatNumber = (val) => {
  if (val === null || val === undefined || val === "") return "-";
  const num = Number(val);
  if (isNaN(num)) return "-";
  return num.toLocaleString();
};

const formatPercentage = (val) => {
  if (val === null || val === undefined || val === "") return "-";
  const num = Number(val);
  if (isNaN(num)) return "-";
  return `${Math.round(num)}%`;
};

const getErrorMessage = (err, fallback = "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง") => {
  if (!err) return fallback;
  if (axios.isCancel(err)) return null;
  return (
    err.response?.data?.error?.message ||
    err.response?.data?.message ||
    err.message ||
    fallback
  );
};

const normalizeId = (value) => {
  if (value === undefined || value === null || value === "") return "";
  return String(value);
};

const stripHtml = (value) => {
  if (typeof value !== "string") return value;
  return value.replace(/<\/?[^>]+(>|$)/g, " ").replace(/\s+/g, " ").trim();
};

const getNodeId = (node) => normalizeId(node?.ID ?? node?.id ?? node?.SceneID ?? node?.scene_id);

const getNodeType = (node) => {
  const type = stripHtml((node?.Type ?? node?.type ?? "")).toLowerCase();
  if (type === "start" || type === "starting" || node?.is_start_scene || node?.isStart || node?.isStartScene) {
    return "start";
  }
  if (type === "ending" || type === "end" || Boolean(node?.ending_title || node?.EndingTitle || node?.endingTitle || node?.isEnding)) {
    return "ending";
  }
  return "normal";
};

const getNodeTitle = (node) => stripHtml(node?.Title || node?.title || node?.Label || node?.label || `ฉากที่ ${getNodeId(node)}`);
const getNodeChapter = (node) => stripHtml(node?.ChapterTitle || node?.chapter_title || node?.chapter || node?.chapterName || node?.chapter_name || "");

// 🟢 Custom Node Component
const AnalyticsNode = ({ data }) => {
  const isSelected = data.isSelected;
  const isEnding = data.isEnding;
  const isMaxDrop = !isEnding && Boolean(data.isMaxDrop);
  const isHighExit = !isEnding && !isMaxDrop && Number(data.exitRate) >= 25;
  
  let shade = VISITOR_SHADES.LOW;
  if (data.visitors >= (data.highMax || 1600)) shade = VISITOR_SHADES.HIGH;
  else if (data.visitors >= (data.midMax || 800)) shade = VISITOR_SHADES.MEDIUM;

  const nodeStyle = {
    backgroundColor: shade.bg,
    color: shade.text,
    position: "relative",
    borderColor: isSelected ? "#2563eb" : (isMaxDrop ? "#ef4444" : (isHighExit ? "#f97316" : shade.border)),
    borderWidth: isSelected ? "3px" : (isMaxDrop ? "3px" : "2px"),
  };

  const type = stripHtml(data.type || "").toLowerCase();
  const typeIcon = type === "start" || type === "starting" ? "▶ " : (type === "ending" || type === "end" ? "🏆 " : "");

  return (
    <div
      className={`wsg-flow-node ${isMaxDrop ? "max-drop" : (isHighExit ? "high-exit" : "")} ${
        isSelected ? "active-selection" : ""
      } ${data.hasActiveSelection && !isSelected ? "dimmed" : ""}`}
      style={nodeStyle}
    >
      <Handle type="target" position={Position.Top} style={{ background: isSelected ? "#2563eb" : (isMaxDrop ? "#ef4444" : (isHighExit ? "#f97316" : shade.border)), width: 8, height: 8 }} />
      
      {/* Badge สัญลักษณ์ไฟสำหรับฉากที่มีอัตราออกสูงสุด */}
      {isMaxDrop && (
        <div 
          className="wsg-node-badge-fire"
          title={`ฉากที่มีอัตราคนกดออกสูงสุด: ${formatPercentage(data.exitRate)}`}
        >
          <span>🔥</span>
          <span className="wsg-node-badge-fire-pct">{formatPercentage(data.exitRate)}</span>
        </div>
      )}

      {/* Badge สัญลักษณ์เตือนสำหรับฉากที่มีอัตราออกสูง (≥ 25%) แต่ไม่ใช่จุดสูงสุด */}
      {isHighExit && (
        <div 
          className="wsg-node-badge-warning"
          title={`จุดที่มีอัตราออกจากฉากสูง (≥25%): ${formatPercentage(data.exitRate)}`}
        >
          ⚠️ อัตราออกสูง
        </div>
      )}

      <div className="wsg-node-header">
        <span 
          className="wsg-node-label" 
          style={{ 
            backgroundColor: isMaxDrop ? "#fee2e2" : (isHighExit ? "#ffedd5" : "rgba(0, 0, 0, 0.07)"), 
            color: isMaxDrop ? "#dc2626" : (isHighExit ? "#c2410c" : shade.text),
            fontWeight: 800
          }}
        >
          {typeIcon}{data.labelNum || "ฉาก"}
        </span>
        <div className="wsg-node-status-badge">
          <span style={{ fontSize: "0.7rem", fontWeight: 600, opacity: 0.85 }}>
            {shade.label}
          </span>
        </div>
      </div>
      
      <h4 className="wsg-node-title" title={data.title} style={{ color: shade.text, fontWeight: 800 }}>
        {data.title || "ไม่มีชื่อฉาก"}
      </h4>
      
      <div className="wsg-node-stats" style={{ color: shade.text, fontWeight: 700 }}>
        <div className="wsg-node-stat-item">
          <span style={{ opacity: 0.85, color: shade.text, fontWeight: 700 }}>ผู้ชม:</span>
          <strong style={{ color: shade.text, fontWeight: 800 }}>{formatNumber(data.visitors)}</strong>
        </div>
        <div className="wsg-node-stat-item">
          <span style={{ opacity: 0.85, color: shade.text, fontWeight: 700 }}>Exit Rate:</span>
          <strong style={{ color: isMaxDrop ? "#dc2626" : (isHighExit ? "#ea580c" : shade.text), fontWeight: 800 }}>
            {isEnding ? "-" : formatPercentage(data.exitRate)}
          </strong>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} style={{ background: isSelected ? "#2563eb" : (isMaxDrop ? "#ef4444" : (isHighExit ? "#f97316" : shade.border)), width: 8, height: 8 }} />
    </div>
  );
};

const getSceneTypeBadge = (typeStr) => {
  const type = stripHtml(typeStr || "").toLowerCase();
  
  const isStart = type === "start" || type === "starting" || type.includes("เริ่มต้น");
  const isEnding = type === "ending" || type === "end" || type.includes("จบ");

  const typeLabel = isStart ? "จุดเริ่มต้น"
    : isEnding ? "ฉากจบ"
      : "ฉากทั่วไป";

  const typeColor = isStart ? "#16A34A"
    : isEnding ? "#EF4444"
      : "#38BDF8";

  const typeBgColor = isStart ? "#DCFCE7"
    : isEnding ? "#FEE2E2"
      : "#E0F2FE";

  const typeIcon = isStart ? "▶"
    : isEnding ? "🏆"
      : "📖";

  return (
    <span 
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "3px 8px",
        borderRadius: "12px",
        backgroundColor: typeBgColor,
        color: typeColor,
        fontSize: "0.75rem",
        fontWeight: 700,
        marginLeft: "8px",
        verticalAlign: "middle"
      }}
    >
      <span>{typeIcon}</span>
      <span>{typeLabel}</span>
    </span>
  );
};

function StatisticsGraph() {
  const { novelId } = useParams();
  const navigate = useNavigate();

  const nodeTypes = useMemo(() => ({
    analyticsNode: AnalyticsNode,
  }), []);
  
  const [novelTitle, setNovelTitle] = useState("นิยายของฉัน");
  const [treeData, setTreeData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // 3 APIs States
  const [overallAnalytics, setOverallAnalytics] = useState(null);
  const [sceneAnalytics, setSceneAnalytics] = useState(null);
  const [choiceAnalytics, setChoiceAnalytics] = useState(null);
  const [allScenesAnalytics, setAllScenesAnalytics] = useState([]);
  const [isSceneLoading, setIsSceneLoading] = useState(false);
  const [isChoiceLoading, setIsChoiceLoading] = useState(false);
  const [sceneError, setSceneError] = useState(null);
  const [choiceError, setChoiceError] = useState(null);
  
  // Abort Controllers & Request Sequence ID
  const sceneRequestIdRef = useRef(0);
  const mainAbortRef = useRef(null);
  const sceneAbortRef = useRef(null);
  
  // Selection
  const [selectedSceneId, setSelectedSceneId] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState("scene");
  const [highlightedChoiceId, setHighlightedChoiceId] = useState(null);

  // Legend Collapse State
  const [isLegendOpen, setIsLegendOpen] = useState(true);

  // Clean up abort controllers on unmount
  useEffect(() => {
    return () => {
      if (mainAbortRef.current) mainAbortRef.current.abort();
      if (sceneAbortRef.current) sceneAbortRef.current.abort();
    };
  }, []);

  // Fetch Data (Story Tree + Overall Analytics + All Scenes Analytics)
  const fetchData = useCallback(async () => {
    if (!novelId) return;

    if (mainAbortRef.current) {
      mainAbortRef.current.abort();
    }
    const controller = new AbortController();
    mainAbortRef.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // Send authorization header to all requests including story-tree
      const [treeSettled, analyticsSettled, scenesAnalyticsSettled] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/novels/${novelId}/story-tree`, { headers, signal: controller.signal }),
        axios.get(`${API_BASE_URL}/api/v1/writer/novels/${novelId}/analytics`, { headers, signal: controller.signal }),
        axios.get(`${API_BASE_URL}/api/v1/writer/novels/${novelId}/analytics/scenes`, { headers, signal: controller.signal })
      ]);
      
      // Process story tree
      if (treeSettled.status === "fulfilled") {
        const tree = treeSettled.value.data?.data || treeSettled.value.data || null;
        setTreeData(tree);
        const title = tree?.NovelTitle || tree?.novel_title;
        if (title) setNovelTitle(title);
      } else {
        if (!axios.isCancel(treeSettled.reason)) {
          console.error("Story tree fetch error:", treeSettled.reason);
          setError(getErrorMessage(treeSettled.reason, "ไม่สามารถดึงข้อมูลโครงสร้างนิยายได้"));
        }
      }

      // Process overall analytics
      if (analyticsSettled.status === "fulfilled") {
        setOverallAnalytics(analyticsSettled.value.data?.data || analyticsSettled.value.data || null);
      } else {
        if (!axios.isCancel(analyticsSettled.reason)) {
          console.warn("Overall analytics fetch warning:", analyticsSettled.reason);
        }
      }

      // Process all scenes analytics
      if (scenesAnalyticsSettled.status === "fulfilled") {
        setAllScenesAnalytics(scenesAnalyticsSettled.value.data?.data || scenesAnalyticsSettled.value.data || []);
      } else {
        if (!axios.isCancel(scenesAnalyticsSettled.reason)) {
          console.warn("Scenes analytics fetch warning:", scenesAnalyticsSettled.reason);
        }
      }
    } catch (err) {
      if (!axios.isCancel(err)) {
        console.error("Error fetching analytics data:", err);
        setError(getErrorMessage(err, "ไม่สามารถดึงข้อมูลนิยายและสถิติได้ กรุณาลองใหม่อีกครั้ง"));
      }
    } finally {
      setIsLoading(false);
    }
  }, [novelId]);

  // Fetch Scene Details (Scene Analytics + Choice Analytics)
  const fetchSceneDetails = useCallback(async (sceneId) => {
    if (!novelId || !sceneId) return;

    if (sceneAbortRef.current) {
      sceneAbortRef.current.abort();
    }
    const controller = new AbortController();
    sceneAbortRef.current = controller;

    const requestId = sceneRequestIdRef.current + 1;
    sceneRequestIdRef.current = requestId;

    // Clear previous scene data immediately to prevent stale data display
    setSceneAnalytics(null);
    setChoiceAnalytics(null);
    setSceneError(null);
    setChoiceError(null);
    setIsSceneLoading(true);
    setIsChoiceLoading(true);
    
    const token = localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const [sceneSettled, choiceSettled] = await Promise.allSettled([
        axios.get(
          `${API_BASE_URL}/api/v1/writer/novels/${novelId}/analytics/scenes/${sceneId}`,
          { headers, signal: controller.signal }
        ),
        axios.get(
          `${API_BASE_URL}/api/v1/writer/novels/${novelId}/analytics/scenes/${sceneId}/choices`,
          { headers, signal: controller.signal }
        )
      ]);

      if (sceneRequestIdRef.current === requestId) {
        if (sceneSettled.status === "fulfilled") {
          setSceneAnalytics(sceneSettled.value.data?.data || sceneSettled.value.data || null);
        } else {
          if (!axios.isCancel(sceneSettled.reason)) {
            console.error("Error fetching scene analytics:", sceneSettled.reason);
            setSceneAnalytics(null);
            setSceneError(getErrorMessage(sceneSettled.reason, "ไม่สามารถโหลดสถิติฉากนี้ได้"));
          }
        }

        if (choiceSettled.status === "fulfilled") {
          setChoiceAnalytics(choiceSettled.value.data?.data || choiceSettled.value.data || null);
        } else {
          if (!axios.isCancel(choiceSettled.reason)) {
            console.error("Error fetching choice analytics:", choiceSettled.reason);
            setChoiceAnalytics(null);
            setChoiceError(getErrorMessage(choiceSettled.reason, "ไม่สามารถโหลดสถิติทางเลือกของฉากนี้ได้"));
          }
        }
      }
    } catch (err) {
      if (!axios.isCancel(err) && sceneRequestIdRef.current === requestId) {
        console.error("Error in scene details request:", err);
      }
    } finally {
      if (sceneRequestIdRef.current === requestId) {
        setIsSceneLoading(false);
        setIsChoiceLoading(false);
      }
    }
  }, [novelId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (selectedSceneId) {
      fetchSceneDetails(selectedSceneId);
    } else {
      if (sceneAbortRef.current) {
        sceneAbortRef.current.abort();
      }
      sceneRequestIdRef.current += 1;
      setSceneAnalytics(null);
      setChoiceAnalytics(null);
      setSceneError(null);
      setChoiceError(null);
      setIsSceneLoading(false);
      setIsChoiceLoading(false);
    }

    return () => {
      if (sceneAbortRef.current) {
        sceneAbortRef.current.abort();
      }
      sceneRequestIdRef.current += 1;
    };
  }, [selectedSceneId, fetchSceneDetails]);

  const rawNodes = treeData?.Nodes ?? treeData?.nodes ?? [];
  const rawEdges = treeData?.Edges ?? treeData?.edges ?? [];

  const uniqueNodes = useMemo(() => {
    const seen = new Set();
    return rawNodes.filter((scene) => {
      const id = getNodeId(scene);
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [rawNodes]);

  // Map display layout - chapter grouping
  const chapterAndSceneDisplayMap = useMemo(() => {
    if (!uniqueNodes.length) return new Map();

    const chapterGroups = new Map();
    const chapterOrder = [];
    uniqueNodes.forEach((scene) => {
      const chapter = getNodeChapter(scene) || "อื่นๆ";
      if (!chapterGroups.has(chapter)) {
        chapterGroups.set(chapter, []);
        chapterOrder.push(chapter);
      }
      chapterGroups.get(chapter).push(scene);
    });

    const displayMap = new Map();
    chapterOrder.forEach((chapter, chapterIndex) => {
      chapterGroups.get(chapter).forEach((scene, sceneIndex) => {
        const id = getNodeId(scene);
        if (id) {
          displayMap.set(id, {
            display: `ฉากที่ ${chapterIndex + 1}.${sceneIndex + 1}`,
            chapterName: chapter || `ตอนที่ ${chapterIndex + 1}`,
            chapterNum: chapterIndex + 1,
            sceneNum: sceneIndex + 1,
          });
        }
      });
    });

    return displayMap;
  }, [uniqueNodes]);

  // Pre-build O(1) lookup maps for analytics data
  const allScenesAnalyticsMap = useMemo(() => {
    const m = new Map();
    if (Array.isArray(allScenesAnalytics)) {
      allScenesAnalytics.forEach((s) => {
        const id = normalizeId(s.scene_id);
        if (id) m.set(id, s);
      });
    }
    return m;
  }, [allScenesAnalytics]);

  const topDropOffMap = useMemo(() => {
    const m = new Map();
    overallAnalytics?.top_drop_off_scenes?.forEach((d) => {
      const id = normalizeId(d.scene_id);
      if (id) m.set(id, d);
    });
    return m;
  }, [overallAnalytics]);

  // Node analytics data mapping
  const nodeAnalyticsMap = useMemo(() => {
    const analytics = new Map();
    
    uniqueNodes.forEach((node) => {
      const id = getNodeId(node);
      if (!id) return;
      
      const type = getNodeType(node);
      
      let visitors = 0;
      let exitRate = 0;

      const sceneData = allScenesAnalyticsMap.get(id);
      if (sceneData) {
        visitors = sceneData.unique_readers ?? 0;
        exitRate = Math.round(Number(sceneData.drop_off_rate ?? 0));
      }

      const dropData = topDropOffMap.get(id);
      if (dropData) {
        visitors = dropData.unique_readers ?? 0;
        exitRate = Math.round(Number(dropData.drop_off_rate ?? 0));
      }

      if (selectedSceneId === id && sceneAnalytics) {
        visitors = sceneAnalytics.unique_readers ?? 0;
        exitRate = Math.round(Number(sceneAnalytics.drop_off_rate ?? 0));
      }

      if (type === "ending" || type === "end") {
        exitRate = 0;
      }

      analytics.set(id, { visitors, exitRate });
    });
    return analytics;
  }, [uniqueNodes, allScenesAnalyticsMap, topDropOffMap, selectedSceneId, sceneAnalytics]);

  // Find the maximum exit rate across all non-ending nodes
  // Used to accurately determine which scene(s) get the fire 🔥 badge consistently
  const maxExitRate = useMemo(() => {
    let max = 0;
    uniqueNodes.forEach((node) => {
      const id = getNodeId(node);
      const type = getNodeType(node);
      if (type === "ending" || type === "end") return;
      const analytics = nodeAnalyticsMap.get(id);
      if (analytics && Number(analytics.exitRate) > max) {
        max = Number(analytics.exitRate);
      }
    });
    return max;
  }, [uniqueNodes, nodeAnalyticsMap]);

  // Edge Selection Map from API
  // Only indicates selection percentage if the source scene is currently selected and choice data is loaded
  const edgeSelectionMap = useMemo(() => {
    const selections = new Map();

    rawEdges.forEach((edge) => {
      const fromId = normalizeId(edge.FromID || edge.from_id || edge.from || edge.source || "");
      if (!fromId) return;

      const toId = normalizeId(edge.ToID || edge.to_id || edge.to || edge.target || "");
      const choiceLabel = edge.Label || edge.label || edge.choice_text || edge.text || "";
      const isSourceSelected = fromId === selectedSceneId;
      const realChoice = isSourceSelected && choiceAnalytics?.choices?.find(
        c => normalizeId(c.choice_id) === normalizeId(edge.data?.ID || edge.data?.id) || c.label === choiceLabel
      );

      selections.set(`${fromId}->${toId}`, {
        hasData: Boolean(realChoice && realChoice.percentage !== undefined && realChoice.percentage !== null),
        percentage: realChoice ? Number(realChoice.percentage) : null,
      });
    });

    return selections;
  }, [rawEdges, selectedSceneId, choiceAnalytics]);

  // Position Elements for ReactFlow
  const positionedElements = useMemo(() => {
    if (!uniqueNodes.length) return { nodes: [], edges: [] };

    const nodeIds = uniqueNodes.map((n) => getNodeId(n));
    const localMap = new Map();
    uniqueNodes.forEach((n) => localMap.set(getNodeId(n), n));

    const edgeList = rawEdges.map((edge, index) => {
      const source = normalizeId(edge.FromID || edge.from_id || edge.from || edge.source || "");
      const target = normalizeId(edge.ToID || edge.to_id || edge.to || edge.target || "");
      return {
        id: normalizeId(edge.id ?? edge.ID ?? `edge-${source}-${target}-${index}`),
        source,
        target,
        label: edge.Label || edge.label || edge.choice_text || edge.text || "",
        data: edge,
      };
    });

    const adjacency = {};
    const inDegree = {};
    const nodeLevels = {};

    nodeIds.forEach((id) => {
      adjacency[id] = [];
      inDegree[id] = 0;
    });

    edgeList.forEach((edge) => {
      if (edge.source && edge.target && adjacency[edge.source] && inDegree[edge.target] !== undefined) {
        adjacency[edge.source].push(edge.target);
        inDegree[edge.target] += 1;
      }
    });

    const queue = [];
    nodeIds.forEach((id) => {
      const scene = localMap.get(id);
      const type = getNodeType(scene);
      if (type === "start" || type === "starting" || inDegree[id] === 0) {
        nodeLevels[id] = 0;
        queue.push(id);
      }
    });

    while (queue.length > 0) {
      const current = queue.shift();
      const level = nodeLevels[current] ?? 0;
      adjacency[current].forEach((childId) => {
        const offset = (inDegree[childId] >= 3) ? 2 : 1;
        const nextLevel = level + offset;
        if (nodeLevels[childId] === undefined || nodeLevels[childId] > nextLevel) {
          nodeLevels[childId] = nextLevel;
          queue.push(childId);
        }
      });
    }

    const levelsMap = {};
    nodeIds.forEach((id) => {
      const level = nodeLevels[id] ?? 0;
      if (!levelsMap[level]) levelsMap[level] = [];
      levelsMap[level].push(id);
    });

    const positions = {};
    const sortedLevels = Object.keys(levelsMap).map(Number).sort((a, b) => a - b);
    const HORIZONTAL_STEP = NODE_WIDTH + NODE_HORIZONTAL_GAP;
    const VERTICAL_STEP = NODE_HEIGHT + NODE_VERTICAL_GAP;

    if (sortedLevels.length > 0) {
      const level0Ids = levelsMap[0] || [];
      level0Ids.sort();
      const total0 = level0Ids.length;
      const offset0 = ((total0 - 1) * HORIZONTAL_STEP) / 2;
      level0Ids.forEach((id, colIndex) => {
        positions[id] = {
          x: CANVAS_MARGIN + colIndex * HORIZONTAL_STEP - offset0,
          y: CANVAS_MARGIN + 0 * VERTICAL_STEP,
        };
      });
    }

    const parentMap = {};
    nodeIds.forEach((id) => {
      parentMap[id] = [];
    });
    edgeList.forEach((edge) => {
      if (edge.source && edge.target && parentMap[edge.target]) {
        parentMap[edge.target].push(edge.source);
      }
    });

    for (let i = 1; i < sortedLevels.length; i++) {
      const level = sortedLevels[i];
      const ids = levelsMap[level] || [];

      const idealXValues = {};
      ids.forEach((id) => {
        const parents = parentMap[id] || [];
        const activeParents = parents.filter((pId) => positions[pId] !== undefined);
        if (activeParents.length > 0) {
          const sumX = activeParents.reduce((sum, pId) => sum + positions[pId].x, 0);
          idealXValues[id] = sumX / activeParents.length;
        } else {
          idealXValues[id] = 0;
        }
      });

      ids.sort((a, b) => idealXValues[a] - idealXValues[b]);

      const total = ids.length;
      const offset = ((total - 1) * HORIZONTAL_STEP) / 2;
      ids.forEach((id, colIndex) => {
        positions[id] = {
          x: CANVAS_MARGIN + colIndex * HORIZONTAL_STEP - offset,
          y: CANVAS_MARGIN + level * VERTICAL_STEP,
        };
      });
    }

    const allY = Object.values(positions).map((pos) => pos.y);
    const minY = Math.min(...allY, 0);
    const shiftY = Math.max(CANVAS_MARGIN, CANVAS_MARGIN - minY);

    Object.keys(positions).forEach((sceneId) => {
      positions[sceneId].y += shiftY;
    });

    const finalNodes = [];
    const finalEdges = [];

    const totalVisitors = overallAnalytics?.unique_readers ?? 0;
    const highMax = totalVisitors > 0 ? Math.round(totalVisitors * 0.66) : 1;
    const midMax = totalVisitors > 0 ? Math.round(totalVisitors * 0.33) : 1;

    nodeIds.forEach((sceneId) => {
      const scene = localMap.get(sceneId);
      const position = positions[sceneId] || { x: CANVAS_MARGIN, y: CANVAS_MARGIN };

      const apiX = scene.node_x ?? scene.NodeX;
      const apiY = scene.node_y ?? scene.NodeY;
      const hasSavedPosition = apiX !== null && apiX !== undefined && apiY !== null && apiY !== undefined;

      const finalX = hasSavedPosition ? apiX : (scene.x ?? position.x);
      const finalY = hasSavedPosition ? apiY : (scene.y ?? position.y);

      const pos = chapterAndSceneDisplayMap.get(sceneId);
      const analytics = nodeAnalyticsMap.get(sceneId) || { visitors: 0, exitRate: 0 };
      const isEnding = getNodeType(scene) === "ending";
      const exitRate = analytics.exitRate ?? 0;

      // Consistently show fire 🔥 on all nodes that tie for maximum exit rate (if maxExitRate >= 25)
      const isMaxDrop = !isEnding && maxExitRate >= 25 && exitRate === maxExitRate;

      finalNodes.push({
        id: sceneId,
        type: "analyticsNode",
        position: { x: finalX, y: finalY },
        data: {
          title: getNodeTitle(scene),
          labelNum: pos ? pos.display : "ฉากนิยาย",
          visitors: analytics.visitors,
          exitRate: analytics.exitRate,
          isSelected: selectedSceneId === sceneId,
          hasActiveSelection: !!selectedSceneId,
          highMax,
          midMax,
          isMaxDrop,
          type: getNodeType(scene),
          isEnding,
        },
      });
    });

    edgeList.forEach((edge) => {
      const src = edge.source;
      const tgt = edge.target;
      const key = `${src}->${tgt}`;
      const selection = edgeSelectionMap.get(key);
      const hasData = selection?.hasData ?? false;
      const pct = selection?.percentage;

      // ปรับเส้นเชื่อมของกราฟให้หนาขึ้นตามที่ร้องขอ
      let strokeWidth = 2.5;
      let strokeColor = "#CBD5E1";
      
      if (hasData && pct !== null && pct !== undefined) {
        if (pct >= 60) {
          strokeWidth = 4.5;
          strokeColor = "#10B981";
        } else if (pct >= 30) {
          strokeWidth = 3.5;
          strokeColor = "#F59E0B";
        } else {
          strokeWidth = 2.5;
          strokeColor = "#94A3B8";
        }
      }

      const isConnectedToSelection = selectedSceneId && (src === selectedSceneId || tgt === selectedSceneId);
      if (selectedSceneId) {
        if (!isConnectedToSelection) {
          strokeColor = "#E2E8F0";
          strokeWidth = 1.5;
        }
      }

      const choiceName = edge.label || "";
      let edgeLabel = choiceName;
      if (hasData && pct !== null && pct !== undefined) {
        edgeLabel = choiceName ? `${choiceName} (${formatPercentage(pct)})` : formatPercentage(pct);
      }

      finalEdges.push({
        id: edge.id,
        source: src,
        target: tgt,
        label: edgeLabel,
        type: "smoothstep",
        animated: false,
        style: {
          stroke: strokeColor,
          strokeWidth: strokeWidth,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: strokeColor,
        },
        data: { pct: hasData ? pct : null, hasData },
      });
    });

    return { nodes: finalNodes, edges: finalEdges };
  }, [uniqueNodes, rawEdges, selectedSceneId, chapterAndSceneDisplayMap, nodeAnalyticsMap, edgeSelectionMap, overallAnalytics, maxExitRate]);

  const [rfNodes, setRfNodes] = useNodesState([]);
  const [rfEdges, setRfEdges] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  useEffect(() => {
    if (treeData) {
      setRfNodes(positionedElements.nodes);
      setRfEdges(positionedElements.edges);
    }
  }, [positionedElements, treeData, setRfNodes, setRfEdges]);

  const onNodeClick = useCallback((event, node) => {
    setHighlightedChoiceId(null);
    setSelectedSceneId(prev => {
      const next = prev === node.id ? null : node.id;
      if (next) {
        setIsCollapsed(false);
      }
      return next;
    });
  }, []);

  const onPaneClick = useCallback(() => {
    setHighlightedChoiceId(null);
    setSelectedSceneId(null);
  }, []);

  const onEdgeClick = useCallback((event, edge) => {
    event.stopPropagation();
    setHighlightedChoiceId(normalizeId(edge.data?.ID ?? edge.data?.id) || edge.label || null);
    setSelectedSceneId(edge.source);
    setActiveTab("choice");
    setIsCollapsed(false);
  }, []);

  const focusNode = useCallback((sceneId) => {
    if (!reactFlowInstance || !sceneId) return;

    const targetNode = reactFlowInstance.getNode(sceneId) || rfNodes.find((node) => node.id === sceneId);
    if (!targetNode) return;

    requestAnimationFrame(() => {
      const position = targetNode.positionAbsolute || targetNode.position;
      const width = targetNode.measured?.width || targetNode.width || NODE_WIDTH;
      const height = targetNode.measured?.height || targetNode.height || NODE_HEIGHT;

      reactFlowInstance.setCenter(
        position.x + width / 2,
        position.y + height / 2,
        { zoom: 1.1, duration: 500 }
      );
    });
  }, [reactFlowInstance, rfNodes]);

  const onPreviousSceneClick = useCallback((sceneId) => {
    if (!sceneId) return;
    setActiveTab("scene");
    setIsCollapsed(false);
    setSelectedSceneId(sceneId);
    focusNode(sceneId);
  }, [focusNode]);

  const onChoiceDestinationClick = useCallback((sceneId) => {
    if (!sceneId) return;
    focusNode(sceneId);
  }, [focusNode]);

  const selectedSceneDetails = useMemo(() => {
    if (!selectedSceneId) return null;
    
    const node = uniqueNodes.find((n) => getNodeId(n) === selectedSceneId);
    if (!node) return null;
    
    const pos = chapterAndSceneDisplayMap.get(selectedSceneId);
    const type = getNodeType(node);
    let sceneType = "ฉากทั่วไป";
    if (type === "start" || type === "starting") sceneType = "ฉากเริ่มต้น";
    else if (type === "ending" || type === "end") sceneType = "ฉากตอนจบ";
    
    return {
      id: selectedSceneId,
      title: getNodeTitle(node),
      label: pos ? pos.display : "ฉากนิยาย",
      chapterName: pos ? pos.chapterName : "",
      sceneType,
    };
  }, [selectedSceneId, uniqueNodes, chapterAndSceneDisplayMap]);

  // Ending stats mapping
  const mappedEndings = useMemo(() => {
    const formatEndingTitle = (type) => {
      if (!type) return "ฉากจบไม่ระบุประเภท";
      const text = type.trim();
      const lower = text.toLowerCase();
      if (lower.endsWith(" ending")) {
        const prefix = text.slice(0, text.length - 7).trim();
        return `${prefix.charAt(0).toUpperCase() + prefix.slice(1)} Ending`;
      } else if (lower === "ending") {
        return "Ending";
      } else {
        return `${text.charAt(0).toUpperCase() + text.slice(1)} Ending`;
      }
    };

    const rawEndings = overallAnalytics?.ending_stats || [];
    const result = rawEndings.map((e) => {
      const typeLabel = formatEndingTitle(e.ending_type);
      const titleLabel = e.ending_title ? `${e.ending_title} (${typeLabel})` : typeLabel;
      return {
        title: titleLabel,
        count: e.count ?? 0,
        percentage: parseFloat(e.percentage !== undefined ? e.percentage : 0),
      };
    });
    result.sort((a, b) => b.percentage - a.percentage || b.count - a.count);
    return result;
  }, [overallAnalytics]);

  if (isLoading) {
    return <LoadingScreen message="กำลังโหลดสถิติกราฟนิยาย..." />;
  }

  if (error) {
    return (
      <div className="wsg-page">
        <div className="wst-loading-state">
          <p className="wst-error-text">{error}</p>
          <button className="wst-error-button" onClick={fetchData}>
            โหลดใหม่อีกครั้ง
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="wsg-page">
      {/* Topbar */}
      <header className="wsg-topbar">
        <div className="wsg-topbar__left">
          <button 
            type="button"
            className="wsg-topbar__back"
            onClick={() => navigate(`/writer/${novelId}/chapters`)}
            title="ย้อนกลับไปหน้ารายชื่อตอน"
          >
            <ArrowLeft size={16} />
            <span>ย้อนกลับ</span>
          </button>
          <div className="wsg-topbar__divider-v" />
          <h2 className="wsg-topbar__title" title={novelTitle}>
            เรื่อง: {novelTitle.length > 28 ? `${novelTitle.slice(0, 28)}...` : novelTitle}
          </h2>
        </div>

        <div className="wsg-toggle-wrap">
          <button 
            type="button"
            className="wsg-toggle-btn"
            onClick={() => navigate(`/writer/${novelId}/storytree`)}
          >
            โครงสร้าง
          </button>
          <button type="button" className="wsg-toggle-btn active">
            วิเคราะห์การเลือกของนักอ่าน
          </button>
        </div>
      </header>

      {/* 🟢 KPI Dashboard แสดงตัวเลขภาพรวม 5 การ์ด (รองรับ Responsive Scrollbar เมื่อจอล้น) */}
      <section className="wsg-kpis-new-container">
        {/* การ์ด 1: ยอดวิวรวม */}
        <div className="wsg-kpi-card-large">
          <div className="wsg-kpi-card-header">
            <span className="wsg-kpi-label-new">👁️ ยอดวิวรวม</span>
          </div>
          <div>
            <div className="wsg-kpi-val-large">
              {formatNumber(overallAnalytics?.total_views)}
            </div>
            <span className="wsg-kpi-sub-text">มีคนเปิดอ่านกี่ครั้ง</span>
          </div>
        </div>

        {/* การ์ด 2: จำนวนคนอ่านจริง */}
        <div className="wsg-kpi-card-large">
          <div className="wsg-kpi-card-header">
            <span className="wsg-kpi-label-new">👥 จำนวนคนอ่าน</span>
          </div>
          <div>
            <div className="wsg-kpi-val-large color-teal">
              {formatNumber(overallAnalytics?.unique_readers)}
            </div>
            <span className="wsg-kpi-sub-text">คน</span>
          </div>
        </div>

        {/* การ์ด 3: คนอ่านจบกี่คน / กี่ % */}
        <div className="wsg-kpi-card-large">
          <div className="wsg-kpi-card-header">
            <span className="wsg-kpi-label-new">🏆 คนอ่านจบ</span>
          </div>
          <div>
            <div className="wsg-kpi-val-large color-purple">
              {overallAnalytics?.completed_readers !== undefined && overallAnalytics?.completed_readers !== null
                ? `${formatNumber(overallAnalytics.completed_readers)} คน`
                : "-"}
            </div>
            <span className="wsg-kpi-rate-text color-purple">
              คิดเป็น {formatPercentage(overallAnalytics?.completion_rate)}
            </span>
          </div>
        </div>

        {/* การ์ด 4: จบแบบไหนบ้าง (เป็น %) */}
        <div className="wsg-kpi-card-large wsg-kpi-card-endings">
          <div className="wsg-kpi-card-header">
            <span className="wsg-kpi-label-new">🏁 จบแบบไหนบ้าง (เป็น %)</span>
          </div>
          <div className="wsg-endings-scroll-list">
            {mappedEndings.length === 0 ? (
              <p className="wsg-endings-empty">
                ไม่มีข้อมูลฉากจบ
              </p>
            ) : (
              mappedEndings.map((ending, idx) => {
                const colors = ["#10b981", "#f43f5e", "#d97706", "#3b82f6", "#8b5cf6"];
                const color = colors[idx % colors.length];
                const isLast = idx === mappedEndings.length - 1;
                return (
                  <div key={idx} className={`wsg-ending-row ${isLast ? "last" : ""}`}>
                    <span className="wsg-ending-title" style={{ color }} title={ending.title}>
                      {ending.title} ({formatNumber(ending.count)} คน)
                    </span>
                    <span className="wsg-ending-pct">
                      {formatPercentage(ending.percentage)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* การ์ด 5: ฉากคนหนีเยอะสุด */}
        <div className="wsg-kpi-card-large wsg-kpi-card-dropoff">
          <div className="wsg-kpi-card-header">
            <span className="wsg-kpi-label-new text-red">🔥 ฉากที่คนกดออกเยอะสุด</span>
          </div>
          {(() => {
            const topDrop = overallAnalytics?.top_drop_off_scenes?.[0];
            if (topDrop) {
              const displayLabel = chapterAndSceneDisplayMap.get(normalizeId(topDrop.scene_id))?.display || `ฉากที่ ${topDrop.scene_id}`;
              return (
                <div className="wsg-dropoff-info">
                  <div className="wsg-dropoff-title" title={`${displayLabel} - ${topDrop.title}`}>
                    {displayLabel} - {topDrop.title}
                  </div>
                  <div className="wsg-dropoff-stats">
                    อัตราคนหนี: <strong>{formatPercentage(topDrop.drop_off_rate)}</strong> ({formatNumber(topDrop.unique_readers)} คน / {formatNumber(topDrop.visit_count)} ครั้ง)
                  </div>
                </div>
              );
            }
            return <div className="wsg-dropoff-empty">ไม่มีข้อมูลอัตราออกสูง</div>;
          })()}
          <div className="wsg-dropoff-footnote">
            "ฉากที่คนกดออกเยอะที่สุด" คือฉากที่มี Exit Rate สูงสุด
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="wsg-body">
        {/* 🟢 Detail Sidebar ทางซ้าย (แสดงเมื่อคลิกเลือกโหนดฉากเท่านั้น) */}
        {selectedSceneDetails && (
          <aside className={`wsg-sidebar ${isCollapsed ? "collapsed" : ""}`}>
            <div className="wsg-sidebar-tabs">
              <div className="wsg-sidebar-tab-btns">
                <button 
                  type="button"
                  className={`wsg-sidebar-tab-btn ${activeTab === "scene" ? "active" : ""}`}
                  onClick={() => setActiveTab("scene")}
                >
                  สถิติฉาก
                </button>
                <button 
                  type="button"
                  className={`wsg-sidebar-tab-btn ${activeTab === "choice" ? "active" : ""}`}
                  onClick={() => setActiveTab("choice")}
                >
                  สถิติทางเลือก
                </button>
              </div>
              <button 
                type="button"
                className="wsg-sidebar-close-btn" 
                onClick={() => setIsCollapsed(true)} 
                title="ซ่อนรายละเอียด"
              >
                ✕
              </button>
            </div>

            <div className="wsg-sidebar-content">
              {activeTab === "scene" ? (
                isSceneLoading ? (
                  <div className="wsg-loading-overlay">
                    <LoadingScreen message="กำลังโหลดสถิติฉาก..." compact />
                  </div>
                ) : sceneError ? (
                  <div className="wsg-loading-overlay">
                    <p style={{ fontSize: "0.85rem", color: "#b91c1c", margin: 0 }}>{sceneError}</p>
                    <button className="wst-error-button" onClick={() => fetchSceneDetails(selectedSceneId)}>
                      ลองใหม่อีกครั้ง
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{ marginBottom: "20px", textAlign: "left" }}>
                      <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", margin: "0 0 4px 0" }}>
                        {selectedSceneDetails.label} {selectedSceneDetails.title}
                      </h3>
                      <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 500, display: "flex", alignItems: "center", flexWrap: "wrap", gap: "4px" }}>
                        <span>ประเภท:</span>
                        {getSceneTypeBadge(selectedSceneDetails.sceneType)}
                      </span>
                    </div>

                    {/* สถิติสรุปทั่วไป 4 กล่องย่อย */}
                    <div className="wsg-stats-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "24px" }}>
                      {/* ผู้เข้าชมไม่ซ้ำ */}
                      <div style={{ 
                        padding: "12px 8px", 
                        backgroundColor: "#f8fafc", 
                        border: "1px solid #f1f5f9", 
                        borderRadius: "12px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
                      }}>
                        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#0f766e" }}>
                          จำนวนคนอ่าน
                        </span>
                        <span style={{ fontSize: "1.3rem", fontWeight: 800, color: "#0f172a", marginTop: "6px" }}>
                          {formatNumber(sceneAnalytics?.unique_readers)}
                        </span>
                        <span style={{ fontSize: "0.68rem", color: "#64748b", marginTop: "2px" }}>คน</span>
                      </div>
                      
                      {/* เข้าฉากทั้งหมด */}
                      <div style={{ 
                        padding: "12px 8px", 
                        backgroundColor: "#f8fafc", 
                        border: "1px solid #f1f5f9", 
                        borderRadius: "12px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
                      }}>
                        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#3b82f6" }}>
                          เข้าฉากทั้งหมด
                        </span>
                        <span style={{ fontSize: "1.3rem", fontWeight: 800, color: "#0f172a", marginTop: "6px" }}>
                          {formatNumber(sceneAnalytics?.visit_count)}
                        </span>
                        <span style={{ fontSize: "0.68rem", color: "#64748b", marginTop: "2px" }}>ครั้ง</span>
                      </div>
                      
                      {/* เข้าซ้ำ */}
                      <div style={{ 
                        padding: "12px 8px", 
                        backgroundColor: "#f8fafc", 
                        border: "1px solid #f1f5f9", 
                        borderRadius: "12px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
                      }}>
                        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#7c3aed" }}>
                          การเข้า Scene ซ้ำ
                        </span>
                        <span style={{ fontSize: "1.3rem", fontWeight: 800, color: "#0f172a", marginTop: "6px" }}>
                          {formatNumber(sceneAnalytics?.repeat_visit_count)}
                        </span>
                        <span style={{ fontSize: "0.68rem", color: "#64748b", marginTop: "2px" }}>ครั้ง</span>
                      </div>

                      {/* Drop-off Rate */}
                      <div style={{ 
                        padding: "12px 8px", 
                        backgroundColor: "#f8fafc", 
                        border: "1px solid #f1f5f9", 
                        borderRadius: "12px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
                      }}>
                        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#ef4444" }}>
                          กดออกจากฉาก
                        </span>
                        <span style={{ fontSize: "1.3rem", fontWeight: 800, color: "#0f172a", marginTop: "6px" }}>
                          {formatPercentage(sceneAnalytics?.drop_off_rate)}
                        </span>
                        <span style={{ fontSize: "0.68rem", color: "#64748b", marginTop: "2px" }}>
                          {sceneAnalytics && sceneAnalytics.unique_readers !== undefined && sceneAnalytics.drop_off_rate !== undefined
                            ? `ผู้ชมที่คาดว่าออก: ~${Math.round((Number(sceneAnalytics.unique_readers) * Number(sceneAnalytics.drop_off_rate)) / 100).toLocaleString()} คน`
                            : "ผู้ชมที่คาดว่าออก: -"}
                        </span>
                      </div>
                    </div>

                    {/* มาจากฉากก่อนหน้า */}
                    <div style={{ marginTop: "20px" }}>
                      <h4 style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0f172a", margin: "0 0 12px 0", textAlign: "left" }}>
                        มาจากฉากก่อนหน้า
                      </h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {(() => {
                          const prevList = sceneAnalytics?.previous_scenes || [];
                          if (prevList.length > 0) {
                            return prevList.map((item, idx) => {
                              const scId = normalizeId(item.scene_id);
                              const displayLabel = chapterAndSceneDisplayMap.get(scId)?.display || "ฉากก่อนหน้า";

                              return (
                                <button
                                  key={idx} 
                                  type="button"
                                  onClick={() => onPreviousSceneClick(scId)}
                                  style={{ 
                                    padding: "10px 14px", 
                                    backgroundColor: "#f8fafc", 
                                    borderRadius: "8px", 
                                    border: "1px solid #e2e8f0", 
                                    fontSize: "0.85rem", 
                                    color: "#334155",
                                    textAlign: "left",
                                    cursor: "pointer",
                                    width: "100%"
                                  }}
                                >
                                  <div>มาจาก <strong>{displayLabel}</strong> - {item.title || "ไม่มีชื่อฉาก"}</div>
                                  <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "4px" }}>
                                    ผ่านเข้าฉาก {formatNumber(item.transition_count)} ครั้ง ({formatPercentage(item.percentage)})
                                  </div>
                                </button>
                              );
                            });
                          }
                          return <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: 0, textAlign: "left" }}>ไม่มีฉากก่อนหน้า (ฉากนี้เป็นฉากเริ่มต้น)</p>;
                        })()}
                      </div>
                    </div>
                  </>
                )
              ) : (
                isChoiceLoading ? (
                  <div className="wsg-loading-overlay">
                    <LoadingScreen message="กำลังโหลดสถิติทางเลือก..." compact />
                  </div>
                ) : choiceError ? (
                  <div className="wsg-loading-overlay">
                    <p style={{ fontSize: "0.85rem", color: "#b91c1c", margin: 0 }}>{choiceError}</p>
                    <button className="wst-error-button" onClick={() => fetchSceneDetails(selectedSceneId)}>
                      ลองใหม่อีกครั้ง
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="wsg-scene-title-row" style={{ marginBottom: "16px" }}>
                      <h3 className="wsg-scene-title-text" style={{ fontSize: "1rem", fontWeight: 800 }}>
                        {selectedSceneDetails.label} - {selectedSceneDetails.title}
                      </h3>
                      <span className="wsg-scene-type-text">
                        ประเภท: {selectedSceneDetails.sceneType}
                      </span>
                    </div>

                    <h4 className="wsg-section-title" style={{ fontSize: "0.8rem", fontWeight: 800, color: "#334155" }}>สถิติปุ่มทางเลือกในฉากนี้</h4>
                    {choiceAnalytics?.choices && choiceAnalytics.choices.length > 0 ? (
                      <div className="wsg-choice-list" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {(() => {
                          const topId = choiceAnalytics.top_choice?.choice_id;

                          return choiceAnalytics.choices.map((choice, idx) => {
                            const isTop = topId !== undefined && normalizeId(choice.choice_id) === normalizeId(topId);
                            const choiceId = normalizeId(choice.choice_id);
                            const isHighlighted = highlightedChoiceId === choiceId || highlightedChoiceId === choice.label;
                            const targetSceneId = normalizeId(choice.to_scene_id);
                            const hasTarget = Boolean(targetSceneId);
                            const targetLabel = hasTarget ? (chapterAndSceneDisplayMap.get(targetSceneId)?.display || "ฉากปลายทาง") : "";
                            
                            return (
                              <button
                                key={idx} 
                                type="button"
                                disabled={!hasTarget}
                                onClick={() => hasTarget && onChoiceDestinationClick(targetSceneId)}
                                className={`wsg-choice-row-container ${isTop ? "wsg-top-choice-row" : ""} ${isHighlighted ? "wsg-highlighted-choice-row" : ""}`} 
                                style={{ 
                                  padding: "10px", 
                                  border: isTop ? "1.5px solid #d97706" : "1px solid #e2e8f0",
                                  borderRadius: "8px",
                                  width: "100%",
                                  textAlign: "left",
                                  cursor: hasTarget ? "pointer" : "default",
                                  opacity: hasTarget ? 1 : 0.85
                                }}
                              >
                                <div className="wsg-choice-row-top" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <span style={{ fontWeight: 800, fontSize: "0.8rem", color: isTop ? "#92400e" : "#1e293b" }}>
                                    ปุ่ม: "{choice.label || "ไม่มีข้อความ"}"
                                  </span>
                                  {isTop && (
                                    <span className="wsg-top-choice-badge" style={{ backgroundColor: "#d97706", color: "#ffffff", padding: "3px 8px", borderRadius: "12px", fontSize: "0.65rem", fontWeight: 800 }}>
                                      🏆 ปุ่มที่นิยมที่สุด
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "4px", fontWeight: 600, textAlign: "left" }}>
                                  {hasTarget ? (
                                    <span>ไปยัง: {targetLabel} - {choice.target_scene_title || "ไม่มีชื่อฉาก"}</span>
                                  ) : (
                                    <span style={{ color: "#94a3b8" }}>ไปยัง: ยังไม่มีฉากปลายทาง</span>
                                  )}
                                </div>
                                <div className="wsg-choice-row-bottom" style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
                                  <div className="wsg-choice-progress-wrap" style={{ flex: 1, height: "8px", backgroundColor: "#e2e8f0", borderRadius: "4px" }}>
                                    <div 
                                      className="wsg-choice-progress-bar" 
                                      style={{ width: `${Math.min(100, Math.max(0, Number(choice.percentage ?? 0)))}%`, height: "100%", backgroundColor: isTop ? "#d97706" : "#475569", borderRadius: "4px" }} 
                                    />
                                  </div>
                                  <div style={{ fontSize: "0.72rem", fontWeight: 700, display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                                    <span style={{ color: isTop ? "#d97706" : "inherit" }}>{formatPercentage(choice.percentage)}</span>
                                    <span style={{ fontSize: "0.65rem", color: "#64748b" }}>กด {formatNumber(choice.selection_count)} ครั้ง</span>
                                  </div>
                                </div>
                              </button>
                            );
                          });
                        })()}
                      </div>
                    ) : (
                      <div className="wsg-empty-choices" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "30px 10px" }}>
                        <span style={{ fontSize: "2rem" }}>🔗</span>
                        <p style={{ fontSize: "0.85rem", color: "#64748b", margin: 0, marginTop: "8px" }}>ฉากนี้ไม่มีปุ่มทางเลือก</p>
                      </div>
                    )}
                  </>
                )
              )}
            </div>
          </aside>
        )}

        {/* 🟢 Canvas Area ทางขวา */}
        <div className="wsg-canvas-area">
          {/* ข้อความแนะนำเมื่อยังไม่ได้เลือกโหนดฉาก */}
          {!selectedSceneId && (
            <div className="wsg-canvas-hint-pill">
              <span className="wsg-canvas-hint-icon">💡</span>
              <span className="wsg-canvas-hint-text">คลิกเลือกโหนดฉากในแผนผังเพื่อดูสถิติและการตัดสินใจเชิงลึก</span>
            </div>
          )}

          {/* ปุ่มเปิดสไลด์บาร์เมื่อมีโหนดที่เลือกแต่ถูกกดซ่อนไว้ */}
          {isCollapsed && selectedSceneId && (
            <button 
              type="button"
              className="wsg-slidebar-toggle-open" 
              onClick={() => setIsCollapsed(false)}
              title="เปิดแถบรายละเอียดสถิติฉาก"
            >
              <span>📊</span>
              <span>เปิดสถิติฉาก</span>
            </button>
          )}

          <div className="wsg-canvas-wrap">
            {/* 🟢 Legend Overlay แบบ Dropdown ที่สามารถกดซ่อน/แสดงได้ */}
            {(() => {
              const totalVis = overallAnalytics?.unique_readers ?? 0;
              const hMax = totalVis > 0 ? Math.round(totalVis * 0.66) : 1;
              const mMax = totalVis > 0 ? Math.round(totalVis * 0.33) : 1;

              return (
                <div className={`wsg-legend-overlay ${isLegendOpen ? "is-open" : "is-collapsed"}`}>
                  <button
                    type="button"
                    className="wsg-legend-header-btn"
                    onClick={() => setIsLegendOpen((prev) => !prev)}
                    title={isLegendOpen ? "ซ่อนคำอธิบายสัญลักษณ์" : "แสดงคำอธิบายสัญลักษณ์"}
                  >
                    <div className="wsg-legend-header-title">
                      <span className="wsg-legend-icon">ℹ️</span>
                      <span>คำอธิบายสัญลักษณ์</span>
                    </div>
                    <span className="wsg-legend-toggle-icon">
                      {isLegendOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </span>
                  </button>

                  {isLegendOpen && (
                    <div className="wsg-legend-body">
                      <div className="wsg-legend-overlay__section">
                        <h4 className="wsg-legend-overlay__title">👥 ระดับสัดส่วนผู้ชมฉาก</h4>
                        <div className="wsg-legend-overlay__row">
                          <span className="wsg-legend-color-box" style={{ backgroundColor: "#F472B6", border: "1px solid #ec4899" }} />
                          <span>ผู้ชมสูง ({"≥"} {formatNumber(hMax)} คน)</span>
                        </div>
                        <div className="wsg-legend-overlay__row">
                          <span className="wsg-legend-color-box" style={{ backgroundColor: "#F9A8D4", border: "1px solid #f472b6" }} />
                          <span>ผู้ชมปานกลาง ({formatNumber(mMax)} - {formatNumber(hMax - 1)} คน)</span>
                        </div>
                        <div className="wsg-legend-overlay__row">
                          <span className="wsg-legend-color-box" style={{ backgroundColor: "#FCE7F3", border: "1px solid #fbcfe8" }} />
                          <span>ผู้ชมน้อย ({"<"} {formatNumber(mMax)} คน)</span>
                        </div>
                      </div>

                      <div className="wsg-legend-overlay__section">
                        <h4 className="wsg-legend-overlay__title">⚠️ อัตราออกจากฉาก</h4>
                        <div className="wsg-legend-overlay__row" style={{ color: "#ef4444", fontWeight: 700 }}>
                          <span style={{ fontSize: "0.95rem" }}>🔥</span>
                          <span>ฉากที่คนออกสูงสุด (Exit Rate สูงสุด)</span>
                        </div>
                        <div className="wsg-legend-overlay__row" style={{ color: "#c2410c", fontWeight: 600 }}>
                          <span className="wsg-legend-color-box" style={{ backgroundColor: "#ffedd5", border: "1px solid #fdba74" }} />
                          <span>อัตราออกสูง (Exit Rate {"≥"} 25%)</span>
                        </div>
                      </div>

                      <div className="wsg-legend-overlay__section">
                        <h4 className="wsg-legend-overlay__title">➡️ ความนิยมของทางเลือก</h4>
                        <div className="wsg-legend-overlay__row">
                          <span className="wsg-legend-line" style={{ height: "4px", backgroundColor: "#10B981" }} />
                          <span>นิยมสูง ({"≥"} 60%)</span>
                        </div>
                        <div className="wsg-legend-overlay__row">
                          <span className="wsg-legend-line" style={{ height: "3px", backgroundColor: "#F5C84B" }} />
                          <span>ทั่วไป (30% - 59%)</span>
                        </div>
                        <div className="wsg-legend-overlay__row">
                          <span className="wsg-legend-line" style={{ height: "2px", backgroundColor: "#94A3B8" }} />
                          <span>เลือกน้อย ({"<"} 30%)</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {rfNodes.length === 0 ? (
              <div className="wsg-empty-sidebar">
                <p className="wsg-empty-text">ยังไม่มีฉากในโครงสร้างนิยาย</p>
              </div>
            ) : (
              <ReactFlow
                nodes={rfNodes}
                edges={rfEdges}
                nodeTypes={nodeTypes}
                onInit={setReactFlowInstance}
                onNodeClick={onNodeClick}
                onEdgeClick={onEdgeClick}
                onPaneClick={onPaneClick}
                fitView
                minZoom={0.2}
                maxZoom={2}
              >
                <Background variant={BackgroundVariant.Dots} gap={24} size={1.2} color="#e2e8f0" />
                <Controls showInteractive={false} />
                <MiniMap 
                  nodeColor={(node) => {
                    if (node.data?.isMaxDrop) return "#ef4444";
                    if (node.data?.visitors >= (node.data?.highMax || 1600)) return "#F472B6";
                    if (node.data?.visitors >= (node.data?.midMax || 800)) return "#F9A8D4";
                    return "#FCE7F3";
                  }}
                  maskColor="rgba(250, 249, 246, 0.6)"
                />
              </ReactFlow>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StatisticsGraph;
