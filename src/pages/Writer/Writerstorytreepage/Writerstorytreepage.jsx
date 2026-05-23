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

import React, { useState, useEffect, useMemo } from "react";
import ReactFlow from "reactflow";
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
  UNLOCKED: "unlocked",
  LOCKED: "locked",
  ENDING_UNLOCKED: "ending_unlocked",
  ENDING_LOCKED: "ending_locked",
};

const WRITER_NODE_STYLE = {
  [WRITER_NODE_STATUS.START]: { stroke: "#E91E8C", fill: "#FFF0F5", text: "#B00057" },
  [WRITER_NODE_STATUS.UNLOCKED]: { stroke: "#4CAF82", fill: "#F0FBF5", text: "#1F5C3E" },
  [WRITER_NODE_STATUS.LOCKED]: { stroke: "#C8C3D4", fill: "#F9F9FB", text: "#6B6578" },
  [WRITER_NODE_STATUS.ENDING_UNLOCKED]: { stroke: "#F59E0B", fill: "#FFFBEB", text: "#92400E" },
  [WRITER_NODE_STATUS.ENDING_LOCKED]: { stroke: "#C8C3D4", fill: "#F9F9FB", text: "#9E9589" },
};

const WRITER_LEGEND = [
  { label: "จุดเริ่มต้น", color: "#E91E8C" },
  { label: "ปลดล็อกแล้ว", color: "#4CAF82" },
  { label: "ตอนจบปลดล็อก", color: "#F59E0B" },
  { label: "ยังไม่ปลดล็อก", color: "#C8C3D4" },
];

const normalizeId = (value) => {
  if (value === undefined || value === null || value === "") return "";
  return String(value);
};

const getNodeId = (node) => normalizeId(node?.ID ?? node?.id ?? node?.SceneID ?? node?.scene_id);
const getNodeType = (node) => (node?.Type ?? node?.type ?? "").toLowerCase();
const getNodeTitle = (node) => node?.Title || node?.title || node?.Label || node?.label || `ฉากที่ ${getNodeId(node)}`;
const getNodeContent = (node) => node?.Content || node?.content || node?.Excerpt || node?.excerpt || "รายละเอียดฉากนี้ยังไม่มี";
const getNodeChapter = (node) => node?.ChapterTitle || node?.chapter_title || node?.chapter_title || "ไม่ระบุบท";

const formatNodeStatus = (node) => {
  const type = getNodeType(node);
  const isUnlocked = node.IsUnlocked ?? node.is_unlocked ?? false;
  if (type === "start") return WRITER_NODE_STATUS.START;
  if (type === "ending") {
    return isUnlocked ? WRITER_NODE_STATUS.ENDING_UNLOCKED : WRITER_NODE_STATUS.ENDING_LOCKED;
  }
  return isUnlocked ? WRITER_NODE_STATUS.UNLOCKED : WRITER_NODE_STATUS.LOCKED;
};

