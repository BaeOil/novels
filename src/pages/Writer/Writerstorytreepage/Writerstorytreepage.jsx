import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import ReactFlow, {
  Handle,
  Position,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  addEdge,
  useNodesState,
  useEdgesState,
  ReactFlowProvider, // หุ้ม React Flow ด้วย Provider
  useReactFlow,      // ใช้ hook เพื่อแปลงพิกัดหน้าจอกับพิกัด Canvas
  MarkerType,
} from "reactflow";
import axios from "axios";
import "reactflow/dist/style.css";  
import "./Writerstorytreepage.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const NODE_WIDTH = 260;
const NODE_HEIGHT = 118;
const NODE_HORIZONTAL_GAP = 300;
const NODE_VERTICAL_GAP = 250;
const CANVAS_MARGIN = 36;

const WRITER_NODE_STATUS = {
  START: "start",
  NORMAL: "normal",
  ENDING: "ending",
  ORPHAN: "orphan",
};

const WRITER_NODE_STYLE = {
  // จุดเริ่มต้น = เขียว
  [WRITER_NODE_STATUS.START]: {
    stroke: "#16A34A",
    fill: "#DCFCE7",
    text: "#166534",
  },

  // ฉากทั่วไป = ฟ้าอ่อน
  [WRITER_NODE_STATUS.NORMAL]: {
    stroke: "#38BDF8",
    fill: "#E0F2FE",
    text: "#0369A1",
  },

  // ฉากจบ = แดง
  [WRITER_NODE_STATUS.ENDING]: {
    stroke: "#EF4444",
    fill: "#FEE2E2",
    text: "#991B1B",
  },

  // ฉากไม่มีการเชื่อมต่อ
  [WRITER_NODE_STATUS.ORPHAN]: {
    stroke: "#94A3B8",
    fill: "#F1F5F9",
    text: "#475569",
  },
};

const WRITER_LEGEND = [
  { label: "จุดเริ่มต้น", color: "#16A34A" },
  { label: "ฉากทั่วไป", color: "#38BDF8" },
  { label: "ฉากจบ", color: "#EF4444" },
  { label: "ฉากยังไม่เชื่อมต่อ", color: "#94A3B8" },
];

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
const getNodeContent = (node) => stripHtml(node?.Content || node?.content || node?.Excerpt || node?.excerpt || "รายละเอียดฉากนี้ยังไม่มี");
const getNodeChapter = (node) => stripHtml(node?.ChapterTitle || node?.chapter_title || node?.chapter || node?.chapterName || node?.chapter_name || "");
const getChoiceLabel = (choice) => stripHtml(choice?.Label || choice?.label || choice?.choice_text || choice?.text || "ไม่มีชื่อ");
const getChapterId = (node) =>
  normalizeId(
    node?.ChapterID ??
    node?.chapter_id ??
    node?.chapterId
  );

const getSceneId = (node) =>
  normalizeId(
    node?.ID ??
    node?.id ??
    node?.SceneID ??
    node?.scene_id
  );

const formatNodeStatus = (node) => {
  const type = getNodeType(node);
  if (type === "start" || type === "starting") return WRITER_NODE_STATUS.START;
  if (type === "ending" || type === "end") return WRITER_NODE_STATUS.ENDING;
  return WRITER_NODE_STATUS.NORMAL;
};

