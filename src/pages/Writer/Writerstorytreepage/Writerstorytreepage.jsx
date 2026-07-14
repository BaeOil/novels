// src/pages/Writer/WriterStoryTreePage/WriterStoryTreePage.jsx
//
// ══════════════════════════════════════════════════════════════════
//  Writer Story Tree
//  Scene = Node, Choice = Edge (labeled)
//
//  Features:
//   - SVG-based graph rendering
//   - Read-only preview with selection + navigation
//   - Chapter grouping sidebar
//   - Ending nodes and scene connections
//
//  CONNECTED: GET /novels/:id/story-tree
// ══════════════════════════════════════════════════════════════════

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
} from "reactflow";
import axios from "axios";
import "reactflow/dist/style.css";
import "./Writerstorytreepage.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const NODE_WIDTH = 260;
const NODE_HEIGHT = 118;
const NODE_HORIZONTAL_GAP = 260;
const NODE_VERTICAL_GAP = 170;
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
  if (type === "start") return WRITER_NODE_STATUS.START;
  if (type === "ending") return WRITER_NODE_STATUS.ENDING;
  return WRITER_NODE_STATUS.NORMAL;
};

const StoryNode = ({ data }) => {
  const status = data.status;
  const style = WRITER_NODE_STYLE[status] || WRITER_NODE_STYLE[WRITER_NODE_STATUS.NORMAL];
  const title = getNodeTitle(data);

  // Get chapter and scene numbers from data or scenePositionMap
  const chapterNo = data.chapterNumber || data.chapter_number || data.ChapterID || "?";
  const sceneNo = data.sceneNumber || data.scene_number || data.ID || "?";

  const description = getNodeContent(data);
  const chapter = getNodeChapter(data);

  return (
    <div className="wst-node-card" style={{ borderColor: style.stroke, background: style.fill, color: style.text }}>
      <Handle type="target" position={Position.Top} />
      
      {/* Header: Chapter badge */}
      <div className="wst-node-card__badge">
        ตอนที่ {chapterNo}
      </div>

      {/* Scene number */}
      <div className="wst-node-card__scene-num">
        ฉาก {chapterNo}.{sceneNo}
      </div>

      {/* Title */}
      <div className="wst-node-card__title">
        {title}
      </div>

      {/* Description/Content */}
      <div className="wst-node-card__desc">
        {description}
      </div>

      {/* Edit button */}
      <button
        className="wst-node-card__edit"
        onClick={(e) => {
          e.stopPropagation();
          data.onEdit?.(
            getSceneId(data),
            data.ChapterID
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

const WriterStoryTreePage = ({ novelId, onNavigate }) => {
  const [treeData, setTreeData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSceneId, setSelectedSceneId] = useState(null);
  const [interactionMode, setInteractionMode] = useState("select"); // select | connect | pan
  const reactflowWrapperRef = useRef(null);

  useEffect(() => {
    const fetchStoryTree = async () => {
      if (!novelId) return;
      setIsLoading(true);
      setError(null);
      try {
        const response = await axios.get(`${API_BASE_URL}/novels/${novelId}/story-tree`);
        setTreeData(response.data?.data || response.data || null);
      } catch (err) {
        console.error("Error fetching story tree:", err);
        setError("ไม่สามารถโหลดข้อมูล โครงสร้างเนื้อเรื่อง ได้ กรุณาลองใหม่อีกครั้ง");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStoryTree();
  }, [novelId]);

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

  const sceneMap = useMemo(() => {
    const map = new Map();
    uniqueNodes.forEach((scene) => map.set(getNodeId(scene), scene));
    return map;
  }, [uniqueNodes]);

  const { positionedNodes, positionedEdges, chapters, stats } = useMemo(() => {
    if (!uniqueNodes.length) {
      return { positionedNodes: [], positionedEdges: [], chapters: [], stats: treeData?.Stats ?? treeData?.stats ?? null };
    }

    const nodeIds = uniqueNodes.map(getNodeId);
    const adjacency = {};
    const inDegree = {};
    const nodeStatuses = {};
    const nodeLevels = {};

    nodeIds.forEach((id) => {
      adjacency[id] = [];
      inDegree[id] = 0;
    });

    // Resolve edge endpoints more robustly: backend may use different field names or
    // partial ids. Try direct match first, then fallback to searching nodeIds.
    const findMatchingNodeId = (raw) => {
      const candidate = normalizeId(raw);
      if (!candidate) return "";
      if (adjacency[candidate] !== undefined) return candidate;
      // try exact equality or contains/endsWith heuristics
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
      const scene = sceneMap.get(id);
      const type = getNodeType(scene);
      if (type === "start" || inDegree[id] === 0) {
        nodeLevels[id] = 0;
        queue.push(id);
      }
    });

    while (queue.length > 0) {
      const current = queue.shift();
      const level = nodeLevels[current] ?? 0;
      adjacency[current].forEach((childId) => {
        const nextLevel = level + 1;
        if (nodeLevels[childId] === undefined || nodeLevels[childId] > nextLevel) {
          nodeLevels[childId] = nextLevel;
          queue.push(childId);
        }
      });
    }

    const columns = {};
    nodeIds.forEach((id) => {
      const level = nodeLevels[id] ?? 0;
      if (!columns[level]) columns[level] = [];
      columns[level].push(id);
    });

    const positions = {};
    Object.keys(columns)
      .map(Number)
      .sort((a, b) => a - b)
      .forEach((level) => {
        const columnNodes = columns[level];
        const total = columnNodes.length;
        const offset = ((total - 1) * (NODE_WIDTH + NODE_HORIZONTAL_GAP)) / 2;

        columnNodes.forEach((sceneId, index) => {
          const x = CANVAS_MARGIN + index * (NODE_WIDTH + NODE_HORIZONTAL_GAP) - offset;
          const y = CANVAS_MARGIN + level * (NODE_HEIGHT + NODE_VERTICAL_GAP);
          positions[sceneId] = { x, y };
        });
      });

    const allX = Object.values(positions).map((pos) => pos.x);
    const allY = Object.values(positions).map((pos) => pos.y);
    const minY = Math.min(...allY, 0);
    const shiftY = Math.max(CANVAS_MARGIN, CANVAS_MARGIN - minY);

    Object.keys(positions).forEach((sceneId) => {
      positions[sceneId].y += shiftY;
    });

    const positionedNodes = nodeIds.map((sceneId) => {
      const scene = sceneMap.get(sceneId);
      const position = positions[sceneId] || { x: CANVAS_MARGIN, y: CANVAS_MARGIN };
      return {
        id: sceneId,
        scene,
        x: position.x,
        y: position.y,
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
  }, [nodes, edges, sceneMap, treeData]);

  // Convert positionedNodes/positionedEdges into React Flow node/edge shapes
  const flowNodes = useMemo(() => {
    return positionedNodes.map((n) => ({
      id: String(n.id),
      type: "writerNode",
      position: { x: n.x, y: n.y },
      data: {
        ...n.scene,
        status: n.status,
        onEdit: (sceneId, chapterId) => {
          onNavigate?.("scene-editor", { novelId, chapterId, sceneId });
        },
      },
    }));
  }, [positionedNodes, novelId, onNavigate]);

  const flowEdges = useMemo(() => {
    return positionedEdges.map((e) => ({
      id: String(e.id || `e-${e.source}-${e.target}`),
      source: String(e.source),
      target: String(e.target),
      label: e.label || "",
      type: e.type || "smoothstep",
      data: e.data || {},
      animated: !!e.animated,
    }));
  }, [positionedEdges]);

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

  // nodeTypes now defined at module top-level (see above)

  // create editable react-flow state initialized from computed flowNodes/flowEdges
  const [rfNodes, setRfNodes, onNodesChangeRF] = useNodesState([]);
  const [rfEdges, setRfEdges, onEdgesChangeRF] = useEdgesState([]);
  const [selection, setSelection] = useState({ nodes: [], edges: [] });

  // sync when backend positions change
  useEffect(() => {
    setRfNodes(flowNodes);
  }, [flowNodes, setRfNodes]);

  useEffect(() => {
    setRfEdges(flowEdges);
  }, [flowEdges, setRfEdges]);

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
    // sel = { nodes: [...], edges: [...] } (ReactFlow v10)
    setSelection({
      nodes: sel?.nodes || [],
      edges: sel?.edges || [],
    });
  }, []);

  const addNewNode = useCallback(() => {
    const id = `new-${Date.now()}`;
    const newNode = {
      id,
      type: "writerNode",
      position: { x: 60 + Math.random() * 200, y: 60 + Math.random() * 120 },
      data: {
        Title: "ฉากใหม่",
        Content: "",
        status: WRITER_NODE_STATUS.NORMAL,
        // onEdit will be filled by flowNodes -> when saving to server you can map back
      },
      draggable: true,
    };
    setRfNodes((nds) => [...nds, newNode]);
    // optional: focus/select new node
    setSelection({ nodes: [newNode], edges: [] });
  }, [setRfNodes]);

  const deleteSelection = useCallback(() => {
    setRfNodes((nds) => nds.filter((n) => !selection.nodes.some(s => s.id === n.id)));
    setRfEdges((eds) => eds.filter((e) => !selection.edges.some(s => s.id === e.id) && !selection.nodes.some(sn => sn.id === e.source || sn.id === e.target)));
    setSelection({ nodes: [], edges: [] });
  }, [selection, setRfNodes, setRfEdges]);

  const onNodesChangeWrapper = useCallback((changes) => {
    onNodesChangeRF(changes);
  }, [onNodesChangeRF]);

  const onEdgesChangeWrapper = useCallback((changes) => {
    onEdgesChangeRF(changes);
  }, [onEdgesChangeRF]);

  // allow double click to open editor (reuse existing handler)
  const handleNodeDoubleClick = (evt, node) => {
    const sceneId = node?.id;
    if (!sceneId) return;
    const sceneData = sceneMap.get(sceneId);
    const chapterId =
      sceneData?.ChapterID ?? sceneData?.chapter_id ?? sceneData?.chapterId;
    setSelectedSceneId(sceneId);
    if (onNavigate) {
      onNavigate("scene-editor", {
        novelId,
        chapterId,
        sceneId,
      });
    }
  };

  // handle single click: select node, show details in left panel
  const handleNodeClick = useCallback((evt, node) => {
    if (!node) return;
    setSelectedSceneId(String(node.id));
    // keep RF selection state in sync for toolbar actions
    setSelection({ nodes: [node], edges: [] });
  }, [setSelectedSceneId, setSelection]);

  const title = treeData?.NovelTitle || treeData?.novel_title || "Story Tree";

  if (isLoading) {
    return (
      <div className="wst-page wst-loading-state">
        <p>กำลังโหลดโครงสร้างเนื้อเรื่อง...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="wst-page wst-loading-state">
        <p className="wst-error-text">{error}</p>
        <button className="wst-error-button" onClick={() => window.location.reload()}>ลองใหม่อีกครั้ง</button>
      </div>
    );
  }

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


  return (
    <div className="wst-page">
      <header className="wst-topbar">
        <div className="wst-topbar__left">
          <button className="wst-topbar__back" onClick={() => onNavigate && onNavigate("chapters")}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 3L5 7L9 11" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            จัดการตอน
          </button>
          <div className="wst-topbar__divider-v" />
          <LegendBar />
        </div>
        <div className="wst-topbar__actions">
          <button className="wst-topbar__add" onClick={addNewNode}>+ เพิ่มฉากใหม่</button>
        </div>
      </header>

      <div className="wst-body">
        <div className="wst-canvas-area">
          <div className="wst-canvas-heading">
            <h1 className="wst-canvas-title">โครงสร้างเนื้อเรื่อง</h1>
            <p className="wst-canvas-sub">{title} · ดูภาพรวมโครงสร้างเนื้อเรื่อง</p>
          </div>

          <div className="wst-canvas-wrap">
            <div className="wst-canvas-scroll">
              {/* ensure parent has explicit measurable height so React Flow can render (#004) */}
              <div
                className="wst-reactflow-container"
                ref={reactflowWrapperRef}
                style={{ width: "100%", height: "100%", position: "relative" }}
              >
                {/* Floating toolbar (inside canvas so it overlays correctly) */}
                <div className="wst-canvas-toolbar">
                  <button 
                    title="เลือก" 
                    className={`wst-toolbar-btn ${interactionMode==='select' ? 'active':''}`} 
                    onClick={() => setInteractionMode('select')}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3h6v6H3V3M15 3h6v6h-6V3M3 15h6v6H3v-6M15 15h6v6h-6v-6"/></svg>
                    <span>เลือก</span>
                  </button>
                  <button 
                    title="เชื่อม" 
                    className={`wst-toolbar-btn ${interactionMode==='connect' ? 'active':''}`} 
                    onClick={() => setInteractionMode('connect')}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l12 6-12 6V9z"/></svg>
                    <span>เชื่อม</span>
                  </button>
                  <button 
                    title="เลื่อน" 
                    className={`wst-toolbar-btn ${interactionMode==='pan' ? 'active':''}`} 
                    onClick={() => setInteractionMode('pan')}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                    <span>เลื่อน</span>
                  </button>
                  <button 
                    title="เพิ่มฉาก" 
                    className="wst-toolbar-btn"
                    onClick={addNewNode}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                    <span>เพิ่ม</span>
                  </button>
                  <button 
                    title="ลบที่เลือก" 
                    className="wst-toolbar-btn"
                    onClick={deleteSelection}
                    disabled={selection.nodes.length===0 && selection.edges.length===0}
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
                  nodesDraggable={interactionMode !== 'pan' && interactionMode !== 'connect'}
                  nodesConnectable={interactionMode === 'connect'}
                  elementsSelectable={interactionMode === 'select'}
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

          <div className="wst-canvas-note">คลิกโหนดเพื่อเลือก, ดับเบิลคลิกเพื่อเปิด Scene Editor</div>
        </div>

        <aside className="wst-sidebar">
          <div className="wst-sidebar__top">
            <h3 className="wst-sidebar__novel-title">สถิติ</h3>
          </div>

          <div className="wst-sidebar__stats">
            <div className="wst-sidebar__stat-row"><span className="wst-sidebar__stat-label">ฉากทั้งหมด</span><span className="wst-sidebar__stat-val">{stats?.TotalScenes ?? stats?.total_scenes ?? 0}</span></div>
            <div className="wst-sidebar__stat-row"><span className="wst-sidebar__stat-label">ฉากที่ยังไม่เชื่อมต่อ</span><span className="wst-sidebar__stat-val wst-sidebar__stat-val--pink">{stats?.VisitedScenes ?? stats?.visited_scenes ?? 0}</span></div>
            <div className="wst-sidebar__progress-track"><div className="wst-sidebar__progress-fill" style={{ width: `${Math.round(((stats?.VisitedScenes ?? stats?.visited_scenes ?? 0) / Math.max(1, (stats?.TotalScenes ?? stats?.total_scenes ?? 1))) * 100)}%` }} /></div>
            <div className="wst-sidebar__stat-row" style={{ marginTop: 10 }}><span className="wst-sidebar__stat-label">จำนวนตัวเลือกทั้งหมด</span><span className="wst-sidebar__stat-val wst-sidebar__stat-val--pink">{stats?.TotalChoicePoints ?? stats?.total_choice_points ?? 0}</span></div>
            <div className="wst-sidebar__stat-row"><span className="wst-sidebar__stat-label">ฉากจบ</span><span className="wst-sidebar__stat-val wst-sidebar__stat-val--pink">{stats?.TotalEndings ?? stats?.total_endings ?? 0}</span></div>
          </div>

          {selectedScene && (
            <>
              <div className="wst-sidebar__divider" />
              <SceneDetailsCard
                scene={selectedScene}
                scenePositionMap={scenePositionMap}
                selectedSceneId={selectedSceneId}
                onEdit={(sceneId) => {
                  const sceneData = sceneMap.get(sceneId);
                  const chapterId = sceneData?.ChapterID ?? sceneData?.chapter_id ?? sceneData?.chapterId;
                  onNavigate?.("scene-editor", {
                    novelId,
                    chapterId,
                    sceneId,
                  });
                }}
                incomingChoices={incomingChoices}
                outgoingChoices={outgoingChoices}
              />
            </>
          )}
        </aside>
      </div>
    </div>
  );
};

const SceneDetailsCard = ({
  scene,
  scenePositionMap,
  selectedSceneId,
  onEdit,
  incomingChoices,
  outgoingChoices
}) => {
  const sceneId = getNodeId(scene);
  const pos = scenePositionMap.get(sceneId);
  const type = getNodeType(scene);

  const typeLabel = type === "start" ? "จุดเริ่มต้น"
    : type === "ending" ? "ฉากจบ"
      : "ฉากทั่วไป";

  const typeColor = type === "start" ? "#16A34A"
    : type === "ending" ? "#EF4444"
      : "#38BDF8";

  const typeIcon = type === "start" ? "▶"
    : type === "ending" ? "🏆"
      : "📖";

  const sceneNumber = pos ? `${pos.chapterNumber}.${pos.sceneNumber}` : "?";
  const sceneTitle = getNodeTitle(scene);
  const chapterTitle = pos ? `ตอนที่ ${pos.chapterNumber}: ${pos.chapterTitle}` : getNodeChapter(scene);

  // บรรทัด 730–744 — แก้ให้อ่าน normalized fields ก่อน
const formatChoiceSourceInfo = (choice) => {
  if (!choice) return "";
  const fromTitle =
    choice.fromSceneTitle ||           // ✅ normalized key
    choice.from_scene_title ||
    choice.FromSceneTitle ||
    "ไม่ทราบ";
  const fromChapter =
    choice.fromChapterEpisode ??       // ✅ normalized key
    choice.from_chapter_episode ??
    choice.FromChapterEpisode ??
    0;
  const fromSceneNum =
    choice.fromSceneNumberInChapter ?? // ✅ normalized key
    choice.from_scene_number_in_chapter ??
    choice.FromSceneNumberInChapter ??
    scenePositionMap.get(normalizeId(choice.fromId ?? choice.from_id))?.sceneNumber ??
    0;
  return `ฉากที่ ${fromChapter}.${fromSceneNum} (${fromTitle})`;
};

const formatChoiceDestinationInfo = (choice) => {
  if (!choice) return "";
  const toTitle =
    choice.toSceneTitle ||             // ✅ normalized key
    choice.to_scene_title ||
    choice.ToSceneTitle ||
    "ไม่ทราบ";
  const toChapter =
    choice.toChapterEpisode ??         // ✅ normalized key
    choice.to_chapter_episode ??
    choice.ToChapterEpisode ??
    0;
  const toSceneNum =
    choice.toSceneNumberInChapter ??   // ✅ normalized key
    choice.to_scene_number_in_chapter ??
    choice.ToSceneNumberInChapter ??
    scenePositionMap.get(normalizeId(choice.toId ?? choice.to_id))?.sceneNumber ??
    0;
  return `ฉากที่ ${toChapter}.${toSceneNum} (${toTitle})`;
};
   


  return (
    <div className="wst-scene-details">
      {/* Header Section */}
      <div className="wst-scene-details__header">
        <div className="wst-scene-details__header-left">
          <h4 className="wst-scene-details__scene-number">ฉากที่ {sceneNumber}</h4>
          <span
            className="wst-scene-details__type-badge"
            style={{
              borderColor: typeColor,
              color: typeColor
            }}
          >
            {typeIcon} {typeLabel}
          </span>
        </div>
        <button
          className="wst-scene-details__edit-btn"
          onClick={() => onEdit?.(selectedSceneId)}
          title="แก้ไขฉากนี้"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 14h3.5L13.85 3.65l-3.5-3.5L2 10.5V14z" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M10.5 2l3.5 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          แก้ไข
        </button>
      </div>

      {/* Title */}
      <h3 className="wst-scene-details__title">{sceneTitle}</h3>

      {/* Meta Info */}
      <div className="wst-scene-details__meta">
        <div className="wst-scene-details__meta-item">
          <span className="wst-scene-details__meta-label">ตอน</span>
          <span className="wst-scene-details__meta-value">{chapterTitle}</span>
        </div>
        <div className="wst-scene-details__meta-item">
          <span className="wst-scene-details__meta-label">ประเภท</span>
          <span className="wst-scene-details__meta-value">{typeLabel}</span>
        </div>
      </div>

      {/* Content */}
      <div className="wst-scene-details__content-section">
        <h5 className="wst-scene-details__section-title">📖 เนื้อหา</h5>
        <p className="wst-scene-details__content">{getNodeContent(scene)}</p>
      </div>

      {/* Incoming Choices */}
      {incomingChoices && incomingChoices.length > 0 && (
        <div className="wst-scene-details__choices-section">
          <div className="wst-scene-details__choices-header">
            <h5 className="wst-scene-details__section-title">
              ตัวเลือกต้นทางที่เชื่อมมาฉากนี้
            </h5>
            <span className="wst-scene-details__count">{incomingChoices.length}</span>
          </div>
          <div className="wst-scene-details__choices-list">
            {incomingChoices.map((choice, idx) => (
              <div key={idx} className="wst-scene-details__choice-item wst-scene-details__choice-item--in">
                <div className="wst-scene-details__choice-main">
                  <span className="wst-scene-details__choice-arrow">←</span>
                  <span className="wst-scene-details__choice-text">{getChoiceLabel(choice)}</span>
                </div>
                <div className="wst-scene-details__choice-meta">
                  <span className="wst-scene-details__choice-source">จาก: {formatChoiceSourceInfo(choice)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Outgoing Choices */}
      {outgoingChoices && outgoingChoices.length > 0 && (
        <div className="wst-scene-details__choices-section">
          <div className="wst-scene-details__choices-header">
            <h5 className="wst-scene-details__section-title">
              ตัวเลือกปลายทาง
            </h5>
            <span className="wst-scene-details__count">{outgoingChoices.length}</span>
          </div>
          <div className="wst-scene-details__choices-list">
            {outgoingChoices.map((choice, idx) => (
              <div key={idx} className="wst-scene-details__choice-item wst-scene-details__choice-item--out">
                <div className="wst-scene-details__choice-main">
                  <span className="wst-scene-details__choice-text">{getChoiceLabel(choice)}</span>
                  <span className="wst-scene-details__choice-arrow">→</span>
                </div>
                <div className="wst-scene-details__choice-meta">
                  <span className="wst-scene-details__choice-destination">ไป: {formatChoiceDestinationInfo(choice)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {(!incomingChoices || incomingChoices.length === 0) &&
        (!outgoingChoices || outgoingChoices.length === 0) && (
          <div className="wst-scene-details__empty-state">
            <p>ฉากนี้ยังไม่มีตัวเลือกเชื่อมต่อ</p>
          </div>
        )}
    </div>
  );
};

export default WriterStoryTreePage;
