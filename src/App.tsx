import { useEffect, useMemo, useRef, useState } from 'react';
import {
  House,
  Grid2X2,
  Box,
  Download,
  Plus,
  Trash2,
  RotateCcw,
  Save,
  Ruler,
  ChevronDown,
  Layers,
  Move,
  DoorOpen,
  Sofa,
  Bath,
  BedDouble,
  Utensils,
  Sun,
  Check,
  Menu,
  Moon,
  Monitor,
} from 'lucide-react';

type Room = {
  id: number;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  icon: string;
};
const initialRooms: Room[] = [
  {
    id: 1,
    name: 'Living room',
    x: 0,
    y: 0,
    w: 6,
    h: 4,
    color: '#dce9df',
    icon: 'sofa',
  },
  {
    id: 2,
    name: 'Kitchen',
    x: 6,
    y: 0,
    w: 4,
    h: 3,
    color: '#f3e5c8',
    icon: 'kitchen',
  },
  {
    id: 3,
    name: 'Bedroom 1',
    x: 0,
    y: 4,
    w: 4,
    h: 4,
    color: '#dce5f2',
    icon: 'bed',
  },
  {
    id: 4,
    name: 'Bedroom 2',
    x: 4,
    y: 4,
    w: 4,
    h: 4,
    color: '#e9e0f2',
    icon: 'bed',
  },
  {
    id: 5,
    name: 'Bathroom',
    x: 8,
    y: 3,
    w: 2,
    h: 3,
    color: '#d8ebef',
    icon: 'bath',
  },
  {
    id: 6,
    name: 'Entry',
    x: 8,
    y: 6,
    w: 2,
    h: 2,
    color: '#f1e2d6',
    icon: 'door',
  },
];
const palette = [
  '#dce9df',
  '#f3e5c8',
  '#dce5f2',
  '#e9e0f2',
  '#d8ebef',
  '#f1e2d6',
  '#f1deda',
  '#e3e7ce',
];
const kinds = [
  { name: 'Living room', w: 6, h: 4, color: palette[0], icon: 'sofa' },
  { name: 'Bedroom', w: 4, h: 4, color: palette[2], icon: 'bed' },
  { name: 'Kitchen', w: 4, h: 3, color: palette[1], icon: 'kitchen' },
  { name: 'Bathroom', w: 2, h: 3, color: palette[4], icon: 'bath' },
  { name: 'Dining room', w: 4, h: 3, color: palette[6], icon: 'dining' },
  { name: 'Office', w: 3, h: 3, color: palette[7], icon: 'office' },
];
const iconFor = (icon: string, size = 18) => {
  if (icon === 'bed') return <BedDouble size={size} />;
  if (icon === 'kitchen' || icon === 'dining') return <Utensils size={size} />;
  if (icon === 'bath') return <Bath size={size} />;
  if (icon === 'door') return <DoorOpen size={size} />;
  return <Sofa size={size} />;
};
function App() {
  const [rooms, setRooms] = useState<Room[]>(() => {
    try {
      const saved = localStorage.getItem('hearthplan-rooms');
      return saved ? JSON.parse(saved) : initialRooms;
    } catch {
      return initialRooms;
    }
  });
  const [selected, setSelected] = useState<number | null>(1);
  const [view, setView] = useState<'2d' | '3d'>('2d');
  const [unit, setUnit] = useState<'m' | 'cm' | 'mm' | 'km' | 'ft' | 'in' | 'yd'>('m');
  const [projectName, setProjectName] = useState('My first home');
  const [showAdd, setShowAdd] = useState(false);
  const [saved, setSaved] = useState(false);
  const [mobilePanel, setMobilePanel] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    try { return (localStorage.getItem('hearthplan-theme') as 'light' | 'dark' | 'system') || 'system'; } catch { return 'system'; }
  });
  useEffect(() => {
    const root = document.documentElement;
    const applyTheme = () => {
      const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      root.dataset.theme = dark ? 'dark' : 'light';
    };
    applyTheme();
    try { localStorage.setItem('hearthplan-theme', theme); } catch {}
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', applyTheme);
    return () => media.removeEventListener('change', applyTheme);
  }, [theme]);
  const svgRef = useRef<SVGSVGElement>(null);
  const selectedRoom = rooms.find(r => r.id === selected) ?? null;
  const totalArea = useMemo(
    () => rooms.reduce((sum, r) => sum + r.w * r.h, 0),
    [rooms]
  );
  const unitFactors: Record<typeof unit, number> = { m: 1, cm: 100, mm: 1000, km: 0.001, ft: 3.280839895, in: 39.37007874, yd: 1.093613298 };
  const unitLabels: Record<typeof unit, string> = { m: 'm', cm: 'cm', mm: 'mm', km: 'km', ft: 'ft', in: 'in', yd: 'yd' };
  const factor = unitFactors[unit];
  const fmt = (n: number) => {
    const value = n * factor;
    const digits = Math.abs(value) >= 100 ? 1 : 2;
    return value.toFixed(digits).replace(/\\.?0+$/, '');
  };
  const areaLabel = unit === 'm' ? 'm²' : unit === 'cm' ? 'cm²' : unit === 'mm' ? 'mm²' : unit === 'km' ? 'km²' : unit === 'ft' ? 'ft²' : unit === 'in' ? 'in²' : 'yd²';
  useEffect(() => {
    localStorage.setItem('hearthplan-rooms', JSON.stringify(rooms));
  }, [rooms]);
  const updateRoom = (id: number, patch: Partial<Room>) =>
    setRooms(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)));
  const addRoom = (kind: (typeof kinds)[number]) => {
    const id = Math.max(0, ...rooms.map(r => r.id)) + 1;
    const nextX = rooms.length % 2 === 0 ? 0 : 6;
    const nextY = Math.max(0, ...rooms.map(r => r.y + r.h)) + 0.25;
    const room: Room = {
      id,
      ...kind,
      name:
        kind.name === 'Bedroom'
          ? 'Bedroom ' +
            (rooms.filter(r => r.name.startsWith('Bedroom')).length + 1)
          : kind.name,
      x: nextX,
      y: nextY,
      w: kind.w,
      h: kind.h,
    };
    setRooms(prev => [...prev, room]);
    setSelected(id);
    setShowAdd(false);
    setView('2d');
  };
  const reset = () => {
    setRooms(initialRooms);
    setSelected(1);
    setProjectName('My first home');
  };
  const download = async () => {
    const svg = svgRef.current;
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', '1200');
    clone.setAttribute('height', '900');
    const source = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1800;
      canvas.height = 1350;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#fbfaf7';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }
      URL.revokeObjectURL(url);
      const a = document.createElement('a');
      a.download =
        projectName
          .trim()
          .replace(/[^a-z0-9]+/gi, '-')
          .toLowerCase() +
        '-' +
        view +
        '.png';
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'house-plan.svg';
      a.click();
    };
    img.src = url;
  };
  const render2d = () => {
    const scale = 48,
      ox = 100,
      oy = 95;
    return (
      <svg
        ref={svgRef}
        className="plan-svg"
        viewBox="0 0 760 620"
        role="img"
        aria-label="Editable 2D house floor plan"
      >
        <defs>
          <pattern
            id="grid"
            width={scale}
            height={scale}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${scale} 0 L 0 0 0 ${scale}`}
              fill="none"
              stroke="#e7e6e1"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="760" height="620" fill="#fbfaf7" />
        <rect
          x="24"
          y="24"
          width="712"
          height="572"
          rx="10"
          fill="url(#grid)"
        />
        {Array.from({ length: 11 }, (_, i) => (
          <g key={i}>
            <text
              x={ox + i * scale}
              y={oy - 18}
              textAnchor="middle"
              fontSize="10"
              fill="#888b84"
            >
              {i}
            </text>
            <text
              x={ox - 18}
              y={oy + i * scale + 4}
              textAnchor="middle"
              fontSize="10"
              fill="#888b84"
            >
              {i}
            </text>
          </g>
        ))}
        {rooms.map(room => {
          const active = room.id === selected;
          const x = ox + room.x * scale,
            y = oy + room.y * scale,
            w = room.w * scale,
            h = room.h * scale;
          return (
            <g
              key={room.id}
              onClick={() => setSelected(room.id)}
              style={{ cursor: 'pointer' }}
            >
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                fill={room.color}
                stroke={active ? '#315e49' : '#7f8b80'}
                strokeWidth={active ? 4 : 2.5}
              />
              <text
                x={x + w / 2}
                y={y + h / 2 - 4}
                textAnchor="middle"
                fontSize="13"
                fontWeight="600"
                fill="#303d34"
              >
                {room.name}
              </text>
              <text
                x={x + w / 2}
                y={y + h / 2 + 15}
                textAnchor="middle"
                fontSize="11"
                fill="#536157"
              >
                {fmt(room.w)} × {fmt(room.h)} {unitLabels[unit]}
              </text>
              {active && (
                <g>
                  <rect
                    x={x + w - 13}
                    y={y - 7}
                    width="14"
                    height="14"
                    rx="3"
                    fill="#315e49"
                  />
                  <path
                    d={`M ${x + w - 9} ${y} l3 3 l5 -6`}
                    fill="none"
                    stroke="white"
                    strokeWidth="1.5"
                  />
                </g>
              )}
            </g>
          );
        })}
        <g transform="translate(100 565)">
          <path d="M0 0 H96" stroke="#3c4e40" strokeWidth="3" />
          <path
            d="M0 -5 V5 M48 -4 V4 M96 -5 V5"
            stroke="#3c4e40"
            strokeWidth="2"
          />
          <text x="48" y="18" textAnchor="middle" fontSize="11" fill="#536157">
            Scale: 1 grid = 1 {unitLabels[unit]}
          </text>
        </g>
      </svg>
    );
  };
  const render3d = () => {
    const iso = (x: number, y: number, z = 0) => ({
      x: 380 + (x - y) * 34,
      y: 340 + (x + y) * 17 - z * 38,
    });
    const points = (arr: { x: number; y: number }[]) =>
      arr.map(p => `${p.x},${p.y}`).join(' ');
    const maxX = Math.max(10, ...rooms.map(r => r.x + r.w)),
      maxY = Math.max(8, ...rooms.map(r => r.y + r.h));
    return (
      <svg
        ref={svgRef}
        className="plan-svg"
        viewBox="0 0 760 620"
        role="img"
        aria-label="Isometric 3D house view"
      >
        <rect width="760" height="620" fill="#fbfaf7" />
        <ellipse
          cx="380"
          cy="470"
          rx="265"
          ry="80"
          fill="#e9e8df"
          opacity=".6"
        />
        <polygon
          points={points([
            iso(0, 0),
            iso(maxX, 0),
            iso(maxX, maxY),
            iso(0, maxY),
          ])}
          fill="#eeeae0"
          stroke="#c7c6bb"
          strokeWidth="2"
        />
        {rooms.map(room => {
          const a = iso(room.x, room.y),
            b = iso(room.x + room.w, room.y),
            c = iso(room.x + room.w, room.y + room.h),
            d = iso(room.x, room.y + room.h);
          const ah = iso(room.x, room.y, 2.25),
            bh = iso(room.x + room.w, room.y, 2.25),
            ch = iso(room.x + room.w, room.y + room.h, 2.25),
            dh = iso(room.x, room.y + room.h, 2.25);
          const active = room.id === selected;
          return (
            <g
              key={room.id}
              onClick={() => setSelected(room.id)}
              style={{ cursor: 'pointer' }}
            >
              <polygon
                points={points([a, b, c, d])}
                fill={room.color}
                stroke={active ? '#315e49' : '#9aa398'}
                strokeWidth={active ? 3 : 1.5}
              />
              <polygon
                points={points([a, b, bh, ah])}
                fill="#c5cfc4"
                stroke="#9aa398"
                strokeWidth="1"
              />
              <polygon
                points={points([b, c, ch, bh])}
                fill="#aebcaf"
                stroke="#879688"
                strokeWidth="1"
              />
              <polygon
                points={points([c, d, dh, ch])}
                fill="#d1d9ce"
                stroke="#9aa398"
                strokeWidth="1"
              />
              <polygon
                points={points([d, a, ah, dh])}
                fill="#e1e7dc"
                stroke="#9aa398"
                strokeWidth="1"
              />
              <text
                x={(a.x + b.x + c.x + d.x) / 4}
                y={(a.y + b.y + c.y + d.y) / 4 + 4}
                textAnchor="middle"
                fontSize="11"
                fontWeight="600"
                fill="#344339"
              >
                {room.name}
              </text>
            </g>
          );
        })}
        <text x="34" y="42" fontSize="13" fill="#777d73">
          ISOMETRIC CONCEPT VIEW · Select a room to edit
        </text>
      </svg>
    );
  };
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <House size={20} />
          </div>
          <span>
            hearth<span className="brand-light">plan</span>
          </span>
          <span className="beta">STUDIO</span>
        </div>
        <div className="project-name">
          <span>PROJECT</span>
          <input
            aria-label="Project name"
            value={projectName}
            onChange={e => setProjectName(e.target.value)}
          />
        </div>
        <div className="top-actions">
          <label className="theme-select" title="Choose appearance">
            {theme === 'light' ? <Sun size={15} /> : theme === 'dark' ? <Moon size={15} /> : <Monitor size={15} />}
            <select aria-label="Theme" value={theme} onChange={e => setTheme(e.target.value as 'light' | 'dark' | 'system')}>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </label>
          <span className="saved-status">
            <span className="status-dot" />
            {saved ? 'Saved just now' : 'Auto-save on'}
          </span>
          <button
            className="btn btn-quiet"
            onClick={() => {
              localStorage.setItem('hearthplan-rooms', JSON.stringify(rooms));
              setSaved(true);
            }}
          >
            <Save size={16} /> Save
          </button>
          <button className="btn btn-primary" onClick={download}>
            <Download size={16} /> Export plan
          </button>
          <button
            className="mobile-menu"
            onClick={() => setMobilePanel(!mobilePanel)}
            aria-label="Toggle room panel"
          >
            <Menu size={20} />
          </button>
        </div>
      </header>
      <div className="workspace">
        <aside className={'sidebar ' + (mobilePanel ? 'sidebar-open' : '')}>
          <div className="side-heading">
            <div>
              <span className="eyebrow">YOUR PROJECT</span>
              <h2>Design workspace</h2>
            </div>
            <span className="live-pill">
              <span />
              LIVE
            </span>
          </div>
          <div className="side-section">
            <div className="section-title">
              FLOOR PLAN <span>{rooms.length} rooms</span>
            </div>
            <div className="room-list">
              {rooms.map(room => (
                <button
                  key={room.id}
                  className={
                    'room-row ' + (room.id === selected ? 'room-selected' : '')
                  }
                  onClick={() => {
                    setSelected(room.id);
                    setMobilePanel(false);
                  }}
                >
                  <span
                    className="room-icon"
                    style={{ background: room.color }}
                  >
                    {iconFor(room.icon, 17)}
                  </span>
                  <span className="room-meta">
                    <strong>{room.name}</strong>
                    <small>
                      {fmt(room.w)} × {fmt(room.h)} {unitLabels[unit]}
                    </small>
                  </span>
                  <span className="room-area">
                    {fmt(room.w * room.h)}
                    <small>{areaLabel}</small>
                  </span>
                </button>
              ))}
            </div>
            <button className="add-room" onClick={() => setShowAdd(!showAdd)}>
              <Plus size={17} /> Add a room{' '}
              <ChevronDown size={15} className={showAdd ? 'chevron-up' : ''} />
            </button>
            {showAdd && (
              <div className="add-room-menu">
                {kinds.map(k => (
                  <button key={k.name} onClick={() => addRoom(k)}>
                    <span
                      className="kind-dot"
                      style={{ background: k.color }}
                    />
                    <span>{k.name}</span>
                    <small>
                      {k.w} × {k.h} m
                    </small>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="side-section selected-panel">
            <div className="section-title">ROOM SETTINGS</div>
            {selectedRoom ? (
              <>
                <label className="field-label">
                  Room name
                  <input
                    value={selectedRoom.name}
                    onChange={e =>
                      updateRoom(selectedRoom.id, { name: e.target.value })
                    }
                  />
                </label>
                <div className="dimension-grid">
                  <label className="field-label">
                    Width ({unitLabels[unit]})
                    <input
                      type="number"
                      min="1"
                      max="20"
                      step=".5"
                      value={selectedRoom.w}
                      onChange={e =>
                        updateRoom(selectedRoom.id, {
                          w: Math.max(
                            1,
                            Math.min(20, Number(e.target.value) || 1)
                          ),
                        })
                      }
                    />
                  </label>
                  <label className="field-label">
                    Length ({unitLabels[unit]})
                    <input
                      type="number"
                      min="1"
                      max="20"
                      step=".5"
                      value={selectedRoom.h}
                      onChange={e =>
                        updateRoom(selectedRoom.id, {
                          h: Math.max(
                            1,
                            Math.min(20, Number(e.target.value) || 1)
                          ),
                        })
                      }
                    />
                  </label>
                </div>
                <label className="field-label">
                  Floor colour
                  <div className="color-options">
                    {palette.slice(0, 8).map(c => (
                      <button
                        key={c}
                        aria-label={'Set room color ' + c}
                        className={
                          'color-swatch ' +
                          (selectedRoom.color === c ? 'color-active' : '')
                        }
                        style={{ background: c }}
                        onClick={() =>
                          updateRoom(selectedRoom.id, { color: c })
                        }
                      >
                        {selectedRoom.color === c && <Check size={13} />}
                      </button>
                    ))}
                  </div>
                </label>
                <div className="room-stat">
                  <span>
                    <Ruler size={15} /> Room area
                  </span>
                  <strong>
                    {fmt(selectedRoom.w * selectedRoom.h)} {areaLabel}
                  </strong>
                </div>
                <div className="room-tools">
                  <button
                    onClick={() =>
                      updateRoom(selectedRoom.id, {
                        w: selectedRoom.h,
                        h: selectedRoom.w,
                      })
                    }
                  >
                    <RotateCcw size={15} /> Rotate dimensions
                  </button>
                  <button
                    className="delete-room"
                    onClick={() => {
                      setRooms(prev =>
                        prev.filter(r => r.id !== selectedRoom.id)
                      );
                      setSelected(
                        rooms.find(r => r.id !== selectedRoom.id)?.id ?? null
                      );
                    }}
                  >
                    <Trash2 size={15} /> Remove room
                  </button>
                </div>
              </>
            ) : (
              <p className="empty-selection">
                Choose a room from the plan or add a new one.
              </p>
            )}
          </div>
          <div className="side-footer">
            <div className="tip-icon">
              <Sun size={17} />
            </div>
            <div>
              <strong>A little planning goes a long way</strong>
              <p>
                Use this as a concept plan. Have a qualified local architect
                verify structural and building-code requirements.
              </p>
            </div>
          </div>
        </aside>
        <main className="main-area">
          <div className="canvas-top">
            <div>
              <div className="breadcrumb">
                Projects <span>/</span> {projectName || 'Untitled project'}{' '}
                <span>/</span> <b>Floor plan</b>
              </div>
              <h1>
                Shape your space<span>.</span>
              </h1>
              <p>Plan room by room. See your ideas take shape.</p>
            </div>
            <div className="view-switch">
              <button
                className={view === '2d' ? 'view-active' : ''}
                onClick={() => setView('2d')}
              >
                <Grid2X2 size={16} /> 2D plan
              </button>
              <button
                className={view === '3d' ? 'view-active' : ''}
                onClick={() => setView('3d')}
              >
                <Box size={16} /> 3D view <span className="new-tag">NEW</span>
              </button>
            </div>
          </div>
          <div className="canvas-card">
            <div className="canvas-toolbar">
              <div className="canvas-label">
                <span className="canvas-indicator" />
                {view === '2d'
                  ? 'FLOOR PLAN · TOP VIEW'
                  : 'SPATIAL VIEW · ISOMETRIC'}
                <span className="toolbar-divider" />
                <Layers size={15} />
                {rooms.length} spaces
              </div>
              <div className="toolbar-actions">
                <label className="unit-select">
                  <Ruler size={14} />
                  <select
                    value={unit}
                    onChange={e => setUnit(e.target.value as typeof unit)}
                    aria-label="Measurement units"
                  >
                    <option value="m">Meters (m)</option>
                    <option value="cm">Centimeters (cm)</option>
                    <option value="mm">Millimeters (mm)</option>
                    <option value="km">Kilometers (km)</option>
                    <option value="ft">Feet (ft)</option>
                    <option value="in">Inches (in)</option>
                    <option value="yd">Yards (yd)</option>
                  </select>
                </label>
                <button
                  className="icon-button"
                  onClick={reset}
                  title="Reset plan"
                >
                  <RotateCcw size={16} />
                </button>
                <button
                  className="icon-button"
                  onClick={download}
                  title="Download as PNG"
                >
                  <Download size={16} />
                </button>
              </div>
            </div>
            <div className="canvas-stage">
              {view === '2d' ? render2d() : render3d()}
            </div>
            <div className="canvas-legend">
              <span>
                <i className="legend-room" /> Room area
              </span>
              <span>
                <i className="legend-selected" /> Selected room
              </span>
              <span>
                <Move size={13} /> Tap a room to select
              </span>
            </div>
          </div>
          <div className="summary-row">
            <div className="summary-card">
              <span className="summary-icon">
                <House size={18} />
              </span>
              <div>
                <small>PLANNED AREA</small>
                <strong>
                  {fmt(totalArea)} <em>{areaLabel}</em>
                </strong>
                <p>Combined room area</p>
              </div>
            </div>
            <div className="summary-card">
              <span className="summary-icon">
                <Grid2X2 size={18} />
              </span>
              <div>
                <small>SPACES</small>
                <strong>
                  {rooms.length}
                  <em> rooms</em>
                </strong>
                <p>Your current layout</p>
              </div>
            </div>
            <div className="summary-card">
              <span className="summary-icon">
                <Box size={18} />
              </span>
              <div>
                <small>VIEW MODE</small>
                <strong>{view === '2d' ? '2D plan' : '3D view'}</strong>
                <p>
                  {view === '2d'
                    ? 'Precise top-down layout'
                    : 'Isometric spatial concept'}
                </p>
              </div>
            </div>
          </div>
          <div className="bottom-note">
            <span className="note-check">
              <Check size={14} />
            </span>
            <span>Your changes are saved in this browser automatically.</span>
            <button onClick={download}>
              Download your plan <Download size={14} />
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
export default App;
