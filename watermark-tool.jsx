import { useState, useRef, useCallback, useEffect } from "react";

const POSITIONS = [
  { id: "bottom-right", label: "Bottom Right" },
  { id: "bottom-left", label: "Bottom Left" },
  { id: "top-right", label: "Top Right" },
  { id: "top-left", label: "Top Left" },
  { id: "center", label: "Center" },
];

export default function WatermarkTool() {
  const [images, setImages] = useState([]);
  const [logo, setLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [position, setPosition] = useState("bottom-right");
  const [opacity, setOpacity] = useState(80);
  const [scale, setScale] = useState(15);
  const [padding, setPadding] = useState(3);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState([]);
  const [previewIdx, setPreviewIdx] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const imgInputRef = useRef();
  const logoInputRef = useRef();

  const handleImageDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(null);
    const files = [...e.dataTransfer.files].filter((f) =>
      f.type.startsWith("image/")
    );
    if (files.length) setImages((prev) => [...prev, ...files]);
  }, []);

  const handleLogoDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(null);
    const file = [...e.dataTransfer.files].find((f) =>
      f.type.startsWith("image/")
    );
    if (file) {
      setLogo(file);
      const r = new FileReader();
      r.onload = (ev) => setLogoPreview(ev.target.result);
      r.readAsDataURL(file);
    }
  }, []);

  const loadImage = (src) =>
    new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = rej;
      img.src = src;
    });

  const applyWatermark = async (imageFile) => {
    const imgUrl = URL.createObjectURL(imageFile);
    const logoUrl = URL.createObjectURL(logo);
    const [img, wm] = await Promise.all([loadImage(imgUrl), loadImage(logoUrl)]);

    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    const wmWidth = img.width * (scale / 100);
    const wmHeight = (wm.height / wm.width) * wmWidth;
    const pad = img.width * (padding / 100);

    let x, y;
    switch (position) {
      case "bottom-right":
        x = img.width - wmWidth - pad;
        y = img.height - wmHeight - pad;
        break;
      case "bottom-left":
        x = pad;
        y = img.height - wmHeight - pad;
        break;
      case "top-right":
        x = img.width - wmWidth - pad;
        y = pad;
        break;
      case "top-left":
        x = pad;
        y = pad;
        break;
      case "center":
        x = (img.width - wmWidth) / 2;
        y = (img.height - wmHeight) / 2;
        break;
    }

    ctx.globalAlpha = opacity / 100;
    ctx.drawImage(wm, x, y, wmWidth, wmHeight);
    ctx.globalAlpha = 1;

    URL.revokeObjectURL(imgUrl);
    URL.revokeObjectURL(logoUrl);

    return new Promise((res) => canvas.toBlob(res, "image/png"));
  };

  const processAll = async () => {
    if (!images.length || !logo) return;
    setProcessing(true);
    setProgress(0);
    setResults([]);
    const out = [];
    for (let i = 0; i < images.length; i++) {
      const blob = await applyWatermark(images[i]);
      out.push({ name: images[i].name, url: URL.createObjectURL(blob), blob });
      setProgress(((i + 1) / images.length) * 100);
    }
    setResults(out);
    setProcessing(false);
  };

  const downloadAll = () => {
    results.forEach((r) => {
      const a = document.createElement("a");
      a.href = r.url;
      a.download = `watermarked_${r.name}`;
      a.click();
    });
  };

  const removeImage = (idx) =>
    setImages((prev) => prev.filter((_, i) => i !== idx));

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0b",
        color: "#e8e6e3",
        fontFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #1a1a1d; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
        input[type=range] {
          -webkit-appearance: none; width: 100%; height: 4px;
          background: #2a2a2d; border-radius: 2px; outline: none;
        }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none; width: 14px; height: 14px;
          background: #c5f82a; border-radius: 50%; cursor: pointer;
          border: 2px solid #0a0a0b;
        }
      `}</style>

      {/* Header */}
      <div
        style={{
          padding: "24px 32px",
          borderBottom: "1px solid #1f1f22",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 32,
              height: 32,
              background: "#c5f82a",
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              color: "#0a0a0b",
              fontWeight: 700,
            }}
          >
            W
          </div>
          <span
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 18,
              fontWeight: 600,
              letterSpacing: "-0.02em",
            }}
          >
            stamp<span style={{ color: "#c5f82a" }}>.</span>batch
          </span>
        </div>
        <span style={{ fontSize: 11, color: "#666", letterSpacing: "0.05em" }}>
          100% CLIENT-SIDE · NO UPLOADS
        </span>
      </div>

      <div
        style={{
          maxWidth: 960,
          margin: "0 auto",
          padding: "32px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 28,
        }}
      >
        {/* Drop zones row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 20 }}>
          {/* Images drop zone */}
          <div
            onDrop={handleImageDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver("images");
            }}
            onDragLeave={() => setDragOver(null)}
            onClick={() => imgInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver === "images" ? "#c5f82a" : "#2a2a2d"}`,
              borderRadius: 12,
              padding: 32,
              textAlign: "center",
              cursor: "pointer",
              transition: "all 0.2s",
              background: dragOver === "images" ? "#c5f82a08" : "#111113",
              minHeight: 140,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <div style={{ fontSize: 28, opacity: 0.4 }}>📸</div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>
              Drop images here or click to browse
            </div>
            <div style={{ fontSize: 11, color: "#666" }}>
              JPG, PNG, WebP — any number of files
            </div>
            {images.length > 0 && (
              <div
                style={{
                  marginTop: 8,
                  background: "#c5f82a",
                  color: "#0a0a0b",
                  padding: "4px 12px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {images.length} image{images.length !== 1 ? "s" : ""} loaded
              </div>
            )}
            <input
              ref={imgInputRef}
              type="file"
              multiple
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) =>
                setImages((prev) => [...prev, ...[...e.target.files]])
              }
            />
          </div>

          {/* Logo drop zone */}
          <div
            onDrop={handleLogoDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver("logo");
            }}
            onDragLeave={() => setDragOver(null)}
            onClick={() => logoInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver === "logo" ? "#c5f82a" : "#2a2a2d"}`,
              borderRadius: 12,
              padding: 20,
              textAlign: "center",
              cursor: "pointer",
              transition: "all 0.2s",
              background: dragOver === "logo" ? "#c5f82a08" : "#111113",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {logoPreview ? (
              <>
                <img
                  src={logoPreview}
                  alt="logo"
                  style={{
                    maxHeight: 56,
                    maxWidth: "80%",
                    objectFit: "contain",
                    background: "#2a2a2d",
                    borderRadius: 6,
                    padding: 8,
                  }}
                />
                <div style={{ fontSize: 11, color: "#c5f82a" }}>
                  ✓ Logo loaded — click to change
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 28, opacity: 0.4 }}>🏷️</div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>
                  Drop your logo/watermark
                </div>
                <div style={{ fontSize: 11, color: "#666" }}>PNG recommended</div>
              </>
            )}
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files[0];
                if (f) {
                  setLogo(f);
                  const r = new FileReader();
                  r.onload = (ev) => setLogoPreview(ev.target.result);
                  r.readAsDataURL(f);
                }
              }}
            />
          </div>
        </div>

        {/* Image thumbnails */}
        {images.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {images.slice(0, 20).map((img, i) => (
              <div
                key={i}
                style={{
                  position: "relative",
                  width: 56,
                  height: 56,
                  borderRadius: 6,
                  overflow: "hidden",
                  border: "1px solid #2a2a2d",
                }}
              >
                <img
                  src={URL.createObjectURL(img)}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage(i);
                  }}
                  style={{
                    position: "absolute",
                    top: 2,
                    right: 2,
                    width: 16,
                    height: 16,
                    background: "#000a",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    cursor: "pointer",
                    color: "#fff",
                  }}
                >
                  ×
                </div>
              </div>
            ))}
            {images.length > 20 && (
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 6,
                  background: "#1a1a1d",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  color: "#888",
                }}
              >
                +{images.length - 20}
              </div>
            )}
            <div
              onClick={() => setImages([])}
              style={{
                height: 56,
                padding: "0 12px",
                borderRadius: 6,
                background: "#1a1a1d",
                display: "flex",
                alignItems: "center",
                fontSize: 11,
                color: "#f44",
                cursor: "pointer",
                border: "1px solid #2a2a2d",
              }}
            >
              Clear all
            </div>
          </div>
        )}

        {/* Controls */}
        <div
          style={{
            background: "#111113",
            borderRadius: 12,
            padding: 24,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 24,
            border: "1px solid #1f1f22",
          }}
        >
          {/* Position */}
          <div>
            <div
              style={{
                fontSize: 11,
                color: "#888",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 10,
              }}
            >
              Position
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {POSITIONS.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setPosition(p.id)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 6,
                    fontSize: 12,
                    cursor: "pointer",
                    background: position === p.id ? "#c5f82a" : "#1f1f22",
                    color: position === p.id ? "#0a0a0b" : "#aaa",
                    fontWeight: position === p.id ? 600 : 400,
                    transition: "all 0.15s",
                  }}
                >
                  {p.label}
                </div>
              ))}
            </div>
          </div>

          {/* Sliders */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    color: "#888",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  Opacity
                </span>
                <span style={{ fontSize: 12, color: "#c5f82a" }}>{opacity}%</span>
              </div>
              <input
                type="range"
                min={5}
                max={100}
                value={opacity}
                onChange={(e) => setOpacity(+e.target.value)}
              />
            </div>
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    color: "#888",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  Size
                </span>
                <span style={{ fontSize: 12, color: "#c5f82a" }}>{scale}%</span>
              </div>
              <input
                type="range"
                min={3}
                max={50}
                value={scale}
                onChange={(e) => setScale(+e.target.value)}
              />
            </div>
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    color: "#888",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  Padding
                </span>
                <span style={{ fontSize: 12, color: "#c5f82a" }}>{padding}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={15}
                value={padding}
                onChange={(e) => setPadding(+e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Process button */}
        <button
          onClick={processAll}
          disabled={!images.length || !logo || processing}
          style={{
            width: "100%",
            padding: "16px",
            borderRadius: 10,
            border: "none",
            fontSize: 14,
            fontWeight: 600,
            fontFamily: "'Space Grotesk', sans-serif",
            letterSpacing: "0.02em",
            cursor:
              !images.length || !logo || processing ? "not-allowed" : "pointer",
            background:
              !images.length || !logo
                ? "#1f1f22"
                : processing
                  ? "#2a2a2d"
                  : "#c5f82a",
            color:
              !images.length || !logo
                ? "#555"
                : processing
                  ? "#888"
                  : "#0a0a0b",
            transition: "all 0.2s",
          }}
        >
          {processing
            ? `Processing... ${Math.round(progress)}%`
            : !images.length
              ? "Add images to start"
              : !logo
                ? "Add a watermark logo"
                : `Watermark ${images.length} image${images.length !== 1 ? "s" : ""}`}
        </button>

        {/* Progress bar */}
        {processing && (
          <div
            style={{
              height: 3,
              background: "#1f1f22",
              borderRadius: 2,
              overflow: "hidden",
              marginTop: -20,
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progress}%`,
                background: "#c5f82a",
                transition: "width 0.2s",
                borderRadius: 2,
              }}
            />
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <span
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 16,
                  fontWeight: 600,
                }}
              >
                Done! {results.length} images watermarked
              </span>
              <button
                onClick={downloadAll}
                style={{
                  padding: "8px 20px",
                  borderRadius: 6,
                  border: "1px solid #c5f82a",
                  background: "transparent",
                  color: "#c5f82a",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                ↓ Download all
              </button>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                gap: 10,
              }}
            >
              {results.map((r, i) => (
                <div
                  key={i}
                  onClick={() => setPreviewIdx(i)}
                  style={{
                    borderRadius: 8,
                    overflow: "hidden",
                    border: "1px solid #1f1f22",
                    cursor: "pointer",
                    transition: "border-color 0.15s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.borderColor = "#c5f82a")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.borderColor = "#1f1f22")
                  }
                >
                  <img
                    src={r.url}
                    style={{
                      width: "100%",
                      height: 100,
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                  <div
                    style={{
                      padding: "6px 8px",
                      fontSize: 10,
                      color: "#888",
                      background: "#111113",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {r.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Preview modal */}
      {previewIdx !== null && results[previewIdx] && (
        <div
          onClick={() => setPreviewIdx(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "#000c",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999,
            padding: 40,
            backdropFilter: "blur(8px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "90%",
              maxHeight: "90%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
            }}
          >
            <img
              src={results[previewIdx].url}
              style={{
                maxWidth: "100%",
                maxHeight: "80vh",
                borderRadius: 8,
                border: "1px solid #333",
              }}
            />
            <div style={{ display: "flex", gap: 12 }}>
              <a
                href={results[previewIdx].url}
                download={`watermarked_${results[previewIdx].name}`}
                style={{
                  padding: "8px 20px",
                  borderRadius: 6,
                  background: "#c5f82a",
                  color: "#0a0a0b",
                  fontSize: 12,
                  fontWeight: 600,
                  textDecoration: "none",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                ↓ Download
              </a>
              <button
                onClick={() => setPreviewIdx(null)}
                style={{
                  padding: "8px 20px",
                  borderRadius: 6,
                  border: "1px solid #333",
                  background: "transparent",
                  color: "#aaa",
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
