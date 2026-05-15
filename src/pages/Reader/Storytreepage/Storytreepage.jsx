// src/pages/StoryTree/StoryTreePage.jsx

import React, { useMemo } from "react";

import ReactFlow, {
  Background,
  Controls,
  Handle,
  Position,
} from "reactflow";

import "reactflow/dist/style.css";
import "./StoryTreePage.css";

import {
  mockStoryTreeData,
  NODE_STATUS,
  ENDING_META,
} from "../../../data/mockstorytreedata";

import { SCENE_TYPES } from "../../../data/mockscenedata";

// ======================================================
// Status Colors
// ======================================================

const STATUS_STYLE = {
  [NODE_STATUS.VISITED]: {
    stroke: "#4CAF82",
    fill: "#F0FBF5",
    text: "#2E7A55",
  },

  [NODE_STATUS.CURRENT]: {
    stroke: "#E91E8C",
    fill: "#FFF0F5",
    text: "#E91E8C",
  },

  [NODE_STATUS.LOCKED]: {
    stroke: "#C8C3D4",
    fill: "#F9F9FB",
    text: "#9E9589",
  },

  [NODE_STATUS.ENDING_UNLOCKED]: {
    stroke: "#F7C940",
    fill: "#FFFDE7",
    text: "#8B6D00",
  },

  [NODE_STATUS.ENDING_LOCKED]: {
    stroke: "#C8C3D4",
    fill: "#F9F9FB",
    text: "#9E9589",
  },
};

// ======================================================
// Custom Node
// ======================================================

const StoryNode = ({ data }) => {
  const style = STATUS_STYLE[data.status];

  const isCurrent =
    data.status === NODE_STATUS.CURRENT;

  const isLocked =
    data.status === NODE_STATUS.LOCKED ||
    data.status === NODE_STATUS.ENDING_LOCKED;

  const isEnding =
    data.sceneType === SCENE_TYPES.ENDING;

  const endingMeta = data.endingType
    ? ENDING_META[data.endingType]
    : null;

  const getPrefix = () => {
    if (data.sceneType === SCENE_TYPES.START)
      return "▶ ";

    if (isLocked)
      return "🔒 ";

    if (
      data.status ===
      NODE_STATUS.ENDING_UNLOCKED &&
      endingMeta
    ) {
      return `${endingMeta.icon} `;
    }

    if (isEnding)
      return "🏆 ";

    return "";
  };

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
      />

      <div
        className={`story-node ${isCurrent
          ? "story-node--current"
          : ""
          }`}
        style={{
          borderColor:
            endingMeta &&
              data.status ===
              NODE_STATUS.ENDING_UNLOCKED
              ? endingMeta.color
              : style.stroke,

          background:
            endingMeta &&
              data.status ===
              NODE_STATUS.ENDING_UNLOCKED
              ? `${endingMeta.color}15`
              : style.fill,

          color:
            endingMeta &&
              data.status ===
              NODE_STATUS.ENDING_UNLOCKED
              ? endingMeta.color
              : style.text,
        }}
      >
        <div className="story-node__label">
          {getPrefix()}

          {data.isHidden &&
            data.status !==
            NODE_STATUS.ENDING_UNLOCKED
            ? "???"
            : data.label}
        </div>

        <div className="story-node__chapter">
          Ch.{data.chapterNumber}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
      />
    </>
  );
};

// ======================================================
// Node Types
// ======================================================

const nodeTypes = {
  storyNode: StoryNode,
};

// ======================================================
// Component
// ======================================================