const StoryNode = ({ data }) => {
  const status = data.status;
  const style = WRITER_NODE_STYLE[status] || WRITER_NODE_STYLE[WRITER_NODE_STATUS.LOCKED];
  const title = getNodeTitle(data);
  const description = getNodeContent(data);
  const chapter = getNodeChapter(data);
  const prefix = status === WRITER_NODE_STATUS.START
    ? "▶ "
    : status === WRITER_NODE_STATUS.ENDING_UNLOCKED || status === WRITER_NODE_STATUS.ENDING_LOCKED
      ? "🏆 "
      : status === WRITER_NODE_STATUS.LOCKED
        ? "🔒 "
        : "📘 ";

  return (
    <div className="wst-node-card" style={{ borderColor: style.stroke, background: style.fill, color: style.text }}>
      <div className="wst-node-card__title">{prefix}{title}</div>
      <div className="wst-node-card__desc">{description}</div>
      <div className="wst-node-card__chapter">{chapter}</div>
    </div>
  );
};

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
        setError("ไม่สามารถโหลดข้อมูล Story Tree ได้ กรุณาลองใหม่อีกครั้ง");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStoryTree();
  }, [novelId]);

  const nodes = treeData?.Nodes ?? treeData?.nodes ?? [];
  const edges = treeData?.Edges ?? treeData?.edges ?? [];

  const sceneMap = useMemo(() => {
    const map = new Map();
    nodes.forEach((scene) => map.set(getNodeId(scene), scene));
    return map;
  }, [nodes]);

  const { positionedNodes, positionedEdges, chapters, stats } = useMemo(() => {
    if (!nodes.length) {
      return { positionedNodes: [], positionedEdges: [], chapters: [], stats: treeData?.Stats ?? treeData?.stats ?? null };
    }

    const nodeIds = nodes.map(getNodeId);
    const adjacency = {};
    const inDegree = {};
    const nodeStatuses = {};
    const nodeLevels = {};

    nodeIds.forEach((id) => {
      adjacency[id] = [];
      inDegree[id] = 0;
    });

    const edgeList = edges
      .map((edge, index) => {
        const source = normalizeId(edge.FromID ?? edge.from_id ?? edge.from ?? edge.From ?? edge.source ?? edge.Source);
        const target = normalizeId(edge.ToID ?? edge.to_id ?? edge.to ?? edge.To ?? edge.target ?? edge.Target);
        if (adjacency[source] && inDegree[target] !== undefined) {
          adjacency[source].push(target);
          inDegree[target] += 1;
        }
        return {
          id: normalizeId(edge.id ?? edge.ID ?? `edge-${source}-${target}-${index}`),
          source,
          target,
          label: edge.Label || edge.label || edge.choice_text || edge.text || "",
        };
      })
      .filter((edge) => edge.source && edge.target && adjacency[edge.source] !== undefined && inDegree[edge.target] !== undefined);

    nodes.forEach((node) => {
      const id = getNodeId(node);
      nodeStatuses[id] = formatNodeStatus(node);
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
        const offset = ((total - 1) * (NODE_HEIGHT + NODE_VERTICAL_GAP)) / 2;

        columnNodes.forEach((sceneId, index) => {
          const x = CANVAS_MARGIN + level * (NODE_WIDTH + NODE_HORIZONTAL_GAP);
          const y = CANVAS_MARGIN + index * (NODE_HEIGHT + NODE_VERTICAL_GAP) - offset;
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
      .map((edge) => {
        return {
          ...edge,
          active: nodeStatuses[edge.source] !== WRITER_NODE_STATUS.LOCKED && nodeStatuses[edge.source] !== WRITER_NODE_STATUS.ENDING_LOCKED,
        };
      });

    const chapterGroups = new Map();
    const chapterOrder = [];
    positionedNodes.forEach((item) => {
      const chapter = getNodeChapter(item.scene) || "ไม่ระบุบท";
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

  const flowNodes = positionedNodes.map((item) => ({
    id: item.id,
    type: "writerNode",
    position: { x: item.x, y: item.y },
    data: { ...item.scene, status: item.status },
    draggable: false,
  }));

  const validNodeIds = new Set(positionedNodes.map((item) => item.id));

  const flowEdges = positionedEdges
    .filter((edge) => edge.source && edge.target && edge.source !== "undefined" && edge.target !== "undefined" && validNodeIds.has(edge.source) && validNodeIds.has(edge.target))
    .map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      animated: edge.active,
      label: edge.label,
      labelBgPadding: [6, 4],
      labelBgBorderRadius: 4,
      labelStyle: { fill: "#4a5568", fontWeight: 500, fontSize: 11 },
      style: { stroke: edge.active ? "#4CAF82" : "#CBD5E1", strokeWidth: 2 },
      type: "smoothstep",
    }));

  useEffect(() => {
    if (!selectedSceneId && positionedNodes.length > 0) {
      const currentId = String(treeData?.CurrentSceneID ?? treeData?.current_scene_id ?? "");
      setSelectedSceneId(currentId || positionedNodes[0]?.id);
    }
  }, [positionedNodes, selectedSceneId, treeData]);

  const handleNodeClick = (_, node) => {
    const sceneId = node?.id;
    if (sceneId) setSelectedSceneId(sceneId);
  };

  const handleNodeDoubleClick = (_, node) => {
    const sceneId = node?.id;
    if (!sceneId) return;
    setSelectedSceneId(sceneId);
    if (onNavigate) {
      onNavigate("scene-editor", { novelId, sceneId });
    }
  };

  const handleSidebarSceneClick = (sceneId) => {
    setSelectedSceneId(sceneId);
    if (onNavigate) {
      onNavigate("scene-editor", { novelId, sceneId });
    }
  };

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
  const selectedSceneEdges = selectedSceneId ? edges.filter(e => {
    const sourceId = String(e.FromID ?? e.from_id ?? e.from ?? e.From ?? "");
    const targetId = String(e.ToID ?? e.to_id ?? e.to ?? e.To ?? "");
    return sourceId === selectedSceneId || targetId === selectedSceneId;
  }) : [];

  const incomingChoices = selectedSceneEdges.filter(e => {
    const targetId = String(e.ToID ?? e.to_id ?? e.to ?? e.To ?? "");
    return targetId === selectedSceneId;
  });

  const outgoingChoices = selectedSceneEdges.filter(e => {
    const sourceId = String(e.FromID ?? e.from_id ?? e.from ?? e.From ?? "");
    return sourceId === selectedSceneId;
  });

  return (
    <div className="wst-page">
      <header className="wst-topbar">
        <div className="wst-topbar__left">
          <button className="wst-topbar__back" onClick={() => onNavigate && onNavigate("chapters") }>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 3L5 7L9 11" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            จัดการตอน
          </button>
          <div className="wst-topbar__divider-v" />
          <LegendBar />
        </div>
      </header>

      <div className="wst-body">
        <div className="wst-canvas-area">
          <div className="wst-canvas-heading">
            <h1 className="wst-canvas-title">Story Tree</h1>
            <p className="wst-canvas-sub">{title} · ดูภาพรวมโครงสร้างเนื้อเรื่อง</p>
          </div>

          <div className="wst-canvas-wrap">
            <div className="wst-canvas-scroll">
              {positionedNodes.length > 0 ? (
                <div className="wst-reactflow-container">
                  <ReactFlow
                    nodes={flowNodes}
                    edges={flowEdges}
                    nodeTypes={nodeTypes}
                    onNodeClick={handleNodeClick}
                    onNodeDoubleClick={handleNodeDoubleClick}
                    fitView
                    fitViewOptions={{ padding: 0.2 }}
                    preventScrolling={false}
                    panOnScroll
                    nodesDraggable={false}
                    nodesConnectable={false}
                    elementsSelectable={true}
                    minZoom={0.3}
                    maxZoom={1.6}
                    className="wst-reactflow"
                  />
                </div>
              ) : (
                <div className="wst-empty-state">ไม่พบข้อมูลโครงสร้างเนื้อเรื่อง</div>
              )}
            </div>
          </div>

          <div className="wst-canvas-note">คลิกโหนดเพื่อเลือก, ดับเบิลคลิกเพื่อเปิด Scene Editor</div>
        </div>

        <aside className="wst-sidebar">
          <div className="wst-sidebar__top">
            <h3 className="wst-sidebar__novel-title">สถิติผังเส้นทาง</h3>
            <p className="wst-sidebar__updated">ข้อมูลจาก backend แบบเรียลไทม์</p>
          </div>

          <div className="wst-sidebar__stats">
            <div className="wst-sidebar__stat-row"><span className="wst-sidebar__stat-label">ฉากทั้งหมด</span><span className="wst-sidebar__stat-val">{stats?.TotalScenes ?? stats?.total_scenes ?? 0}</span></div>
            <div className="wst-sidebar__stat-row"><span className="wst-sidebar__stat-label">ปลดล็อกแล้ว</span><span className="wst-sidebar__stat-val wst-sidebar__stat-val--pink">{stats?.VisitedScenes ?? stats?.visited_scenes ?? 0}</span></div>
            <div className="wst-sidebar__progress-track"><div className="wst-sidebar__progress-fill" style={{ width: `${Math.round(((stats?.VisitedScenes ?? stats?.visited_scenes ?? 0) / Math.max(1, (stats?.TotalScenes ?? stats?.total_scenes ?? 1))) * 100)}%` }} /></div>
            <div className="wst-sidebar__stat-row" style={{ marginTop: 10 }}><span className="wst-sidebar__stat-label">จำนวน Choice</span><span className="wst-sidebar__stat-val wst-sidebar__stat-val--pink">{stats?.DiscoveredChoices ?? stats?.discovered_choices ?? 0}</span></div>
            <div className="wst-sidebar__stat-row"><span className="wst-sidebar__stat-label">ฉากจบ</span><span className="wst-sidebar__stat-val wst-sidebar__stat-val--pink">{stats?.UnlockedEndings ?? stats?.unlocked_endings ?? 0}/{stats?.TotalEndings ?? stats?.total_endings ?? 0}</span></div>
          </div>

          {selectedScene && (
            <>
              <div className="wst-sidebar__divider" />
              <div className="wst-sidebar__details-section">
                <h4 className="wst-sidebar__details-title">📋 รายละเอียดฉากที่เลือก</h4>
                
                <div className="wst-sidebar__detail-item">
                  <span className="wst-sidebar__detail-label">ชื่อฉาก:</span>
                  <span className="wst-sidebar__detail-value">{getNodeTitle(selectedScene)}</span>
                </div>

                <div className="wst-sidebar__detail-item">
                  <span className="wst-sidebar__detail-label">ตอน:</span>
                  <span className="wst-sidebar__detail-value">{getNodeChapter(selectedScene)}</span>
                </div>

                <div className="wst-sidebar__detail-item">
                  <span className="wst-sidebar__detail-label">ประเภท:</span>
                  <span className="wst-sidebar__detail-value">
                    {getNodeType(selectedScene) === "start" ? "🟢 จุดเริ่มต้น" 
                     : getNodeType(selectedScene) === "ending" ? "🏆 ฉากจบ" 
                     : "📘 ฉากปกติ"}
                  </span>
                </div>

                <div className="wst-sidebar__detail-item">
                  <span className="wst-sidebar__detail-label">สถานะ:</span>
                  <span className="wst-sidebar__detail-value">
                    {selectedScene.IsUnlocked ?? selectedScene.is_unlocked ? "🟢 ปลดล็อก" : "🔒 ล็อก"}
                  </span>
                </div>

                <div className="wst-sidebar__detail-item">
                  <span className="wst-sidebar__detail-label">เนื้อหา:</span>
                  <p className="wst-sidebar__detail-content">{getNodeContent(selectedScene)}</p>
                </div>

                {incomingChoices.length > 0 && (
                  <div className="wst-sidebar__choices-section">
                    <span className="wst-sidebar__choices-label">🔤 ตัวเลือกขาเข้า ({incomingChoices.length}):</span>
                    <ul className="wst-sidebar__choices-list">
                      {incomingChoices.map((choice, idx) => (
                        <li key={idx} className="wst-sidebar__choice-item">{choice.Label || choice.label || "ไม่มีชื่อ"}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {outgoingChoices.length > 0 && (
                  <div className="wst-sidebar__choices-section">
                    <span className="wst-sidebar__choices-label">🔤 ตัวเลือกขาออก ({outgoingChoices.length}):</span>
                    <ul className="wst-sidebar__choices-list">
                      {outgoingChoices.map((choice, idx) => (
                        <li key={idx} className="wst-sidebar__choice-item">{choice.Label || choice.label || "ไม่มีชื่อ"}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <button 
                  className="wst-sidebar__edit-btn"
                  onClick={() => handleNodeDoubleClick(selectedSceneId)}
                >
                  ✏️ แก้ไขฉากนี้
                </button>
              </div>
            </>
          )}

          <div className="wst-sidebar__divider" />
          <div className="wst-sidebar__ch-label">กลุ่มตอน</div>
          <div className="wst-sidebar__chapters">
            {chapters.map((chapter) => (
              <div key={chapter.title} className="wst-sidebar__chapter">
                <div className="wst-sidebar__ch-heading">{chapter.title}</div>
                <div className="wst-sidebar__scenes">
                  {chapter.scenes.map((scene) => {
                    const id = getNodeId(scene);
                    const status = formatNodeStatus(scene);
                    const statusColor = status === WRITER_NODE_STATUS.START ? "#E91E8C" : status === WRITER_NODE_STATUS.UNLOCKED ? "#4CAF82" : status === WRITER_NODE_STATUS.ENDING_UNLOCKED ? "#F59E0B" : "#C8C3D4";
                    return (
                      <button
                        type="button"
                        key={id}
                        className={`wst-sidebar__scene-row ${selectedSceneId === id ? "wst-sidebar__scene-row--active" : ""}`}
                        onClick={() => handleSidebarSceneClick(id)}
                      >
                        <span className="wst-sidebar__scene-dot" style={{ background: statusColor }} />
                        <span className="wst-sidebar__scene-label">{getNodeTitle(scene)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default WriterStoryTreePage;
