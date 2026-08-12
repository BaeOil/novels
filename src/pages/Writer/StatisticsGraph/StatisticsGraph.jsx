import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
import axios from "axios";
import "reactflow/dist/style.css";
import "./StatisticsGraph.css";
import LoadingScreen from "../../../components/LoadingScreen/LoadingScreen";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const NODE_WIDTH = 260;
const NODE_HEIGHT = 118;
const NODE_HORIZONTAL_GAP = 360;
const NODE_VERTICAL_GAP = 250;

// โทนสีชมพูวิเคราะห์ระดับผู้ชมให้ตรงกับสัญลักษณ์เป๊ะๆ (BE5985, EC7FA9, FFB8E0, FFEDFA)
// และเลือกสีตัวอักษรตัดกับสีโหนดอย่างสมบูรณ์แบบ
const VISITOR_SHADES = {
  VERY_HIGH: { bg: "#BE5985", border: "#9a3962", text: "#ffffff", label: "ผู้ชมสูงมาก" }, // สีชมพูเข้ม อักษรขาวหนาพิเศษ
  HIGH: { bg: "#EC7FA9", border: "#cd5c87", text: "#ffffff", label: "ผู้ชมมาก" },     // สีชมพูกลาง อักษรขาวหนาพิเศษ
  MEDIUM: { bg: "#FFB8E0", border: "#e88bbd", text: "#2c0217", label: "ผู้ชมปานกลาง" },  // สีชมพูสว่าง อักษรแดงเข้มหนาพิเศษ
  LOW: { bg: "#FFEDFA", border: "#f6cbe8", text: "#4c0529", label: "ผู้ชมน้อย" },     // สีชมพูจางมาก อักษรแดงเข้มหนาพิเศษ
};

// 🟢 Custom Node Component สำหรับหน้าสถิติ
const AnalyticsNode = ({ data }) => {
  const isSelected = data.isSelected;
  const isHighExit = data.exitRate >= 25; // อัตราออกสูงกว่า 25%
  
  // หาสีโหนดที่สอดคล้องกับสัดส่วนผู้ชม (ไดนามิกเทียบจาก kpiStats.totalVisitors)
  let shade = VISITOR_SHADES.LOW;
  if (data.visitors >= (data.highMax || 1860)) shade = VISITOR_SHADES.VERY_HIGH;
  else if (data.visitors >= (data.midMax || 1240)) shade = VISITOR_SHADES.HIGH;
  else if (data.visitors >= (data.lowMax || 620)) shade = VISITOR_SHADES.MEDIUM;

  const nodeStyle = {
    backgroundColor: shade.bg,
    borderColor: isHighExit ? "#ef4444" : shade.border,
    color: shade.text,
  };

  return (
    <div
      className={`wsg-flow-node ${isHighExit ? "high-exit" : ""} ${
        isSelected ? "active-selection" : ""
      } ${data.hasActiveSelection && !isSelected && !isHighExit ? "dimmed" : ""}`}
      style={nodeStyle}
    >
      {/* Handles */}
      <Handle type="target" position={Position.Left} style={{ background: isHighExit ? "#ef4444" : shade.border, width: 8, height: 8 }} />
      
      <div className="wsg-node-header">
        <span 
          className="wsg-node-label" 
          style={{ 
            backgroundColor: isHighExit ? "#fee2e2" : (shade.text === "#ffffff" ? "rgba(255, 255, 255, 0.25)" : "rgba(0, 0, 0, 0.07)"), 
            color: isHighExit ? "#dc2626" : shade.text,
            fontWeight: 800
          }}
        >
          {data.labelNum || "ฉาก"}
        </span>
        
        <div className="wsg-node-status-badge">
          {isHighExit && <span title="จุดที่มีอัตราออกจากฉากสูงมาก (คอขวด)!" style={{ fontSize: "1.1rem" }}>🔥</span>}
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
            {data.exitRate}%
          </strong>
        </div>
      </div>

      <Handle type="source" position={Position.Right} style={{ background: isHighExit ? "#ef4444" : shade.border, width: 8, height: 8 }} />
    </div>
  );
};

const nodeTypes = {
  analyticsNode: AnalyticsNode,
};

const CANVAS_MARGIN = 80;

const normalizeId = (value) => {
  if (value === undefined || value === null || value === "") return "";
  return String(value);
};