const StoryTreePage = ({
  novelId,
  onNavigate,
}) => {
  const data = mockStoryTreeData;

  // ====================================================
  // Nodes
  // ====================================================

  const nodes = useMemo(() => {
    return data.nodes.map((node) => ({
      id: node.id,

      type: "storyNode",

      position: {
        x: node.col * 240,
        y: node.row * 140,
      },

      data: node,
    }));
  }, [data.nodes]);

  // ====================================================
  // Edges
  // ====================================================

  const nodeMap = Object.fromEntries(
    data.nodes.map((n) => [n.id, n])
  );

  const edges = useMemo(() => {
    return data.edges.map((edge) => {
      const fromNode = nodeMap[edge.from];
      const toNode = nodeMap[edge.to];

      let stroke = "#D0CCD7";

      if (
        fromNode.status ===
        NODE_STATUS.CURRENT
      ) {
        stroke = "#E91E8C";
      } else if (
        fromNode.status ===
        NODE_STATUS.VISITED &&
        toNode.status ===
        NODE_STATUS.VISITED
      ) {
        stroke = "#4CAF82";
      } else if (
        toNode.status ===
        NODE_STATUS.ENDING_UNLOCKED
      ) {
        stroke = "#F7C940";
      }

      return {
        id: edge.id,

        source: edge.from,
        target: edge.to,

        animated:
          fromNode.status ===
          NODE_STATUS.CURRENT,

        style: {
          stroke,
          strokeWidth: 2,
        },

        type: "smoothstep",
      };
    });
  }, [data.edges]);

  // ====================================================
  // Click Node
  // ====================================================

  const handleNodeClick = (_, node) => {
    const scene = node.data;

    const clickable =
      scene.status ===
      NODE_STATUS.CURRENT ||
      scene.status ===
      NODE_STATUS.VISITED;

    if (!clickable) return;

    onNavigate("reading", {
      novelId,
      initialSceneId: scene.id,
    });
  };

  // ====================================================
  // Render
  // ====================================================

  return (
    <div className="stp">
      <div className="stp__container">

        {/* Back */}
        <button
          className="stp__back"
          onClick={() =>
            onNavigate(
              "novel-detail",
              { novelId }
            )
          }
        >
          ← กลับรายละเอียด
        </button>

        {/* Header */}
        <div className="stp__header">
          <h1 className="stp__title">
            ผังเส้นทาง
            <span className="stp__title-sep">
              {" "}—{" "}
            </span>

            <span className="stp__title-novel">
              {data.novelTitle}
            </span>
          </h1>

          <div className="stp__legend">
            {[
              {
                color: "#E91E8C",
                label: "กำลังอ่าน",
              },
              {
                color: "#4CAF82",
                label: "ผ่านแล้ว",
              },
              {
                color: "#F7C940",
                label: "ตอนจบ",
              },
              {
                color: "#C8C3D4",
                label: "ยังไม่ถึง",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="stp__legend-item"
              >
                <span
                  className="stp__legend-dot"
                  style={{
                    background:
                      item.color,
                  }}
                />

                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* MAIN */}
        <div className="stp__main">

          {/* FLOW */}
          <div className="stp__flow-wrapper">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{
                padding: 0.3,
              }}
              zoomOnScroll={false}
              panOnDrag={true}
              minZoom={0.7}
              maxZoom={1.5}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable={false}
              onNodeClick={
                handleNodeClick
              }
              proOptions={{
                hideAttribution: true,
              }}
            >
              <Background
                gap={20}
                size={1}
              />

              <Controls />
            </ReactFlow>
          </div>

          {/* SIDEBAR */}
          <aside className="stp__sidebar">

            <div className="stp__stat-card">

              <div className="stp__stat-card-title">
                สถิติการสำรวจ
              </div>

              {[
                {
                  label:
                    "เส้นทางที่ผ่านแล้ว",

                  val:
                    data.stats
                      .visitedScenes,

                  total:
                    data.stats
                      .totalScenes,
                },

                {
                  label:
                    "จุดเลือกที่ค้นพบ",

                  val:
                    data.stats
                      .discoveredChoices,

                  total:
                    data.stats
                      .totalChoicePoints,
                },

                {
                  label:
                    "ตอนจบที่ปลดล็อก",

                  val:
                    data.stats
                      .unlockedEndings,

                  total:
                    data.stats
                      .totalEndings,
                },
              ].map((stat, i) => (
                <div
                  key={i}
                  style={{
                    marginTop:
                      i > 0
                        ? 14
                        : 0,
                  }}
                >
                  <div className="stp__stat-item">
                    <span className="stp__stat-label">
                      {stat.label}
                    </span>

                    <span className="stp__stat-value stp__stat-value--pink">
                      {stat.val}/
                      {stat.total}
                    </span>
                  </div>

                  <div className="stp__stat-track">
                    <div
                      className="stp__stat-fill stp__stat-fill--pink"
                      style={{
                        width: `${(stat.val /
                          stat.total) *
                          100
                          }%`,
                      }}
                    />
                  </div>
                </div>
              ))}

              {/* ENDINGS */}
              <div className="stp__endings-list">
                {data.nodes
                  .filter(
                    (n) =>
                      n.sceneType ===
                      SCENE_TYPES.ENDING
                  )
                  .map((endNode) => {
                    const meta =
                      endNode.endingType
                        ? ENDING_META[
                        endNode
                          .endingType
                        ]
                        : null;

                    const unlocked =
                      endNode.status ===
                      NODE_STATUS.ENDING_UNLOCKED;

                    return (
                      <div
                        key={
                          endNode.id
                        }
                        className={`stp__ending-item ${unlocked
                          ? "stp__ending-item--unlocked"
                          : ""
                          }`}
                      >
                        <span className="stp__ending-icon">
                          {unlocked
                            ? meta?.icon ||
                            "🏆"
                            : "🔒"}
                        </span>

                        <div>
                          <div className="stp__ending-type">
                            {meta?.label}
                          </div>

                          <div className="stp__ending-name">
                            {unlocked
                              ? endNode.label
                              : "???"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* BUTTON */}
              <button
                className="stp__continue-btn"
                onClick={() =>
                  onNavigate(
                    "reading",
                    {
                      novelId,
                      initialSceneId:
                        data.currentSceneId,
                    }
                  )
                }
              >
                ▶ อ่านต่อ
              </button>

            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default StoryTreePage;