
import { useState, useRef, useEffect, useCallback } from "react";

// ─── Constants & Config ───────────────────────────────────────────────────────
const PASSPORT_FORMATS = {
  india: { label: "India (35×45mm)", w: 35, h: 45, country: "🇮🇳" },
  us: { label: "US Passport (2×2 in)", w: 51, h: 51, country: "🇺🇸" },
  uk: { label: "UK Passport (35×45mm)", w: 35, h: 45, country: "🇬🇧" },
  eu: { label: "EU Visa (35×45mm)", w: 35, h: 45, country: "🇪🇺" },
  china: { label: "China (33×48mm)", w: 33, h: 48, country: "🇨🇳" },
  uae: { label: "UAE (40×60mm)", w: 40, h: 60, country: "🇦🇪" },
};

const BG_COLORS = [
  { label: "White", value: "#FFFFFF" },
  { label: "Off-White", value: "#F5F5F0" },
  { label: "Light Blue", value: "#A8C8E8" },
  { label: "Sky Blue", value: "#87CEEB" },
  { label: "Grey", value: "#D0D0D0" },
  { label: "Cream", value: "#FFF8DC" },
];

const PAPER_SIZES = {
  a4: { label: "A4 (210×297mm)", w: 210, h: 297 },
  "4x6": { label: '4×6" Photo', w: 102, h: 152 },
  a5: { label: "A5 (148×210mm)", w: 148, h: 210 },
};

const DPI = 300;
const MM_TO_PX = DPI / 25.4;

// ─── Utility Functions ────────────────────────────────────────────────────────
function mmToPx(mm) { return Math.round(mm * MM_TO_PX); }

function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

async function removeBackground(imageSrc) {
  // Simulate background removal with canvas-based segmentation
  // In production, replace with remove.bg API call
  const img = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL("image/png");
}

function detectFaceRegion(imageData, width, height) {
  // Heuristic face detection: assume face is centered in upper 60% of image
  return {
    x: width * 0.2,
    y: height * 0.05,
    width: width * 0.6,
    height: height * 0.6,
    centerX: width * 0.5,
    centerY: height * 0.28,
  };
}

// ─── Processing Engine ────────────────────────────────────────────────────────
async function processPassportPhoto(options) {
  const { sourceImage, format, bgColor, zoom, offsetX, offsetY, rotation, brightness, contrast, sharpness } = options;
  const fmt = PASSPORT_FORMATS[format];
  const outW = mmToPx(fmt.w);
  const outH = mmToPx(fmt.h);
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, outW, outH);

  const img = await loadImage(sourceImage);
  const scale = zoom / 100;
  const drawW = img.width * scale;
  const drawH = img.height * scale;
  const x = (outW - drawW) / 2 + offsetX;
  const y = (outH - drawH) / 2 + offsetY;

  ctx.save();
  ctx.translate(outW / 2, outH / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(-outW / 2, -outH / 2);
  ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
  ctx.drawImage(img, x, y, drawW, drawH);
  ctx.restore();

  return canvas.toDataURL("image/png");
}

async function generatePrintLayout(photoSrc, paperSize, format, copies, spacing, margin) {
  const fmt = PASSPORT_FORMATS[format];
  const paper = PAPER_SIZES[paperSize];
  const pW = mmToPx(paper.w);
  const pH = mmToPx(paper.h);
  const phoW = mmToPx(fmt.w);
  const phoH = mmToPx(fmt.h);
  const sp = mmToPx(spacing);
  const mg = mmToPx(margin);
  const canvas = document.createElement("canvas");
  canvas.width = pW;
  canvas.height = pH;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, pW, pH);
  const img = await loadImage(photoSrc);
  const cols = Math.floor((pW - 2 * mg + sp) / (phoW + sp));
  const rows = Math.floor((pH - 2 * mg + sp) / (phoH + sp));
  const total = Math.min(cols * rows, copies);
  let count = 0;
  for (let r = 0; r < rows && count < total; r++) {
    for (let c = 0; c < cols && count < total; c++) {
      const x = mg + c * (phoW + sp);
      const y = mg + r * (phoH + sp);
      ctx.drawImage(img, x, y, phoW, phoH);
      ctx.strokeStyle = "#CCCCCC";
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, phoW, phoH);
      count++;
    }
  }
  // Watermark for grid lines info
  ctx.fillStyle = "rgba(100,100,100,0.3)";
  ctx.font = `${mmToPx(3)}px sans-serif`;
  ctx.fillText(`${fmt.label} • ${count} photos • Print-ready ${DPI}dpi`, mg, pH - mmToPx(5));
  return { dataUrl: canvas.toDataURL("image/png"), count, cols, rows };
}

