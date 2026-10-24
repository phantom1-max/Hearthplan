import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { ArrowLeft, ArrowRight, BedDouble, Box, Check, ChevronDown, CircleHelp, Copy, Download, DoorOpen, FilePlus2, FolderOpen, Grid2X2, House, Layers, Minus, Plus, Printer, RotateCcw, RotateCw, Search, Sofa, Trash2, Upload, X, ZoomIn, ZoomOut } from 'lucide-react';

type Room = { id: string; name: string; x: number; y: number; w: number; h: number; color: string; floor: number };
type Furniture = { id: string; name: string; category: string; x: number; y: number; w: number; h: number; rotation: number; floor: number; color: string };
type Floor = { id: number; name: string; width: number; height: number };
type Project = { id: string; name: string; unit: 'm' | 'ft'; floors: Floor[]; rooms: Room[]; furniture: Furniture[]; createdAt: number };
type Template = { id: string; name: string; description: string; project: Project; username: string };
type DragState = { type: 'room' | 'furniture' | 'resize-room' | 'resize-furniture' | 'resize-floor'; id: string; handle?: string; startX: number; startY: number; originalX: number; originalY: number; originalW: number; originalH: number };

const palette = ['#e6eee5', '#f3ead7', '#e2eaf4', '#eee5f3', '#dceff0', '#f4e2dc', '#e8ebd8'];
const roomTypes = [
  { name: 'Living room', w: 5, h: 4, color: palette[0] },
  { name: 'Bedroom', w: 4, h: 3.5, color: palette[2] },
  { name: 'Kitchen', w: 3.5, h: 3, color: palette[1] },
  { name: 'Bathroom', w: 2, h: 2.5, color: palette[4] },
  { name: 'Dining room', w: 3.5, h: 3, color: palette[5] },
  { name: 'Study', w: 3, h: 2.5, color: palette[3] },
  { name: 'Custom room', w: 3, h: 3, color: palette[6] },
];
const furnitureCatalog = [
  { name: 'Single bed', category: 'Beds', w: 1, h: 2, color: '#a7b7ce' },
  { name: 'Double bed', category: 'Beds', w: 1.8, h: 2, color: '#a7b7ce' },
  { name: 'Sofa', category: 'Seating', w: 2, h: 0.9, color: '#bda08a' },
  { name: 'Armchair', category: 'Seating', w: 0.9, h: 0.9, color: '#bda08a' },
  { name: 'Dining table', category: 'Tables', w: 1.6, h: 0.9, color: '#b99b76' },
  { name: 'Study desk', category: 'Tables', w: 1.2, h: 0.6, color: '#b99b76' },
  { name: 'Wardrobe', category: 'Storage', w: 1.5, h: 0.6, color: '#9e8978' },
  { name: 'Kitchen counter', category: 'Kitchen', w: 1.8, h: 0.6, color: '#9ba99a' },
  { name: 'Toilet', category: 'Bathroom', w: 0.45, h: 0.65, color: '#b8d8d8' },
  { name: 'Sink', category: 'Bathroom', w: 0.6, h: 0.5, color: '#b8d8d8' },
  { name: 'Plant', category: 'Decor', w: 0.5, h: 0.5, color: '#8da88b' },
];
const makeId = () => Math.random().toString(36).slice(2, 10);
const emptyProject = (name: string, width: number, height: number, count: number, unit: 'm' | 'ft'): Project => ({
  id: makeId(), name, unit,
  floors: Array.from({ length: count }, (_, i) => ({ id: i, name: ['Ground Floor', 'First Floor', 'Second Floor', 'Third Floor'][i] || `Floor ${i + 1}`, width, height })),
  rooms: [], furniture: [], createdAt: Date.now(),
});