const stripHtml = (value) => {
  if (typeof value !== "string") return value;
  return value
    .replace(/<\/?[^>]+(>|$)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const getNodeId = (node) => normalizeId(node?.ID ?? node?.id ?? node?.SceneID ?? node?.scene_id);
const getNodeType = (node) => stripHtml((node?.Type ?? node?.type ?? "")).toLowerCase();
const getNodeTitle = (node) => stripHtml(node?.Title || node?.title || node?.Label || node?.label || `ฉากที่ ${getNodeId(node)}`);
const getNodeChapter = (node) => stripHtml(node?.ChapterTitle || node?.chapter_title || node?.chapter || node?.chapterName || node?.chapter_name || "");

function StatisticsGraph() {
  const { novelId } = useParams();
  const navigate = useNavigate();
  
  // State การดึงข้อมูล
  const [novelTitle, setNovelTitle] = useState(() => {
    const localNovelStr = localStorage.getItem("selectedNovel");
    if (localNovelStr) {
      try {
        const localNovel = JSON.parse(localNovelStr);
        return localNovel.title || localNovel.Title || localNovel.novel_name || "นิยายของฉัน";
      } catch (e) {
        console.error(e);
      }
    }
    return "นิยายของฉัน";
  });
  const [treeData, setTreeData] = useState(null);
  const [novelChapters, setNovelChapters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter States
  const [timeRange, setTimeRange] = useState("30days");
  const [readerGroup, setReaderGroup] = useState("all");
  
  // Selection
  const [selectedSceneId, setSelectedSceneId] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState("scene");

  // ดึงข้อมูลหลักจาก API เหมือนหน้า Story Tree
  const fetchData = useCallback(async () => {
    if (!novelId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [treeRes, chaptersRes, novelRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/novels/${novelId}/story-tree`),
        axios.get(`${API_BASE_URL}/novels/${novelId}/chapters`),
        axios.get(`${API_BASE_URL}/novels/${novelId}`)
      ]);
      
      setTreeData(treeRes.data?.data || treeRes.data || null);
      
      const chaptersList = chaptersRes.data?.data?.chapters || chaptersRes.data?.chapters || chaptersRes.data?.data || [];
      setNovelChapters(Array.isArray(chaptersList) ? chaptersList : []);
      
      const title = novelRes.data?.data?.title || 
                    novelRes.data?.title || 
                    novelRes.data?.data?.Title || 
                    novelRes.data?.Title || 
                    novelRes.data?.data?.name || 
                    novelRes.data?.name;
      if (title) setNovelTitle(title);
    } catch (err) {
      console.error("Error fetching analytics data:", err);
      setError("ไม่สามารถดึงข้อมูลนิยายและสถิติได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsLoading(false);
    }
  }, [novelId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const rawNodes = treeData?.Nodes ?? treeData?.nodes ?? [];
  const rawEdges = treeData?.Edges ?? treeData?.edges ?? [];

  // กรองฉากที่ซ้ำ
  const uniqueNodes = useMemo(() => {
    const seen = new Set();
    return rawNodes.filter((scene) => {
      const id = getNodeId(scene);
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [rawNodes]);

  // 🟢 Mock Data เปอร์เซ็นต์การเลือกเส้นเชื่อม (Choices/Edges Selection Pct)
  const edgeSelectionMap = useMemo(() => {
    const selections = new Map();
    
    // จัดกลุ่มตาม Source node
    const sourceGroups = {};
    rawEdges.forEach((edge) => {
      const fromId = normalizeId(edge.FromID || edge.from_id || edge.from || edge.source || "");
      if (!fromId) return;
      if (!sourceGroups[fromId]) sourceGroups[fromId] = [];
      sourceGroups[fromId].push(edge);
    });

    // แบ่งเปอร์เซ็นต์ให้รวมกันได้ 100% สำหรับแต่ละ source
    Object.keys(sourceGroups).forEach((fromId) => {
      const edges = sourceGroups[fromId];
      const count = edges.length;
      if (count === 0) return;
      
      let remaining = 100;
      edges.forEach((edge, idx) => {
        const toId = normalizeId(edge.ToID || edge.to_id || edge.to || edge.target || "");
        const key = `${fromId}->${toId}`;
        
        let pct = Math.floor(remaining / (count - idx));
        // เติมลูกเล่นให้บางทางเลือกนิยมกว่า
        if (idx === 0 && count > 1) {
          pct = Math.min(80, Math.floor(remaining * 0.65));
        }
        remaining -= pct;
        selections.set(key, pct);
      });
    });

    return selections;
  }, [rawEdges]);

  // สร้าง Map บทเรียนและตอน โดยใช้ลอจิก BFS + Layout แบบเดียวกับ Story Tree
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

  // 🟢 Mock Data สถิติประกอบการวิเคราะห์ตัดสินใจ
  const nodeAnalyticsMap = useMemo(() => {
    const analytics = new Map();
    uniqueNodes.forEach((node, index) => {
      const id = getNodeId(node);
      if (!id) return;
      
      const type = getNodeType(node);
      const isStart = type === "start" || type === "starting" || index === 0;
      let visitors = Math.max(80, Math.floor(1800 * Math.pow(0.72, index % 6)));
      if (isStart) visitors = 2480;
      
      let exitRate = 2 + (index * 7) % 18;
      if (index === 2 || index === 5) {
        exitRate = 34; // คอขวดสุ่มฉากที่ 2 และ 5 ให้มีปัญหา Exit Rate สูง
      }

      const returnRate = Math.floor(5 + (index * 3) % 20);

      analytics.set(id, {
        visitors,
        exitRate,
        returnRate,
      });
    });
    return analytics;
  }, [uniqueNodes]);

  // คำนวณ KPI Cards
  const kpiStats = useMemo(() => {
    let totalVisitors = 2480;
    let endSceneVisitors = 0;
    
    let highestExitScene = { title: "ไม่มีข้อมูล", rate: 0, label: "" };
    
    nodeAnalyticsMap.forEach((data, id) => {
      const node = uniqueNodes.find(n => getNodeId(n) === id);
      const type = getNodeType(node);
      const isEnding = type === "ending" || type === "end";
      if (isEnding) {
        endSceneVisitors += data.visitors;
      }
      
      const pos = chapterAndSceneDisplayMap.get(id);
      const label = pos ? pos.display : "ฉากที่ ?";
      if (data.exitRate > highestExitScene.rate) {
        highestExitScene = {
          title: node ? getNodeTitle(node) : "ฉากไม่มีชื่อ",
          rate: data.exitRate,
          label: label,
        };
      }
    });

    const completionRate = totalVisitors > 0 
      ? Math.round((endSceneVisitors / totalVisitors) * 100) 
      : 0;

    return {
      totalVisitors,
      completionRate: Math.max(12, completionRate || 68),
      highestExitScene,
    };
  }, [nodeAnalyticsMap, uniqueNodes, chapterAndSceneDisplayMap]);

  const avgReturnRate = useMemo(() => {
    if (!uniqueNodes.length) return 8;
    const rates = Array.from(nodeAnalyticsMap.values()).map((a) => a.returnRate);
    const sum = rates.reduce((a, b) => a + b, 0);
    return Math.round(sum / uniqueNodes.length) || 8;
  }, [uniqueNodes, nodeAnalyticsMap]);

  const { popularSceneLabel, popularScenePct } = useMemo(() => {
    let maxPct = 0;
    let popularLabel = "ฉาก 1.2";
    
    edgeSelectionMap.forEach((pct, key) => {
      if (pct > maxPct) {
        maxPct = pct;
        const fromId = key.split("->")[0];
        const pos = chapterAndSceneDisplayMap.get(fromId);
        if (pos) {
          popularLabel = pos.display;
        }
      }
    });
    
    return {
      popularSceneLabel: popularLabel,
      popularScenePct: maxPct || 65,
    };
  }, [edgeSelectionMap, chapterAndSceneDisplayMap]);

  // จัดวาง Layout ตำแหน่งของ Nodes และ Edges อัตโนมัติ เลียนแบบ Story Tree เป๊ะๆ
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
    const nodeStatuses = {};

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

    const formatNodeStatus = (node) => {
      const type = getNodeType(node);
      if (type === "start" || type === "starting") return "start";
      if (type === "ending" || type === "end") return "ending";
      return "normal";
    };

    nodeIds.forEach((id) => {
      const node = localMap.get(id);
      const type = getNodeType(node);
      const isStartNode = type === "start" || type === "starting";
      const hasIncoming = inDegree[id] > 0;

      if (!isStartNode && !hasIncoming) {
        nodeStatuses[id] = "orphan";
      } else {
        nodeStatuses[id] = formatNodeStatus(node);
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

    const totalVisitors = kpiStats.totalVisitors || 2480;
    const highMax = Math.round(totalVisitors * 0.75);
    const midMax = Math.round(totalVisitors * 0.50);
    const lowMax = Math.round(totalVisitors * 0.25);

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
          lowMax,
        },
      });
    });

    edgeList.forEach((edge) => {
      const src = edge.source;
      const tgt = edge.target;
      const key = `${src}->${tgt}`;
      
      const pct = edgeSelectionMap.get(key) ?? 100;

      let strokeWidth = 2;
      let strokeColor = "#DCCFC0"; // ทั่วไป/เลือกน้อย
      
      if (pct >= 60) {
        strokeWidth = 4;
        strokeColor = "#7DCCAD"; // นิยมสูง
      } else if (pct >= 30) {
        strokeWidth = 2.5;
        strokeColor = "#FFEA88"; // ทั่วไป
      } else {
        strokeWidth = 1.5;
        strokeColor = "#DCCFC0"; // เลือกน้อย
      }

      // เมื่อกดยืนยันเลือกโหนดใด จะโฟกัสเส้นทางเข้า-ออกของโหนดนั้นเป็นสี 3874FF
      const isConnectedToSelection = selectedSceneId && (src === selectedSceneId || tgt === selectedSceneId);
      if (selectedSceneId) {
        if (isConnectedToSelection) {
          strokeColor = "#3874FF"; // โฟกัสสีน้ำเงินเด่น
          strokeWidth = 4;
        } else {
          strokeColor = "#e2e8f0"; // หรี่เส้นอื่นๆ ที่ไม่เกี่ยวข้อง
          strokeWidth = 1;
        }
      }

      finalEdges.push({
        id: edge.id,
        source: src,
        target: tgt,
        label: `${pct}%`,
        type: "smoothstep", // เส้นเชื่อมโค้งมน smoothstep
        animated: false,   // ไม่มีเคลื่อนที่
        style: {
          stroke: strokeColor,
          strokeWidth: strokeWidth,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: strokeColor,
        },
        data: {
          pct,
        },
      });
    });

    return { nodes: finalNodes, edges: finalEdges };
  }, [uniqueNodes, rawEdges, selectedSceneId, chapterAndSceneDisplayMap, nodeAnalyticsMap, edgeSelectionMap]);

  // ควบคุม React Flow state
  const [rfNodes, setRfNodes] = useNodesState([]);
  const [rfEdges, setRfEdges] = useEdgesState([]);

  useEffect(() => {
    if (positionedElements.nodes.length > 0) {
      setRfNodes(positionedElements.nodes);
      setRfEdges(positionedElements.edges);
    }
  }, [positionedElements, setRfNodes, setRfEdges]);

  // จัดการเมื่อคลิกที่ Node
  const onNodeClick = useCallback((event, node) => {
    setSelectedSceneId(prev => {
      const next = prev === node.id ? null : node.id;
      if (next) {
        setIsCollapsed(false); // กางปุ่มสไลด์บาร์อัตโนมัติ
      }
      return next;
    });
  }, []);

  // จัดการเมื่อคลิกที่ Pane (Canvas โล่งๆ) เพื่อ Reset selection
  const onPaneClick = useCallback(() => {
    setSelectedSceneId(null);
  }, []);

  // ดึงรายละเอียดของฉากที่ถูกเลือกมาแสดงใน Sidebar
  const selectedSceneDetails = useMemo(() => {
    if (!selectedSceneId) return null;
    
    const node = uniqueNodes.find(n => getNodeId(n) === selectedSceneId);
    if (!node) return null;
    
    const pos = chapterAndSceneDisplayMap.get(selectedSceneId);
    const type = getNodeType(node);
    let sceneType = "ฉากทั่วไป";
    if (type === "start" || type === "starting") sceneType = "ฉากเริ่มต้น";
    else if (type === "ending" || type === "end") sceneType = "ฉากตอนจบ";
    const analytics = nodeAnalyticsMap.get(selectedSceneId) || { visitors: 0, exitRate: 0, returnRate: 0 };
    
    // ดึงเส้นทางที่นำมาสู่ฉากนี้ (Incoming) และ ทางเลือกออกไป (Outgoing)
    const incoming = [];
    const outgoing = [];
    
    rawEdges.forEach((edge) => {
      const from = normalizeId(edge.FromID || edge.from_id || edge.from || edge.source || "");
      const to = normalizeId(edge.ToID || edge.to_id || edge.to || edge.target || "");
      const key = `${from}->${to}`;
      
      const pct = edgeSelectionMap.get(key) ?? 100;
      
      if (to === selectedSceneId) {
        const srcNode = uniqueNodes.find(n => getNodeId(n) === from);
        const srcPos = chapterAndSceneDisplayMap.get(from);
        incoming.push({
          sceneId: from,
          title: srcNode ? getNodeTitle(srcNode) : "ฉากก่อนหน้า",
          label: srcPos ? srcPos.display : "ฉากก่อนหน้า",
          choiceText: edge.Label || edge.label || edge.choice_text || edge.text || "เลือกไปต่อ...",
          pct,
        });
      }
      
      if (from === selectedSceneId) {
        const destNode = uniqueNodes.find(n => getNodeId(n) === to);
        const destPos = chapterAndSceneDisplayMap.get(to);
        outgoing.push({
          sceneId: to,
          title: destNode ? getNodeTitle(destNode) : "ฉากปลายทาง",
          label: destPos ? destPos.display : "ฉากถัดไป",
          choiceText: edge.Label || edge.label || edge.choice_text || edge.text || "เลือกทางเลือกนี้...",
          pct,
        });
      }
    });

    // จำลองตอนจบ (Ending Distribution) หากเป็นฉากตอนท้ายๆ
    const endDistribution = [
      { name: "Good Ending", count: Math.round(analytics.visitors * 0.65), color: "#10b981", pct: 65 },
      { name: "Bad Ending", count: Math.round(analytics.visitors * 0.25), color: "#f43f5e", pct: 25 },
      { name: "Secret Ending", count: Math.round(analytics.visitors * 0.10), color: "#f59e0b", pct: 10 },
    ];

    // สร้างคำแนะนำอัจฉริยะ (AI Insight Suggestion) อิงตามข้อมูล Exit Rate
    let insightTitle = "สถิติมีความสอดคล้องดี";
    let insightText = "ฉากนี้มีอัตราผู้อ่านไปต่อได้ค่อนข้างสูง ทางเลือกที่คุณมอบให้มีสัดส่วนสอดคล้องกับพฤติกรรมความชอบของตลาด";
    
    if (analytics.exitRate >= 25) {
      insightTitle = "พบคอขวด (Exit Rate สูงผิดปกติ)!";
      insightText = "ผู้อ่านกว่า " + analytics.exitRate + "% ตัดสินใจกดปิดและออกจากระบบที่ฉากนี้ แนะนำให้ตรวจเช็คความน่าสนใจของเนื้อหา หรือเพิ่มทางเลือกที่หลากหลายขึ้นเพื่อกระตุ้นความน่าอ่าน";
    } else if (analytics.returnRate >= 18) {
      insightTitle = "นักอ่านชอบย้อนกลับบทเรียนนี้";
      insightText = "มีอัตราการย้อนกลับอ่านเฉลี่ยสูงถึง " + analytics.returnRate + "% แปลว่าฉากดังกล่าวมีเนื้อหาหรือความลับที่นักอ่านมักกดย้อนกลับไปอ่านทวนบ่อยครั้ง";
    }

    return {
      id: selectedSceneId,
      title: getNodeTitle(node),
      label: pos ? pos.display : "ฉากนิยาย",
      chapterName: pos ? pos.chapterName : "",
      visitors: analytics.visitors,
      exitRate: analytics.exitRate,
      returnRate: analytics.returnRate,
      sceneType,
      incoming,
      outgoing,
      endDistribution,
      insight: {
        title: insightTitle,
        text: insightText,
      }
    };
  }, [selectedSceneId, uniqueNodes, chapterAndSceneDisplayMap, nodeAnalyticsMap, rawEdges, edgeSelectionMap]);

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
      {/* 🟢 Topbar ติดตั้งหัวเครื่องมือ และปุ่ม Toggle */}
      <header className="wsg-topbar">
        <div className="wsg-topbar__left">
          <button 
            className="wsg-topbar__back"
            onClick={() => navigate(`/writer/${novelId}/chapters`)}
          >
            ← รายชื่อตอน
          </button>
          <div className="wsg-topbar__divider-v" />
          <h2 className="wsg-topbar__title" title={novelTitle}>
            เรื่อง: {novelTitle.length > 25 ? `${novelTitle.slice(0, 25)}...` : novelTitle}
          </h2>
        </div>

        {/* ปุ่มสลับโครงสร้าง (Structure) กับสถิติวิเคราะห์ (Analytics) */}
        <div className="wsg-toggle-wrap">
          <button 
            className="wsg-toggle-btn"
            onClick={() => navigate(`/writer/${novelId}/storytree`)}
          >
            โครงสร้าง
          </button>
          <button className="wsg-toggle-btn active">
            วิเคราะห์การตัดสินใจ
          </button>
        </div>

        <div className="wsg-topbar__filters">
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
            className="wsg-filter-select"
            title="ช่วงเวลาวิเคราะห์"
          >
            <option value="7days">7 วันล่าสุด</option>
            <option value="30days">30 วันล่าสุด</option>
            <option value="3months">3 เดือนล่าสุด</option>
            <option value="all">ทั้งหมด</option>
          </select>

          <select 
            value={readerGroup} 
            onChange={(e) => setReaderGroup(e.target.value)}
            className="wsg-filter-select"
            title="กลุ่มผู้ใช้"
          >
            <option value="all">นักอ่านทั้งหมด</option>
            <option value="premium">นักอ่าน</option>
            <option value="free">ผู้เยี่ยมชม</option>
          </select>
        </div>
      </header>

      {/* 🟢 KPI Dashboard แสดงตัวเลขภาพรวมแบบใหม่ 5 การ์ด + 3 คำแนะนำระบบ */}
      <section className="wsg-kpis-new-container">
        {/* ฝั่งซ้าย: ภาพรวม (5 การ์ด) */}
        <div className="wsg-kpis-left-panel">
          <div className="wsg-kpis-header-row">
            <span className="wsg-panel-title-icon">📊</span>
            <h3 className="wsg-panel-title">ภาพรวม</h3>
          </div>
          
          <div className="wsg-kpis-grid-layout">
            {/* การ์ดใบใหญ่: นักอ่านทั้งหมด (ปรับเป็นสีเขียวเพื่อความโดดเด่นตัดกับธีม) */}
            <div className="wsg-kpi-card-large">
              <div className="wsg-kpi-badge-icon" style={{ backgroundColor: "#dcfce7" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#16a34a" }}>
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
              <div>
                <div className="wsg-kpi-label-new">นักอ่านทั้งหมด</div>
                <div className="wsg-kpi-val-large" style={{ color: "#16a34a" }}>{kpiStats.totalVisitors.toLocaleString()}</div>
              </div>
              <div className="wsg-kpi-sub-new" style={{ color: "#16a34a", fontWeight: 600 }}>+12% จากเดือนก่อน</div>
            </div>

            {/* การ์ดใบเล็ก 4 ใบ จัดเป็น Grid 2x2 พร้อมตัวเลขอยู่ขวา */}
            <div className="wsg-kpis-small-grid">
              {/* การ์ด 2: Completion Rate */}
              <div className="wsg-kpi-card-small card-blue">
                <div className="wsg-kpi-card-small-left">
                  <div className="wsg-kpi-badge-icon small-icon" style={{ backgroundColor: "#e0f2fe" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#0284c7" }}>
                      <line x1="6" y1="3" x2="6" y2="15"></line>
                      <circle cx="18" cy="6" r="3"></circle>
                      <circle cx="6" cy="18" r="3"></circle>
                      <path d="M18 9a9 9 0 0 1-9 9"></path>
                    </svg>
                  </div>
                  <div className="wsg-kpi-text-col">
                    <div className="wsg-kpi-label-new">Completion Rate</div>
                    <div className="wsg-kpi-sub-new">เดินทางถึงจบ</div>
                  </div>
                </div>
                <div className="wsg-kpi-val-small text-blue">{kpiStats.completionRate || 183}%</div>
              </div>

              {/* การ์ด 3: Highest Exit */}
              <div className="wsg-kpi-card-small card-red">
                <div className="wsg-kpi-card-small-left">
                  <div className="wsg-kpi-badge-icon small-icon" style={{ backgroundColor: "#fee2e2" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#dc2626" }}>
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                      <polyline points="16 17 21 12 16 7"></polyline>
                      <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                  </div>
                  <div className="wsg-kpi-text-col">
                    <div className="wsg-kpi-label-new">Highest Exit</div>
                    <div className="wsg-kpi-sub-new" title={kpiStats.highestExitScene.title}>
                      ที่{kpiStats.highestExitScene.label || "ฉาก 1.3"}
                    </div>
                  </div>
                </div>
                <div className="wsg-kpi-val-small text-red">{kpiStats.highestExitScene.rate || 34}%</div>
              </div>

              {/* การ์ด 4: Avg. Return Rate */}
              <div className="wsg-kpi-card-small card-purple">
                <div className="wsg-kpi-card-small-left">
                  <div className="wsg-kpi-badge-icon small-icon" style={{ backgroundColor: "#f3e8ff" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#7c3aed" }}>
                      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
                    </svg>
                  </div>
                  <div className="wsg-kpi-text-col">
                    <div className="wsg-kpi-label-new">Avg. Return Rate</div>
                    <div className="wsg-kpi-sub-new">ย้อนกลับต่อฉาก</div>
                  </div>
                </div>
                <div className="wsg-kpi-val-small text-purple">{avgReturnRate}%</div>
              </div>

              {/* การ์ด 5: ทางเลือกทั้งหมด */}
              <div className="wsg-kpi-card-small card-orange">
                <div className="wsg-kpi-card-small-left">
                  <div className="wsg-kpi-badge-icon small-icon" style={{ backgroundColor: "#ffedd5" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#ea580c" }}>
                      <circle cx="18" cy="18" r="3"></circle>
                      <circle cx="6" cy="6" r="3"></circle>
                      <circle cx="18" cy="6" r="3"></circle>
                      <path d="M6 9v9a2 2 0 0 0 2 2h7"></path>
                      <path d="M18 9v6"></path>
                    </svg>
                  </div>
                  <div className="wsg-kpi-text-col">
                    <div className="wsg-kpi-label-new">ทางเลือกทั้งหมด</div>
                    <div className="wsg-kpi-sub-new">
                      {uniqueNodes.length} ฉาก - {novelChapters.length || 5} ตอน
                    </div>
                  </div>
                </div>
                <div className="wsg-kpi-val-small text-orange">{rawEdges.length || 25}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ฝั่งขวา: ข้อแนะนำระบบ (3 คำแนะนำ) */}
        <div className="wsg-kpis-right-panel">
          <div className="wsg-kpis-header-row">
            <span className="wsg-panel-title-icon">💡</span>
            <h3 className="wsg-panel-title">ข้อแนะนำระบบ</h3>
          </div>
          
          <div className="wsg-insights-column">
            {/* คำแนะนำ 1: จุดเสี่ยงสูง (จัดบรรทัดเดียว บางและลดความหนาแน่น) */}
            <div className="wsg-insight-bar-item insight-yellow">
              <span className="wsg-insight-bar-icon">⚠️</span>
              <div className="wsg-insight-bar-content">
                <div className="wsg-insight-bar-title">จุดเสี่ยงสูง:</div>
                <div className="wsg-insight-bar-desc" title={`ฉาก ${kpiStats.highestExitScene.label || "1.3"} (Exit Rate ${kpiStats.highestExitScene.rate || 34}%)`}>
                  ฉาก {kpiStats.highestExitScene.label || "1.3"} (Exit Rate {kpiStats.highestExitScene.rate || 34}%)
                </div>
              </div>
            </div>

            {/* คำแนะนำ 2: เส้นทางยอดนิยม (จัดบรรทัดเดียว บางและลดความหนาแน่น) */}
            <div className="wsg-insight-bar-item insight-green">
              <span className="wsg-insight-bar-icon">⭐</span>
              <div className="wsg-insight-bar-content">
                <div className="wsg-insight-bar-title">เส้นทางยอดนิยม:</div>
                <div className="wsg-insight-bar-desc" title={`ฉาก ${popularSceneLabel} (คนเลือก ${popularScenePct}%)`}>
                  ฉาก {popularSceneLabel} (คนเลือก {popularScenePct}%)
                </div>
              </div>
            </div>

            {/* คำแนะนำ 3: เส้นทางมาแรง (จัดบรรทัดเดียว บางและลดความหนาแน่น) */}
            <div className="wsg-insight-bar-item insight-blue">
              <span className="wsg-insight-bar-icon">🔥</span>
              <div className="wsg-insight-bar-content">
                <div className="wsg-insight-bar-title">เส้นทางมาแรง:</div>
                <div className="wsg-insight-bar-desc" title="ทางเลือกถูกเข้าอ่านเพิ่มขึ้น 22% ในรอบ 7 วัน">
                  ทางเลือกถูกคลิกอ่านเพิ่มขึ้น 22% ในรอบ 7 วัน
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 🟢 แผนผังกราฟ + แถบข้างรายละเอียด */}
      <div className="wsg-body">
        {/* 🟢 Detail Sidebar ทางซ้าย พร้อมสเตท Collapsed */}
        <aside className={`wsg-sidebar ${isCollapsed ? "collapsed" : ""}`}>
          {selectedSceneDetails ? (
            <>
              {/* แถบ Tabs และปุ่มปิดกากบาทตามรูป */}
              <div className="wsg-sidebar-tabs">
                <div className="wsg-sidebar-tab-btns">
                  <button 
                    className={`wsg-sidebar-tab-btn ${activeTab === "scene" ? "active" : ""}`}
                    onClick={() => setActiveTab("scene")}
                  >
                    Scene Analytics
                  </button>
                  <button 
                    className={`wsg-sidebar-tab-btn ${activeTab === "choice" ? "active" : ""}`}
                    onClick={() => setActiveTab("choice")}
                  >
                    Choice Analytics
                  </button>
                </div>
                <button className="wsg-sidebar-close-btn" onClick={() => setIsCollapsed(true)} title="ซ่อนรายละเอียด">✕</button>
              </div>

              <div className="wsg-sidebar-content">
                {/* ข้อมูลฉาก: ฉากที่ X.Y ชื่อฉาก และประเภทฉาก */}
                <div className="wsg-scene-title-row">
                  <h3 className="wsg-scene-title-text">
                    {selectedSceneDetails.label} {selectedSceneDetails.title}
                  </h3>
                  <span className="wsg-scene-type-text">ประเภทของฉาก: {selectedSceneDetails.sceneType}</span>
                  {selectedSceneDetails.exitRate >= 25 && (
                    <span className="wsg-scene-alert-badge">
                      🔥 Exit Rate สูงกว่าค่าเฉลี่ย
                    </span>
                  )}
                </div>

                {/* สถิติสรุปทั่วไป 3 กล่องย่อยตามรูป */}
                <div className="wsg-stats-grid">
                  <div className="wsg-stat-box">
                    <span className="wsg-stat-box__label">👁️ ผู้เข้าชม</span>
                    <span className="wsg-stat-box-num">
                      {selectedSceneDetails.visitors.toLocaleString()}
                    </span>
                    <span className="wsg-stat-box-desc">คน</span>
                  </div>
                  
                  <div className="wsg-stat-box">
                    <span className="wsg-stat-box__label">Exit Rate</span>
                    <span className="wsg-stat-box-num">
                      {selectedSceneDetails.exitRate}%
                    </span>
                    <span className="wsg-stat-box-desc">
                      {Math.round(selectedSceneDetails.visitors * selectedSceneDetails.exitRate / 100).toLocaleString()} คนออก
                    </span>
                  </div>
                  
                  <div className="wsg-stat-box">
                    <span className="wsg-stat-box__label">Return Rate</span>
                    <span className="wsg-stat-box-num">
                      {selectedSceneDetails.returnRate}%
                    </span>
                    <span className="wsg-stat-box-desc">
                      {Math.round(selectedSceneDetails.visitors * selectedSceneDetails.returnRate / 100).toLocaleString()} คนกลับมาอ่านซ้ำ
                    </span>
                  </div>
                </div>

                {/* แหล่งที่มา (Traffic incoming) ตามรูป */}
                <div>
                  <h4 className="wsg-section-title">มาจากทางเลือกก่อนหน้า</h4>
                  <div className="wsg-choice-list">
                    {selectedSceneDetails.incoming.length > 0 ? (
                      selectedSceneDetails.incoming.map((item, idx) => (
                        <div key={idx} className="wsg-choice-row-container">
                          <div className="wsg-choice-row-top" title={item.choiceText}>
                            {item.choiceText}
                          </div>
                          <div className="wsg-choice-row-bottom">
                            <div className="wsg-choice-progress-wrap">
                              <div className="wsg-choice-progress-bar" style={{ width: `${item.pct}%` }} />
                            </div>
                            <div className="wsg-choice-row-right-values">
                              <span className="wsg-choice-pct-val">{item.pct}%</span>
                              <span className="wsg-choice-count-val">
                                {Math.round(selectedSceneDetails.visitors * item.pct / 100).toLocaleString()} คน
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p style={{ fontSize: "0.74rem", color: "#94a3b8", margin: 0, textAlign: "left" }}>
                        ไม่มีที่มา (ฉากเริ่มต้นของบทเรียน)
                      </p>
                    )}
                  </div>
                </div>

                {/* ทางเลือกถัดไป (Traffic outgoing) ตามรูป */}
                <div>
                  <h4 className="wsg-section-title">ผู้อ่านเลือกอะไรต่อ</h4>
                  <div className="wsg-choice-list">
                    {selectedSceneDetails.outgoing.length > 0 ? (
                      selectedSceneDetails.outgoing.map((item, idx) => (
                        <div key={idx} className="wsg-choice-row-container">
                          <div className="wsg-choice-row-top" title={item.choiceText}>
                            {item.choiceText}
                          </div>
                          <div className="wsg-choice-row-bottom">
                            <div className="wsg-choice-progress-wrap">
                              <div className="wsg-choice-progress-bar" style={{ width: `${item.pct}%` }} />
                            </div>
                            <div className="wsg-choice-row-right-values">
                              <span className="wsg-choice-pct-val">{item.pct}%</span>
                              <span className="wsg-choice-count-val">
                                {Math.round(selectedSceneDetails.visitors * item.pct / 100).toLocaleString()} คน
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p style={{ fontSize: "0.74rem", color: "#94a3b8", margin: 0, textAlign: "left" }}>
                        ไม่มีฉากปลายทางต่อ (ฉากตอนจบของนิยาย)
                      </p>
                    )}
                  </div>
                </div>

                {/* เปอร์เซ็นต์แนวโน้มผู้อ่านจะไป Ending ไหนต่อ (Ending Spread) ตามรูป */}
                <div className="wsg-donut-section">
                  <h4 className="wsg-section-title">เปอร์เซ็นต์แนวโน้มผู้อ่านจะไปฉากจบไหนต่อ</h4>
                  <div className="wsg-donut-container">
                    <div className="wsg-donut-chart">
                      <svg className="wsg-donut-svg" width="80" height="80" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="3.5" />
                        
                        {/* Segment 1: Good (45%) */}
                        <circle 
                          cx="18" cy="18" r="15.915" 
                          fill="none" stroke="#10b981" strokeWidth="4.5" 
                          strokeDasharray="45 55" strokeDashoffset="0"
                        />
                        {/* Segment 2: Bad (30%) */}
                        <circle 
                          cx="18" cy="18" r="15.915" 
                          fill="none" stroke="#f43f5e" strokeWidth="4.5" 
                          strokeDasharray="30 70" strokeDashoffset="-45"
                        />
                        {/* Segment 3: Secret (25%) */}
                        <circle 
                          cx="18" cy="18" r="15.915" 
                          fill="none" stroke="#8b5cf6" strokeWidth="4.5" 
                          strokeDasharray="25 75" strokeDashoffset="-75"
                        />
                        
                        <circle className="wsg-donut-hole" cx="18" cy="18" r="12" />
                      </svg>
                      <div className="wsg-donut-center-text">
                        <span className="wsg-donut-num">45%</span>
                        <span className="wsg-donut-label">Good</span>
                      </div>
                    </div>

                    <div className="wsg-donut-legend-new">
                      <div className="wsg-donut-legend-row">
                        <div className="wsg-donut-legend-left">
                          <span className="wsg-donut-legend-indicator" style={{ backgroundColor: "#10b981" }} />
                          <span>Good Ending</span>
                        </div>
                        <div className="wsg-donut-legend-right">
                          <span className="wsg-donut-legend-pct">45%</span>
                          <span className="wsg-donut-legend-count">
                            {Math.round(selectedSceneDetails.visitors * 0.45).toLocaleString()} คน
                          </span>
                        </div>
                      </div>

                      <div className="wsg-donut-legend-row">
                        <div className="wsg-donut-legend-left">
                          <span className="wsg-donut-legend-indicator" style={{ backgroundColor: "#f43f5e" }} />
                          <span>Bad Ending</span>
                        </div>
                        <div className="wsg-donut-legend-right">
                          <span className="wsg-donut-legend-pct">30%</span>
                          <span className="wsg-donut-legend-count">
                            {Math.round(selectedSceneDetails.visitors * 0.30).toLocaleString()} คน
                          </span>
                        </div>
                      </div>

                      <div className="wsg-donut-legend-row">
                        <div className="wsg-donut-legend-left">
                          <span className="wsg-donut-legend-indicator" style={{ backgroundColor: "#8b5cf6" }} />
                          <span>Secret Ending</span>
                        </div>
                        <div className="wsg-donut-legend-right">
                          <span className="wsg-donut-legend-pct">25%</span>
                          <span className="wsg-donut-legend-count">
                            {Math.round(selectedSceneDetails.visitors * 0.25).toLocaleString()} คน
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Insights ข้อเสนอแนะเชิงวิเคราะห์ */}
                <div className="wsg-insight-card">
                  <div className="wsg-insight-icon">💡</div>
                  <div className="wsg-insight-body">
                    <span className="wsg-insight-title">{selectedSceneDetails.insight.title}</span>
                    <span className="wsg-insight-text">{selectedSceneDetails.insight.text}</span>
                  </div>
                </div>

              </div>
            </>
          ) : (
            <div className="wsg-empty-sidebar">
              {/* <span className="wsg-empty-icon">🖱️</span> */}
              <p className="wsg-empty-text">กรุณาคลิกเลือกโหนดฉากในแผนผังเพื่อดูสถิติและการตัดสินใจเชิงลึก</p>
            </div>
          )}
        </aside>

        {/* 🟢 Canvas Area ทางขวา */}
        <div className="wsg-canvas-area" style={{ position: "relative" }}>
          {/* ปุ่ม Slidebar เปิดแถบสถิติกรณีถูกยุบไป */}
          {isCollapsed && selectedSceneId && (
            <button className="wsg-slidebar-toggle-open" onClick={() => setIsCollapsed(false)}>
              📊 เปิดสถิติฉาก
            </button>
          )}


          
          <div className="wsg-canvas-wrap">
            {/* สัญญลักษณ์แจ้งรายละเอียดสี (Legend) สีชมพูพรีเมียม */}
            {(() => {
              const totalVis = kpiStats.totalVisitors || 2480;
              const hMax = Math.round(totalVis * 0.75);
              const mMax = Math.round(totalVis * 0.50);
              const lMax = Math.round(totalVis * 0.25);

              return (
                <div className="wsg-legend-overlay">
                  <div className="wsg-legend-overlay__section">
                    <h4 className="wsg-legend-overlay__title">👥 ระดับสัดส่วนผู้ชมฉาก</h4>
                    <div className="wsg-legend-overlay__row">
                      <span className="wsg-legend-color-box" style={{ backgroundColor: "#BE5985", border: "1px solid #9a3962" }} />
                      <span>ผู้ชมสูงมาก ({"≥"} {hMax.toLocaleString()} คน)</span>
                    </div>
                    <div className="wsg-legend-overlay__row">
                      <span className="wsg-legend-color-box" style={{ backgroundColor: "#EC7FA9", border: "1px solid #cd5c87" }} />
                      <span>ผู้ชมมาก ({mMax.toLocaleString()} - {(hMax - 1).toLocaleString()} คน)</span>
                    </div>
                    <div className="wsg-legend-overlay__row">
                      <span className="wsg-legend-color-box" style={{ backgroundColor: "#FFB8E0", border: "1px solid #e88bbd" }} />
                      <span>ผู้ชมปานกลาง ({lMax.toLocaleString()} - {(mMax - 1).toLocaleString()} คน)</span>
                    </div>
                    <div className="wsg-legend-overlay__row">
                      <span className="wsg-legend-color-box" style={{ backgroundColor: "#FFEDFA", border: "1px solid #f6cbe8" }} />
                      <span>ผู้ชมน้อย ({"<"} {lMax.toLocaleString()} คน)</span>
                    </div>
                  </div>

                  <div className="wsg-legend-overlay__section">
                    <h4 className="wsg-legend-overlay__title">🔥 คอขวดผู้อ่านสะดุด</h4>
                    <div className="wsg-legend-overlay__row" style={{ color: "#ef4444", fontWeight: 700 }}>
                      <span className="wsg-legend-color-box pulse-alert-box" style={{ backgroundColor: "#fee2e2" }} />
                      <span>Exit Rate {"≥"} 25% 🔥</span>
                    </div>
                  </div>

                  <div className="wsg-legend-overlay__section">
                    <h4 className="wsg-legend-overlay__title">➡️ ความนิยมของทางเลือก</h4>
                    <div className="wsg-legend-overlay__row">
                      <span className="wsg-legend-line" style={{ height: "4px", backgroundColor: "#7DCCAD" }} />
                      <span>นิยมสูง ({"≥"} 60% สี 7DCCAD)</span>
                    </div>
                    <div className="wsg-legend-overlay__row">
                      <span className="wsg-legend-line" style={{ height: "2.5px", backgroundColor: "#FFEA88" }} />
                      <span>ทั่วไป (30% - 59% สี FFEA88)</span>
                    </div>
                    <div className="wsg-legend-overlay__row">
                      <span className="wsg-legend-line" style={{ height: "1.5px", backgroundColor: "#DCCFC0" }} />
                      <span>เลือกน้อย ({"<"} 30% สี DCCFC0)</span>
                    </div>
                  </div>
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
                  if (node.data?.exitRate >= 25) return "#fec2c2";
                  if (node.data?.visitors >= (node.data?.highMax || 1860)) return "#BE5985";
                  if (node.data?.visitors >= (node.data?.midMax || 1240)) return "#EC7FA9";
                  return "#f1f5f9";
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

export default StatisticsGraph;