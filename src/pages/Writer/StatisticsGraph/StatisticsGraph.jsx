import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  ReactFlowProvider,
  useReactFlow,
} from "reactflow";
import axios from "axios";
import "reactflow/dist/style.css";
import "./StatisticsGraph.css";
import LoadingScreen from "../../../components/LoadingScreen/LoadingScreen";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const NODE_WIDTH = 260;
const NODE_HEIGHT = 118;
const NODE_HORIZONTAL_GAP = 360;
const NODE_VERTICAL_GAP = 250;

const VISITOR_SHADES = {
  HIGH: { bg: "#FCE7F3", border: "#EC4899", text: "#9D174D", label: "ผู้ชมสูง" },
  MEDIUM: { bg: "#FFF1F2", border: "#FDA4AF", text: "#BE185D", label: "ผู้ชมปานกลาง" },
  LOW: { bg: "#F8FAFC", border: "#E2E8F0", text: "#475569", label: "ผู้ชมน้อย" },
};

// 🟢 Custom Node Component
const AnalyticsNode = ({ data }) => {
  const isSelected = data.isSelected;
  const isEnding = data.isEnding;
  const isHighExit = !isEnding && data.exitRate >= 25; // อัตราออกสูงกว่า 25% (หากเป็นฉากจบจะไม่นับ)
  const isMaxDrop = data.isMaxDrop;
  
  let shade = VISITOR_SHADES.LOW;
  if (data.visitors >= (data.highMax || 1600)) shade = VISITOR_SHADES.HIGH;
  else if (data.visitors >= (data.midMax || 800)) shade = VISITOR_SHADES.MEDIUM;

  const nodeStyle = {
    backgroundColor: shade.bg,
    color: shade.text,
    position: "relative",
    borderColor: isSelected ? "#2563eb" : (isMaxDrop ? "#ef4444" : (isHighExit ? "#ef4444" : shade.border)),
    borderWidth: isSelected ? "3px" : (isMaxDrop ? "3px" : "2px"),
  };

  const type = stripHtml(data.type || "").toLowerCase();
  const typeIcon = type === "start" || type === "starting" ? "▶ " : (type === "ending" || type === "end" ? "🏆 " : "");

  return (
    <div
      className={`wsg-flow-node ${isHighExit ? "high-exit" : ""} ${
        isSelected ? "active-selection" : ""
      } ${data.hasActiveSelection && !isSelected ? "dimmed" : ""}`}
      style={nodeStyle}
    >
      <Handle type="target" position={Position.Top} style={{ background: isSelected ? "#2563eb" : (isMaxDrop ? "#ef4444" : (isHighExit ? "#ef4444" : shade.border)), width: 8, height: 8 }} />
      
      {(isMaxDrop || isHighExit) && (
        <div 
          style={{
            position: "absolute",
            bottom: "-10px",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "#fee2e2",
            border: isMaxDrop ? "1.5px solid #ef4444" : "1px solid #fca5a5",
            color: "#b91c1c",
            borderRadius: "10px",
            padding: "2px 8px",
            fontSize: "0.65rem",
            fontWeight: 800,
            boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
            whiteSpace: "nowrap",
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            gap: "4px"
          }}
          title={isMaxDrop ? `ฉากที่มีคนออกสูงสุดในเรื่อง: ${Math.round(data.maxDropOffRate)}%` : "จุดที่มีอัตราออกจากฉากสูง"}
        >
          {isMaxDrop ? (
            <>
              <span>🔥 อัตราออกสูงสุด</span>
              <span style={{ fontSize: "0.6rem", opacity: 0.9 }}>({Math.round(data.maxDropOffRate)}%)</span>
            </>
          ) : (
            <>
              <span>⚠️ อัตราออกสูง</span>
              <span style={{ fontSize: "0.6rem", opacity: 0.9 }}>({Math.round(data.exitRate)}%)</span>
            </>
          )}
        </div>
      )}

      <div className="wsg-node-header">
        <span 
          className="wsg-node-label" 
          style={{ 
            backgroundColor: isHighExit ? "#fee2e2" : "rgba(0, 0, 0, 0.07)", 
            color: isHighExit ? "#dc2626" : shade.text,
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
          <strong style={{ color: shade.text, fontWeight: 800 }}>{data.visitors.toLocaleString()}</strong>
        </div>
        <div className="wsg-node-stat-item">
          <span style={{ opacity: 0.85, color: shade.text, fontWeight: 700 }}>Exit Rate:</span>
          <strong style={{ color: isHighExit ? "#e11d48" : shade.text, fontWeight: 800 }}>
            {isEnding ? "-" : `${data.exitRate}%`}
          </strong>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} style={{ background: isSelected ? "#2563eb" : (isMaxDrop ? "#ef4444" : (isHighExit ? "#ef4444" : shade.border)), width: 8, height: 8 }} />
    </div>
  );
};

// nodeTypes is memoized inside the component to prevent React Flow warnings


const CANVAS_MARGIN = 80;

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

const getSceneTypeBadge = (typeStr) => {
  const type = stripHtml(typeStr || "").toLowerCase();
  
  const isStart = type === "start" || type === "starting" || type.includes("เริ่มต้น");
  const isEnding = type === "ending" || type === "end" || type.includes("จบ");

  const typeLabel = isStart ? "จุดเริ่มต้น"
    : isEnding ? (typeStr.includes("(") ? typeStr : "ฉากจบ")
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

function StatisticsGraphContent() {
  const { novelId } = useParams();
  const navigate = useNavigate();
  const { setCenter } = useReactFlow();

  const nodeTypes = useMemo(() => ({
    analyticsNode: AnalyticsNode,
  }), []);
  
  const [novelTitle, setNovelTitle] = useState("นิยายของฉัน");
  const [treeData, setTreeData] = useState(null);
  const [novelChapters, setNovelChapters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // 3 APIs States
  const [overallAnalytics, setOverallAnalytics] = useState(null);
  const [sceneAnalytics, setSceneAnalytics] = useState(null);
  const [choiceAnalytics, setChoiceAnalytics] = useState(null);
  const [allChoicesAnalytics, setAllChoicesAnalytics] = useState({});
  const [allScenesAnalytics, setAllScenesAnalytics] = useState([]);
  const [isSceneLoading, setIsSceneLoading] = useState(false);
  const [isChoiceLoading, setIsChoiceLoading] = useState(false);
  
  // Selection
  const [selectedSceneId, setSelectedSceneId] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState("scene");
  const [showLegend, setShowLegend] = useState(window.innerWidth > 768);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setShowLegend(false);
      } else {
        setShowLegend(true);
      }
    };
    window.addEventListener("resize", handleResize);
    handleResize(); // run on mount
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Fetch Data
  const fetchData = useCallback(async () => {
    if (!novelId) return;
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const [treeRes, chaptersRes, novelRes, analyticsRes, scenesAnalyticsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/novels/${novelId}/story-tree`),
        axios.get(`${API_BASE_URL}/novels/${novelId}/chapters`),
        axios.get(`${API_BASE_URL}/novels/${novelId}`),
        axios.get(`${API_BASE_URL}/api/v1/writer/novels/${novelId}/analytics`, { headers }),
        axios.get(`${API_BASE_URL}/api/v1/writer/novels/${novelId}/analytics/scenes`, { headers })
      ]);
      
      const tree = treeRes.data?.data || treeRes.data || null;
      setTreeData(tree);
      
      const chaptersList = chaptersRes.data?.data?.chapters || chaptersRes.data?.chapters || chaptersRes.data?.data || [];
      setNovelChapters(Array.isArray(chaptersList) ? chaptersList : []);
      
      const title = tree?.NovelTitle || tree?.novel_title || novelRes.data?.data?.title || novelRes.data?.title || novelRes.data?.data?.Title || novelRes.data?.Title;
      if (title) setNovelTitle(title);

      setOverallAnalytics(analyticsRes.data?.data || analyticsRes.data || null);
      setAllScenesAnalytics(scenesAnalyticsRes.data?.data || scenesAnalyticsRes.data || []);

      // ดึงสถิติของทางเลือก (choices) ของทุกโหนดมาแบบคู่ขนานเพื่อใช้คำนวณและแสดงสีเส้นเชื่อมแบบคงที่ ไม่กระพริบเปลี่ยนสีทีหลัง
      const nodesList = tree?.Nodes ?? tree?.nodes ?? [];
      const seen = new Set();
      const uniqueSceneIds = nodesList
        .map((n) => normalizeId(n?.SceneID ?? n?.scene_id ?? n?.id ?? n?.ID))
        .filter((id) => {
          if (!id || seen.has(id)) return false;
          seen.add(id);
          return true;
        });

      const choicesPromises = uniqueSceneIds.map(async (scId) => {
        try {
          const res = await axios.get(
            `${API_BASE_URL}/api/v1/writer/novels/${novelId}/analytics/scenes/${scId}/choices`,
            { headers }
          );
          return { sceneId: scId, data: res.data?.data || res.data || null };
        } catch (e) {
          return { sceneId: scId, data: null };
        }
      });

      const choicesResults = await Promise.all(choicesPromises);
      const choiceMap = {};
      choicesResults.forEach((r) => {
        if (r.data) {
          choiceMap[r.sceneId] = r.data;
        }
      });
      setAllChoicesAnalytics(choiceMap);
    } catch (err) {
      console.error("Error fetching analytics data:", err);
      setError("ไม่สามารถดึงข้อมูลนิยายและสถิติได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsLoading(false);
    }
  }, [novelId]);

  // Fetch Scene Details
  const fetchSceneDetails = useCallback(async (sceneId) => {
    if (!novelId || !sceneId) return;
    setIsSceneLoading(true);
    setIsChoiceLoading(true);
    
    const token = localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const sceneRes = await axios.get(
        `${API_BASE_URL}/api/v1/writer/novels/${novelId}/analytics/scenes/${sceneId}`,
        { headers }
      );
      setSceneAnalytics(sceneRes.data?.data || sceneRes.data || null);
    } catch (err) {
      console.error("Error fetching scene analytics:", err);
      setSceneAnalytics(null);
    } finally {
      setIsSceneLoading(false);
    }

    try {
      const choiceRes = await axios.get(
        `${API_BASE_URL}/api/v1/writer/novels/${novelId}/analytics/scenes/${sceneId}/choices`,
        { headers }
      );
      setChoiceAnalytics(choiceRes.data?.data || choiceRes.data || null);
    } catch (err) {
      console.error("Error fetching choice analytics:", err);
      setChoiceAnalytics(null);
    } finally {
      setIsChoiceLoading(false);
    }
  }, [novelId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (selectedSceneId) {
      fetchSceneDetails(selectedSceneId);
    } else {
      setSceneAnalytics(null);
      setChoiceAnalytics(null);
    }
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

  // Map display layout
  const chapterAndSceneDisplayMap = useMemo(() => {
    if (!uniqueNodes.length) return new Map();

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

    const tempNodes = nodeIds.map((sceneId) => {
      const scene = localMap.get(sceneId);
      const position = positions[sceneId] || { x: CANVAS_MARGIN, y: CANVAS_MARGIN };
      return {
        id: sceneId,
        scene,
        x: scene.x ?? position.x,
        y: scene.y ?? position.y,
      };
    });

    const chapterGroups = new Map();
    const chapterOrder = [];
    tempNodes.forEach((item) => {
      const chapter = getNodeChapter(item.scene) || "อื่นๆ";
      if (!chapterGroups.has(chapter)) {
        chapterGroups.set(chapter, []);
        chapterOrder.push(chapter);
      }
      chapterGroups.get(chapter).push(item.scene);
    });

    const chapters = chapterOrder.map((chapter) => ({ title: chapter, scenes: chapterGroups.get(chapter) }));

    const displayMap = new Map();
    chapters.forEach((chapter, chapterIndex) => {
      chapter.scenes.forEach((scene, sceneIndex) => {
        const id = getNodeId(scene);
        if (id) {
          displayMap.set(id, {
            display: `ฉากที่ ${chapterIndex + 1}.${sceneIndex + 1}`,
            chapterName: chapter.title || `ตอนที่ ${chapterIndex + 1}`,
            chapterNum: chapterIndex + 1,
            sceneNum: sceneIndex + 1,
          });
        }
      });
    });

    return displayMap;
  }, [uniqueNodes, rawEdges]);

  // Node analytics data mapping
  const nodeAnalyticsMap = useMemo(() => {
    const analytics = new Map();
    const uniqueReaders = overallAnalytics?.unique_readers || 2000;
    
    uniqueNodes.forEach((node, index) => {
      const id = getNodeId(node);
      if (!id) return;
      
      const type = getNodeType(node);
      const isStart = type === "start" || type === "starting" || index === 0;
      
      let visitors = Math.max(80, Math.floor(uniqueReaders * Math.pow(0.75, index % 6)));
      if (isStart) visitors = uniqueReaders || 2480;
      
      let exitRate = 2 + (index * 5) % 15;
      let returnRate = Math.floor(5 + (index * 3) % 15);

      // Match with real data from get all scenes endpoint
      if (Array.isArray(allScenesAnalytics)) {
        const sceneData = allScenesAnalytics.find(s => normalizeId(s.scene_id) === id);
        if (sceneData) {
          visitors = sceneData.unique_readers || sceneData.visit_count || visitors;
          exitRate = Math.round(sceneData.drop_off_rate) ?? exitRate;
        }
      }

      if (overallAnalytics?.top_drop_off_scenes) {
        const dropData = overallAnalytics.top_drop_off_scenes.find(d => normalizeId(d.scene_id) === id);
        if (dropData) {
          visitors = dropData.unique_readers || dropData.visit_count || visitors;
          exitRate = Math.round(dropData.drop_off_rate) || exitRate;
        }
      }

      if (selectedSceneId === id && sceneAnalytics) {
        visitors = sceneAnalytics.unique_readers || sceneAnalytics.visit_count || visitors;
        exitRate = Math.round(sceneAnalytics.drop_off_rate) ?? exitRate;
        if (sceneAnalytics.unique_readers > 0) {
          returnRate = Math.round((sceneAnalytics.repeat_visit_count / sceneAnalytics.unique_readers) * 100) || returnRate;
        }
      }

      if (type === "ending" || type === "end") {
        exitRate = 0;
      }

      analytics.set(id, {
        visitors,
        exitRate,
        returnRate,
      });
    });
    return analytics;
  }, [uniqueNodes, overallAnalytics, selectedSceneId, sceneAnalytics, allScenesAnalytics]);

  // Edge Selection Map from API
  const edgeSelectionMap = useMemo(() => {
    const selections = new Map();
    
    const sourceGroups = {};
    rawEdges.forEach((edge) => {
      const fromId = normalizeId(edge.FromID || edge.from_id || edge.from || edge.source || "");
      if (!fromId) return;
      if (!sourceGroups[fromId]) sourceGroups[fromId] = [];
      sourceGroups[fromId].push(edge);
    });

    Object.keys(sourceGroups).forEach((fromId) => {
      const edges = sourceGroups[fromId];
      const count = edges.length;
      if (count === 0) return;
      
      const cachedChoices = allChoicesAnalytics[fromId]?.choices;
      
      if (cachedChoices) {
        edges.forEach((edge) => {
          const toId = normalizeId(edge.ToID || edge.to_id || edge.to || edge.target || "");
          const choiceLabel = edge.Label || edge.label || edge.choice_text || edge.text || "";
          
          const realChoice = cachedChoices.find(
            c => normalizeId(c.choice_id) === normalizeId(edge.data?.ID || edge.data?.id) || 
                 c.label === choiceLabel
          );
          
          const key = `${fromId}->${toId}`;
          const pct = realChoice ? Math.round(realChoice.percentage) : 0;
          selections.set(key, pct);
        });
      } else if (fromId === selectedSceneId && choiceAnalytics?.choices) {
        edges.forEach((edge) => {
          const toId = normalizeId(edge.ToID || edge.to_id || edge.to || edge.target || "");
          const choiceLabel = edge.Label || edge.label || edge.choice_text || edge.text || "";
          
          const realChoice = choiceAnalytics.choices.find(
            c => normalizeId(c.choice_id) === normalizeId(edge.data?.ID || edge.data?.id) || 
                 c.label === choiceLabel
          );
          
          const key = `${fromId}->${toId}`;
          const pct = realChoice ? Math.round(realChoice.percentage) : 0;
          selections.set(key, pct);
        });
      } else {
        let remaining = 100;
        edges.forEach((edge, idx) => {
          const toId = normalizeId(edge.ToID || edge.to_id || edge.to || edge.target || "");
          const key = `${fromId}->${toId}`;
          
          let pct = Math.floor(remaining / (count - idx));
          if (idx === 0 && count > 1) {
            pct = Math.min(80, Math.floor(remaining * 0.65));
          }
          remaining -= pct;
          selections.set(key, pct);
        });
      }
    });

    return selections;
  }, [rawEdges, selectedSceneId, choiceAnalytics, allChoicesAnalytics]);

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

    const maxDropOffScene = overallAnalytics?.top_drop_off_scenes?.[0];
    const totalVisitors = overallAnalytics?.unique_readers || 2480;
    const highMax = Math.round(totalVisitors * 0.66);
    const midMax = Math.round(totalVisitors * 0.33);

    nodeIds.forEach((sceneId) => {
      const scene = localMap.get(sceneId);
      const position = positions[sceneId] || { x: CANVAS_MARGIN, y: CANVAS_MARGIN };

      const apiX = scene.node_x ?? scene.NodeX;
      const apiY = scene.node_y ?? scene.NodeY;
      const hasSavedPosition = apiX !== null && apiX !== undefined && apiY !== null && apiY !== undefined;

      const finalX = hasSavedPosition ? apiX : (scene.x ?? position.x);
      const finalY = hasSavedPosition ? apiY : (scene.y ?? position.y);

      const pos = chapterAndSceneDisplayMap.get(sceneId);
      const analytics = nodeAnalyticsMap.get(sceneId) || { visitors: 0, exitRate: 0, returnRate: 0 };
      const maxDropRate = maxDropOffScene ? Math.round(maxDropOffScene.drop_off_rate) : -1;
      const isMaxDrop = maxDropOffScene && (
        normalizeId(maxDropOffScene.scene_id) === sceneId || 
        (maxDropRate >= 0 && Math.round(analytics.exitRate) === maxDropRate)
      );

      finalNodes.push({
        id: sceneId,
        type: "analyticsNode",
        position: { x: finalX, y: finalY },
        data: {
          title: getNodeTitle(scene),
          labelNum: pos ? pos.display : `ฉากที่ ${sceneId}`,
          visitors: analytics.visitors,
          exitRate: analytics.exitRate,
          returnRate: analytics.returnRate,
          isSelected: selectedSceneId === sceneId,
          hasActiveSelection: !!selectedSceneId,
          highMax,
          midMax,
          isMaxDrop,
          maxDropOffRate: maxDropOffScene?.drop_off_rate || 0,
          type: getNodeType(scene),
          isEnding: getNodeType(scene) === "ending",
        },
      });
    });

    edgeList.forEach((edge) => {
      const src = edge.source;
      const tgt = edge.target;
      const key = `${src}->${tgt}`;
      const pct = edgeSelectionMap.get(key) ?? 100;

      let strokeWidth = 3;
      let strokeColor = "#64748b";
      
      if (pct >= 60) {
        strokeWidth = 6;
        strokeColor = "#059669";
      } else if (pct >= 30) {
        strokeWidth = 4.5;
        strokeColor = "#d97706";
      } else {
        strokeWidth = 3;
        strokeColor = "#64748b";
      }

      const isConnectedToSelection = selectedSceneId && (src === selectedSceneId || tgt === selectedSceneId);
      if (selectedSceneId) {
        if (!isConnectedToSelection) {
          strokeColor = "#cbd5e1";
          strokeWidth = 1.5;
        }
      }

      const choiceName = edge.label || "";
      const edgeLabel = choiceName ? `${choiceName} ${pct}%` : `${pct}%`;

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
        data: { pct },
      });
    });

    return { nodes: finalNodes, edges: finalEdges };
  }, [uniqueNodes, rawEdges, selectedSceneId, chapterAndSceneDisplayMap, nodeAnalyticsMap, edgeSelectionMap, overallAnalytics]);

  const [rfNodes, setRfNodes] = useNodesState([]);
  const [rfEdges, setRfEdges] = useEdgesState([]);

  useEffect(() => {
    if (positionedElements.nodes.length > 0) {
      setRfNodes(positionedElements.nodes);
      setRfEdges(positionedElements.edges);
    }
  }, [positionedElements, setRfNodes, setRfEdges]);

  const onNodeClick = useCallback((event, node) => {
    setSelectedSceneId(prev => {
      const next = prev === node.id ? null : node.id;
      if (next) {
        setIsCollapsed(false);
      }
      return next;
    });
  }, []);

  const focusOnScene = useCallback((sceneId) => {
    const sId = normalizeId(sceneId);
    setSelectedSceneId(sId);
    setIsCollapsed(false);

    const targetNode = rfNodes.find((n) => normalizeId(n.id) === sId);
    if (targetNode && targetNode.position) {
      setCenter(targetNode.position.x + NODE_WIDTH / 2, targetNode.position.y + NODE_HEIGHT / 2, {
        zoom: 1,
        duration: 800,
      });
    }
  }, [rfNodes, setCenter]);

  const onPaneClick = useCallback(() => {
    setSelectedSceneId(null);
  }, []);

  const selectedSceneDetails = useMemo(() => {
    if (!selectedSceneId) return null;
    
    const node = uniqueNodes.find((n) => getNodeId(n) === selectedSceneId);
    if (!node) return null;
    
    const pos = chapterAndSceneDisplayMap.get(selectedSceneId);
    const type = getNodeType(node);
    let sceneType = "ฉากทั่วไป";
    if (type === "start" || type === "starting") {
      sceneType = "ฉากเริ่มต้น";
    } else if (type === "ending" || type === "end") {
      const rawEndingType = (node.ending_type || node.EndingType || node.endingType || "").toString().trim();
      if (rawEndingType) {
        let clean = rawEndingType.trim();
        let formattedEnding = clean.split(/\s+/).map(word => {
          if (!word) return "";
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }).join(" ");
        
        if (!formattedEnding.toLowerCase().endsWith("ending")) {
          formattedEnding = formattedEnding + " Ending";
        }
        sceneType = `ฉากจบ (${formattedEnding})`;
      } else {
        sceneType = "ฉากจบ";
      }
    }
    
    return {
      id: selectedSceneId,
      title: getNodeTitle(node),
      label: pos ? pos.display : "ฉากนิยาย",
      chapterName: pos ? pos.chapterName : "",
      sceneType,
    };
  }, [selectedSceneId, uniqueNodes, chapterAndSceneDisplayMap]);

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
      <header className="wsg-topbar">
        <div className="wsg-topbar__left">
          <button 
            className="wsg-topbar__back"
            onClick={() => navigate(`/writer/${novelId}/chapters`)}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 3L5 7L9 11" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            ย้อนกลับ
          </button>
          <div className="wsg-topbar__divider-v" />
          <h2 className="wsg-topbar__title" title={novelTitle}>
            เรื่อง: {novelTitle.length > 25 ? `${novelTitle.slice(0, 25)}...` : novelTitle}
          </h2>
        </div>

        <div className="wsg-toggle-wrap">
          <button 
            className="wsg-toggle-btn"
            onClick={() => navigate(`/writer/${novelId}/storytree`)}
          >
            โครงสร้าง
          </button>
          <button className="wsg-toggle-btn active">
            วิเคราะห์การเลือกของนักอ่าน
          </button>
        </div>
      </header>

      {/* 🟢 KPI Dashboard แสดงตัวเลขภาพรวม 5 การ์ดตามเพื่อนแนะนำ และคัดกรองสิ่งอื่นออก */}
      <section className="wsg-kpis-new-container">
        {/* การ์ด 1: ยอดวิวรวม */}
        <div className="wsg-kpi-card-large" style={{ height: "100%", justifyContent: "space-between", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "14px", display: "flex", flexDirection: "column", alignItems: "flex-start", backgroundColor: "#fff" }}>
          <span className="wsg-kpi-label-new" style={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b", display: "flex", alignItems: "center", gap: "6px" }}>👁️ ยอดวิวรวม</span>
          <div style={{ marginTop: "auto", textAlign: "left" }}>
            <div style={{ color: "#0f172a", fontSize: "1.45rem", fontWeight: 800 }}>
              {overallAnalytics?.total_views ? overallAnalytics.total_views.toLocaleString() : "0"}
            </div>
            <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>มีคนเปิดอ่านกี่ครั้ง</span>
          </div>
        </div>

        {/* การ์ด 2: จำนวนคนอ่านจริง */}
        <div className="wsg-kpi-card-large" style={{ height: "100%", justifyContent: "space-between", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "14px", display: "flex", flexDirection: "column", alignItems: "flex-start", backgroundColor: "#fff" }}>
          <span className="wsg-kpi-label-new" style={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b", display: "flex", alignItems: "center", gap: "6px" }}>👥 จำนวนคนอ่าน</span>
          <div style={{ marginTop: "auto", textAlign: "left" }}>
            <div style={{ color: "#0f172a", fontSize: "1.45rem", fontWeight: 800 }}>
              {overallAnalytics?.unique_readers ? overallAnalytics.unique_readers.toLocaleString() : "0"}
            </div>
            <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>คน</span>
          </div>
        </div>

        {/* การ์ด 3: คนอ่านจบกี่คน / กี่ % */}
        <div className="wsg-kpi-card-large" style={{ height: "100%", justifyContent: "space-between", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "14px", display: "flex", flexDirection: "column", alignItems: "flex-start", backgroundColor: "#fff" }}>
          <span className="wsg-kpi-label-new" style={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b", display: "flex", alignItems: "center", gap: "6px" }}>🏆 คนอ่านจบ</span>
          <div style={{ marginTop: "auto", textAlign: "left" }}>
            <div style={{ color: "#0f172a", fontSize: "1.45rem", fontWeight: 800 }}>
              {overallAnalytics?.completed_readers ? overallAnalytics.completed_readers.toLocaleString() : "0"} คน
            </div>
            <span style={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: 600 }}>
              คิดเป็น {overallAnalytics?.completion_rate ? overallAnalytics.completion_rate : "0"}%
            </span>
          </div>
        </div>

        {/* การ์ด 4: จบแบบไหนบ้าง (เป็น %) */}
        <div className="wsg-kpi-card-large" style={{ height: "100%", padding: "12px 14px", justifyContent: "space-between", border: "1px solid #e2e8f0", borderRadius: "12px", display: "flex", flexDirection: "column", alignItems: "flex-start", backgroundColor: "#fff" }}>
          <span className="wsg-kpi-label-new" style={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b", display: "flex", alignItems: "center", gap: "6px" }}>🏁 จบแบบไหนบ้าง (เป็น %)</span>
          <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "2px", flex: 1, justifyContent: "center", width: "100%" }}>
            {(() => {
              const allEndingsFromTree = uniqueNodes.filter(n => getNodeType(n) === "ending");
              const rawEndings = overallAnalytics?.ending_stats || [];

              // Collect unique ending types from both the tree nodes and backend stats (ignore fallback scene titles)
              const uniqueEndingTypes = new Set();
              allEndingsFromTree.forEach((sceneNode) => {
                const sceneEndingType = (sceneNode.ending_type || sceneNode.EndingType || sceneNode.endingType || "").toString().trim();
                if (sceneEndingType) {
                  uniqueEndingTypes.add(sceneEndingType);
                }
              });

              rawEndings.forEach((e) => {
                if (e.ending_type) uniqueEndingTypes.add(e.ending_type.trim());
              });

              // Formatting helper for Ending Types
              const formatEndingType = (str) => {
                if (!str) return "";
                let clean = str.trim();
                let formatted = clean.split(/\s+/).map(word => {
                  if (!word) return "";
                  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
                }).join(" ");
                
                if (!formatted.toLowerCase().endsWith("ending")) {
                  formatted = formatted + " Ending";
                }
                return formatted;
              };

              // Group and format endings
              const formattedGroups = {};
              Array.from(uniqueEndingTypes).forEach((endType) => {
                const formattedTitle = formatEndingType(endType);
                if (!formattedTitle) return;

                const statsMatch = rawEndings.find(
                  e => e.ending_type && e.ending_type.trim().toLowerCase() === endType.toLowerCase()
                );

                const count = statsMatch ? (statsMatch.count ?? 0) : 0;
                const percentage = statsMatch ? (statsMatch.percentage !== undefined ? statsMatch.percentage : 0) : 0;

                if (!formattedGroups[formattedTitle]) {
                  formattedGroups[formattedTitle] = { count: 0, percentage: 0 };
                }
                formattedGroups[formattedTitle].count = Math.max(formattedGroups[formattedTitle].count, count);
                formattedGroups[formattedTitle].percentage = Math.max(formattedGroups[formattedTitle].percentage, percentage);
              });

              const mappedEndings = Object.keys(formattedGroups).map((title) => ({
                title,
                count: formattedGroups[title].count,
                percentage: parseFloat(formattedGroups[title].percentage),
              }));

              mappedEndings.sort((a, b) => b.percentage - a.percentage || b.count - a.count);

              if (mappedEndings.length === 0) {
                return (
                  <p style={{ fontSize: "0.72rem", color: "#94a3b8", margin: 0, textAlign: "center" }}>
                    ไม่มีข้อมูลฉากจบ
                  </p>
                );
              }

              return mappedEndings.map((ending, idx) => {
                const colors = ["#10b981", "#f43f5e", "#d97706", "#3b82f6", "#8b5cf6"];
                const color = colors[idx % colors.length];
                const isLast = idx === mappedEndings.length - 1;
                return (
                  <div 
                    key={idx} 
                    style={{ 
                      display: "flex", 
                      justifyContent: "space-between", 
                      fontSize: "0.72rem", 
                      borderBottom: isLast ? "none" : "1px dashed #f1f5f9",
                      padding: "2px 0"
                    }}
                  >
                    <span style={{ fontWeight: 600, color: color }}>
                      {ending.title} ({ending.count} คน)
                    </span>
                    <span style={{ fontWeight: 700 }}>
                      {ending.percentage}%
                    </span>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* การ์ด 5: ฉากคนหนีเยอะสุด */}
        <div className="wsg-kpi-card-large" style={{ height: "100%", border: "1px solid #fca5a5", borderRadius: "12px", padding: "12px 14px", display: "flex", flexDirection: "column", alignItems: "flex-start", backgroundColor: "#fff5f5", justifyContent: "space-between" }}>
          <span className="wsg-kpi-label-new" style={{ fontSize: "0.8rem", fontWeight: 600, color: "#991b1b", display: "flex", alignItems: "center", gap: "6px" }}>🔥 ฉากที่คนกดออกเยอะสุด</span>
          {(() => {
            const topDrop = overallAnalytics?.top_drop_off_scenes?.[0];
            if (topDrop) {
              const displayLabel = chapterAndSceneDisplayMap.get(normalizeId(topDrop.scene_id))?.display || `ฉากที่ ${topDrop.scene_id}`;
              return (
                <div style={{ width: "100%", textAlign: "left", marginTop: "auto" }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#ef4444", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={topDrop.title}>
                    {displayLabel} - {topDrop.title}
                  </div>
                  <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#7f1d1d", marginTop: "2px" }}>
                    อัตราคนหนี: {topDrop.drop_off_rate}% ({topDrop.unique_readers?.toLocaleString() || "0"} คน / {topDrop.visit_count?.toLocaleString() || "0"} ครั้ง)
                  </div>
                </div>
              );
            }
            return <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "auto" }}>ไม่มีข้อมูลอัตราออกสูง</div>;
          })()}
          <div style={{ color: "#b91c1c", fontWeight: 900, fontSize: "0.68rem", borderTop: "1px dashed #fca5a5", paddingTop: "4px", textAlign: "center", width: "100%", marginTop: "4px" }}>
            "ฉากที่คนกดออกเยอะที่สุด" คือฉากที่มี Exit Rate สูงสุด
          </div>
        </div>
      </section>

      <div className="wsg-body">
        {/* 🟢 Detail Sidebar ทางซ้าย */}
        <aside className={`wsg-sidebar ${(!selectedSceneId || isCollapsed) ? "collapsed" : ""}`}>
          {selectedSceneDetails ? (
            <>
              <div className="wsg-sidebar-tabs">
                <div className="wsg-sidebar-tab-btns">
                  <button 
                    className={`wsg-sidebar-tab-btn ${activeTab === "scene" ? "active" : ""}`}
                    onClick={() => setActiveTab("scene")}
                  >
                    สถิติฉาก
                  </button>
                  <button 
                    className={`wsg-sidebar-tab-btn ${activeTab === "choice" ? "active" : ""}`}
                    onClick={() => setActiveTab("choice")}
                  >
                    สถิติทางเลือก
                  </button>
                </div>
                <button className="wsg-sidebar-close-btn" onClick={() => setIsCollapsed(true)} title="ซ่อนรายละเอียด">✕</button>
              </div>

              <div className="wsg-sidebar-content">
                {activeTab === "scene" ? (
                  isSceneLoading ? (
                    <div className="wsg-loading-overlay">
                      <div className="wsg-spinner"></div>
                      <p style={{ fontSize: "0.85rem", color: "#64748b", margin: 0 }}>กำลังโหลดสถิติฉาก...</p>
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
                          padding: "14px 16px", 
                          backgroundColor: "#fff", 
                          border: "1px solid #e2e8f0", 
                          borderRadius: "12px",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
                        }}>
                          <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b", display: "flex", alignItems: "center", gap: "6px" }}>
                            👥 ผู้ชม
                          </span>
                          <span style={{ fontSize: "1.3rem", fontWeight: 800, color: "#0f172a", marginTop: "6px" }}>
                            {sceneAnalytics?.unique_readers !== undefined ? sceneAnalytics.unique_readers.toLocaleString() : "0"}
                          </span>
                          <span style={{ fontSize: "0.68rem", color: "#64748b", marginTop: "2px" }}>คน</span>
                        </div>
                        
                        {/* เข้าฉากทั้งหมด */}
                        <div style={{ 
                          padding: "14px 16px", 
                          backgroundColor: "#fff", 
                          border: "1px solid #e2e8f0", 
                          borderRadius: "12px",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
                        }}>
                          <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b", display: "flex", alignItems: "center", gap: "6px" }}>
                            📖 เข้าฉากทั้งหมด
                          </span>
                          <span style={{ fontSize: "1.3rem", fontWeight: 800, color: "#0f172a", marginTop: "6px" }}>
                            {sceneAnalytics?.visit_count !== undefined ? sceneAnalytics.visit_count.toLocaleString() : "0"}
                          </span>
                          <span style={{ fontSize: "0.68rem", color: "#64748b", marginTop: "2px" }}>ครั้ง</span>
                        </div>
                        
                        {/* เข้าซ้ำ */}
                        <div style={{ 
                          padding: "14px 16px", 
                          backgroundColor: "#fff", 
                          border: "1px solid #e2e8f0", 
                          borderRadius: "12px",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
                        }}>
                          <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b", display: "flex", alignItems: "center", gap: "6px" }}>
                            🔁 เข้า Scene ซ้ำ
                          </span>
                          <span style={{ fontSize: "1.3rem", fontWeight: 800, color: "#0f172a", marginTop: "6px" }}>
                            {sceneAnalytics?.repeat_visit_count !== undefined ? sceneAnalytics.repeat_visit_count.toLocaleString() : "0"}
                          </span>
                          <span style={{ fontSize: "0.68rem", color: "#64748b", marginTop: "2px" }}>ครั้ง</span>
                        </div>

                        {/* Drop-off Rate */}
                        <div style={{ 
                          padding: "14px 16px", 
                          backgroundColor: "#fff", 
                          border: "1px solid #e2e8f0", 
                          borderRadius: "12px",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
                        }}>
                          <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b", display: "flex", alignItems: "center", gap: "6px" }}>
                            🚪 อัตราออก
                          </span>
                          <span style={{ fontSize: "1.3rem", fontWeight: 800, color: "#0f172a", marginTop: "6px" }}>
                            {sceneAnalytics?.drop_off_rate !== undefined ? Math.round(sceneAnalytics.drop_off_rate) : "0"}%
                          </span>
                          <span style={{ fontSize: "0.68rem", color: "#64748b", marginTop: "2px" }}>
                            {sceneAnalytics ? Math.round(sceneAnalytics.unique_readers * sceneAnalytics.drop_off_rate / 100).toLocaleString() : "0"} คนออก
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
                                const displayLabel = chapterAndSceneDisplayMap.get(scId)?.display || `ฉากที่ ${scId}`;

                                return (
                                  <div 
                                    key={idx} 
                                    onClick={() => focusOnScene(item.scene_id)}
                                    style={{ 
                                      padding: "10px 14px", 
                                      backgroundColor: "#f8fafc", 
                                      borderRadius: "8px", 
                                      border: "1px solid #e2e8f0", 
                                      fontSize: "0.85rem", 
                                      color: "#334155",
                                      textAlign: "left",
                                      cursor: "pointer"
                                    }}
                                  >
                                    มาจาก <strong>{displayLabel}</strong> - {item.title || "ไม่มีชื่อฉาก"}
                                    <span style={{ display: "block", fontSize: "0.75rem", color: "#64748b", marginTop: "4px" }}>
                                      จำนวนผู้ข้ามมา: <strong>{item.transition_count ?? 0} คน</strong> (คิดเป็น {item.percentage !== undefined ? item.percentage : 0}%)
                                    </span>
                                  </div>
                                );
                              });
                            }
                            return <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: 0, textAlign: "left" }}>ไม่มีฉากก่อนหน้า (ฉากนี้เป็นฉากเริ่มต้น)</p>;
                          })()}
                        </div>
                      </div>

                      {/* เชื่อมต่อไปยังฉากถัดไป (ฉากปลายทาง) */}
                      <div style={{ marginTop: "24px" }}>
                        <h4 style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0f172a", margin: "0 0 12px 0", textAlign: "left" }}>
                          เชื่อมต่อไปยังฉากถัดไป (ฉากปลายทาง)
                        </h4>
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                          {(() => {
                            const nextList = sceneAnalytics?.next_scenes || [];
                            if (nextList.length > 0) {
                              return nextList.map((item, idx) => {
                                const scId = normalizeId(item.scene_id);
                                const displayLabel = chapterAndSceneDisplayMap.get(scId)?.display || `ฉากที่ ${scId}`;

                                return (
                                  <div 
                                    key={idx} 
                                    onClick={() => focusOnScene(item.scene_id)}
                                    style={{ 
                                      padding: "10px 14px", 
                                      backgroundColor: "#f8fafc", 
                                      borderRadius: "8px", 
                                      border: "1px solid #e2e8f0", 
                                      fontSize: "0.85rem", 
                                      color: "#334155",
                                      textAlign: "left",
                                      cursor: "pointer"
                                    }}
                                  >
                                    ไปยัง <strong>{displayLabel}</strong> - {item.title || "ไม่มีชื่อฉาก"}
                                    <span style={{ display: "block", fontSize: "0.75rem", color: "#64748b", marginTop: "4px" }}>
                                      จำนวนผู้ไปต่อ: <strong>{item.transition_count ?? 0} คน</strong> (คิดเป็น {item.percentage !== undefined ? item.percentage : 0}%)
                                    </span>
                                  </div>
                                );
                              });
                            }
                            return <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: 0, textAlign: "left" }}>ไม่มีฉากปลายทาง (ฉากนี้เป็นฉากจบ)</p>;
                          })()}
                        </div>
                      </div>
                    </>
                  )
                ) : (
                  isChoiceLoading ? (
                    <div className="wsg-loading-overlay">
                      <div className="wsg-spinner"></div>
                      <p style={{ fontSize: "0.85rem", color: "#64748b", margin: 0 }}>กำลังโหลดสถิติทางเลือก...</p>
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

                      <h4 className="wsg-section-title" style={{ fontSize: "0.8rem", fontWeight: 800, color: "#334155" }}>สถิติทางเลือกไปยังฉากถัดไป</h4>
                      {choiceAnalytics?.choices && choiceAnalytics.choices.length > 0 ? (
                        <div className="wsg-choice-list" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                          {(() => {
                            const topId = choiceAnalytics.top_choice?.choice_id;

                            return choiceAnalytics.choices.map((choice, idx) => {
                              const isTop = topId !== undefined && normalizeId(choice.choice_id) === normalizeId(topId);
                              const targetLabel = chapterAndSceneDisplayMap.get(normalizeId(choice.to_scene_id))?.display || `ฉากที่ ${choice.to_scene_id}`;
                              return (
                                <div 
                                  key={idx} 
                                  className={`wsg-choice-row-container ${isTop ? "wsg-top-choice-row" : ""}`} 
                                  onClick={() => {
                                    if (choice.to_scene_id) {
                                      focusOnScene(choice.to_scene_id);
                                    }
                                  }}
                                  style={{ 
                                    padding: "10px", 
                                    border: isTop ? "1.5px solid #d97706" : "1px solid #e2e8f0",
                                    borderRadius: "8px",
                                    cursor: choice.to_scene_id ? "pointer" : "default"
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
                                    ไปยัง: {targetLabel} - {choice.target_scene_title || "ไม่มีชื่อฉาก"}
                                  </div>
                                  <div className="wsg-choice-row-bottom" style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
                                    <div className="wsg-choice-progress-wrap" style={{ flex: 1, height: "8px", backgroundColor: "#e2e8f0", borderRadius: "4px" }}>
                                      <div 
                                        className="wsg-choice-progress-bar" 
                                        style={{ width: `${choice.percentage}%`, height: "100%", backgroundColor: isTop ? "#d97706" : "#475569", borderRadius: "4px" }} 
                                      />
                                    </div>
                                    <div style={{ fontSize: "0.72rem", fontWeight: 700, display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                                      <span style={{ color: isTop ? "#d97706" : "inherit" }}>{Math.round(choice.percentage)}%</span>
                                      <span style={{ fontSize: "0.65rem", color: "#64748b" }}>กด {choice.selection_count.toLocaleString()} ครั้ง</span>
                                    </div>
                                  </div>
                                </div>
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
            </>
          ) : (
            <div className="wsg-empty-sidebar">
              <p className="wsg-empty-text">กรุณาคลิกเลือกโหนดฉากในแผนผังเพื่อดูสถิติและการตัดสินใจเชิงลึก</p>
            </div>
          )}
        </aside>

        {/* 🟢 Canvas Area ทางขวา */}
        <div className="wsg-canvas-area" style={{ position: "relative" }}>
          {isCollapsed && selectedSceneId && (
            <button className="wsg-slidebar-toggle-open" onClick={() => setIsCollapsed(false)}>
              📊 เปิดสถิติฉาก
            </button>
          )}

          {!selectedSceneId && (
            <div 
              className="wsg-empty-notice-banner"
              style={{
                position: "absolute",
                top: "20px",
                left: "20px",
                zIndex: 10,
                backgroundColor: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                padding: "12px 18px",
                fontSize: "0.88rem",
                fontWeight: 500,
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontFamily: "'Sarabun', sans-serif"
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#db2777" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5 5 0 0 0 8 8c0 1 .3 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
                <path d="M9 18h6" />
                <path d="M10 22h4" />
              </svg>
              <div>
                <span style={{ color: "#db2777", fontWeight: 700 }}>คำแนะนำ: </span>
                <span style={{ color: "#475569" }}>คลิกโหนดฉากในแผนผังเพื่อดูสถิติ — ลากเพื่อเลื่อน กด + / - เพื่อซูม</span>
              </div>
            </div>
          )}

          <div className="wsg-canvas-wrap">
            {(() => {
              const totalVis = overallAnalytics?.unique_readers || 2480;
              const hMax = Math.round(totalVis * 0.66);
              const mMax = Math.round(totalVis * 0.33);

              return (
                <div className={`wsg-legend-overlay ${!showLegend ? "collapsed" : ""}`}>
                  <div 
                    className="wsg-legend-header"
                    style={{ 
                      display: "flex", 
                      justifyContent: "space-between", 
                      alignItems: "center", 
                      cursor: "pointer",
                      userSelect: "none"
                    }}
                    onClick={() => setShowLegend(!showLegend)}
                  >
                    <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#1e293b", display: "flex", alignItems: "center", gap: "6px" }}>
                      ℹ️ คำอธิบายสัญลักษณ์
                    </span>
                    <button 
                      style={{ 
                        background: "none", 
                        border: "none", 
                        cursor: "pointer", 
                        fontSize: "0.75rem", 
                        color: "#db2777",
                        fontWeight: 700,
                        padding: "2px 6px"
                      }}
                    >
                      {showLegend ? "▲ ซ่อน" : "▼ แสดง"}
                    </button>
                  </div>

                  {showLegend && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "8px" }}>
                      <div className="wsg-legend-overlay__section">
                        <h4 className="wsg-legend-overlay__title">👥 ระดับสัดส่วนผู้ชมฉาก</h4>
                        <div className="wsg-legend-overlay__row">
                          <span className="wsg-legend-color-box" style={{ backgroundColor: "#F472B6", border: "1px solid #ec4899" }} />
                          <span>ผู้ชมสูง ({"≥"} {hMax.toLocaleString()} คน)</span>
                        </div>
                        <div className="wsg-legend-overlay__row">
                          <span className="wsg-legend-color-box" style={{ backgroundColor: "#F9A8D4", border: "1px solid #f472b6" }} />
                          <span>ผู้ชมปานกลาง ({mMax.toLocaleString()} - {(hMax - 1).toLocaleString()} คน)</span>
                        </div>
                        <div className="wsg-legend-overlay__row">
                          <span className="wsg-legend-color-box" style={{ backgroundColor: "#FCE7F3", border: "1px solid #fbcfe8" }} />
                          <span>ผู้ชมน้อย ({"<"} {mMax.toLocaleString()} คน)</span>
                        </div>
                      </div>

                      <div className="wsg-legend-overlay__section">
                        <h4 className="wsg-legend-overlay__title">⚠️ อัตราออกสูง</h4>
                        <div className="wsg-legend-overlay__row" style={{ color: "#b91c1c", fontWeight: 700 }}>
                          <span className="wsg-legend-color-box" style={{ backgroundColor: "#fee2e2", border: "1px solid #fca5a5" }} />
                          <span>Exit Rate {"≥"} 25% ⚠️</span>
                        </div>
                      </div>

                      <div className="wsg-legend-overlay__section">
                        <h4 className="wsg-legend-overlay__title">➡️ ความนิยมของทางเลือก</h4>
                        <div className="wsg-legend-overlay__row">
                          <span className="wsg-legend-line" style={{ height: "6px", backgroundColor: "#059669" }} />
                          <span>นิยมสูง ({"≥"} 60%)</span>
                        </div>
                        <div className="wsg-legend-overlay__row">
                          <span className="wsg-legend-line" style={{ height: "4.5px", backgroundColor: "#d97706" }} />
                          <span>ทั่วไป (30% - 59%)</span>
                        </div>
                        <div className="wsg-legend-overlay__row">
                          <span className="wsg-legend-line" style={{ height: "3px", backgroundColor: "#64748b" }} />
                          <span>เลือกน้อย ({"<"} 30%)</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            <ReactFlow
              nodes={rfNodes}
              edges={rfEdges}
              nodeTypes={nodeTypes}
              onNodeClick={onNodeClick}
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
          </div>
        </div>
      </div>
    </div>
  );
}

function StatisticsGraph() {
  return (
    <ReactFlowProvider>
      <StatisticsGraphContent />
    </ReactFlowProvider>
  );
}

export default StatisticsGraph;