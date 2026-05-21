// src/pages/Writer/WriterStoryTree/WriterStoryTreePage.jsx
//
// ══════════════════════════════════════════════════════════
//  Story Tree — Writer View
//  Scene = Node,  Choice = Edge (with label)
//
//  Features:
//   - SVG canvas พร้อม node/edge
//   - Edge labels (ข้อความ choice)
//   - Node colors ตาม status
//   - Zoom in/out/fit/lock
//   - Minimap มุมล่างซ้าย
//   - Right sidebar: novel stats + chapter/scene accordion
//   - Top bar: legend + + เพิ่มตอน
//
//  TODO: GET /api/v1/novels/:id/story-tree (writer)
//        POST /api/v1/chapters  → เพิ่มตอน
// ══════════════════════════════════════════════════════════

import React, {
    useState, useRef, useEffect, useCallback, useMemo
} from "react";
import "./Writerstorytreepage.css";
import {
    mockWriterTreeNodes,
    mockWriterTreeEdges,
    mockWriterNovelSummary,
    WRITER_NODE_STYLE,
    WRITER_NODE_STATUS,
    WRITER_LEGEND,
} from "../../../data/mockWriterTreeData";

// ════════════════════════════════════════════════════════
//  Layout constants
// ════════════════════════════════════════════════════════
const COL_W = 168;   // ระยะห่างแนวนอนระหว่าง col
const ROW_H = 110;   // ระยะห่างแนวตั้งระหว่าง row
const NODE_W = 148;   // ความกว้าง node
const NODE_H = 40;    // ความสูง node
const PAD_X = 48;    // padding ซ้าย-ขวา
const PAD_Y = 40;    // padding บน-ล่าง
const MINIMAP_W = 180;
const MINIMAP_H = 130;

// ─────────────────────────────────────────────
//  คำนวณตำแหน่ง pixel จาก col/row
// ─────────────────────────────────────────────
const nodePos = (node) => ({
    x: PAD_X + node.col * COL_W,
    y: PAD_Y + node.row * ROW_H,
    cx: PAD_X + node.col * COL_W + NODE_W / 2,
    cy: PAD_Y + node.row * ROW_H + NODE_H / 2,
});

// ─────────────────────────────────────────────
//  สร้าง Cubic Bezier path: ออกกลางล่าง → เข้ากลางบน
// ─────────────────────────────────────────────
const buildPath = (fromNode, toNode) => {
    const f = nodePos(fromNode);
    const t = nodePos(toNode);
    const x1 = f.cx, y1 = f.y + NODE_H;
    const x2 = t.cx, y2 = t.y;
    const cy = (y1 + y2) / 2;
    return `M ${x1} ${y1} C ${x1} ${cy}, ${x2} ${cy}, ${x2} ${y2}`;
};

// ─────────────────────────────────────────────
//  สี edge ตาม status ต้นทาง
// ─────────────────────────────────────────────
const edgeColor = (fromNode) => {
    const s = WRITER_NODE_STYLE[fromNode?.status];
    return s?.stroke || "#C8C3D4";
};

// ════════════════════════════════════════════════════════
//  Sub: Legend dots
// ════════════════════════════════════════════════════════
const LegendBar = () => (
    <div className="wst-legend" role="list" aria-label="คำอธิบายสัญลักษณ์">
        {WRITER_LEGEND.map((item) => (
            <div key={item.status} className="wst-legend__item" role="listitem">
                <span className="wst-legend__dot" style={{ background: item.color }} />
                <span className="wst-legend__label">{item.label}</span>
            </div>
        ))}
    </div>
);

