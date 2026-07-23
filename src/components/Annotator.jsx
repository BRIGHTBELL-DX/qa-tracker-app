import { useEffect, useRef, useState } from "react";

const HARD_MAX = 1440;
const COLORS = ["#e0433a", "#f2b632", "#2b6fe0"];

export default function Annotator({ src, onCancel, onDone }) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const imgRef = useRef(null);
  const strokesRef = useRef([]);
  const drawingRef = useRef(false);
  const currentRef = useRef(null);
  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState(COLORS[0]);
  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  toolRef.current = tool;
  colorRef.current = color;

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      const scale = Math.min(HARD_MAX / img.width, HARD_MAX / img.height, 1);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      imgRef.current = img;
      strokesRef.current = [];
      ctxRef.current = canvas.getContext("2d");
      redraw();
    };
    img.src = src;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  function redraw() {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !imgRef.current) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height);
    strokesRef.current.forEach(drawStroke);
    if (drawingRef.current && currentRef.current) drawStroke(currentRef.current);
  }

  function drawStroke(s) {
    const ctx = ctxRef.current;
    ctx.strokeStyle = s.color;
    ctx.fillStyle = s.color;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (s.type === "pen") {
      ctx.beginPath();
      s.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();
    } else if (s.type === "rect") {
      const x = Math.min(s.a.x, s.b.x), y = Math.min(s.a.y, s.b.y);
      const w = Math.abs(s.b.x - s.a.x), h = Math.abs(s.b.y - s.a.y);
      ctx.strokeRect(x, y, w, h);
    } else if (s.type === "arrow") {
      drawArrow(s.a, s.b, s.color);
    }
  }

  function drawArrow(a, b, color) {
    const ctx = ctxRef.current;
    const headlen = 12;
    const dx = b.x - a.x, dy = b.y - a.y;
    const angle = Math.atan2(dy, dx);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x - headlen * Math.cos(angle - Math.PI / 7), b.y - headlen * Math.sin(angle - Math.PI / 7));
    ctx.lineTo(b.x - headlen * Math.cos(angle + Math.PI / 7), b.y - headlen * Math.sin(angle + Math.PI / 7));
    ctx.closePath();
    ctx.fill();
  }

  function canvasPos(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  }

  function startDraw(e) {
    e.preventDefault();
    const p = canvasPos(e);
    drawingRef.current = true;
    currentRef.current =
      toolRef.current === "pen"
        ? { type: "pen", color: colorRef.current, points: [p] }
        : { type: toolRef.current, color: colorRef.current, a: p, b: p };
  }
  function moveDraw(e) {
    if (!drawingRef.current) return;
    e.preventDefault();
    const p = canvasPos(e);
    if (toolRef.current === "pen") currentRef.current.points.push(p);
    else currentRef.current.b = p;
    redraw();
  }
  function endDraw() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    strokesRef.current.push(currentRef.current);
    currentRef.current = null;
    redraw();
  }

  function undo() {
    strokesRef.current.pop();
    redraw();
  }
  function clearAll() {
    strokesRef.current = [];
    redraw();
  }

  function handleDone() {
    const dataUrl = canvasRef.current.toDataURL("image/jpeg", 0.85);
    onDone(dataUrl);
  }

  return (
    <div className="overlay">
      <div className="modal lg">
        <div className="modal-head">
          <div className="modal-title">캡쳐 표시하기</div>
          <button className="close-x" onClick={onCancel}>✕</button>
        </div>
        <div className="annot-toolbar">
          <button className={"tool-btn" + (tool === "pen" ? " on" : "")} onClick={() => setTool("pen")}>펜</button>
          <button className={"tool-btn" + (tool === "rect" ? " on" : "")} onClick={() => setTool("rect")}>박스</button>
          <button className={"tool-btn" + (tool === "arrow" ? " on" : "")} onClick={() => setTool("arrow")}>화살표</button>
          <span style={{ width: 1, height: 20, background: "var(--border)", margin: "0 4px" }} />
          {COLORS.map((c) => (
            <button
              key={c}
              className={"swatch" + (color === c ? " on" : "")}
              style={{ background: c }}
              onClick={() => setColor(c)}
            />
          ))}
          <span style={{ width: 1, height: 20, background: "var(--border)", margin: "0 4px" }} />
          <button className="tool-btn" onClick={undo}>되돌리기</button>
          <button className="tool-btn" onClick={clearAll}>전체 지우기</button>
        </div>
        <div className="annot-canvas-wrap">
          <canvas
            ref={canvasRef}
            onMouseDown={startDraw}
            onMouseMove={moveDraw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={moveDraw}
            onTouchEnd={endDraw}
          />
        </div>
        <div className="modal-foot">
          <button className="ghost-btn" onClick={onCancel}>취소</button>
          <button className="primary-btn" onClick={handleDone}>완료</button>
        </div>
      </div>
    </div>
  );
}