const StoryNode = ({ data }) => {
  const status = data.status;
  const style = WRITER_NODE_STYLE[status] || WRITER_NODE_STYLE[WRITER_NODE_STATUS.NORMAL];
  const title = getNodeTitle(data);

  // ดึงข้อมูลเลขตอนและฉากจาก data ที่ถูกส่งต่อมาอย่างถูกต้อง
  const chapterNo = data.chapterNumber ?? "?";
  const sceneNo = data.sceneNumber ?? "?";
  const chapterTitle = data.chapterTitle || getNodeChapter(data) || "";
  const description = getNodeContent(data);

  return (
    <div className="wst-node-card" style={{ borderColor: style.stroke, background: style.fill, color: style.text }}>
      <Handle type="target" position={Position.Top} />
      
      {/* ตอนที่ [เลขตอน] [ชื่อตอน] */}
      <div className="wst-node-card__badge">
        ตอนที่ {chapterNo} {chapterTitle}
      </div>

      {/* ฉากที่ [เลขตอน].[เลขฉาก] */}
      <div className="wst-node-card__scene-num">
        ฉากที่ {chapterNo}.{sceneNo}
      </div>

      {/* ชื่อฉาก */}
      <div className="wst-node-card__title">
        {title}
      </div>

      {/* เนื้อหาของฉาก */}
      <div className="wst-node-card__desc">
        {description}
      </div>

      {/* ปุ่มแก้ไข */}
      <button
        className="wst-node-card__edit"
        onClick={(e) => {
          e.stopPropagation();
          data.onEdit?.(
            getSceneId(data),
            data.ChapterID ?? data.chapter_id ?? data.chapterId
          );
        }}
      >
        ✏️ แก้ไข
      </button>
      
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

// add stable nodeTypes at module top-level to avoid React Flow warning #002
const nodeTypes = {
  writerNode: StoryNode,
};

const LegendBar = () => (
  <div className="wst-legend" role="list" aria-label="คำอธิบายสัญลักษณ์">
    {WRITER_LEGEND.map((item) => (
      <div key={item.label} className="wst-legend__item" role="listitem">
        <span className="wst-legend__dot" style={{ background: item.color }} />
        <span className="wst-legend__label">{item.label}</span>
      </div>
    ))}
  </div>
);

// Inner component เพื่อให้สามารถเรียกใช้ useReactFlow() hook ได้อย่างถูกต้อง
const StoryTreeInner = ({ novelId, onNavigate }) => {
  const { screenToFlowPosition } = useReactFlow();
  const [treeData, setTreeData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSceneId, setSelectedSceneId] = useState(null);
  const [interactionMode, setInteractionMode] = useState("select"); // select | connect | pan | add-node
  const reactflowWrapperRef = useRef(null);

  // States สำหรับ Interactive Connection System
  const [connectSource, setConnectSource] = useState(null); // ฉากต้นทาง
  const [connectTarget, setConnectTarget] = useState(null); // ฉากปลายทาง
  const [isModalOpen, setIsModalOpen] = useState(false);     // ควบคุม Popup Modal
  const [choiceText, setChoiceText] = useState("");          // ข้อความตัวเลือก
  const [toast, setToast] = useState(null);                  // Toast แจ้งเตือน

  // States สำหรับการเพิ่มฉากโดยระบุตอนที่เลือก
  const [novelChapters, setNovelChapters] = useState([]);
  const [showAddScenePopup, setShowAddScenePopup] = useState(false);
  const [pendingScenePosition, setPendingScenePosition] = useState(null); // { x, y }
  const [selectedMoveChapterId, setSelectedMoveChapterId] = useState("");

  // States สำหรับระบบการลบโหนดด้วยการคลิกยืนยัน
  const [sceneToDelete, setSceneToDelete] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // States สำหรับฉากและเส้นเชื่อม
  const [newSceneTitle, setNewSceneTitle] = useState("");
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [showEdgeModal, setShowEdgeModal] = useState(false);
  const [editEdgeLabel, setEditEdgeLabel] = useState("");
  const [editEdgeSource, setEditEdgeSource] = useState("");
  const [editEdgeTarget, setEditEdgeTarget] = useState("");
  const [showDeleteChoiceConfirm, setShowDeleteChoiceConfirm] = useState(false);

  // States สำหรับการลากและ Reconnect เส้นเชื่อมโยง
  const [pendingEdgeUpdate, setPendingEdgeUpdate] = useState(null); // { oldEdge, newConnection }
  const [showEdgeUpdateConfirm, setShowEdgeUpdateConfirm] = useState(false);

  // Sync interactionMode with ref to prevent stale closures
  const modeRef = useRef(interactionMode);
  useEffect(() => {
    modeRef.current = interactionMode;
  }, [interactionMode]);

  // Toast handler
  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    const timer = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(timer);
  }, []);

  const fetchStoryTreeAndChapters = useCallback(async () => {
    if (!novelId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [treeRes, chaptersRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/novels/${novelId}/story-tree`),
        axios.get(`${API_BASE_URL}/novels/${novelId}/chapters`)
      ]);
      setTreeData(treeRes.data?.data || treeRes.data || null);
      
      let chaptersData = chaptersRes.data?.data?.chapters || chaptersRes.data?.chapters || chaptersRes.data?.data || chaptersRes.data || [];
      setNovelChapters(Array.isArray(chaptersData) ? chaptersData : []);
    } catch (err) {
      console.error("Error fetching story tree and chapters:", err);
      setError("ไม่สามารถโหลดข้อมูล โครงสร้างเนื้อเรื่อง ได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsLoading(false);
    }
  }, [novelId]);

  useEffect(() => {
    fetchStoryTreeAndChapters();
  }, [fetchStoryTreeAndChapters]);

  useEffect(() => {
    const handleDataUpdate = () => {
      fetchStoryTreeAndChapters();
    };
    window.addEventListener("novel-data-updated", handleDataUpdate);
    return () => window.removeEventListener("novel-data-updated", handleDataUpdate);
  }, [fetchStoryTreeAndChapters]);

  const nodes = treeData?.Nodes ?? treeData?.nodes ?? [];
  const edges = treeData?.Edges ?? treeData?.edges ?? [];

  const uniqueNodes = useMemo(() => {
    const seen = new Set();
    return nodes.filter((scene) => {
      const id = getNodeId(scene);
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [nodes]);

  const normalizedEdges = useMemo(() => {
    return edges.map((choice) => {
      const fromId = normalizeId(choice.FromID ?? choice.from_id ?? choice.from ?? choice.From);
      const toId = normalizeId(choice.ToID ?? choice.to_id ?? choice.to ?? choice.To);
      const fromSceneNumberInChapter = choice.fromSceneNumberInChapter ?? choice.FromSceneNumberInChapter ?? choice.from_scene_number_in_chapter ?? 0;
      const toSceneNumberInChapter = choice.toSceneNumberInChapter ?? choice.ToSceneNumberInChapter ?? choice.to_scene_number_in_chapter ?? 0;
      const fromChapterEpisode = choice.fromChapterEpisode ?? choice.FromChapterEpisode ?? choice.from_chapter_episode ?? 0;
      const toChapterEpisode = choice.toChapterEpisode ?? choice.ToChapterEpisode ?? choice.to_chapter_episode ?? 0;
      const fromSceneTitle = choice.fromSceneTitle || choice.FromSceneTitle || choice.from_scene_title || "ไม่ทราบ";
      const toSceneTitle = choice.toSceneTitle || choice.ToSceneTitle || choice.to_scene_title || "ไม่ทราบ";

      return {
        ...choice,
        fromId,
        toId,
        fromSceneNumberInChapter,
        toSceneNumberInChapter,
        fromChapterEpisode,
        toChapterEpisode,
        fromSceneTitle,
        toSceneTitle,
      };
    });
  }, [edges]);

  const { positionedNodes, positionedEdges, chapters, stats } = useMemo(() => {
    if (!uniqueNodes.length) {
      return { positionedNodes: [], positionedEdges: [], chapters: [], stats: treeData?.Stats ?? treeData?.stats ?? null };
    }

    // สร้าง Map ค้นหาข้อมูลภายใน useMemo นี้โดยตรงเพื่อป้องกันปัญหา TDZ (Temporal Dead Zone)
    const localMap = new Map();
    uniqueNodes.forEach((scene) => localMap.set(getNodeId(scene), scene));

    const nodeIds = uniqueNodes.map(getNodeId);
    const adjacency = {};
    const inDegree = {};
    const nodeStatuses = {};
    const nodeLevels = {};

    nodeIds.forEach((id) => {
      adjacency[id] = [];
      inDegree[id] = 0;
    });

    const findMatchingNodeId = (raw) => {
      const candidate = normalizeId(raw);
      if (!candidate) return "";
      if (adjacency[candidate] !== undefined) return candidate;
      for (const id of nodeIds) {
        const sid = normalizeId(id);
        if (sid === candidate) return sid;
        if (sid.endsWith(candidate)) return sid;
        if (sid.includes(candidate) && candidate.length > 1) return sid;
      }
      return "";
    };

    const edgeList = normalizedEdges
      .map((edge, index) => {
        const rawSource = edge.fromId;
        const rawTarget = edge.toId;
        const source = findMatchingNodeId(rawSource);
        const target = findMatchingNodeId(rawTarget);
        if (source && adjacency[source] && inDegree[target] !== undefined) {
          adjacency[source].push(target);
          inDegree[target] += 1;
        }
        return {
          id: normalizeId(edge.id ?? edge.ID ?? `edge-${source}-${target}-${index}`),
          source,
          target,
          label: edge.Label || edge.label || edge.choice_text || edge.text || "",
          data: edge,
        };
      })
      .filter((edge) => edge.source && edge.target && adjacency[edge.source] !== undefined && inDegree[edge.target] !== undefined);

    uniqueNodes.forEach((node) => {
      const id = getNodeId(node);

      const hasIncoming = inDegree[id] > 0;
      const hasOutgoing = adjacency[id]?.length > 0;

      if (!hasIncoming && !hasOutgoing) {
        nodeStatuses[id] = WRITER_NODE_STATUS.ORPHAN;
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
        // หากโหนดลูกมีเส้นเชื่อมเข้าตั้งแต่ 3 เส้นขึ้นไป (Junction Node) 
        // ให้เลื่อนระดับความสูงลงไปอีก 1 แถวเพื่อเลี่ยงการทับซ้อนแนวนอนกับโหนดข้างเคียง
        const offset = (inDegree[childId] >= 3) ? 2 : 1;
        const nextLevel = level + offset;
        if (nodeLevels[childId] === undefined || nodeLevels[childId] > nextLevel) {
          nodeLevels[childId] = nextLevel;
          queue.push(childId);
        }
      });
    }

    // 2. จัดกลุ่มโหนดตาม Level
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

    // 3. จัดตำแหน่งระดับ 0 (จุดเริ่มต้น) เป็นค่าเริ่มต้น
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

    // 4. จัดเรียงระดับถัดๆ ไป (1, 2, 3...) อิงตาม Barycenter heuristic ของ parents
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

      // จัดเรียงตาม X ในอุดมคติเพื่อรักษาแนวเส้นทางไม่ให้ข้ามฝั่งกัน
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

    const allX = Object.values(positions).map((pos) => pos.x);
    const allY = Object.values(positions).map((pos) => pos.y);
    const minY = Math.min(...allY, 0);
    const shiftY = Math.max(CANVAS_MARGIN, CANVAS_MARGIN - minY);

    Object.keys(positions).forEach((sceneId) => {
      positions[sceneId].y += shiftY;
    });

    const positionedNodes = nodeIds.map((sceneId) => {
      const scene = localMap.get(sceneId);
      const position = positions[sceneId] || { x: CANVAS_MARGIN, y: CANVAS_MARGIN };
      return {
        id: sceneId,
        scene,
        x: scene.x ?? position.x, 
        y: scene.y ?? position.y,
        status: nodeStatuses[sceneId],
      };
    });

    const positionedEdges = edgeList
      .map((edge) => ({
        ...edge,
        active: true,
      }));

    const chapterGroups = new Map();
    const chapterOrder = [];
    positionedNodes.forEach((item) => {
      const chapter = getNodeChapter(item.scene) || "อื่นๆ";
      if (!chapterGroups.has(chapter)) {
        chapterGroups.set(chapter, []);
        chapterOrder.push(chapter);
      }
      chapterGroups.get(chapter).push(item.scene);
    });

    const chapters = chapterOrder.map((chapter) => ({ title: chapter, scenes: chapterGroups.get(chapter) }));

    return {
      positionedNodes,
      positionedEdges,
      chapters,
      stats: treeData?.Stats ?? treeData?.stats ?? null,
    };
  }, [nodes, edges, treeData]);

  // แมปข้อมูลเบื้องต้นเฉพาะโหนดที่ส่งตรงมาจาก Backend เท่านั้น
  const sceneMapBackendOnly = useMemo(() => {
    const map = new Map();
    uniqueNodes.forEach((scene) => map.set(getNodeId(scene), scene));
    return map;
  }, [uniqueNodes]);

  // คำนวณ scenePositionMap เพื่อใช้ดึงเลขตอนและเลขฉาก
  const scenePositionMap = useMemo(() => {
    const map = new Map();

    chapters.forEach((chapter, chapterIndex) => {
      chapter.scenes.forEach((scene, sceneIndex) => {
        map.set(getNodeId(scene), {
          chapterNumber: chapterIndex + 1,
          sceneNumber: sceneIndex + 1,
          chapterTitle: chapter.title,
        });
      });
    });

    return map;
  }, [chapters]);

  // Convert positionedNodes/positionedEdges into React Flow node/edge shapes
  const flowNodes = useMemo(() => {
    return positionedNodes.map((n) => {
      const sceneId = getNodeId(n.scene);
      const pos = scenePositionMap.get(sceneId);
      return {
        id: String(n.id),
        type: "writerNode",
        position: { x: n.x, y: n.y },
        data: {
          ...n.scene,
          status: n.status,
          chapterNumber: pos ? pos.chapterNumber : "?",
          sceneNumber: pos ? pos.sceneNumber : "?",
          chapterTitle: pos ? pos.chapterTitle : (getNodeChapter(n.scene) || ""),
          onEdit: (sceneId, chapterId) => {
            onNavigate?.("scene-editor", { novelId, chapterId, sceneId });
          },
        },
      };
    });
  }, [positionedNodes, novelId, onNavigate, scenePositionMap]);

  const flowEdges = useMemo(() => {
    return positionedEdges.map((e) => ({
      id: String(e.id || `e-${e.source}-${e.target}`),
      source: String(e.source),
      target: String(e.target),
      label: e.label || "",
      type: e.type || "smoothstep",
      data: e.data || {},
      animated: !!e.animated,
      interactionWidth: 20, // ขยายพื้นที่รับการคลิกเมาส์ของเส้นให้กว้างขึ้นเป็น 20px
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: "#94a3b8", // หัวลูกศรชี้ปลายทางชัดเจน
      },
      style: {
        stroke: "#94a3b8", // เส้นหนาขึ้นและใช้สีที่คมชัดขึ้น
        strokeWidth: 2,
      }
    }));
  }, [positionedEdges]);

  // create editable react-flow state initialized from computed flowNodes/flowEdges
  const [rfNodes, setRfNodes, onNodesChangeRF] = useNodesState([]);
  const [rfEdges, setRfEdges, onEdgesChangeRF] = useEdgesState([]);
  const [selection, setSelection] = useState({ nodes: [], edges: [] });

  // sync when backend positions change (ซิงค์เฉพาะเมื่อ treeData หรือ novelId มีการโหลด/เปลี่ยนแปลงจากหลังบ้านจริง ป้องกัน Update Loop)
  useEffect(() => {
    if (!treeData) return;

    setRfNodes((currentNds) => {
      const currentTempNodes = currentNds.filter(n => n.id.startsWith("temp-new-") || n.data?.isTemp);
      const hasCursor = currentNds.some(n => n.id === "cursor-node");
      const cursorN = hasCursor && connectSource ? currentNds.find(n => n.id === "cursor-node") : null;
      
      let nextNds = Array.isArray(flowNodes) ? [...flowNodes] : [];
      
      // รักษาโหนดชั่วคราวที่ยังไม่บันทึกไว้ในกราฟ
      currentTempNodes.forEach((tempNode) => {
        if (!nextNds.some(n => n.id === tempNode.id)) {
          nextNds.push(tempNode);
        }
      });
      
      if (cursorN) nextNds.push(cursorN);
      return nextNds;
    });

    setRfEdges((currentEds) => {
      const hasCursorEdge = currentEds.some(e => e.id === "cursor-edge");
      const cursorE = hasCursorEdge && connectSource ? currentEds.find(e => e.id === "cursor-edge") : null;
      
      let nextEds = Array.isArray(flowEdges) ? [...flowEdges] : [];
      if (cursorE) nextEds.push(cursorE);
      return nextEds;
    });
  }, [treeData, novelId]);

  // ดักจับและยกเลิก Connect Mode เมื่อออกจากโหมด
  const changeMode = useCallback((newMode) => {
    setInteractionMode(newMode);
    
    // รีเซ็ตโหมดการเชื่อม
    setConnectSource(null);
    setConnectTarget(null);
    setIsModalOpen(false);

    // รีเซ็ตตัวแปรโหมดลบโหนด
    setSceneToDelete(null);
    setShowDeleteModal(false);
    
    // ล้าง cursor-node & cursor-edge ออก
    setRfNodes((nds) => nds.filter((n) => n.id !== "cursor-node"));
    setRfEdges((eds) => eds.filter((e) => e.id !== "cursor-edge"));
  }, [setRfNodes, setRfEdges]);

  // keydown event listener สำหรับคีย์บอร์ดชอร์ตคัต 'C' และ 'Escape'
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.matches("input, textarea")) return;
      
      if (e.key === "Escape") {
        if (isModalOpen) {
          setIsModalOpen(false);
          setConnectSource(null);
          setConnectTarget(null);
          setRfNodes((nds) => nds.filter((n) => n.id !== "cursor-node"));
          setRfEdges((eds) => eds.filter((e) => e.id !== "cursor-edge"));
        } else if (interactionMode !== "select") {
          changeMode("select");
        }
      }
      
      if (e.key === "c" || e.key === "C" || e.key === "แ" || e.key === "ฉ") {
        changeMode(interactionMode === "connect" ? "select" : "connect");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [interactionMode, isModalOpen, changeMode]);

  // ดึงแผนแมพแบบผสม (โหนดจริงจากหลังบ้าน + โหนดว่างชั่วคราว) เพื่อสนับสนุนการกดและรายละเอียด Sidebar
  const sceneMap = useMemo(() => {
    const map = new Map();
    // โหลดโหนดหลังบ้าน
    uniqueNodes.forEach((scene) => map.set(getNodeId(scene), scene));
    
    rfNodes.forEach((node) => {
      if (node.id.startsWith("temp-new-") || node.data?.isTemp) {
        map.set(node.id, {
          id: node.id,
          title: node.data?.Title || "ฉากใหม่ยังไม่มีข้อมูล",
          content: node.data?.Content || "กรุณาคลิกแก้ไขเพื่อเขียนเนื้อเรื่อง",
          type: "normal",
          status: "draft",
          x: node.position?.x ?? 0,
          y: node.position?.y ?? 0,
          isTemp: true,
          chapter_id: node.data?.chapterId,
        });
      }
    });
    return map;
  }, [uniqueNodes, rfNodes]);

  const onConnect = useCallback((params) => {
    const edge = {
      ...params,
      id: `edge-${params.source}-${params.target}-${Date.now()}`,
      animated: true,
      type: "smoothstep",
    };
    setRfEdges((eds) => addEdge(edge, eds));
  }, [setRfEdges]);

  const handleSelectionChange = useCallback((sel) => {
    setSelection({
      nodes: sel?.nodes || [],
      edges: sel?.edges || [],
    });
  }, []);

  // ฟังก์ชันสร้างโหนดเปล่าชั่วคราวลงกราฟตามพิกัด Canvas ทันทีโดยมีข้อมูลตอนที่เลือก
  const addSceneOnCanvasLocal = useCallback((x, y, chosenChapterId) => {
    const tempId = `temp-new-${Date.now()}`;
    
    const targetCh = novelChapters.find(ch => {
      const id = ch.id ?? ch.chapter_id ?? ch.ChapterID ?? ch.chapterId;
      return String(id) === String(chosenChapterId);
    });
    
    const chNumber = targetCh?.chapterNumber ?? targetCh?.episode ?? targetCh?.order_index ?? "?";
    const chTitle = targetCh?.title ?? "ตอนไม่มีชื่อ";
    
    const newNode = {
      id: tempId,
      type: "writerNode",
      position: { x: Math.round(x), y: Math.round(y) },
      data: {
        id: tempId,
        Title: "ฉากใหม่ยังไม่มีข้อมูล",
        Content: "ดับเบิลคลิกหรือกดแก้ไขเพื่อเขียนเนื้อเรื่อง",
        status: WRITER_NODE_STATUS.ORPHAN,
        chapterNumber: String(chNumber),
        sceneNumber: "?",
        chapterTitle: chTitle,
        x: Math.round(x),
        y: Math.round(y),
        isTemp: true, // กำหนดสถานะชั่วคราว
        chapterId: chosenChapterId, // แนบ chapter_id ลงในโหนด
        onEdit: (sceneId) => {
          onNavigate?.("scene-editor", {
            novelId,
            chapterId: chosenChapterId,
            sceneId: "new",
            x: Math.round(x),
            y: Math.round(y),
          });
        },
      },
    };
    
    setRfNodes((nds) => [...nds, newNode]);
    showToast("เพิ่มโหนดว่างเปล่าแล้ว! ดับเบิลคลิกหรือกดแก้ไขเพื่อเขียนเนื้อหา", "success");
    changeMode("select");
    setSelectedSceneId(tempId); // ตั้งค่าโฟกัสโหนดใหม่
  }, [novelId, onNavigate, showToast, changeMode, setRfNodes, novelChapters]);

  // ฟังก์ชันดักคลิกบน Canvas พื้นหลัง (แสดงโมดอลเลือกตอนสังกัด)
  const handlePaneClick = useCallback((e) => {
    if (interactionMode !== "add-node") return;
    
    const flowPos = screenToFlowPosition({
      x: e.clientX,
      y: e.clientY
    });
    
    setPendingScenePosition({ x: flowPos.x, y: flowPos.y });
    if (novelChapters.length > 0) {
      const firstChId = novelChapters[0]?.id ?? novelChapters[0]?.chapter_id ?? novelChapters[0]?.ChapterID ?? novelChapters[0]?.chapterId;
      setSelectedMoveChapterId(String(firstChId));
    } else {
      setSelectedMoveChapterId("");
    }
    setShowAddScenePopup(true);
  }, [interactionMode, screenToFlowPosition, novelChapters]);

  const edgeUpdateSuccessful = useRef(true);

  const handleAddSceneBackend = async () => {
    if (!pendingScenePosition || !selectedMoveChapterId) return;
    const token = localStorage.getItem("token");
    try {
      const payload = {
        novel_id: parseInt(novelId, 10),
        chapter_id: parseInt(selectedMoveChapterId, 10),
        title: newSceneTitle.trim() || "ฉากไม่มีชื่อ",
        content: "",
        x: Math.round(pendingScenePosition.x),
        y: Math.round(pendingScenePosition.y),
        type: "normal",
        status: "draft",
        is_ending: false,
        choices: []
      };
      
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      showToast("กำลังสร้างฉากใหม่...", "info");
      const response = await axios.post(`${API_BASE_URL}/scenes`, payload, { headers });
      
      if (response.status === 200 || response.status === 201) {
        showToast("สร้างฉากใหม่เรียบร้อยแล้ว", "success");
        await fetchStoryTreeAndChapters();
        window.dispatchEvent(new Event("novel-data-updated"));
      }
    } catch (err) {
      console.error("Create scene error:", err);
      showToast("เกิดข้อผิดพลาดในการสร้างฉาก", "warn");
    } finally {
      setShowAddScenePopup(false);
      setPendingScenePosition(null);
      setNewSceneTitle("");
    }
  };

  const handleEdgeClick = useCallback((event, edge) => {
    event.stopPropagation();
    
    // โหมดลบ
    if (modeRef.current === "delete") {
      setSelectedEdge(edge);
      setShowDeleteChoiceConfirm(true);
      return;
    }

    // โหมดปกติ หรือโหมดอื่นๆ
    setSelectedEdge(edge);
    setEditEdgeLabel(edge.label || "");
    setEditEdgeSource(String(edge.source));
    setEditEdgeTarget(String(edge.target));
    setShowEdgeModal(true);
  }, []);

  // ==========================================
  // React Flow Reconnect Edge (ลากย้ายเส้น)
  // ==========================================
  const onEdgeUpdateStart = useCallback(() => {
    edgeUpdateSuccessful.current = false;
  }, []);

  const onEdgeUpdate = useCallback((oldEdge, newConnection) => {
    edgeUpdateSuccessful.current = true;
    setPendingEdgeUpdate({ oldEdge, newConnection });
    setShowEdgeUpdateConfirm(true);
  }, []);

  const onEdgeUpdateEnd = useCallback((_, edge) => {
    if (!edgeUpdateSuccessful.current) {
      setSelectedEdge(edge);
      setShowDeleteChoiceConfirm(true);
    }
    edgeUpdateSuccessful.current = true;
  }, []);

  const handleConfirmEdgeUpdate = async () => {
    if (!pendingEdgeUpdate) return;
    const { oldEdge, newConnection } = pendingEdgeUpdate;
    
    const choiceId = oldEdge.data?.choice_id ?? oldEdge.data?.id ?? oldEdge.data?.ChoiceID;
    const oldSourceId = oldEdge.source;
    const oldTargetId = oldEdge.target;
    const newSourceId = newConnection.source;
    const newTargetId = newConnection.target;
    const choiceLabel = oldEdge.label || "เลือกเส้นทางนี้";

    const token = localStorage.getItem("token");
    const headers = { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    };

    try {
      showToast("กำลังบันทึกการย้ายเส้น...", "info");
      
      // ดึงฉากต้นทางเดิม
      const oldSourceRes = await axios.get(`${API_BASE_URL}/scenes/${oldSourceId}`, { headers });
      const oldSourceData = oldSourceRes.data?.data || oldSourceRes.data;
      let oldChoices = Array.isArray(oldSourceData.choices) ? oldSourceData.choices : [];

      const isSourceChanged = String(oldSourceId) !== String(newSourceId);

      if (isSourceChanged) {
        // 1. ลบทางเลือกออกจากต้นทางเดิม
        const updatedOldChoices = oldChoices.filter(c => 
          String(c.choice_id ?? c.id) !== String(choiceId)
        );
        const oldPayload = {
          ...oldSourceData,
          choices: updatedOldChoices.map(c => ({
            choice_id: c.choice_id ?? c.id,
            label: c.label ?? c.text ?? "",
            text: c.label ?? c.text ?? "",
            to_scene_id: parseInt(c.to_scene_id ?? c.toSceneId ?? c.targetSubScene ?? "0", 10),
            targetSubScene: String(c.targetSubScene ?? c.to_scene_id ?? "")
          }))
        };
        await axios.put(`${API_BASE_URL}/scenes/${oldSourceId}`, oldPayload, { headers });

        // 2. ไปเพิ่มในต้นทางใหม่พร้อมระบุปลายทางใหม่
        const newSourceRes = await axios.get(`${API_BASE_URL}/scenes/${newSourceId}`, { headers });
        const newSourceData = newSourceRes.data?.data || newSourceRes.data;
        let newChoices = Array.isArray(newSourceData.choices) ? newSourceData.choices : [];
        
        newChoices.push({
          label: choiceLabel,
          text: choiceLabel,
          to_scene_id: parseInt(newTargetId, 10),
          targetSubScene: String(newTargetId)
        });

        const newPayload = {
          ...newSourceData,
          choices: newChoices.map(c => ({
            ...(c.choice_id ?? c.id ? { choice_id: c.choice_id ?? c.id } : {}),
            label: c.label ?? c.text ?? "",
            text: c.label ?? c.text ?? "",
            to_scene_id: parseInt(c.to_scene_id ?? c.toSceneId ?? c.targetSubScene ?? "0", 10),
            targetSubScene: String(c.targetSubScene ?? c.to_scene_id ?? "")
          }))
        };
        await axios.put(`${API_BASE_URL}/scenes/${newSourceId}`, newPayload, { headers });
      } else {
        // ต้นทางเดิม แต่เปลี่ยนปลายทาง
        const updatedChoices = oldChoices.map(c => {
          if (String(c.choice_id ?? c.id) === String(choiceId)) {
            return {
              ...c,
              to_scene_id: parseInt(newTargetId, 10),
              targetSubScene: String(newTargetId)
            };
          }
          return c;
        });

        const payload = {
          ...oldSourceData,
          choices: updatedChoices.map(c => ({
            choice_id: c.choice_id ?? c.id,
            label: c.label ?? c.text ?? "",
            text: c.label ?? c.text ?? "",
            to_scene_id: parseInt(c.to_scene_id ?? c.toSceneId ?? c.targetSubScene ?? "0", 10),
            targetSubScene: String(c.targetSubScene ?? c.to_scene_id ?? "")
          }))
        };
        await axios.put(`${API_BASE_URL}/scenes/${oldSourceId}`, payload, { headers });
      }

      showToast("ย้ายจุดเชื่อมต่อสำเร็จแล้ว", "success");
      await fetchStoryTreeAndChapters();
      window.dispatchEvent(new Event("novel-data-updated"));
    } catch (err) {
      console.error("Confirm edge update error:", err);
      showToast("ไม่สามารถย้ายเส้นทางเลือกได้", "warn");
    } finally {
      setShowEdgeUpdateConfirm(false);
      setPendingEdgeUpdate(null);
    }
  };

  const handleUpdateConnection = async () => {
    if (!selectedEdge) return;
    const choiceId = selectedEdge.data?.choice_id ?? selectedEdge.data?.id ?? selectedEdge.data?.ChoiceID;
    const oldSourceId = selectedEdge.source;
    const oldTargetId = selectedEdge.target;
    
    const isSourceChanged = String(oldSourceId) !== String(editEdgeSource);
    const isTargetOrLabelChanged = String(oldTargetId) !== String(editEdgeTarget) || editEdgeLabel !== (selectedEdge.label || "");

    const token = localStorage.getItem("token");
    const headers = { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    };

    try {
      showToast("กำลังบันทึกการเปลี่ยนแปลง...", "info");
      
      // ดึงรายละเอียดฉากต้นทางเดิม
      const oldSourceRes = await axios.get(`${API_BASE_URL}/scenes/${oldSourceId}`, { headers });
      const oldSourceData = oldSourceRes.data?.data || oldSourceRes.data;
      
      let oldChoices = Array.isArray(oldSourceData.choices) ? oldSourceData.choices : [];

      if (isSourceChanged) {
        // กรณีเปลี่ยนต้นทาง:
        // 1. ลบออกจากต้นทางเดิม
        const updatedOldChoices = oldChoices.filter(c => 
          String(c.choice_id ?? c.id) !== String(choiceId)
        );
        
        const oldPayload = {
          ...oldSourceData,
          choices: updatedOldChoices.map(c => ({
            choice_id: c.choice_id ?? c.id,
            label: c.label ?? c.text ?? "",
            text: c.label ?? c.text ?? "",
            to_scene_id: parseInt(c.to_scene_id ?? c.toSceneId ?? c.targetSubScene ?? "0", 10),
            targetSubScene: String(c.targetSubScene ?? c.to_scene_id ?? "")
          }))
        };
        await axios.put(`${API_BASE_URL}/scenes/${oldSourceId}`, oldPayload, { headers });

        // 2. ไปเพิ่มในต้นทางใหม่
        const newSourceRes = await axios.get(`${API_BASE_URL}/scenes/${editEdgeSource}`, { headers });
        const newSourceData = newSourceRes.data?.data || newSourceRes.data;
        let newChoices = Array.isArray(newSourceData.choices) ? newSourceData.choices : [];
        
        newChoices.push({
          label: editEdgeLabel || "เลือกเส้นทางนี้",
          text: editEdgeLabel || "เลือกเส้นทางนี้",
          to_scene_id: parseInt(editEdgeTarget, 10),
          targetSubScene: String(editEdgeTarget)
        });

        const newPayload = {
          ...newSourceData,
          choices: newChoices.map(c => ({
            ...(c.choice_id ?? c.id ? { choice_id: c.choice_id ?? c.id } : {}),
            label: c.label ?? c.text ?? "",
            text: c.label ?? c.text ?? "",
            to_scene_id: parseInt(c.to_scene_id ?? c.toSceneId ?? c.targetSubScene ?? "0", 10),
            targetSubScene: String(c.targetSubScene ?? c.to_scene_id ?? "")
          }))
        };
        await axios.put(`${API_BASE_URL}/scenes/${editEdgeSource}`, newPayload, { headers });
        
      } else if (isTargetOrLabelChanged) {
        // กรณีไม่เปลี่ยนต้นทาง แต่เปลี่ยนปลายทางหรือข้อความ
        const updatedChoices = oldChoices.map(c => {
          if (String(c.choice_id ?? c.id) === String(choiceId)) {
            return {
              ...c,
              label: editEdgeLabel,
              text: editEdgeLabel,
              to_scene_id: parseInt(editEdgeTarget, 10),
              targetSubScene: String(editEdgeTarget)
            };
          }
          return c;
        });

        const payload = {
          ...oldSourceData,
          choices: updatedChoices.map(c => ({
            choice_id: c.choice_id ?? c.id,
            label: c.label ?? c.text ?? "",
            text: c.label ?? c.text ?? "",
            to_scene_id: parseInt(c.to_scene_id ?? c.toSceneId ?? c.targetSubScene ?? "0", 10),
            targetSubScene: String(c.targetSubScene ?? c.to_scene_id ?? "")
          }))
        };
        await axios.put(`${API_BASE_URL}/scenes/${oldSourceId}`, payload, { headers });
      }

      showToast("แก้ไขเส้นทางเลือกสำเร็จแล้ว", "success");
      await fetchStoryTreeAndChapters();
      window.dispatchEvent(new Event("novel-data-updated"));
      setShowEdgeModal(false);
      setSelectedEdge(null);
    } catch (err) {
      console.error("Update connection error:", err);
      showToast("ไม่สามารถบันทึกการแก้ไขเส้นได้", "warn");
    }
  };

  const handleDeleteConnection = async () => {
    if (!selectedEdge) return;
    const choiceId = selectedEdge.data?.choice_id ?? selectedEdge.data?.id ?? selectedEdge.data?.ChoiceID;
    const sourceId = selectedEdge.source;

    const token = localStorage.getItem("token");
    const headers = { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    };

    try {
      showToast("กำลังลบทางเลือก...", "info");
      
      const sourceRes = await axios.get(`${API_BASE_URL}/scenes/${sourceId}`, { headers });
      const sourceData = sourceRes.data?.data || sourceRes.data;
      
      let choicesList = Array.isArray(sourceData.choices) ? sourceData.choices : [];
      const updatedChoices = choicesList.filter(c => 
        String(c.choice_id ?? c.id) !== String(choiceId)
      );
      
      const payload = {
        ...sourceData,
        choices: updatedChoices.map(c => ({
          choice_id: c.choice_id ?? c.id,
          label: c.label ?? c.text ?? "",
          text: c.label ?? c.text ?? "",
          to_scene_id: parseInt(c.to_scene_id ?? c.toSceneId ?? c.targetSubScene ?? "0", 10),
          targetSubScene: String(c.targetSubScene ?? c.to_scene_id ?? "")
        }))
      };

      await axios.put(`${API_BASE_URL}/scenes/${sourceId}`, payload, { headers });
      
      showToast("ลบเส้นทางเลือกสำเร็จแล้ว", "success");
      await fetchStoryTreeAndChapters();
      window.dispatchEvent(new Event("novel-data-updated"));
      setShowDeleteChoiceConfirm(false);
      setShowEdgeModal(false);
      setSelectedEdge(null);
    } catch (err) {
      console.error("Delete connection error:", err);
      showToast("ไม่สามารถลบเส้นทางเลือกได้", "warn");
    }
  };

  const handleConfirmDelete = useCallback(async () => {
    if (!sceneToDelete) return;
    const sceneId = sceneToDelete.id;
    const isTemp = sceneToDelete.data?.isTemp || String(sceneId).startsWith("temp-new-");
    
    try {
      if (isTemp) {
        // ลบจาก client-side ทันที
        setRfNodes((nds) => nds.filter((n) => n.id !== sceneId));
        setRfEdges((eds) => eds.filter((e) => e.source !== sceneId && e.target !== sceneId));
        showToast("ลบฉากชั่วคราวสำเร็จแล้ว", "success");
        window.dispatchEvent(new Event("novel-data-updated"));
      } else {
        // ยิง API ลบที่ backend
        const token = localStorage.getItem("token");
        const headers = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;
        
        await axios.delete(`${API_BASE_URL}/scenes/${sceneId}`, { headers });
        
        // ดึงข้อมูล story-tree ใหม่
        const response = await axios.get(`${API_BASE_URL}/novels/${novelId}/story-tree`);
        setTreeData(response.data?.data || response.data || null);
        showToast("ลบฉากเรียบร้อยแล้ว", "success");
        window.dispatchEvent(new Event("novel-data-updated"));
      }
      
      // ล้างค่าและเปลี่ยนโหมดกลับเป็น select
      setShowDeleteModal(false);
      setSceneToDelete(null);
      changeMode("select");
      setSelectedSceneId(null);
    } catch (err) {
      console.error("Delete scene error:", err);
      showToast("เกิดข้อผิดพลาดในการลบฉาก", "warn");
    }
  }, [sceneToDelete, novelId, showToast, changeMode, setRfNodes, setRfEdges]);

  const onNodesChangeWrapper = useCallback((changes) => {
    onNodesChangeRF(changes);
  }, [onNodesChangeRF]);

  const onEdgesChangeWrapper = useCallback((changes) => {
    onEdgesChangeRF(changes);
  }, [onEdgesChangeRF]);

  // ดักจับการเคลื่อนที่ของเมาส์บนบอร์ดเพื่ออัปเดตเส้นประวิ่งตามเมาส์
  const handlePaneMouseMove = useCallback((e) => {
    if (interactionMode !== "connect" || !connectSource) return;
    
    const flowPos = screenToFlowPosition({
      x: e.clientX,
      y: e.clientY
    });
    
    setRfNodes((nds) => {
      const hasCursor = nds.some(n => n.id === "cursor-node");
      if (!hasCursor) {
        const cursorNode = {
          id: "cursor-node",
          type: "default",
          position: flowPos,
          style: { opacity: 0, width: 0, height: 0, pointerEvents: "none" },
          data: {}
        };
        return [...nds, cursorNode];
      }
      return nds.map((n) => n.id === "cursor-node" ? { ...n, position: flowPos } : n);
    });
    
    setRfEdges((eds) => {
      const hasCursorEdge = eds.some(e => e.id === "cursor-edge");
      if (!hasCursorEdge) {
        const cursorEdge = {
          id: "cursor-edge",
          source: String(connectSource.id),
          target: "cursor-node",
          type: "smoothstep",
          animated: true,
          style: { stroke: "#2563EB", strokeWidth: 2, strokeDasharray: "5,5" }
        };
        return [...eds, cursorEdge];
      }
      return eds;
    });
  }, [interactionMode, connectSource, screenToFlowPosition, setRfNodes, setRfEdges]);

  // ดับเบิลคลิกเพื่อเปิด Scene Editor หน้าเขียนเนื้อหา
  const handleNodeDoubleClick = useCallback((evt, node) => {
    const currentMode = modeRef.current;
    if (currentMode === "connect" || currentMode === "add-node") return;
    
    const sceneId = node?.id;
    if (!sceneId) return;
    
    const isTemp = String(sceneId).startsWith("temp-new-") || node.data?.isTemp;
    if (isTemp) {
      // พาไปสร้างฉากใหม่พร้อมส่งพิกัด X, Y และ ตอนสังกัด (chapterId)
      onNavigate?.("scene-editor", {
        novelId,
        chapterId: node.data?.chapterId,
        sceneId: "new",
        x: Math.round(node.position?.x ?? 0),
        y: Math.round(node.position?.y ?? 0),
      });
      return;
    }
    
    const sceneData = sceneMap.get(sceneId);
    const chapterId = sceneData?.ChapterID ?? sceneData?.chapter_id ?? sceneData?.chapterId;
    
    if (onNavigate) {
      onNavigate("scene-editor", {
        novelId,
        chapterId,
        sceneId,
        x: Math.round(node.position?.x ?? 0),
        y: Math.round(node.position?.y ?? 0),
      });
    }
  }, [sceneMap, onNavigate, novelId]);

  // คลิกที่โหนด
  const handleNodeClick = useCallback((evt, node) => {
    if (!node) return;

    const currentMode = modeRef.current;

    // โหมดลบฉาก (Delete Mode)
    if (currentMode === "delete") {
      setSceneToDelete(node);
      setShowDeleteModal(true);
      return;
    }
    
    // โหมดเชื่อมฉาก (Connect Mode)
    if (currentMode === "connect") {
      if (!connectSource) {
        setConnectSource(node);
        const flowPos = screenToFlowPosition({
          x: evt.clientX,
          y: evt.clientY
        });
        const cursorNode = {
          id: "cursor-node",
          type: "default",
          position: flowPos,
          style: { opacity: 0, width: 0, height: 0, pointerEvents: "none" },
          data: {}
        };
        setRfNodes((nds) => [...nds.filter(n => n.id !== "cursor-node"), cursorNode]);
        
        const cursorEdge = {
          id: "cursor-edge",
          source: String(node.id),
          target: "cursor-node",
          type: "smoothstep",
          animated: true,
          style: { stroke: "#2563EB", strokeWidth: 2, strokeDasharray: "5,5" }
        };
        setRfEdges((eds) => [...eds.filter(e => e.id !== "cursor-edge"), cursorEdge]);
        return;
      }
      
      if (connectSource) {
        if (node.id === connectSource.id) return;
        
        const isDuplicated = normalizedEdges.some(
          e => String(e.fromId) === String(connectSource.id) && String(e.toId) === String(node.id)
        );
        if (isDuplicated) {
          showToast("เชื่อมทางนี้ไว้แล้วในระบบ", "warn");
          return;
        }
        
        setConnectTarget(node);
        setChoiceText("");
        setIsModalOpen(true);
      }
      return;
    }

    // โหมดเลือกปกติ (Select Mode)
    setSelectedSceneId(String(node.id));
    setSelection({ nodes: [node], edges: [] });
  }, [connectSource, normalizedEdges, screenToFlowPosition, setRfNodes, setRfEdges, showToast, setSceneToDelete, setShowDeleteModal]);

  const handleConfirmConnect = async () => {
    if (!choiceText.trim() || !connectSource || !connectTarget) return;

    try {
      const srcSceneId = connectSource.id;
      const dstSceneId = connectTarget.id;
      
      const srcIdInt = parseInt(srcSceneId, 10);
      const dstIdInt = parseInt(dstSceneId, 10);
      
      if (isNaN(srcIdInt) || isNaN(dstIdInt)) {
        showToast("กรุณากดแก้ไขและบันทึกข้อมูลของฉากใหม่ก่อนสร้างเส้นทางเชื่อมโยง", "warn");
        return;
      }
      
      const payload = {
        novel_id: parseInt(novelId, 10),
        from_scene_id: srcIdInt,
        to_scene_id: dstIdInt,
        label: choiceText.trim(),
        text: choiceText.trim(),
      };

      const token = localStorage.getItem("token");
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      await axios.post(`${API_BASE_URL}/choices`, payload, { headers });

      const response = await axios.get(`${API_BASE_URL}/novels/${novelId}/story-tree`);
      setTreeData(response.data?.data || response.data || null);

      showToast("เชื่อมทางเลือกสำเร็จแล้ว", "success");
      window.dispatchEvent(new Event("novel-data-updated"));

      setIsModalOpen(false);
      changeMode("select");
    } catch (err) {
      console.error("Save choice edge error:", err);
      showToast("เกิดข้อผิดพลาดในการบันทึกเส้นทางเชื่อมต่อ", "warn");
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setConnectSource(null);
    setConnectTarget(null);
    setRfNodes((nds) => nds.filter((n) => n.id !== "cursor-node"));
    setRfEdges((eds) => eds.filter((e) => e.id !== "cursor-edge"));
  };

  const selectedScene = selectedSceneId ? sceneMap.get(selectedSceneId) : null;
  const selectedSceneEdges = selectedSceneId ? normalizedEdges.filter((e) => {
    const sourceId = e.fromId;
    const targetId = e.toId;
    return String(sourceId) === selectedSceneId || String(targetId) === selectedSceneId;
  }) : [];

  const incomingChoices = selectedSceneEdges.filter((e) => {
    return String(e.toId) === selectedSceneId;
  });

  const outgoingChoices = selectedSceneEdges.filter((e) => {
    return String(e.fromId) === selectedSceneId;
  });

  const title = treeData?.NovelTitle || treeData?.novel_title || "Story Tree";

  // ข้อความและคำแนะนำ Dynamic ปรับตามเครื่องมือที่กด เพื่อนำทางนักเขียน
  const getBannerInstruction = () => {
    if (interactionMode === "select") {
      return (
        <span>
          💡 <strong>โหมดเลือก:</strong> คลิกโหนดเพื่อดูรายละเอียดฉากด้านซ้าย | ดับเบิลคลิกเพื่อแก้ไขเนื้อหาฉาก
        </span>
      );
    }
    if (interactionMode === "connect") {
      if (!connectSource) {
        return (
          <span>
            🔗 <strong>โหมดเชื่อมโยง:</strong> คลิกเลือกโหนดในแผนภาพเพื่อกำหนดให้เป็น <strong>ฉากต้นทาง</strong>
          </span>
        );
      } else {
        return (
          <span>
            🔗 <strong>โหมดเชื่อมโยง:</strong> คลิกเลือกอีกโหนดเพื่อเชื่อมไปยัง <strong>ฉากปลายทาง</strong> (กด ESC เพื่อยกเลิก)
          </span>
        );
      }
    }
    if (interactionMode === "pan") {
      return (
        <span>
          🖐️ <strong>โหมดเลื่อนบอร์ด:</strong> คลิกค้างไว้แล้วลากเมาส์เพื่อแพนกราฟเลื่อนดูฉากต่างๆ ได้อย่างอิสระ
        </span>
      );
    }
    if (interactionMode === "add-node") {
      return (
        <span>
          ✚ <strong>โหมดเพิ่มฉาก:</strong> คลิกตรงพื้นที่ว่างเปล่าใดก็ได้บนบอร์ดแผนภาพเพื่อวางโหนด <strong>ฉากใหม่</strong>
        </span>
      );
    }
    if (interactionMode === "delete") {
      return (
        <span style={{ color: "#ef4444" }}>
          🗑️ <strong>โหมดลบ:</strong> คลิกเลือกโหนดฉากเพื่อลบ
        </span>
      );
    }
    return null;
  };

  return (
    <div className="wst-page">
      {/* Toast Notification */}
      {toast && (
        <div className={`wst-toast ${toast.type}`}>
          <i className={`ti ti-${toast.type === "success" ? "check-circle" : toast.type === "warn" ? "alert-circle" : "info-circle"}`} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Modal Popup กำหนดทางเลือก (ขั้นตอนที่ 3) */}
      {isModalOpen && connectSource && connectTarget && (
        <div className="wst-modal-bg open" onClick={(e) => e.target.classList.contains("wst-modal-bg") && handleCloseModal()}>
          <div className="wst-modal" role="dialog" aria-modal="true">
            <div className="wst-modal-header">
              <div>
                <div className="wst-modal-eyebrow">
                  <i className="ti ti-git-merge"></i>สร้างทางเลือกใหม่
                </div>
                <h3 className="wst-modal-title">กำหนดข้อความทางเลือก</h3>
              </div>
              <button className="wst-modal-close" onClick={handleCloseModal}>✕</button>
            </div>

            {/* Route Card ยืนยันข้อมูล */}
            <div className="wst-modal-route">
              <div className="wst-route-node">
                <span className="wst-route-node-label">ต้นทาง</span>
                <span className="wst-route-node-title">{connectSource.data?.Title || getNodeTitle(connectSource.data)}</span>
                <span className="wst-route-node-id">ฉากที่ {scenePositionMap.get(normalizeId(connectSource.id)) ? `${scenePositionMap.get(normalizeId(connectSource.id)).chapterNumber}.${scenePositionMap.get(normalizeId(connectSource.id)).sceneNumber}` : connectSource.id}</span>
              </div>
              <div className="wst-route-arrow">
                <i className="ti ti-arrow-right"></i>
              </div>
              <div className="wst-route-divider"></div>
              <div className="wst-route-node">
                <span className="wst-route-node-label">ปลายทาง</span>
                <span className="wst-route-node-title">{connectTarget.data?.Title || getNodeTitle(connectTarget.data)}</span>
                <span className="wst-route-node-id">ฉากที่ {scenePositionMap.get(normalizeId(connectTarget.id)) ? `${scenePositionMap.get(normalizeId(connectTarget.id)).chapterNumber}.${scenePositionMap.get(normalizeId(connectTarget.id)).sceneNumber}` : connectTarget.id}</span>
              </div>
            </div>

            <div className="wst-modal-body">
              <label className="wst-field-label" htmlFor="popup-choice-text">
                <i className="ti ti-cursor-text"></i>
                ข้อความที่นักอ่านกด <span className="req">*</span>
              </label>
              <input
                id="popup-choice-text"
                className="wst-field-input"
                type="text"
                value={choiceText}
                onChange={(e) => setChoiceText(e.target.value)}
                placeholder="เช่น เดินไปทางลำธาร, สำรวจรอยเท้าประหลาด..."
                maxLength={80}
                autoFocus
              />
              <p className="wst-field-hint">ข้อความสั้น กระชับ บอกว่าตัวละครจะทำอะไร (ไม่เกิน 80 ตัวอักษร)</p>
            </div>

            <div className="wst-modal-footer">
              <button className="wst-modal-btn-cancel" onClick={handleCloseModal}>ยกเลิก</button>
              <button 
                className="wst-modal-btn-confirm" 
                onClick={handleConfirmConnect}
                disabled={!choiceText.trim()}
              >
                <i className="ti ti-git-merge"></i>
                เชื่อมโหนด
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="wst-topbar">
        <div className="wst-topbar__left">
          <button 
            className="wst-topbar__back" 
            onClick={() => {
              if (window.history.length > 1) {
                window.history.back();
              } else {
                onNavigate?.("dashboard");
              }
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 3L5 7L9 11" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            ย้อนกลับ
          </button>
          <div className="wst-topbar__divider-v" />
          <LegendBar />
        </div>
        <div className="wst-topbar__actions">
          <button className="wst-topbar__add" onClick={() => onNavigate && onNavigate("chapters", { novelId })}>จัดการตอน</button>
        </div>
      </header>

      <div className="wst-body">
        {/* Sidebar ยึดฝั่งซ้ายของ Canvas */}
        <aside className="wst-sidebar">
          {/* Stats Grid */}
          <div className="wst-sidebar__stats-grid">
            <div className="wst-sidebar__stat-card">
              <div className="wst-sidebar__stat-header">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
                <span>ฉากทั้งหมด</span>
              </div>
              <div className="wst-sidebar__stat-value">
                {stats?.TotalScenes ?? stats?.total_scenes ?? 0}
              </div>
            </div>

            <div className="wst-sidebar__stat-card">
              <div className="wst-sidebar__stat-header" style={{ color: "#db2777" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18.84 12.25a4.5 4.5 0 0 0-6.36-6.36l-1.5 1.5M13.02 16.61l-1.5 1.5a4.5 4.5 0 0 1-6.36-6.36"/><line x1="8" y1="16" x2="16" y2="8"/></svg>
                <span>ยังไม่เชื่อม</span>
              </div>
              <div className="wst-sidebar__stat-value" style={{ color: "#db2777" }}>
                {stats?.VisitedScenes ?? stats?.visited_scenes ?? 0}
              </div>
            </div>

            <div className="wst-sidebar__stat-card">
              <div className="wst-sidebar__stat-header">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>
                <span>ทางเลือก</span>
              </div>
              <div className="wst-sidebar__stat-value">
                {stats?.TotalChoicePoints ?? stats?.total_choice_points ?? 0}
              </div>
            </div>

            <div className="wst-sidebar__stat-card">
              <div className="wst-sidebar__stat-header">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                <span>ฉากจบ</span>
              </div>
              <div className="wst-sidebar__stat-value">
                {stats?.TotalEndings ?? stats?.total_endings ?? 0}
              </div>
            </div>
          </div>

          {selectedScene && (
            <>
              <div className="wst-sidebar__divider" />
              <SceneDetailsCard
                scene={selectedScene}
                scenePositionMap={scenePositionMap}
                sceneMap={sceneMap}
                selectedSceneId={selectedSceneId}
                onEdit={(sceneId) => {
                  const sceneData = sceneMap.get(sceneId);
                  const isTemp = String(sceneId).startsWith("temp-new-");
                  const chapterId = sceneData?.ChapterID ?? sceneData?.chapter_id ?? sceneData?.chapterId;
                  
                  onNavigate?.("scene-editor", {
                    novelId,
                    chapterId,
                    sceneId: isTemp ? "new" : sceneId,
                    x: Math.round(sceneData?.x ?? 0),
                    y: Math.round(sceneData?.y ?? 0),
                  });
                }}
                incomingChoices={incomingChoices}
                outgoingChoices={outgoingChoices}
                onSelectSceneNode={(targetId) => {
                  setSelectedSceneId(targetId);
                }}
              />
            </>
          )}
        </aside>

        {/* Canvas Area */}
        <div 
          className="wst-canvas-area" 
          style={{ 
            cursor: interactionMode === "connect" ? "crosshair" 
                  : interactionMode === "add-node" ? "cell" 
                  : "default" 
          }}
        >
          <div className="wst-canvas-heading">
            <h1 className="wst-canvas-title">โครงสร้างเนื้อเรื่อง</h1>
            <p className="wst-canvas-sub">{title} · ดูภาพรวมโครงสร้างเนื้อเรื่อง</p>
          </div>

          <div className="wst-canvas-wrap">
            {/* แถบคำแนะนำการใช้เครื่องมือ */}
            <div className="wst-canvas-guidance-banner">
              {getBannerInstruction()}
            </div>

            <div className="wst-canvas-scroll">
              <div
                className="wst-reactflow-container"
                ref={reactflowWrapperRef}
                style={{ width: "100%", height: "100%", position: "relative" }}
                onMouseMove={(e) => {
                  if (interactionMode === "connect" && connectSource) {
                    handlePaneMouseMove(e);
                  }
                }}
                onClick={handlePaneClick} // ดักคลิกบน Canvas พื้นหลัง
              >
                {/* Floating toolbar */}
                <div className="wst-canvas-toolbar" onClick={(e) => e.stopPropagation()}>
                  <button 
                    title="เลือก" 
                    className={`wst-toolbar-btn ${interactionMode==='select' ? 'wst-toolbar-btn--select-active':''}`} 
                    onClick={() => changeMode('select')}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3h6v6H3V3M15 3h6v6h-6V3M3 15h6v6H3v-6M15 15h6v6h-6v-6"/></svg>
                    <span>เลือก</span>
                  </button>
                  <button 
                    title="เชื่อมทางเลือก (กด C)" 
                    className={`wst-toolbar-btn ${interactionMode==='connect' ? 'wst-toolbar-btn--connect-active':''}`} 
                    onClick={() => changeMode(interactionMode === 'connect' ? 'select' : 'connect')}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l12 6-12 6V9z"/></svg>
                    <span>เชื่อม</span>
                  </button>
                  <button 
                    title="เลื่อน" 
                    className={`wst-toolbar-btn ${interactionMode==='pan' ? 'wst-toolbar-btn--pan-active':''}`} 
                    onClick={() => changeMode('pan')}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v5" />
                      <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v6" />
                      <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v9" />
                      <path d="M6 14.5v-1.5a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v6a8 8 0 0 0 8 8h2a8 8 0 0 0 8-8V11" />
                    </svg>
                    <span>เลื่อน</span>
                  </button>
                  <button 
                    title="คลิกที่ว่างในบอร์ดเพื่อเพิ่มฉาก" 
                    className={`wst-toolbar-btn ${interactionMode==='add-node' ? 'wst-toolbar-btn--add-active':''}`}
                    onClick={() => changeMode(interactionMode === 'add-node' ? 'select' : 'add-node')}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                    <span>เพิ่ม</span>
                  </button>
                  <button 
                    title="คลิกเลือกโหนดฉากเพื่อลบ" 
                    className={`wst-toolbar-btn ${interactionMode==='delete' ? 'wst-toolbar-btn--delete-active':''}`}
                    onClick={() => changeMode(interactionMode === 'delete' ? 'select' : 'delete')}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2M10 11v6M14 11v6M5 6l1 13a1 1 0 001 1h10a1 1 0 001-1l1-13"/></svg>
                    <span>ลบ</span>
                  </button>
                </div>

                <ReactFlow
                  nodes={rfNodes}
                  edges={rfEdges}
                  nodeTypes={nodeTypes}
                  onNodeClick={handleNodeClick}
                  onNodeDoubleClick={handleNodeDoubleClick}
                  onNodesChange={onNodesChangeWrapper}
                  onEdgesChange={onEdgesChangeWrapper}
                  onConnect={onConnect}
                  onSelectionChange={handleSelectionChange}
                  fitView
                  fitViewOptions={{ padding: 0.2 }}
                  preventScrolling={false}
                  panOnScroll
                  panOnDrag={interactionMode === 'pan'}
                  nodesDraggable={interactionMode !== 'pan' && interactionMode !== 'connect' && interactionMode !== 'add-node'}
                  nodesConnectable={false}
                  elementsSelectable={interactionMode === 'select' || interactionMode === 'delete'}
                  edgesFocusable={true}
                  edgesUpdatable={interactionMode === 'select'}
                  minZoom={0.3}
                  maxZoom={1.6}
                  className="wst-reactflow"
                >
                  <MiniMap
                    zoomable
                    pannable
                    nodeColor={(node) => {
                      const status = node.data?.status;
                      switch (status) {
                        case WRITER_NODE_STATUS.START:
                          return "#16A34A";
                        case WRITER_NODE_STATUS.ENDING:
                          return "#EF4444";
                        case WRITER_NODE_STATUS.ORPHAN:
                          return "#94A3B8";
                        default:
                          return "#38BDF8";
                      }
                    }}
                  />

                  <Controls showZoom showFitView showInteractive={false} />

                  <Background variant={BackgroundVariant.Dots} gap={24} size={1} />
                </ReactFlow>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showAddScenePopup && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.35)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 100000,
          padding: '16px', backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: '#fff', padding: '28px', borderRadius: '24px',
            width: '100%', maxWidth: '440px', boxShadow: '0 20px 50px rgba(37, 99, 235, 0.15)',
            fontFamily: '"Outfit", "Sarabun", sans-serif', border: '1px solid #bfdbfe'
          }}>
            <h3 style={{ marginTop: 0, color: '#1e3a8a', fontSize: '20px', fontWeight: '800', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📌 เลือกตอนและตั้งชื่อสำหรับฉากใหม่
            </h3>
            <p style={{ color: '#6b7280', fontSize: '14.5px', marginBottom: '20px', lineHeight: '1.6' }}>
              กรุณากรอกชื่อฉากและเลือกตอนที่คุณต้องการจัดเก็บฉากใหม่นี้ ก่อนบันทึกลงบนผังโครงสร้างเรื่อง
            </p>
            
            {/* Input ชื่อฉาก */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 700, color: '#4b5563' }}>
                ชื่อฉาก <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="เช่น การเดินทางครั้งใหม่, เผชิญหน้ากับศัตรู..."
                value={newSceneTitle}
                onChange={(e) => setNewSceneTitle(e.target.value)}
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: '12px',
                  border: '1.5px solid #bfdbfe', fontSize: '14.5px', fontFamily: 'inherit',
                  color: '#1f2937', outline: '#3b82f6', background: '#f8fafc',
                  transition: 'all 0.2s ease'
                }}
              />
            </div>

            <div style={{ marginBottom: '28px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 700, color: '#4b5563' }}>
                ตอน
              </label>
              {novelChapters.length === 0 ? (
                <div style={{ color: '#dc2626', fontSize: '14px', background: '#fef2f2', padding: '12px', borderRadius: '12px', border: '1px solid #fecaca' }}>
                  ⚠️ นิยายนี้ยังไม่มีตอนใดๆ เลย กรุณาไปสร้างตอนอย่างน้อยหนึ่งตอนที่หน้า "จัดการตอนนิยาย" ก่อน
                </div>
              ) : (
                <select 
                  value={selectedMoveChapterId}
                  onChange={(e) => setSelectedMoveChapterId(e.target.value)}
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: '12px',
                    border: '1.5px solid #bfdbfe', fontSize: '14.5px', fontFamily: 'inherit',
                    color: '#1f2937', outline: 'none', background: '#f8fafc',
                    transition: 'all 0.2s ease', cursor: 'pointer'
                  }}
                >
                  {novelChapters.map((ch, index) => {
                    const chId = ch.id ?? ch.chapter_id ?? ch.ChapterID ?? ch.chapterId;
                    return (
                      <option key={`add-target-ch-${chId}`} value={chId}>
                        ตอนที่ {ch.chapterNumber ?? ch.order_index ?? ch.episode ?? (index + 1)} — {ch.title}
                      </option>
                    );
                  })}
                </select>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                onClick={() => {
                  setShowAddScenePopup(false);
                  setPendingScenePosition(null);
                  setNewSceneTitle("");
                }}
                style={{
                  padding: '10px 20px', borderRadius: '20px', border: '1px solid #d1d5db',
                  background: '#ffffff', color: '#4b5563', cursor: 'pointer',
                  fontSize: '14px', fontWeight: '600', transition: 'all 0.2s'
                }}
              >
                ยกเลิก
              </button>
              <button 
                disabled={novelChapters.length === 0 || !newSceneTitle.trim()}
                onClick={handleAddSceneBackend}
                style={{
                  padding: '10px 24px', borderRadius: '20px', border: 'none',
                  background: 'linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 100%)',
                  color: '#ffffff', cursor: (novelChapters.length === 0 || !newSceneTitle.trim()) ? 'not-allowed' : 'pointer',
                  fontSize: '14px', fontWeight: '700', transition: 'all 0.2s',
                  boxShadow: '0 4px 12px rgba(29, 78, 216, 0.25)',
                  opacity: (novelChapters.length === 0 || !newSceneTitle.trim()) ? 0.5 : 1
                }}
              >
                ตกลงสร้างฉาก
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && sceneToDelete && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.45)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 100000,
          padding: '16px', backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: '#fff', padding: '28px', borderRadius: '24px',
            width: '100%', maxWidth: '460px', boxShadow: '0 20px 50px rgba(239, 68, 68, 0.15)',
            fontFamily: '"Outfit", "Sarabun", sans-serif', border: '1px solid #fecaca'
          }}>
            <h3 style={{ marginTop: 0, color: '#dc2626', fontSize: '20px', fontWeight: '800', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⚠️ ยืนยันการลบฉาก
            </h3>
            
            <div style={{ background: '#fef2f2', padding: '16px', borderRadius: '16px', border: '1px solid #fee2e2', marginBottom: '24px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#991b1b', marginBottom: '4px' }}>
                ฉากที่เลือก:
              </div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#1f2937', marginBottom: '12px' }}>
                {sceneToDelete.data?.Title || getNodeTitle(sceneToDelete.data)}
              </div>
              
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#991b1b', marginBottom: '4px' }}>
                ตอนสังกัด:
              </div>
              <div style={{ fontSize: '14px', color: '#4b5563', marginBottom: '12px' }}>
                ตอนที่ {sceneToDelete.data?.chapterNumber ?? "?"} — {sceneToDelete.data?.chapterTitle || getNodeChapter(sceneToDelete.data) || "ไม่มีตอน"}
              </div>

              <div style={{ fontSize: '13px', fontWeight: '700', color: '#991b1b', marginBottom: '4px' }}>
                เนื้อเรื่องสังเขป:
              </div>
              <div style={{ fontSize: '13px', color: '#6b7280', maxHeight: '100px', overflowY: 'auto', lineHeight: '1.6', background: '#ffffff', padding: '10px', borderRadius: '8px', border: '1px solid #f3f4f6' }}>
                {sceneToDelete.data?.Content || getNodeContent(sceneToDelete.data) || "(ไม่มีรายละเอียดเนื้อหา)"}
              </div>
            </div>

            <p style={{ color: '#4b5563', fontSize: '14px', marginBottom: '24px', lineHeight: '1.5' }}>
              คุณแน่ใจหรือไม่ว่าต้องการลบฉากนี้ออกจากระบบ? **การกระทำนี้ไม่สามารถย้อนคืนได้และเส้นเชื่อมเลือกใดๆ จากฉากนี้จะถูกลบออกด้วย**
            </p>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                onClick={() => {
                  setShowDeleteModal(false);
                  setSceneToDelete(null);
                  changeMode("select");
                }}
                style={{
                  padding: '10px 20px', borderRadius: '20px', border: '1px solid #d1d5db',
                  background: '#ffffff', color: '#4b5563', cursor: 'pointer',
                  fontSize: '14px', fontWeight: '600', transition: 'all 0.2s'
                }}
              >
                ยกเลิก
              </button>
              <button 
                onClick={handleConfirmDelete}
                style={{
                  padding: '10px 24px', borderRadius: '20px', border: 'none',
                  background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                  color: '#ffffff', cursor: 'pointer',
                  fontSize: '14px', fontWeight: '700', transition: 'all 0.2s',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)'
                }}
              >
                ยืนยันการลบ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edge management Modals */}
      {showEdgeModal && selectedEdge && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.35)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 100000,
          padding: '16px', backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: '#fff', padding: '28px', borderRadius: '24px',
            width: '100%', maxWidth: '460px', boxShadow: '0 20px 50px rgba(37, 99, 235, 0.15)',
            fontFamily: '"Outfit", "Sarabun", sans-serif', border: '1px solid #bfdbfe'
          }}>
            <h3 style={{ marginTop: 0, color: '#1e3a8a', fontSize: '20px', fontWeight: '800', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🔧 จัดการทางเลือก
            </h3>
            <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '20px' }}>
              แก้ไขรายละเอียด ปลายทาง หรือลบทางเลือกเชื่อมโยงเส้นนี้
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 700, color: '#4b5563' }}>
                ข้อความปุ่มทางเลือก
              </label>
              <input 
                type="text"
                value={editEdgeLabel}
                onChange={(e) => setEditEdgeLabel(e.target.value)}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: '10px',
                  border: '1.5px solid #bfdbfe', fontSize: '14px', fontFamily: 'inherit',
                  color: '#1f2937', outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 700, color: '#4b5563' }}>
                ฉากต้นทาง (Source)
              </label>
              <select
                value={editEdgeSource}
                onChange={(e) => setEditEdgeSource(e.target.value)}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: '10px',
                  border: '1.5px solid #bfdbfe', fontSize: '14px', fontFamily: 'inherit',
                  color: '#1f2937', outline: 'none', background: '#f8fafc'
                }}
              >
                {rfNodes.filter(n => n.id !== "cursor-node").map(n => {
                  const num = scenePositionMap.get(n.id) 
                    ? `${scenePositionMap.get(n.id).chapterNumber}.${scenePositionMap.get(n.id).sceneNumber}` 
                    : "";
                  return (
                    <option key={`edge-src-${n.id}`} value={n.id}>
                      ฉาก {num} — {n.data?.title || n.data?.Title || "ไม่มีชื่อ"}
                    </option>
                  );
                })}
              </select>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 700, color: '#4b5563' }}>
                ฉากปลายทาง (Target)
              </label>
              <select
                value={editEdgeTarget}
                onChange={(e) => setEditEdgeTarget(e.target.value)}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: '10px',
                  border: '1.5px solid #bfdbfe', fontSize: '14px', fontFamily: 'inherit',
                  color: '#1f2937', outline: 'none', background: '#f8fafc'
                }}
              >
                {rfNodes.filter(n => n.id !== "cursor-node").map(n => {
                  const num = scenePositionMap.get(n.id) 
                    ? `${scenePositionMap.get(n.id).chapterNumber}.${scenePositionMap.get(n.id).sceneNumber}` 
                    : "";
                  return (
                    <option key={`edge-tgt-${n.id}`} value={n.id}>
                      ฉาก {num} — {n.data?.title || n.data?.Title || "ไม่มีชื่อ"}
                    </option>
                  );
                })}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={() => setShowDeleteChoiceConfirm(true)}
                style={{
                  padding: '10px 18px', borderRadius: '20px', border: 'none',
                  background: '#fef2f2', color: '#ef4444', cursor: 'pointer',
                  fontSize: '13.5px', fontWeight: '700', transition: 'all 0.2s'
                }}
              >
                🗑️ ลบทางเลือกนี้
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => {
                    setShowEdgeModal(false);
                    setSelectedEdge(null);
                  }}
                  style={{
                    padding: '9px 16px', borderRadius: '20px', border: '1px solid #d1d5db',
                    background: '#ffffff', color: '#4b5563', cursor: 'pointer',
                    fontSize: '13.5px', fontWeight: '600'
                  }}
                >
                  ยกเลิก
                </button>
                <button 
                  onClick={handleUpdateConnection}
                  style={{
                    padding: '9px 20px', borderRadius: '20px', border: 'none',
                    background: 'linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 100%)',
                    color: '#ffffff', cursor: 'pointer',
                    fontSize: '13.5px', fontWeight: '700',
                    boxShadow: '0 4px 10px rgba(29, 78, 216, 0.2)'
                  }}
                >
                  บันทึก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteChoiceConfirm && selectedEdge && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.45)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 100000,
          padding: '16px', backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: '#fff', padding: '28px', borderRadius: '24px',
            width: '100%', maxWidth: '440px', boxShadow: '0 20px 50px rgba(239, 68, 68, 0.15)',
            fontFamily: '"Outfit", "Sarabun", sans-serif', border: '1px solid #fecaca'
          }}>
            <h3 style={{ marginTop: 0, color: '#dc2626', fontSize: '18px', fontWeight: '800', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⚠️ ยืนยันการลบทางเลือก
            </h3>
            <p style={{ color: '#4b5563', fontSize: '14.5px', marginBottom: '24px', lineHeight: '1.6' }}>
              คุณต้องการลบเส้นทางเลือก <strong>"{selectedEdge.label || "เลือกเส้นทางนี้"}"</strong> ออกจากระบบใช่หรือไม่? ฉากที่อยู่ถัดไปจะไม่ถูกลบ แต่ความเชื่อมโยงจะขาดหายไป
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                onClick={() => {
                  setShowDeleteChoiceConfirm(false);
                  setSelectedEdge(null);
                  fetchStoryTreeAndChapters();
                }}
                style={{
                  padding: '10px 20px', borderRadius: '20px', border: '1px solid #d1d5db',
                  background: '#ffffff', color: '#4b5563', cursor: 'pointer',
                  fontSize: '14px', fontWeight: '600'
                }}
              >
                ยกเลิก
              </button>
              <button 
                onClick={handleDeleteConnection}
                style={{
                  padding: '10px 24px', borderRadius: '20px', border: 'none',
                  background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                  color: '#ffffff', cursor: 'pointer',
                  fontSize: '14px', fontWeight: '700',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)'
                }}
              >
                ยืนยันการลบ
              </button>
            </div>
          </div>
        </div>
      )}

      {showEdgeUpdateConfirm && pendingEdgeUpdate && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.45)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 100000,
          padding: '16px', backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: '#fff', padding: '28px', borderRadius: '24px',
            width: '100%', maxWidth: '440px', boxShadow: '0 20px 50px rgba(37, 99, 235, 0.15)',
            fontFamily: '"Outfit", "Sarabun", sans-serif', border: '1px solid #bfdbfe'
          }}>
            <h3 style={{ marginTop: 0, color: '#1e3a8a', fontSize: '18px', fontWeight: '800', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ยืนยันการย้ายจุดเชื่อมต่อ
            </h3>
            <p style={{ color: '#4b5563', fontSize: '14.5px', marginBottom: '24px', lineHeight: '1.6' }}>
              ต้องการย้ายมาเชื่อมโหนดนี้ใช่ไหม?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                onClick={() => {
                  setShowEdgeUpdateConfirm(false);
                  setPendingEdgeUpdate(null);
                  fetchStoryTreeAndChapters();
                }}
                style={{
                  padding: '10px 20px', borderRadius: '20px', border: '1px solid #d1d5db',
                  background: '#ffffff', color: '#4b5563', cursor: 'pointer',
                  fontSize: '14px', fontWeight: '600'
                }}
              >
                ยกเลิก
              </button>
              <button 
                onClick={handleConfirmEdgeUpdate}
                style={{
                  padding: '10px 24px', borderRadius: '20px', border: 'none',
                  background: 'linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 100%)',
                  color: '#ffffff', cursor: 'pointer',
                  fontSize: '14px', fontWeight: '700',
                  boxShadow: '0 4px 12px rgba(29, 78, 216, 0.25)'
                }}
              >
                ยืนยันการย้าย
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SceneDetailsCard = ({
  scene,
  scenePositionMap,
  sceneMap,
  selectedSceneId,
  onEdit,
  incomingChoices,
  outgoingChoices,
  onSelectSceneNode
}) => {
  const sceneId = getNodeId(scene);
  const pos = scenePositionMap.get(sceneId);
  const type = getNodeType(scene);

  const getSceneNodeColorInfo = (targetSceneId) => {
    const targetScene = sceneMap?.get(String(targetSceneId));
    const type = targetScene ? getNodeType(targetScene) : "normal";
    
    const typeColor = type === "start" || type === "starting" ? "#15803D"
      : type === "ending" || type === "end" ? "#B91C1C"
        : "#38BDF8";
        
    const typeBgColor = type === "start" || type === "starting" ? "#F0FDF4"
      : type === "ending" || type === "end" ? "#FEF2F2"
        : "#ecf7fd";
        
    const typeBorderColor = type === "start" || type === "starting" ? "#DCFCE7"
      : type === "ending" || type === "end" ? "#FEE2E2"
        : "#E2E8F0";
        
    return { color: typeColor, bg: typeBgColor, border: typeBorderColor };
  };

  const formatChoiceSourceInfo = (choice) => {
    if (!choice) return "";
    const fromTitle =
      choice.fromSceneTitle ||
      choice.from_scene_title ||
      choice.FromSceneTitle ||
      "ไม่ทราบ";
    
    const sourceSceneId = normalizeId(choice.fromId ?? choice.from_id);
    const sourcePos = scenePositionMap.get(sourceSceneId);
    const sourceSceneNum = sourcePos ? `${sourcePos.chapterNumber}.${sourcePos.sceneNumber}` : "?.?";
    
    return `ฉาก ${sourceSceneNum} · ${fromTitle}`;
  };

  const typeLabel = type === "start" || type === "starting" ? "จุดเริ่มต้น"
    : type === "ending" || type === "end" ? "ฉากจบ"
      : "ฉากทั่วไป";

  const typeColor = type === "start" || type === "starting" ? "#16A34A"
    : type === "ending" || type === "end" ? "#EF4444"
      : "#38BDF8";

  const typeBgColor = type === "start" || type === "starting" ? "#DCFCE7"
    : type === "ending" || type === "end" ? "#FEE2E2"
      : "#E0F2FE";

  const typeIcon = type === "start" || type === "starting" ? "▶"
    : type === "ending" || type === "end" ? "🏆"
      : "📖";

  const sceneNumber = pos ? `${pos.chapterNumber}.${pos.sceneNumber}` : "?";
  const sceneTitle = getNodeTitle(scene);
  const chapterTitle = pos ? `ตอนที่ ${pos.chapterNumber}` : getNodeChapter(scene);

  const formatChoiceDestinationInfo = (choice) => {
    if (!choice) return "";
    const toTitle =
      choice.toSceneTitle ||
      choice.to_scene_title ||
      choice.ToSceneTitle ||
      "ไม่ทราบ";
    
    const targetSceneId = normalizeId(choice.toId ?? choice.to_scene_id);
    const targetPos = scenePositionMap.get(targetSceneId);
    const targetSceneNum = targetPos ? `${targetPos.chapterNumber}.${targetPos.sceneNumber}` : "?.?";
    
    return `ฉาก ${targetSceneNum} · ${toTitle}`;
  };

  return (
    <div className="wst-scene-details">
      {/* Header Section */}
      <div className="wst-scene-details__header">
        <h4 className="wst-scene-details__scene-number">ฉากที่ {sceneNumber}</h4>
        <span
          className="wst-scene-details__type-badge"
          style={{
            borderColor: typeColor,
            color: typeColor,
            backgroundColor: typeBgColor
          }}
        >
          {typeIcon} {typeLabel}
        </span>
      </div>

      {/* Title */}
      <h3 className="wst-scene-details__title">{sceneTitle}</h3>

      {/* Action Button */}
      <div className="wst-scene-details__actions">
        <button
          className="wst-scene-details__btn wst-scene-details__btn--edit"
          onClick={() => onEdit?.(selectedSceneId)}
          style={{ width: "100%" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          แก้ไขฉาก
        </button>
      </div>

      {/* Tags Section */}
      <div className="wst-scene-details__meta-tags">
        <div className="wst-scene-details__tag">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
          {chapterTitle}
        </div>
        <div className="wst-scene-details__tag">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>
          {outgoingChoices.length} ทางเลือก
        </div>
      </div>

      {/* Content Excerpt */}
      <div className="wst-scene-details__excerpt-section">
        <div className="wst-scene-details__section-header">
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            ตัวอย่างเนื้อหา
          </span>
        </div>
        <div className="wst-scene-details__excerpt-box">
          {getNodeContent(scene) || "ไม่มีเนื้อหาในฉากนี้"}
        </div>
      </div>

      {/* Incoming Choices List (ฉากก่อนหน้า) */}
      <div className="wst-scene-details__choices-section" style={{ marginBottom: "20px" }}>
        <div className="wst-scene-details__section-header">
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            ฉากก่อนหน้า
          </span>
          <span className="wst-scene-details__choices-count-badge">
            {incomingChoices.length} ฉาก
          </span>
        </div>

        <div className="wst-scene-details__choices-list">
          {incomingChoices.map((choice, idx) => {
            const srcId = normalizeId(choice.fromId ?? choice.from_id);
            const info = getSceneNodeColorInfo(srcId);
            return (
              <div 
                key={`incoming-${idx}`} 
                className="wst-choice-card"
                onClick={() => onSelectSceneNode?.(srcId)}
                style={{ 
                  borderLeft: `4px solid ${info.color}`,
                  background: info.bg
                }}
              >
                <div className="wst-choice-card__left">
                  <div className="wst-choice-card__number" style={{ background: info.color, color: "#fff" }}>
                    {idx + 1}
                  </div>
                  <div className="wst-choice-card__info">
                    <span className="wst-choice-card__text" style={{ color: "#1f2937" }}>
                      {getChoiceLabel(choice)}
                    </span>
                    <span className="wst-choice-card__dest" style={{ color: "#4b5563" }}>
                      ➔ {formatChoiceSourceInfo(choice)}
                    </span>
                  </div>
                </div>
                <span className="wst-choice-card__arrow" style={{ color: info.color }}>❯</span>
              </div>
            );
          })}

          {incomingChoices.length === 0 && (
            <div className="wst-scene-details__empty-state">
              <p>ฉากนี้เป็นจุดเริ่มต้น (ไม่มีฉากก่อนหน้าเชื่อมโยงมา)</p>
            </div>
          )}
        </div>
      </div>

      {/* Outgoing Choices List (ทางเลือกถัดไป) */}
      <div className="wst-scene-details__choices-section">
        <div className="wst-scene-details__section-header">
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
            ทางเลือกถัดไป
          </span>
          <span className="wst-scene-details__choices-count-badge">
            {outgoingChoices.length} ทาง
          </span>
        </div>

        <div className="wst-scene-details__choices-list">
          {outgoingChoices.map((choice, idx) => {
            const destId = normalizeId(choice.toId ?? choice.to_scene_id);
            const info = getSceneNodeColorInfo(destId);
            return (
              <div 
                key={`outgoing-${idx}`} 
                className="wst-choice-card"
                onClick={() => onSelectSceneNode?.(destId)}
                style={{ 
                  borderLeft: `4px solid ${info.color}`,
                  background: info.bg
                }}
              >
                <div className="wst-choice-card__left">
                  <div className="wst-choice-card__number" style={{ background: info.color, color: "#fff" }}>
                    {idx + 1}
                  </div>
                  <div className="wst-choice-card__info">
                    <span className="wst-choice-card__text" style={{ color: "#1f2937" }}>
                      {getChoiceLabel(choice)}
                    </span>
                    <span className="wst-choice-card__dest" style={{ color: "#4b5563" }}>
                      ➔ {formatChoiceDestinationInfo(choice)}
                    </span>
                  </div>
                </div>
                <span className="wst-choice-card__arrow" style={{ color: info.color }}>❯</span>
              </div>
            );
          })}

          {outgoingChoices.length === 0 && (
            <div className="wst-scene-details__empty-state">
              <p>ฉากนี้ยังไม่มีทางเลือกถัดไป (เป็นฉากจบตอน/ฉากจบเรื่อง)</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Wrapper Component หุ้มด้วย ReactFlowProvider เพื่อแชร์ Context
const WriterStoryTreePage = (props) => {
  return (
    <ReactFlowProvider>
      <StoryTreeInner {...props} />
    </ReactFlowProvider>
  );
};

export default WriterStoryTreePage;