// ════════════════════════════════════════════════════════
//  Sub: Minimap
// ════════════════════════════════════════════════════════
const Minimap = ({ nodes, edges, svgW, svgH, viewBox, nodeMap }) => {
    const scaleX = MINIMAP_W / svgW;
    const scaleY = MINIMAP_H / svgH;

    return (
        <div className="wst-minimap">
            <svg width={MINIMAP_W} height={MINIMAP_H} viewBox={`0 0 ${MINIMAP_W} ${MINIMAP_H}`}>
                {/* edges */}
                {edges.map((edge) => {
                    const from = nodeMap[edge.from];
                    const to = nodeMap[edge.to];
                    if (!from || !to) return null;
                    const f = nodePos(from);
                    const t = nodePos(to);
                    return (
                        <line
                            key={edge.id}
                            x1={f.cx * scaleX} y1={(f.y + NODE_H) * scaleY}
                            x2={t.cx * scaleX} y2={t.y * scaleY}
                            stroke="#C8C3D4" strokeWidth={0.8} opacity={0.6}
                        />
                    );
                })}
                {/* nodes */}
                {nodes.map((node) => {
                    const p = nodePos(node);
                    const st = WRITER_NODE_STYLE[node.status] || WRITER_NODE_STYLE[WRITER_NODE_STATUS.DRAFT];
                    return (
                        <rect
                            key={node.id}
                            x={p.x * scaleX} y={p.y * scaleY}
                            width={NODE_W * scaleX} height={NODE_H * scaleY}
                            rx={2} fill={st.fill} stroke={st.stroke} strokeWidth={0.6}
                        />
                    );
                })}
                {/* viewport rect */}
                {viewBox && (
                    <rect
                        x={-viewBox.x * scaleX / viewBox.zoom}
                        y={-viewBox.y * scaleY / viewBox.zoom}
                        width={(600 / viewBox.zoom) * scaleX}
                        height={(500 / viewBox.zoom) * scaleY}
                        fill="none" stroke="var(--pink-500)" strokeWidth={1} opacity={0.5}
                    />
                )}
            </svg>
        </div>
    );
};