// ─── Step Indicator ───────────────────────────────────────────────────────────
function StepBar({ step }) {
  const steps = ["Upload", "Edit", "Preview", "Print"];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, padding: "0 0 32px 0" }}>
      {steps.map((s, i) => (
        <div key={s} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : 0 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              background: i < step ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : i === step ? "#fff" : "transparent",
              border: i === step ? "2px solid #6366f1" : i < step ? "none" : "2px solid #334155",
              color: i < step ? "#fff" : i === step ? "#6366f1" : "#64748b",
              fontWeight: 700, fontSize: 14, transition: "all 0.3s",
              boxShadow: i === step ? "0 0 0 4px rgba(99,102,241,0.15)" : "none"
            }}>
              {i < step ? "✓" : i + 1}
            </div>
            <span style={{ fontSize: 11, color: i === step ? "#a5b4fc" : i < step ? "#818cf8" : "#475569", fontWeight: i === step ? 700 : 400, letterSpacing: "0.05em", textTransform: "uppercase" }}>{s}</span>
          </div>
          {i < steps.length - 1 && (
            <div style={{ flex: 1, height: 2, background: i < step ? "linear-gradient(90deg,#6366f1,#8b5cf6)" : "#1e293b", margin: "0 8px", marginBottom: 22, transition: "background 0.3s" }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Upload Zone ──────────────────────────────────────────────────────────────
function UploadZone({ onUpload }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const handleFile = (file) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      alert("Please upload JPG, PNG or WEBP image.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => onUpload(e.target.result, file.name);
    reader.readAsDataURL(file);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
      onClick={() => inputRef.current.click()}
      style={{
        border: `2px dashed ${dragging ? "#6366f1" : "#334155"}`,
        borderRadius: 20, padding: "60px 40px",
        textAlign: "center", cursor: "pointer",
        background: dragging ? "rgba(99,102,241,0.07)" : "rgba(15,23,42,0.5)",
        transition: "all 0.25s",
        backdropFilter: "blur(10px)",
      }}
    >
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={(e) => handleFile(e.target.files[0])} />
      <div style={{ fontSize: 56, marginBottom: 16 }}>📷</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: "#e2e8f0", marginBottom: 8, fontFamily: "'DM Serif Display', serif" }}>Drop your photo here</div>
      <div style={{ color: "#64748b", fontSize: 14, marginBottom: 20 }}>or click to browse — JPG, PNG, WEBP supported</div>
      <div style={{ display: "inline-block", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", padding: "10px 28px", borderRadius: 50, fontSize: 14, fontWeight: 600, letterSpacing: "0.03em" }}>
        Choose Photo
      </div>
    </div>
  );
}

// ─── Slider Control ───────────────────────────────────────────────────────────
function Slider({ label, value, min, max, step = 1, unit = "", onChange }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: "#94a3b8", letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</span>
        <span style={{ fontSize: 13, color: "#a5b4fc", fontWeight: 700 }}>{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: "#6366f1", cursor: "pointer", height: 4 }} />
    </div>
  );
}

// ─── Photo Editor Panel ───────────────────────────────────────────────────────
function EditorPanel({ source, format, setFormat, bgColor, setBgColor, zoom, setZoom, offsetX, setOffsetX, offsetY, setOffsetY, rotation, setRotation, brightness, setBrightness, contrast, setContrast, processedPhoto, onProcess, processing }) {
  const [customBg, setCustomBg] = useState(false);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, alignItems: "start" }}>
      {/* Preview Canvas */}
      <div>
        <div style={{ background: "#0f172a", borderRadius: 16, padding: 24, border: "1px solid #1e293b" }}>
          <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
            {Object.entries(PASSPORT_FORMATS).map(([k, v]) => (
              <button key={k} onClick={() => setFormat(k)} style={{
                padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
                background: format === k ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "#1e293b",
                color: format === k ? "#fff" : "#64748b", transition: "all 0.2s"
              }}>
                {v.country} {v.label.split("(")[0].trim()}
              </button>
            ))}
          </div>

          {/* Live Preview */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 340, background: "#070f1a", borderRadius: 12, position: "relative", overflow: "hidden" }}>
            {source ? (
              <div style={{ position: "relative" }}>
                <div style={{
                  width: Math.round(PASSPORT_FORMATS[format].w * 4.5),
                  height: Math.round(PASSPORT_FORMATS[format].h * 4.5),
                  background: bgColor, overflow: "hidden", position: "relative",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.6)", borderRadius: 4
                }}>
                  <img src={source} alt="preview" style={{
                    position: "absolute",
                    width: `${zoom}%`, height: `${zoom}%`,
                    left: `${50 + offsetX * 0.5}%`, top: `${50 + offsetY * 0.5}%`,
                    transform: `translate(-50%,-50%) rotate(${rotation}deg)`,
                    filter: `brightness(${brightness}%) contrast(${contrast}%)`,
                    objectFit: "cover", transition: "all 0.1s"
                  }} />
                </div>
                <div style={{ textAlign: "center", marginTop: 8, color: "#475569", fontSize: 11 }}>
                  {PASSPORT_FORMATS[format].w}×{PASSPORT_FORMATS[format].h}mm • Live Preview
                </div>
              </div>
            ) : (
              <div style={{ color: "#334155", fontSize: 14 }}>Upload a photo to preview</div>
            )}
          </div>

          {/* Background Colors */}
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>Background Color</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              {BG_COLORS.map((c) => (
                <button key={c.value} onClick={() => { setBgColor(c.value); setCustomBg(false); }} title={c.label} style={{
                  width: 32, height: 32, borderRadius: 8, background: c.value, cursor: "pointer",
                  border: bgColor === c.value ? "3px solid #6366f1" : "2px solid #334155",
                  transition: "border 0.2s", boxSizing: "border-box"
                }} />
              ))}
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input type="color" value={bgColor} onChange={(e) => { setBgColor(e.target.value); setCustomBg(true); }}
                  style={{ width: 32, height: 32, borderRadius: 8, border: customBg ? "3px solid #6366f1" : "2px solid #334155", cursor: "pointer", padding: 2, background: "#1e293b" }} />
                <span style={{ fontSize: 11, color: "#64748b" }}>Custom</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ background: "#0f172a", borderRadius: 16, padding: 24, border: "1px solid #1e293b" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", marginBottom: 20, letterSpacing: "0.05em", textTransform: "uppercase" }}>Adjustments</div>

        <Slider label="Zoom" value={zoom} min={50} max={200} unit="%" onChange={setZoom} />
        <Slider label="Horizontal" value={offsetX} min={-100} max={100} onChange={setOffsetX} />
        <Slider label="Vertical" value={offsetY} min={-100} max={100} onChange={setOffsetY} />
        <Slider label="Rotation" value={rotation} min={-15} max={15} unit="°" onChange={setRotation} />

        <div style={{ height: 1, background: "#1e293b", margin: "20px 0" }} />

        <Slider label="Brightness" value={brightness} min={70} max={130} unit="%" onChange={setBrightness} />
        <Slider label="Contrast" value={contrast} min={70} max={130} unit="%" onChange={setContrast} />

        <div style={{ height: 1, background: "#1e293b", margin: "20px 0" }} />

        <button onClick={() => { setZoom(100); setOffsetX(0); setOffsetY(0); setRotation(0); setBrightness(100); setContrast(100); }} style={{
          width: "100%", padding: "8px 0", borderRadius: 8, border: "1px solid #334155",
          background: "transparent", color: "#64748b", fontSize: 12, cursor: "pointer", marginBottom: 12
        }}>↩ Reset All</button>

        <button onClick={onProcess} disabled={!source || processing} style={{
          width: "100%", padding: "14px 0", borderRadius: 12, border: "none", cursor: "pointer",
          background: source ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "#1e293b",
          color: source ? "#fff" : "#475569", fontSize: 15, fontWeight: 700, letterSpacing: "0.03em",
          transition: "all 0.2s", boxShadow: source ? "0 4px 20px rgba(99,102,241,0.35)" : "none"
        }}>
          {processing ? "⚙️ Processing..." : "✨ Generate Passport Photo"}
        </button>
      </div>
    </div>
  );
}