function App() {
  const [screen, setScreen] = useState<'start' | 'setup' | 'community' | 'editor'>('start');
  const [project, setProject] = useState<Project | null>(null);
  const [floorId, setFloorId] = useState(0);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [selectedFurniture, setSelectedFurniture] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialog, setDialog] = useState<'room' | 'furniture' | 'custom' | 'export' | 'publish' | null>(null);
  const [search, setSearch] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [roomType, setRoomType] = useState(roomTypes[0].name);
  const [projectName, setProjectName] = useState('My home');
  const [plotWidth, setPlotWidth] = useState('10');
  const [plotHeight, setPlotHeight] = useState('10');
  const [floorCount, setFloorCount] = useState('1');
  const [unit, setUnit] = useState<'m' | 'ft'>('m');
  const [zoom, setZoom] = useState(1);
  const [saved, setSaved] = useState(false);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [publishName, setPublishName] = useState('');
  const [username, setUsername] = useState('');
  const [snap, setSnap] = useState(true);
  const svgRef = useRef<SVGSVGElement>(null);
  const scale = 42;

  useEffect(() => {
    try {
      const raw = localStorage.getItem('hearthplan-projects-v2');
      if (raw) {
        const items = JSON.parse(raw) as Project[];
        if (items[0]) setSaved(true);
      }
      const rawTemplates = localStorage.getItem('hearthplan-community-local');
      if (rawTemplates) setTemplates(JSON.parse(rawTemplates) as Template[]);
    } catch { /* ignore corrupt local drafts */ }
  }, []);

  useEffect(() => {
    if (!project) return;
    try {
      const existing = JSON.parse(localStorage.getItem('hearthplan-projects-v2') || '[]') as Project[];
      const next = [project, ...existing.filter(p => p.id !== project.id)].slice(0, 30);
      localStorage.setItem('hearthplan-projects-v2', JSON.stringify(next));
      setSaved(true);
    } catch { setSaved(false); }
  }, [project]);

  const activeFloor = project?.floors.find(f => f.id === floorId) || project?.floors[0];
  const rooms = project?.rooms.filter(r => r.floor === floorId) || [];
  const furniture = project?.furniture.filter(f => f.floor === floorId) || [];
  const room = project?.rooms.find(r => r.id === selectedRoom) || null;
  const item = project?.furniture.find(f => f.id === selectedFurniture) || null;
  const totalArea = useMemo(() => project?.floors.reduce((sum, f) => sum + project.rooms.filter(r => r.floor === f.id).reduce((s, r) => s + r.w * r.h, 0), 0) || 0, [project]);
  const updateProject = (fn: (p: Project) => Project) => setProject(p => p ? fn(p) : p);
  const updateRoom = (id: string, patch: Partial<Room>) => updateProject(p => ({ ...p, rooms: p.rooms.map(r => r.id === id ? { ...r, ...patch } : r) }));
  const updateFurniture = (id: string, patch: Partial<Furniture>) => updateProject(p => ({ ...p, furniture: p.furniture.map(f => f.id === id ? { ...f, ...patch } : f) }));

  const startBlank = () => setScreen('setup');
  const createProject = () => {
    const w = Number(plotWidth), h = Number(plotHeight), count = Number(floorCount);
    if (!projectName.trim() || !Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0 || !Number.isInteger(count) || count < 1 || count > 4) {
      alert('Enter a project name, positive plot dimensions, and between 1 and 4 floors.');
      return;
    }
    setProject(emptyProject(projectName.trim(), w, h, count, unit));
    setFloorId(0); setSelectedRoom(null); setSelectedFurniture(null); setZoom(1); setScreen('editor');
  };
  const openProject = (p: Project) => { setProject(JSON.parse(JSON.stringify(p)) as Project); setFloorId(0); setScreen('editor'); setSelectedRoom(null); setSelectedFurniture(null); };
  const addFloor = () => {
    if (!project || project.floors.length >= 4) return;
    const id = Math.max(-1, ...project.floors.map(f => f.id)) + 1;
    const previous = activeFloor || { width: 10, height: 10 };
    updateProject(p => ({ ...p, floors: [...p.floors, { id, name: ['Ground Floor', 'First Floor', 'Second Floor', 'Third Floor'][p.floors.length] || `Floor ${p.floors.length + 1}`, width: previous.width, height: previous.height }] }));
    setFloorId(id); setSelectedRoom(null); setSelectedFurniture(null); setMenuOpen(false);
  };
  const addRoom = () => {
    if (!project) return;
    const def = roomTypes.find(t => t.name === roomType) || roomTypes[0];
    const id = makeId();
    const newRoom: Room = { id, name: def.name === 'Bedroom' ? `Bedroom ${project.rooms.filter(r => r.name.startsWith('Bedroom')).length + 1}` : def.name, x: 0.3, y: 0.3, w: Math.min(def.w, (activeFloor?.width || 10) - 0.6), h: Math.min(def.h, (activeFloor?.height || 10) - 0.6), color: def.color, floor: floorId };
    updateProject(p => ({ ...p, rooms: [...p.rooms, newRoom] }));
    setSelectedRoom(id); setSelectedFurniture(null); setDialog(null); setMenuOpen(false);
  };
  const addFurniture = (definition: typeof furnitureCatalog[number], name = definition.name, w = definition.w, h = definition.h) => {
    if (!project) return;
    const id = makeId();
    const f: Furniture = { id, name, category: definition.category, x: 0.5, y: 0.5, w, h, rotation: 0, floor: floorId, color: definition.color };
    updateProject(p => ({ ...p, furniture: [...p.furniture, f] }));
    setSelectedFurniture(id); setSelectedRoom(null); setDialog(null); setMenuOpen(false); setSearch('');
  };
  const deleteSelected = () => {
    if (!project) return;
    updateProject(p => ({ ...p, rooms: p.rooms.filter(r => r.id !== selectedRoom), furniture: p.furniture.filter(f => f.id !== selectedFurniture) }));
    setSelectedRoom(null); setSelectedFurniture(null);
  };
  const duplicateSelected = () => {
    if (room) { const copy = { ...room, id: makeId(), name: room.name + ' copy', x: room.x + 0.3, y: room.y + 0.3 }; updateProject(p => ({ ...p, rooms: [...p.rooms, copy] })); setSelectedRoom(copy.id); }
    else if (item) { const copy = { ...item, id: makeId(), name: item.name + ' copy', x: item.x + 0.3, y: item.y + 0.3 }; updateProject(p => ({ ...p, furniture: [...p.furniture, copy] })); setSelectedFurniture(copy.id); }
  };
  const pointerToWorld = (e: ReactPointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    return { x: (p.x - 45) / scale, y: (p.y - 45) / scale };
  };
  const beginDrag = (e: ReactPointerEvent<SVGElement>, type: DragState['type'], id: string, x: number, y: number, w: number, h: number, handle?: string) => {
    e.stopPropagation();
    const p = pointerToWorld(e as ReactPointerEvent<SVGSVGElement>);
    setDrag({ type, id, handle, startX: p.x, startY: p.y, originalX: x, originalY: y, originalW: w, originalH: h });
    if (type === 'resize-floor') { setSelectedRoom(null); setSelectedFurniture(null); } else if (type.includes('room')) { setSelectedRoom(id); setSelectedFurniture(null); } else { setSelectedFurniture(id); setSelectedRoom(null); }
    try { (e.target as Element).setPointerCapture(e.pointerId); } catch { /* optional */ }
  };
  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!drag || !project) return;
    const p = pointerToWorld(e);
    const dx = p.x - drag.startX, dy = p.y - drag.startY;
    const round = (n: number) => snap ? Math.round(n * 4) / 4 : Math.round(n * 100) / 100;
    if (drag.type === 'room') updateRoom(drag.id, { x: Math.max(0, round(drag.originalX + dx)), y: Math.max(0, round(drag.originalY + dy)) });
    else if (drag.type === 'furniture') updateFurniture(drag.id, { x: Math.max(0, round(drag.originalX + dx)), y: Math.max(0, round(drag.originalY + dy)) });
    else if (drag.type === 'resize-floor') {
      const width = Math.max(2, round(drag.originalW + (drag.handle?.includes('e') ? dx : 0)));
      const height = Math.max(2, round(drag.originalH + (drag.handle?.includes('s') ? dy : 0)));
      updateProject(p => ({ ...p, floors: p.floors.map(f => f.id === Number(drag.id) ? { ...f, width, height } : f) }));
    } else {
      const patch = { x: drag.originalX, y: drag.originalY, w: drag.originalW, h: drag.originalH };
      if (drag.handle?.includes('e')) patch.w = Math.max(0.25, round(drag.originalW + dx));
      if (drag.handle?.includes('s')) patch.h = Math.max(0.25, round(drag.originalH + dy));
      if (drag.handle?.includes('w')) { patch.w = Math.max(0.25, round(drag.originalW - dx)); patch.x = Math.max(0, round(drag.originalX + dx)); }
      if (drag.handle?.includes('n')) { patch.h = Math.max(0.25, round(drag.originalH - dy)); patch.y = Math.max(0, round(drag.originalY + dy)); }
      if (drag.type === 'resize-room') updateRoom(drag.id, patch);
      else updateFurniture(drag.id, patch);
    }
  };
  const exportProject = () => {
    if (!project) return;
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = project.name.replace(/[^a-z0-9-_]/gi, '-') + '.hearthplan.json'; a.click(); URL.revokeObjectURL(a.href);
  };
  const printPlan = () => window.print();
  const publishLocal = () => {
    if (!project || !publishName.trim() || !username.trim()) return;
    const entry: Template = { id: makeId(), name: publishName.trim(), description: `${project.floors.length} floor(s) · ${project.floors[0].width} × ${project.floors[0].height} ${project.unit}`, project: { ...project, name: publishName.trim() }, username: username.trim().replace(/^@/, '') };
    const next = [entry, ...templates];
    setTemplates(next);
    localStorage.setItem('hearthplan-community-local', JSON.stringify(next));
    setDialog(null); setScreen('community');
  };
  const visibleFurniture = furnitureCatalog.filter(f => (f.name + ' ' + f.category).toLowerCase().includes(search.toLowerCase()));

  if (screen === 'start') return <div className="start-page"><header className="landing-nav"><div className="brand"><span className="brand-icon"><House size={19}/></span>hearth<span>plan</span></div><span className="local-label">HOME DESIGN STUDIO</span></header><main className="landing-content"><div className="eyebrow">A SPACE TO MAKE YOURS</div><h1>Design your home,<br/><em>your way.</em></h1><p className="landing-copy">Start with an empty space or explore a house plan made by the community.</p><div className="start-choices"><button className="choice" onClick={startBlank}><span className="choice-icon"><FilePlus2 size={22}/></span><span><strong>Blank project</strong><small>Start from your own plot dimensions</small></span><ArrowRight size={18}/></button><button className="choice" onClick={() => setScreen('community')}><span className="choice-icon muted"><Grid2X2 size={22}/></span><span><strong>Community templates</strong><small>Explore and reuse shared layouts</small></span><ArrowRight size={18}/></button></div><div className="landing-foot"><span><Check size={14}/> Empty canvas by default</span><span><Check size={14}/> Your dimensions, your plan</span></div></main><footer className="site-footer">HEARTHPLAN <span>·</span> CONCEPTUAL HOME PLANNING</footer></div>;

  if (screen === 'setup') return <div className="setup-page"><header className="landing-nav"><button className="back-button" onClick={() => setScreen('start')}><ArrowLeft size={17}/> Back</button><div className="brand"><span className="brand-icon"><House size={19}/></span>hearth<span>plan</span></div><span className="local-label">NEW PROJECT</span></header><main className="setup-card"><div className="eyebrow">01 / PROJECT DETAILS</div><h1>Let's set your space.</h1><p>Start with the available plot. You can design each floor separately next.</p><label>Project name<input value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="e.g. Family home"/></label><div className="field-grid"><label>Plot length<input type="number" min="1" step="0.5" value={plotWidth} onChange={e => setPlotWidth(e.target.value)}/></label><label>Plot breadth<input type="number" min="1" step="0.5" value={plotHeight} onChange={e => setPlotHeight(e.target.value)}/></label></div><div className="field-grid"><label>Measurement unit<select value={unit} onChange={e => setUnit(e.target.value as 'm'|'ft')}><option value="m">Metres (m)</option><option value="ft">Feet (ft)</option></select></label><label>Number of floors<select value={floorCount} onChange={e => setFloorCount(e.target.value)}><option value="1">1 floor</option><option value="2">2 floors</option><option value="3">3 floors</option><option value="4">4 floors</option></select></label></div><div className="setup-boundary"><div className="boundary-sketch"><div className="boundary-label top">{plotWidth || '—'} {unit}</div><div className="boundary-label side">{plotHeight || '—'} {unit}</div><div className="boundary-box"><span>EMPTY PLOT</span></div></div><p>This defines your starting boundary only. No rooms or furniture will be added automatically.</p></div><button className="primary-button full" onClick={createProject}>Create empty project <ArrowRight size={17}/></button></main></div>;

  if (screen === 'community') return <div className="community-page"><header className="editor-header"><button className="back-button" onClick={() => setScreen(project ? 'editor' : 'start')}><ArrowLeft size={17}/> Back</button><div className="brand"><span className="brand-icon"><House size={18}/></span>hearth<span>plan</span><small>COMMUNITY</small></div><button className="primary-button" onClick={() => { if (project) { setPublishName(project.name); setDialog('publish'); } else setScreen('setup'); }}> <Plus size={16}/> Add your template</button></header><main className="community-main"><div className="eyebrow">COMMUNITY CENTRE</div><h1>Plans worth building on.</h1><p>Explore a plan, then make your own independent copy.</p><div className="local-warning"><CircleHelp size={16}/> Community templates are currently saved in this browser only. Shared cloud publishing needs a backend connection.</div>{templates.length === 0 ? <div className="community-empty"><div className="empty-icon"><Layers size={24}/></div><h2>No community templates yet</h2><p>Design a plan and add it here to start your local collection.</p><button className="primary-button" onClick={() => setScreen(project ? 'editor' : 'setup')}>Create a plan <ArrowRight size={16}/></button></div> : <div className="template-grid">{templates.map(t => <article className="template-card" key={t.id}><div className="template-preview"><div className="preview-plot">{t.project.rooms.slice(0,8).map(r => <div key={r.id} style={{left: (r.x / t.project.floors[0].width)*100+'%', top:(r.y / t.project.floors[0].height)*100+'%', width:(r.w / t.project.floors[0].width)*100+'%', height:(r.h / t.project.floors[0].height)*100+'%', background:r.color}}/>)}</div></div><div className="template-info"><h3>{t.name}</h3><p>{t.description}</p><small>by @{t.username}</small><button className="secondary-button" onClick={() => openProject({ ...JSON.parse(JSON.stringify(t.project)), id: makeId(), name: t.name + ' copy' })}>Use this template <ArrowRight size={15}/></button></div></article>)}</div>}</main></div>;

  if (!project || !activeFloor) return null;

  const viewW = Math.max(920, activeFloor.width * scale + 100);
  const viewH = Math.max(620, activeFloor.height * scale + 100);
  const handles = [{ key:'nw', x:0, y:0, cursor:'nwse-resize' }, { key:'n', x:0.5, y:0, cursor:'ns-resize' }, { key:'ne', x:1, y:0, cursor:'nesw-resize' }, { key:'e', x:1, y:0.5, cursor:'ew-resize' }, { key:'se', x:1, y:1, cursor:'nwse-resize' }, { key:'s', x:0.5, y:1, cursor:'ns-resize' }, { key:'sw', x:0, y:1, cursor:'nesw-resize' }, { key:'w', x:0, y:0.5, cursor:'ew-resize' }];

  return <div className="editor-app">
    <header className="editor-header"><div className="brand"><span className="brand-icon"><House size={18}/></span>hearth<span>plan</span></div><div className="header-project"><label>PROJECT</label><input value={project.name} onChange={e => updateProject(p => ({ ...p, name: e.target.value }))}/><span className={saved ? 'save-state' : 'save-state saving'}><i/> {saved ? 'Saved locally' : 'Saving…'}</span></div><div className="header-actions"><button className="icon-action" title="Download project file" onClick={exportProject}><Download size={17}/></button><button className="secondary-button header-export" onClick={() => setDialog('export')}>Export <ChevronDown size={15}/></button></div></header>
    <div className="floor-tabbar">{project.floors.map(f => <button key={f.id} className={floorId === f.id ? 'floor-tab active' : 'floor-tab'} onDoubleClick={() => { const name = prompt('Rename floor', f.name); if (name?.trim()) updateProject(p => ({ ...p, floors: p.floors.map(current => current.id === f.id ? { ...current, name: name.trim() } : current) })); }} onClick={() => { setFloorId(f.id); setSelectedRoom(null); setSelectedFurniture(null); }}>{f.name}<span>{project.rooms.filter(r => r.floor === f.id).length}</span></button>)}<button className="add-floor-tab" disabled={project.floors.length >= 4} onClick={addFloor}><Plus size={16}/></button><div className="floor-tab-spacer"/><span className="unit-label">{project.unit === 'm' ? 'METRES' : 'FEET'}</span></div>
    <main className="editor-workspace"><section className="canvas-column"><div className="canvas-heading"><div><div className="eyebrow">FLOOR PLANNER / {activeFloor.name.toUpperCase()}</div><h1>Make room for life.</h1><p>Drag rooms to arrange them. Select a room to resize it or enter exact dimensions.</p></div><div className="zoom-bar"><button title="Zoom out" onClick={() => setZoom(z => Math.max(.5, Number((z - .1).toFixed(1))))} disabled={zoom <= .5}><ZoomOut size={16}/></button><button className="zoom-number" onClick={() => setZoom(1)}>{Math.round(zoom * 100)}%</button><button title="Zoom in" onClick={() => setZoom(z => Math.min(2.5, Number((z + .1).toFixed(1))))} disabled={zoom >= 2.5}><ZoomIn size={16}/></button></div></div>
      <div className="canvas-shell"><svg ref={svgRef} viewBox={`0 0 ${viewW} ${viewH}`} style={{ width: '100%', maxHeight: '70vh', transform: `scale(${zoom})`, transformOrigin:'top left' }} onPointerMove={onPointerMove} onPointerUp={() => setDrag(null)} onPointerCancel={() => setDrag(null)} onPointerLeave={() => setDrag(null)} onPointerDown={e => { if (e.target === svgRef.current) { setSelectedRoom(null); setSelectedFurniture(null); } }} aria-label="Interactive house floor plan">
        <defs><pattern id="planner-grid" width={scale/2} height={scale/2} patternUnits="userSpaceOnUse"><path d={`M ${scale/2} 0 L 0 0 0 ${scale/2}`} fill="none" stroke="#dfe5dc" strokeWidth="1"/></pattern></defs>
        <rect width={viewW} height={viewH} fill="#fbfcf9"/><rect x="0" y="0" width={viewW} height={viewH} fill="url(#planner-grid)"/>
        <rect x="45" y="45" width={activeFloor.width*scale} height={activeFloor.height*scale} fill="#fff" stroke="#586b59" strokeWidth="3"/>
        <text x="45" y="28" fontSize="12" fill="#627164">{activeFloor.width} × {activeFloor.height} {project.unit} plot boundary</text>
        {rooms.map(r => <g key={r.id} transform={`translate(${45+r.x*scale},${45+r.y*scale})`} onPointerDown={e => beginDrag(e,'room',r.id,r.x,r.y,r.w,r.h)} style={{ cursor:'move' }}><rect width={r.w*scale} height={r.h*scale} fill={r.color} stroke={selectedRoom === r.id ? '#315d43' : '#839184'} strokeWidth={selectedRoom === r.id ? 3 : 1.5}/><text x={r.w*scale/2} y={r.h*scale/2-4} textAnchor="middle" fontSize="13" fill="#34463a" pointerEvents="none">{r.name}</text><text x={r.w*scale/2} y={r.h*scale/2+14} textAnchor="middle" fontSize="10" fill="#536456" pointerEvents="none">{r.w.toFixed(2).replace(/0+$/,'').replace(/\.$/,'')} × {r.h.toFixed(2).replace(/0+$/,'').replace(/\.$/,'')} {project.unit}</text></g>)}
        {furniture.map(f => <g key={f.id} transform={`translate(${45+f.x*scale},${45+f.y*scale}) rotate(${f.rotation},${f.w*scale/2},${f.h*scale/2})`} onPointerDown={e => beginDrag(e,'furniture',f.id,f.x,f.y,f.w,f.h)} style={{cursor:'move'}}><rect width={f.w*scale} height={f.h*scale} rx="4" fill={f.color} stroke={selectedFurniture === f.id ? '#315d43' : '#fff'} strokeWidth={selectedFurniture === f.id ? 3 : 1.5}/><text x={f.w*scale/2} y={f.h*scale/2+4} textAnchor="middle" fontSize="10" fill="#334237" pointerEvents="none">{f.name}</text></g>)}
        {(room || item) && handles.map(h => { const selected = room || item!; const x = 45 + selected.x*scale + selected.w*scale*h.x; const y = 45 + selected.y*scale + selected.h*scale*h.y; return <rect key={h.key} x={x-5} y={y-5} width="10" height="10" rx="1" fill="#fff" stroke="#315d43" strokeWidth="2" style={{cursor:h.cursor}} onPointerDown={e => beginDrag(e,room?'resize-room':'resize-furniture',selected.id,selected.x,selected.y,selected.w,selected.h,h.key)}/>; })}
        {!room && !item && [{key:'e',x:activeFloor.width,y:activeFloor.height/2,cursor:'ew-resize'},{key:'s',x:activeFloor.width/2,y:activeFloor.height,cursor:'ns-resize'},{key:'se',x:activeFloor.width,y:activeFloor.height,cursor:'nwse-resize'}].map(h => <rect key={'floor-'+h.key} x={45+h.x*scale-6} y={45+h.y*scale-6} width="12" height="12" rx="2" fill="#315d43" stroke="#fff" strokeWidth="2" style={{cursor:h.cursor}} onPointerDown={e => beginDrag(e,'resize-floor',String(floorId),0,0,activeFloor.width,activeFloor.height,h.key)}/>)}
      </svg></div>
      <div className="canvas-footer"><span><span className="legend-dot"/> Plot boundary</span><span><Grid2X2 size={14}/> Grid snapping {snap ? 'on' : 'off'}</span><label><input type="checkbox" checked={snap} onChange={e => setSnap(e.target.checked)}/> Snap to grid</label><span className="autosave-note"><Check size={14}/> {saved ? 'Draft saved on this device' : 'Saving draft'}</span></div>
      <div className="below-canvas"><div><strong>{rooms.length} rooms</strong><span>{furniture.length} furniture items · {rooms.reduce((s,r)=>s+r.w*r.h,0).toFixed(1)} {project.unit}² room area</span></div><button className="text-button" onClick={() => setScreen('community')}><Grid2X2 size={15}/> Community centre</button></div>
    </section>
    <aside className="inspector-panel"><div className="inspector-title"><div><div className="eyebrow">DESIGN TOOLS</div><h2>{room ? 'Room details' : item ? 'Furniture details' : 'Add to your plan'}</h2></div>{(room || item) && <button className="icon-action" title="Delete selected" onClick={deleteSelected}><Trash2 size={16}/></button>}</div>
      {room ? <div className="property-fields"><label>Room name<input value={room.name} onChange={e => updateRoom(room.id,{name:e.target.value})}/></label><div className="field-grid"><label>Length ({project.unit})<input type="number" min=".25" step=".25" value={room.w} onChange={e => updateRoom(room.id,{w:Math.max(.25,Number(e.target.value))})}/></label><label>Breadth ({project.unit})<input type="number" min=".25" step=".25" value={room.h} onChange={e => updateRoom(room.id,{h:Math.max(.25,Number(e.target.value))})}/></label></div><div className="field-grid"><label>Left position<input type="number" min="0" step=".25" value={room.x} onChange={e => updateRoom(room.id,{x:Math.max(0,Number(e.target.value))})}/></label><label>Top position<input type="number" min="0" step=".25" value={room.y} onChange={e => updateRoom(room.id,{y:Math.max(0,Number(e.target.value))})}/></label></div><div className="property-summary"><span>Room area</span><strong>{(room.w*room.h).toFixed(2)} {project.unit}²</strong></div><button className="secondary-button full" onClick={() => updateRoom(room.id,{w:room.h,h:room.w})}><RotateCw size={15}/> Rotate dimensions</button><button className="text-button danger" onClick={deleteSelected}><Trash2 size={15}/> Delete room</button></div> : item ? <div className="property-fields"><label>Furniture name<input value={item.name} onChange={e => updateFurniture(item.id,{name:e.target.value})}/></label><div className="field-grid"><label>Length ({project.unit})<input type="number" min=".1" step=".1" value={item.w} onChange={e => updateFurniture(item.id,{w:Math.max(.1,Number(e.target.value))})}/></label><label>Breadth ({project.unit})<input type="number" min=".1" step=".1" value={item.h} onChange={e => updateFurniture(item.id,{h:Math.max(.1,Number(e.target.value))})}/></label></div><button className="secondary-button full" onClick={() => updateFurniture(item.id,{rotation:(item.rotation+90)%360})}><RotateCw size={15}/> Rotate 90°</button><button className="secondary-button full" onClick={duplicateSelected}><Copy size={15}/> Duplicate furniture</button><button className="text-button danger" onClick={deleteSelected}><Trash2 size={15}/> Delete furniture</button></div> : <div className="empty-tools"><div className="empty-tool-icon"><Layers size={22}/></div><h3>Floor boundary</h3><p>Drag the green handles on the right or bottom edge to resize this floor. You can also enter exact dimensions.</p><div className="floor-size-fields"><label>Floor length ({project.unit})<input type="number" min="2" step="0.25" value={activeFloor.width} onChange={e => updateProject(p => ({ ...p, floors: p.floors.map(f => f.id === floorId ? { ...f, width: Math.max(2, Number(e.target.value)) } : f) }))}/></label><label>Floor breadth ({project.unit})<input type="number" min="2" step="0.25" value={activeFloor.height} onChange={e => updateProject(p => ({ ...p, floors: p.floors.map(f => f.id === floorId ? { ...f, height: Math.max(2, Number(e.target.value)) } : f) }))}/></label></div><button className="secondary-button full" onClick={() => { setDialog('room'); setMenuOpen(false); }}><Plus size={15}/> Add a room</button></div>}
      <div className="inspector-bottom"><div className="mini-stat"><span>Plot area</span><strong>{(activeFloor.width*activeFloor.height).toFixed(1)} {project.unit}²</strong></div><div className="mini-stat"><span>Total room area</span><strong>{totalArea.toFixed(1)} {project.unit}²</strong></div><div className="professional-note">Planning concept only. Confirm dimensions, structure and local building rules with qualified professionals.</div></div>
    </aside></main>
    <button className="floating-add" aria-label="Add to plan" onClick={() => setMenuOpen(v => !v)}><Plus size={25}/></button>
    {menuOpen && <><button className="dismiss-layer" aria-label="Close add menu" onClick={() => setMenuOpen(false)}/><div className="add-menu"><button onClick={addFloor} disabled={project.floors.length >= 4}><Layers size={17}/><span><strong>Add floor</strong><small>New tab at the top</small></span></button><button onClick={() => {setDialog('room');setMenuOpen(false);}}><House size={17}/><span><strong>Add room</strong><small>Drag to resize</small></span></button><button onClick={() => {setDialog('furniture');setMenuOpen(false);}}><Sofa size={17}/><span><strong>Add furniture</strong><small>Search the library</small></span></button></div></>}
    {dialog && <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setDialog(null); }}><section className="modal" role="dialog" aria-modal="true">
      <button className="modal-close" onClick={() => setDialog(null)} aria-label="Close"><X size={18}/></button>
      {dialog === 'room' && <><div className="eyebrow">ROOM LIBRARY</div><h2>Add a room</h2><p>Choose a room type. You can resize it by dragging its edges or entering exact dimensions.</p><div className="room-choice-list">{roomTypes.map(t => <button key={t.name} className={roomType===t.name?'room-choice selected':'room-choice'} onClick={() => setRoomType(t.name)}><span style={{background:t.color}}/><strong>{t.name}</strong><small>{t.w} × {t.h} {project.unit}</small></button>)}</div><button className="primary-button full" onClick={addRoom}>Add selected room <Plus size={16}/></button></>}
      {dialog === 'furniture' && <><div className="eyebrow">FURNITURE LIBRARY</div><h2>Find a piece for your room.</h2><div className="search-field"><Search size={17}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search beds, sofas, desks…"/><span>{visibleFurniture.length}</span></div><div className="furniture-list">{visibleFurniture.map(f => <button key={f.name} className="furniture-row" onClick={() => addFurniture(f)}><span className="furniture-swatch" style={{background:f.color}}>{f.category==='Beds'?<BedDouble size={17}/>:f.category==='Seating'?<Sofa size={17}/>:<Box size={17}/>}</span><span><strong>{f.name}</strong><small>{f.category} · {f.w} × {f.h} {project.unit}</small></span><Plus size={16}/></button>)}</div><button className="secondary-button full" onClick={() => {setDialog('custom');setCustomPrompt('');}}>Can't find it? Generate custom furniture <ArrowRight size={15}/></button></>}
      {dialog === 'custom' && <><div className="eyebrow">CUSTOM FURNITURE</div><h2>Describe what you need.</h2><p>Enter a missing furniture item. This version creates an editable concept from the description; real AI image generation needs a configured model.</p><textarea className="prompt-input" rows={3} value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} placeholder="e.g. An L-shaped study desk with drawers"/><div className="configuration-note"><CircleHelp size={15}/> AI image generation is not connected yet. This creates a practical editable placeholder, not an AI-generated image.</div><button className="primary-button full" disabled={!customPrompt.trim()} onClick={() => { const q=customPrompt.trim(); const match=furnitureCatalog.find(f => (q.toLowerCase().includes('bed')&&f.category==='Beds') || (q.toLowerCase().includes('desk')&&f.name==='Study desk') || (q.toLowerCase().includes('sofa')&&f.name==='Sofa') || (q.toLowerCase().includes('chair')&&f.name==='Armchair') || (q.toLowerCase().includes('wardrobe')&&f.name==='Wardrobe')); addFurniture(match || furnitureCatalog[5],q,match?.w || 1.4,match?.h || .8); }}>Create editable concept <Plus size={16}/></button></>}
      {dialog === 'export' && <><div className="eyebrow">EXPORT YOUR PLAN</div><h2>Take your design with you.</h2><p>Choose an export format. PDF uses your browser's print dialog so you can save the plan as a PDF.</p><button className="export-option" onClick={printPlan}><span className="export-icon"><Printer size={18}/></span><span><strong>Print / Save as PDF</strong><small>Current floor plan · use “Save as PDF” in the print dialog</small></span><ArrowRight size={16}/></button><button className="export-option" onClick={exportProject}><span className="export-icon"><Download size={18}/></span><span><strong>Download editable project</strong><small>Save a .hearthplan.json file</small></span><ArrowRight size={16}/></button><button className="export-option" onClick={() => {setPublishName(project.name);setDialog('publish');}}><span className="export-icon"><Upload size={18}/></span><span><strong>Publish to community</strong><small>Make a local community template</small></span><ArrowRight size={16}/></button></>}
      {dialog === 'publish' && <><div className="eyebrow">COMMUNITY TEMPLATE</div><h2>Share your plan.</h2><p>Give the template a public name and author username. This local version saves the template only in this browser; global sharing needs a cloud backend.</p><label>Template name<input value={publishName} onChange={e => setPublishName(e.target.value)} placeholder="e.g. Compact family home"/></label><label>Custom username<input value={username} onChange={e => setUsername(e.target.value)} placeholder="e.g. homeplanner"/></label><button className="primary-button full" disabled={!publishName.trim()||!username.trim()} onClick={publishLocal}>Save template to community <Upload size={15}/></button></>}
    </section></div>}
  </div>;
}
export default App;