// ════════════════════════════════════════════════════════
//  Sub: Right sidebar (novel stats + chapter accordion)
// ════════════════════════════════════════════════════════
const WriterTreeSidebar = ({ summary, onNavigate }) => {
    const [openChapters, setOpenChapters] = useState(["ch-001", "ch-002", "ch-003"]);

    const toggleChapter = (id) => {
        setOpenChapters((prev) =>
            prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
        );
    };

    const pct = Math.round((summary.publishedChapters / summary.totalChapters) * 100);

    return (
        <aside className="wst-sidebar">
            {/* Novel name + updated */}
            <div className="wst-sidebar__top">
                <h3 className="wst-sidebar__novel-title">{summary.title}</h3>
                <p className="wst-sidebar__updated">อัปเดตล่าสุด {summary.updatedAt}</p>
            </div>

            {/* Stats */}
            <div className="wst-sidebar__stats">
                <div className="wst-sidebar__stat-row">
                    <span className="wst-sidebar__stat-label">ตอนทั้งหมด</span>
                    <span className="wst-sidebar__stat-val">{summary.totalChapters} ตอน</span>
                </div>
                <div className="wst-sidebar__stat-row">
                    <span className="wst-sidebar__stat-label">เผยแพร่แล้ว</span>
                    <span className="wst-sidebar__stat-val wst-sidebar__stat-val--pink">
                        {summary.publishedChapters} / {summary.totalChapters}
                    </span>
                </div>
                <div className="wst-sidebar__progress-track">
                    <div className="wst-sidebar__progress-fill" style={{ width: `${pct}%` }} />
                </div>
                <div className="wst-sidebar__stat-row" style={{ marginTop: 10 }}>
                    <span className="wst-sidebar__stat-label">จุดเลือก</span>
                    <span className="wst-sidebar__stat-val wst-sidebar__stat-val--pink">
                        {summary.totalChoicePoints} จุด
                    </span>
                </div>
                <div className="wst-sidebar__stat-row">
                    <span className="wst-sidebar__stat-label">ตอนจบ</span>
                    <span className="wst-sidebar__stat-val wst-sidebar__stat-val--pink">
                        {summary.totalEndings} ทาง
                    </span>
                </div>
            </div>

            <div className="wst-sidebar__divider" />

            {/* Chapter accordion */}
            <div className="wst-sidebar__ch-label">ตอนทั้งหมด</div>
            <div className="wst-sidebar__chapters">
                {summary.chapters.map((ch) => {
                    const isOpen = openChapters.includes(ch.id);
                    return (
                        <div key={ch.id} className="wst-sidebar__chapter">
                            <button
                                className="wst-sidebar__ch-btn"
                                onClick={() => toggleChapter(ch.id)}
                                aria-expanded={isOpen}
                            >
                                <span className="wst-sidebar__ch-num" style={{ color: "var(--pink-500)" }}>
                                    ตอนที่ {ch.chapterNumber} : {ch.title}
                                </span>
                                <svg
                                    width="12" height="12" viewBox="0 0 12 12" fill="none"
                                    style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .18s", flexShrink: 0 }}
                                >
                                    <path d="M2 4l4 4 4-4" stroke="var(--pink-500)" strokeWidth="1.4" strokeLinecap="round" />
                                </svg>
                            </button>
                            {isOpen && (
                                <div className="wst-sidebar__scenes">
                                    {ch.scenes.map((scene) => (
                                        <div key={scene.id} className="wst-sidebar__scene-row">
                                            <span
                                                className="wst-sidebar__scene-dot"
                                                style={{
                                                    background: scene.status === "published"
                                                        ? "#4CAF82" : "#C8C3D4"
                                                }}
                                            />
                                            <span className="wst-sidebar__scene-label">{scene.label}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </aside>
    );
};

// ════════════════════════════════════════════════════════
//  Main Component
// ════════════════════════════════════════════════════════
const WriterStoryTreePage = ({ novelId, onNavigate }) => {
    const nodes = mockWriterTreeNodes;
    const edges = mockWriterTreeEdges;
    const summary = mockWriterNovelSummary;

    // ── nodeMap: id → node ────────────────────────────────
    const nodeMap = useMemo(
        () => Object.fromEntries(nodes.map((n) => [n.id, n])),
        [nodes]
    );

    // ── Canvas size ───────────────────────────────────────
    const maxCol = Math.max(...nodes.map((n) => n.col));
    const maxRow = Math.max(...nodes.map((n) => n.row));
    const svgW = PAD_X * 2 + (maxCol + 1) * COL_W;
    const svgH = PAD_Y * 2 + (maxRow + 1) * ROW_H + 20;

    // ── Zoom / pan state ──────────────────────────────────
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [locked, setLocked] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef(null);
    const wrapRef = useRef(null);

    // ── Selected node ─────────────────────────────────────
    const [selectedId, setSelectedId] = useState(null);

    // ── Zoom helpers ──────────────────────────────────────
    const zoomIn = () => setZoom((z) => Math.min(z + 0.15, 2.5));
    const zoomOut = () => setZoom((z) => Math.max(z - 0.15, 0.3));
    const zoomFit = useCallback(() => {
        if (!wrapRef.current) return;
        const { width, height } = wrapRef.current.getBoundingClientRect();
        const scaleX = (width - 32) / svgW;
        const scaleY = (height - 32) / svgH;
        const fit = Math.min(scaleX, scaleY, 1.2);
        setZoom(fit);
        setPan({ x: 0, y: 0 });
    }, [svgW, svgH]);

    // ── Pan (drag) ────────────────────────────────────────
    const handleMouseDown = (e) => {
        if (locked || e.target.closest(".wst-node")) return;
        setIsDragging(true);
        dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    };
    const handleMouseMove = (e) => {
        if (!isDragging || !dragStart.current) return;
        setPan({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
    };
    const handleMouseUp = () => {
        setIsDragging(false);
        dragStart.current = null;
    };

    // ── Wheel zoom ────────────────────────────────────────
    const handleWheel = (e) => {
        if (locked) return;
        e.preventDefault();
        setZoom((z) => Math.min(Math.max(z - e.deltaY * 0.001, 0.3), 2.5));
    };

    useEffect(() => {
        const el = wrapRef.current;
        if (!el) return;
        el.addEventListener("wheel", handleWheel, { passive: false });
        return () => el.removeEventListener("wheel", handleWheel);
    }, [locked]);

    // ── Node click ────────────────────────────────────────
    const handleNodeClick = (node) => {
        setSelectedId(node.id === selectedId ? null : node.id);
    };

    // ── Node double-click → go to editor ─────────────────
    const handleNodeDblClick = (node) => {
        onNavigate("write", { sceneId: node.id });
    };

    // ── Edge label midpoint ───────────────────────────────
    const edgeLabelPos = (fromNode, toNode) => {
        const f = nodePos(fromNode);
        const t = nodePos(toNode);
        return {
            x: (f.cx + t.cx) / 2,
            y: (f.y + NODE_H + t.y) / 2,
        };
    };

    // ════════════════════════════════════════════════════
    return (
        <div className="wst-page">

            {/* ══ Top bar ══════════════════════════════════ */}
            <header className="wst-topbar">
                <div className="wst-topbar__left">
                    <button
                        className="wst-topbar__back"
                        onClick={() => onNavigate("chapters")}
                    >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M9 3L5 7L9 11" stroke="currentColor" strokeWidth="1.7"
                                strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        จัดการตอน
                    </button>

                    <div className="wst-topbar__divider-v" />
                    <LegendBar />
                </div>

                {/* + เพิ่มตอน */}
                <button
                    className="wst-topbar__add"
                    onClick={() => onNavigate("create-novel")}
                >
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                        <path d="M6.5 1v11M1 6.5h11" stroke="white" strokeWidth="1.7" strokeLinecap="round" />
                    </svg>
                    เพิ่มตอน
                </button>
            </header>

            {/* ══ Body: heading + canvas + sidebar ══════════ */}
            <div className="wst-body">

                {/* ── Left: title + canvas + controls ── */}
                <div className="wst-canvas-area">
                    <div className="wst-canvas-heading">
                        <h1 className="wst-canvas-title">Story Tree</h1>
                        <p className="wst-canvas-sub">{summary.title} · ภาพรวมโครงสร้าง</p>
                    </div>

                    {/* Canvas wrap */}
                    <div
                        ref={wrapRef}
                        className={`wst-canvas-wrap ${isDragging ? "wst-canvas-wrap--dragging" : ""}`}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        aria-label="Story Tree canvas"
                        role="img"
                    >
                        <svg
                            className="wst-canvas-svg"
                            width={svgW}
                            height={svgH}
                            viewBox={`0 0 ${svgW} ${svgH}`}
                            style={{
                                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                                transformOrigin: "0 0",
                                transition: isDragging ? "none" : "transform .12s ease",
                            }}
                        >
                            {/* ── defs: arrowhead ── */}
                            <defs>
                                {Object.entries(WRITER_NODE_STYLE).map(([status, st]) => (
                                    <marker
                                        key={status}
                                        id={`arrow-${status}`}
                                        markerWidth="7" markerHeight="7"
                                        refX="7" refY="3.5" orient="auto"
                                    >
                                        <path d="M0,0 L7,3.5 L0,7 Z" fill={st.stroke} opacity="0.7" />
                                    </marker>
                                ))}
                            </defs>

                            {/* ── Edges ── */}
                            <g>
                                {edges.map((edge) => {
                                    const from = nodeMap[edge.from];
                                    const to = nodeMap[edge.to];
                                    if (!from || !to) return null;
                                    const path = buildPath(from, to);
                                    const color = edgeColor(from);
                                    const mid = edge.label ? edgeLabelPos(from, to) : null;
                                    return (
                                        <g key={edge.id}>
                                            <path
                                                d={path}
                                                fill="none"
                                                stroke={color}
                                                strokeWidth={1.5}
                                                opacity={0.65}
                                                markerEnd={`url(#arrow-${from.status})`}
                                            />
                                            {/* Edge label */}
                                            {edge.label && mid && (
                                                <g>
                                                    <rect
                                                        x={mid.x - 28} y={mid.y - 9}
                                                        width={56} height={18}
                                                        rx={4}
                                                        fill="white"
                                                        stroke={color}
                                                        strokeWidth={0.8}
                                                        opacity={0.9}
                                                    />
                                                    <text
                                                        x={mid.x} y={mid.y + 4}
                                                        textAnchor="middle"
                                                        fontSize={9}
                                                        fontFamily="'Sarabun', sans-serif"
                                                        fill={color}
                                                        fontWeight="600"
                                                    >
                                                        {edge.label}
                                                    </text>
                                                </g>
                                            )}
                                        </g>
                                    );
                                })}
                            </g>

                            {/* ── Nodes ── */}
                            <g>
                                {nodes.map((node) => {
                                    const p = nodePos(node);
                                    const st = WRITER_NODE_STYLE[node.status] || WRITER_NODE_STYLE[WRITER_NODE_STATUS.DRAFT];
                                    const isSelected = selectedId === node.id;

                                    // ตัด label ถ้ายาวเกิน
                                    const label = node.label.length > 16
                                        ? node.label.slice(0, 15) + "…"
                                        : node.label;

                                    return (
                                        <g
                                            key={node.id}
                                            className="wst-node"
                                            transform={`translate(${p.x}, ${p.y})`}
                                            onClick={() => handleNodeClick(node)}
                                            onDoubleClick={() => handleNodeDblClick(node)}
                                            style={{ cursor: "pointer" }}
                                            role="button"
                                            tabIndex={0}
                                            aria-label={`${node.label} — ${node.status}`}
                                            onKeyDown={(e) => e.key === "Enter" && handleNodeDblClick(node)}
                                        >
                                            {/* Selection ring */}
                                            {isSelected && (
                                                <rect
                                                    x={-4} y={-4}
                                                    width={NODE_W + 8} height={NODE_H + 8}
                                                    rx={10}
                                                    fill="none"
                                                    stroke="var(--pink-500)"
                                                    strokeWidth={2}
                                                    opacity={0.5}
                                                    className="wst-node__ring"
                                                />
                                            )}

                                            {/* Node box */}
                                            <rect
                                                x={0} y={0}
                                                width={NODE_W} height={NODE_H}
                                                rx={8}
                                                fill={st.fill}
                                                stroke={isSelected ? "var(--pink-500)" : st.stroke}
                                                strokeWidth={isSelected ? 2 : st.strokeW}
                                                filter={isSelected ? "drop-shadow(0 2px 8px rgba(233,30,140,0.25))" : undefined}
                                            />

                                            {/* Ending crown indicator */}
                                            {node.status === WRITER_NODE_STATUS.ENDING && (
                                                <text x={6} y={NODE_H / 2 + 5} fontSize={13}>🏆</text>
                                            )}
                                            {node.status === WRITER_NODE_STATUS.NO_LINK && (
                                                <text x={6} y={NODE_H / 2 + 5} fontSize={12}>⚠️</text>
                                            )}

                                            {/* Label */}
                                            <text
                                                x={
                                                    node.status === WRITER_NODE_STATUS.ENDING ||
                                                        node.status === WRITER_NODE_STATUS.NO_LINK
                                                        ? NODE_W / 2 + 8
                                                        : NODE_W / 2
                                                }
                                                y={NODE_H / 2 + 5}
                                                textAnchor="middle"
                                                fontSize={10.5}
                                                fontFamily="'Sarabun', sans-serif"
                                                fontWeight={node.status === WRITER_NODE_STATUS.ENDING ? "600" : "400"}
                                                fill={st.text}
                                            >
                                                {label}
                                            </text>
                                        </g>
                                    );
                                })}
                            </g>
                        </svg>

                        {/* ── Minimap ── */}
                        <Minimap
                            nodes={nodes}
                            edges={edges}
                            svgW={svgW}
                            svgH={svgH}
                            viewBox={{ x: pan.x, y: pan.y, zoom }}
                            nodeMap={nodeMap}
                        />

                        {/* ── Zoom controls ── */}
                        <div className="wst-zoom-controls" role="toolbar" aria-label="ควบคุม Zoom">
                            <button
                                className="wst-zoom-btn"
                                onClick={zoomIn}
                                title="Zoom in"
                                aria-label="ขยาย"
                            >
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                    <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.4" />
                                    <path d="M11 11l2 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                                    <path d="M6.5 4.5v4M4.5 6.5h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                                </svg>
                            </button>
                            <button
                                className="wst-zoom-btn"
                                onClick={zoomOut}
                                title="Zoom out"
                                aria-label="ย่อ"
                            >
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                    <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.4" />
                                    <path d="M11 11l2 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                                    <path d="M4.5 6.5h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                                </svg>
                            </button>
                            <button
                                className={`wst-zoom-btn ${locked ? "wst-zoom-btn--active" : ""}`}
                                onClick={() => setLocked(!locked)}
                                title={locked ? "ปลดล็อก" : "ล็อกมุมมอง"}
                                aria-label={locked ? "ปลดล็อก" : "ล็อกมุมมอง"}
                                aria-pressed={locked}
                            >
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                    <rect x="2" y="6" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4" fill="none" />
                                    <path d={locked
                                        ? "M4 6V4.5a3 3 0 016 0V6"
                                        : "M4 6V4.5a3 3 0 016 0"
                                    } stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" />
                                    <circle cx="7" cy="9.5" r="1" fill="currentColor" />
                                </svg>
                            </button>
                            <button
                                className="wst-zoom-btn"
                                onClick={zoomFit}
                                title="Fit to screen"
                                aria-label="พอดีจอ"
                            >
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                    <path d="M1 5V2h3M1 9v3h3M13 5V2h-3M13 9v3h-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── Right sidebar ── */}
                <WriterTreeSidebar
                    summary={summary}
                    onNavigate={onNavigate}
                />
            </div>

            {/* ── Context: selected node info bar ── */}
            {selectedId && (() => {
                const node = nodeMap[selectedId];
                const st = WRITER_NODE_STYLE[node.status];
                return (
                    <div className="wst-node-info">
                        <span className="wst-node-info__name" style={{ color: st.text }}>{node.label}</span>
                        <span className="wst-node-info__status"
                            style={{ background: st.fill, border: `1px solid ${st.stroke}`, color: st.text }}>
                            {node.status}
                        </span>
                        <button
                            className="wst-node-info__edit"
                            onClick={() => onNavigate("write", { sceneId: node.id })}
                        >
                            ✏️ แก้ไขฉากนี้
                        </button>
                        <button
                            className="wst-node-info__close"
                            onClick={() => setSelectedId(null)}
                            aria-label="ปิด"
                        >
                            ✕
                        </button>
                    </div>
                );
            })()}
        </div>
    );
};

export default WriterStoryTreePage;