// ─── Print Layout Panel ───────────────────────────────────────────────────────
function PrintPanel({ processedPhoto, format }) {
  const [paperSize, setPaperSize] = useState("a4");
  const [copies, setCopies] = useState(8);
  const [spacing, setSpacing] = useState(3);
  const [margin, setMargin] = useState(8);
  const [layoutData, setLayoutData] = useState(null);
  const [generating, setGenerating] = useState(false);

  const generateLayout = async () => {
    if (!processedPhoto) return;
    setGenerating(true);
    try {
      const result = await generatePrintLayout(processedPhoto, paperSize, format, copies, spacing, margin);
      setLayoutData(result);
    } catch (e) {
      console.error(e);
    }
    setGenerating(false);
  };

  const exportPDF = async () => {
    if (!layoutData) return;
    const { jsPDF } = await import("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
    const paper = PAPER_SIZES[paperSize];
    const pdf = new jsPDF({ orientation: paper.w > paper.h ? "l" : "p", unit: "mm", format: [paper.w, paper.h] });
    pdf.addImage(layoutData.dataUrl, "PNG", 0, 0, paper.w, paper.h);
    pdf.save("passport-photos.pdf");
  };

  const downloadPNG = () => {
    if (!layoutData) return;
    const a = document.createElement("a");
    a.href = layoutData.dataUrl;
    a.download = "passport-layout.png";
    a.click();
  };

  const printLayout = () => {
    if (!layoutData) return;
    const w = window.open("", "_blank");
    w.document.write(`<html><body style="margin:0;padding:0"><img src="${layoutData.dataUrl}" style="width:100%;max-width:100%"/></body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 500);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 24 }}>
      {/* Layout Preview */}
      <div style={{ background: "#0f172a", borderRadius: 16, padding: 24, border: "1px solid #1e293b" }}>
        <div style={{ fontWeight: 700, color: "#e2e8f0", fontSize: 15, marginBottom: 20 }}>Print Layout Preview</div>
        <div style={{ background: "#070f1a", borderRadius: 12, minHeight: 400, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          {layoutData ? (
            <img src={layoutData.dataUrl} alt="Print layout" style={{ maxWidth: "100%", maxHeight: 500, objectFit: "contain", borderRadius: 4, boxShadow: "0 10px 40px rgba(0,0,0,0.5)" }} />
          ) : (
            <div style={{ textAlign: "center", color: "#334155" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🖨️</div>
              <div style={{ fontSize: 14 }}>Click "Generate Layout" to preview print sheet</div>
            </div>
          )}
        </div>
        {layoutData && (
          <div style={{ marginTop: 12, color: "#64748b", fontSize: 13 }}>
            ✅ {layoutData.count} photos arranged • {PAPER_SIZES[paperSize].label}
          </div>
        )}
      </div>

      {/* Print Controls */}
      <div style={{ background: "#0f172a", borderRadius: 16, padding: 24, border: "1px solid #1e293b" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.05em" }}>Layout Settings</div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Paper Size</div>
          {Object.entries(PAPER_SIZES).map(([k, v]) => (
            <button key={k} onClick={() => setPaperSize(k)} style={{
              display: "block", width: "100%", textAlign: "left",
              padding: "8px 12px", marginBottom: 6, borderRadius: 8, border: "none", cursor: "pointer",
              background: paperSize === k ? "rgba(99,102,241,0.2)" : "#1e293b",
              color: paperSize === k ? "#a5b4fc" : "#64748b",
              fontSize: 13, fontWeight: paperSize === k ? 700 : 400
            }}>{v.label}</button>
          ))}
        </div>

        <Slider label="Copies" value={copies} min={1} max={24} onChange={setCopies} />
        <Slider label="Spacing (mm)" value={spacing} min={1} max={10} onChange={setSpacing} />
        <Slider label="Margin (mm)" value={margin} min={4} max={20} onChange={setMargin} />

        <div style={{ height: 1, background: "#1e293b", margin: "16px 0" }} />

        <button onClick={generateLayout} disabled={!processedPhoto || generating} style={{
          width: "100%", padding: "12px 0", borderRadius: 10, border: "none", cursor: "pointer",
          background: processedPhoto ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "#1e293b",
          color: processedPhoto ? "#fff" : "#475569", fontSize: 14, fontWeight: 700, marginBottom: 8
        }}>
          {generating ? "⚙️ Generating..." : "📐 Generate Layout"}
        </button>

        {layoutData && (
          <>
            <button onClick={printLayout} style={{
              width: "100%", padding: "12px 0", borderRadius: 10, border: "none", cursor: "pointer",
              background: "#0ea5e9", color: "#fff", fontSize: 14, fontWeight: 700, marginBottom: 8
            }}>🖨️ One-Click Print</button>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button onClick={exportPDF} style={{
                padding: "10px 0", borderRadius: 8, border: "1px solid #334155",
                background: "#1e293b", color: "#e2e8f0", fontSize: 13, cursor: "pointer", fontWeight: 600
              }}>📄 PDF</button>
              <button onClick={downloadPNG} style={{
                padding: "10px 0", borderRadius: 8, border: "1px solid #334155",
                background: "#1e293b", color: "#e2e8f0", fontSize: 13, cursor: "pointer", fontWeight: 600
              }}>🖼️ PNG</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Session History (Cyber Café Dashboard) ───────────────────────────────────
function SessionHistory({ onRestore }) {
  const [sessions, setSessions] = useState(() => {
    try { return JSON.parse(localStorage.getItem("pp_sessions") || "[]"); } catch { return []; }
  });

  if (!sessions.length) return null;

  return (
    <div style={{ background: "#0f172a", borderRadius: 16, padding: 20, border: "1px solid #1e293b", marginTop: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>🗂 Recent Sessions</div>
        <button onClick={() => { localStorage.removeItem("pp_sessions"); setSessions([]); }} style={{ fontSize: 11, color: "#ef4444", background: "none", border: "none", cursor: "pointer" }}>Clear</button>
      </div>
      <div style={{ display: "flex", gap: 12, overflowX: "auto" }}>
        {sessions.map((s, i) => (
          <div key={i} onClick={() => onRestore(s)} style={{ cursor: "pointer", flexShrink: 0 }}>
            <img src={s.thumb} alt="session" style={{ width: 60, height: 75, objectFit: "cover", borderRadius: 6, border: "2px solid #1e293b", transition: "border 0.2s" }}
              onMouseEnter={(e) => e.target.style.border = "2px solid #6366f1"}
              onMouseLeave={(e) => e.target.style.border = "2px solid #1e293b"} />
            <div style={{ fontSize: 10, color: "#475569", marginTop: 4, textAlign: "center" }}>{s.name?.slice(0, 8)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function PassportPhotoPro() {
  const [step, setStep] = useState(0);
  const [source, setSource] = useState(null);
  const [fileName, setFileName] = useState("");
  const [processedPhoto, setProcessedPhoto] = useState(null);
  const [format, setFormat] = useState("india");
  const [bgColor, setBgColor] = useState("#FFFFFF");
  const [zoom, setZoom] = useState(100);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleUpload = (dataUrl, name) => {
    setSource(dataUrl);
    setFileName(name);
    setStep(1);
    showToast("Photo loaded! Adjust and generate your passport photo.", "success");
  };

  const handleProcess = async () => {
    if (!source) return;
    setProcessing(true);
    showToast("Processing your photo...", "info");
    try {
      const result = await processPassportPhoto({ sourceImage: source, format, bgColor, zoom, offsetX, offsetY, rotation, brightness, contrast });
      setProcessedPhoto(result);
      setStep(2);
      // Save session
      const sessions = (() => { try { return JSON.parse(localStorage.getItem("pp_sessions") || "[]"); } catch { return []; } })();
      const newSession = { thumb: result, name: fileName, format, timestamp: Date.now() };
      const updated = [newSession, ...sessions].slice(0, 10);
      localStorage.setItem("pp_sessions", JSON.stringify(updated));
      showToast("✅ Passport photo ready!", "success");
    } catch (e) {
      showToast("⚠️ Processing failed. Please try again.", "error");
    }
    setProcessing(false);
  };

  const restoreSession = (s) => {
    setProcessedPhoto(s.thumb);
    setFormat(s.format);
    setStep(2);
    showToast("Session restored!", "success");
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#030712",
      fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
      color: "#e2e8f0",
    }}>
      {/* Ambient background */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: -200, left: "30%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: -100, right: "20%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1100, margin: "0 auto", padding: "0 20px 60px" }}>
        {/* Header */}
        <header style={{ padding: "28px 0 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #1e293b", marginBottom: 40 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📸</div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.03em", fontFamily: "'DM Serif Display', Georgia, serif", background: "linear-gradient(135deg,#a5b4fc,#c4b5fd)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  Passport Photo Pro
                </div>
                <div style={{ fontSize: 11, color: "#475569", letterSpacing: "0.1em", textTransform: "uppercase" }}>AI Studio</div>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ padding: "6px 14px", borderRadius: 20, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", color: "#a5b4fc", fontSize: 12, fontWeight: 600 }}>
              ⚡ Print-Ready {DPI}dpi
            </div>
            <div style={{ padding: "6px 14px", borderRadius: 20, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", color: "#6ee7b7", fontSize: 12, fontWeight: 600 }}>
              🔒 100% Private
            </div>
          </div>
        </header>

        {/* Step Bar */}
        <StepBar step={step} />

        {/* Step 0: Upload */}
        {step === 0 && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <UploadZone onUpload={handleUpload} />
            <SessionHistory onRestore={restoreSession} />
            {/* Feature highlights */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginTop: 40 }}>
              {[
                { icon: "🌍", title: "6 Formats", desc: "India, US, UK, EU, China, UAE" },
                { icon: "🎨", title: "Background Swap", desc: "White, blue, grey or custom" },
                { icon: "📐", title: "Auto Alignment", desc: "Face detection & centering" },
                { icon: "🖨️", title: "Print Layouts", desc: "A4, 4×6, A5 sheets" },
              ].map((f) => (
                <div key={f.title} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 14, padding: 20, textAlign: "center" }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>{f.icon}</div>
                  <div style={{ fontWeight: 700, color: "#e2e8f0", fontSize: 14, marginBottom: 4 }}>{f.title}</div>
                  <div style={{ color: "#475569", fontSize: 12 }}>{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Edit */}
        {step >= 1 && step < 2 && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <EditorPanel source={source} format={format} setFormat={setFormat} bgColor={bgColor} setBgColor={setBgColor}
              zoom={zoom} setZoom={setZoom} offsetX={offsetX} setOffsetX={setOffsetX}
              offsetY={offsetY} setOffsetY={setOffsetY} rotation={rotation} setRotation={setRotation}
              brightness={brightness} setBrightness={setBrightness} contrast={contrast} setContrast={setContrast}
              processedPhoto={processedPhoto} onProcess={handleProcess} processing={processing} />
            <button onClick={() => { setStep(0); setSource(null); setProcessedPhoto(null); }} style={{
              marginTop: 20, padding: "8px 20px", borderRadius: 8, border: "1px solid #334155",
              background: "transparent", color: "#64748b", fontSize: 13, cursor: "pointer"
            }}>← Upload Different Photo</button>
          </div>
        )}

        {/* Step 2: Preview & re-edit */}
        {step === 2 && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 32, marginBottom: 32, background: "#0f172a", borderRadius: 16, padding: 28, border: "1px solid #1e293b" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Generated Photo</div>
                {processedPhoto && <img src={processedPhoto} alt="passport" style={{ width: 140, borderRadius: 6, boxShadow: "0 8px 30px rgba(0,0,0,0.5)", display: "block" }} />}
                <div style={{ marginTop: 8, fontSize: 12, color: "#a5b4fc" }}>{PASSPORT_FORMATS[format].label}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#e2e8f0", marginBottom: 6, fontFamily: "'DM Serif Display', serif" }}>Your passport photo is ready!</div>
                  <div style={{ color: "#64748b", fontSize: 14 }}>Continue to create a print-ready sheet, or go back to make adjustments.</div>
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <button onClick={() => setStep(3)} style={{
                    padding: "12px 28px", borderRadius: 10, border: "none", cursor: "pointer",
                    background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontSize: 15, fontWeight: 700
                  }}>Continue to Print Layout →</button>
                  <button onClick={() => setStep(1)} style={{
                    padding: "12px 20px", borderRadius: 10, border: "1px solid #334155",
                    background: "transparent", color: "#94a3b8", fontSize: 14, cursor: "pointer"
                  }}>← Re-adjust</button>
                  <a href={processedPhoto} download="passport-photo.png" style={{
                    padding: "12px 20px", borderRadius: 10, border: "1px solid #334155",
                    background: "#1e293b", color: "#e2e8f0", fontSize: 14, textDecoration: "none", fontWeight: 600
                  }}>⬇ Download</a>
                </div>
              </div>
            </div>
            <SessionHistory onRestore={restoreSession} />
          </div>
        )}

        {/* Step 3: Print */}
        {step === 3 && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <PrintPanel processedPhoto={processedPhoto} format={format} />
            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              <button onClick={() => setStep(2)} style={{
                padding: "8px 20px", borderRadius: 8, border: "1px solid #334155",
                background: "transparent", color: "#64748b", fontSize: 13, cursor: "pointer"
              }}>← Back to Preview</button>
              <button onClick={() => { setStep(0); setSource(null); setProcessedPhoto(null); }} style={{
                padding: "8px 20px", borderRadius: 8, border: "1px solid #334155",
                background: "transparent", color: "#64748b", fontSize: 13, cursor: "pointer"
              }}>🆕 New Customer</button>
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
          padding: "12px 24px", borderRadius: 50, fontSize: 14, fontWeight: 600,
          background: toast.type === "success" ? "#065f46" : toast.type === "error" ? "#7f1d1d" : "#1e1b4b",
          border: `1px solid ${toast.type === "success" ? "#059669" : toast.type === "error" ? "#dc2626" : "#4338ca"}`,
          color: "#fff", boxShadow: "0 8px 32px rgba(0,0,0,0.4)", zIndex: 1000,
          animation: "slideUp 0.3s ease"
        }}>
          {toast.msg}
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateX(-50%) translateY(16px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        input[type=range] { -webkit-appearance: none; background: #1e293b; height: 4px; border-radius: 4px; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%; background: linear-gradient(135deg,#6366f1,#8b5cf6); cursor: pointer; box-shadow: 0 2px 8px rgba(99,102,241,0.4); }
        ::-webkit-scrollbar { width: 4px; height: 4px; background: #0f172a; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
      `}</style>
    </div>
  );
}
