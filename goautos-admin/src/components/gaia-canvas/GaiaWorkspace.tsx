import { useState, useRef, useCallback, WheelEvent, MouseEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/hooks/useI18n';
import { supabase } from '@/integrations/supabase/client';
import { Rnd } from 'react-rnd';
import { CommandBar } from './CommandBar';
import { CanvasBlock, CanvasBlockData } from './CanvasBlock';
import { ActionTimeline, TimelineEntry } from './ActionTimeline';
import { GaiaHeader } from './GaiaHeader';
import type { GaiaBlock } from '@/types/gaia';
import { Sparkles, Loader2, GripVertical, X, Minimize2, Maximize2, Car, TrendingUp, Users, Search, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import LottieImport from 'lottie-react';
const Lottie = (typeof LottieImport === 'object' && 'default' in LottieImport) ? (LottieImport as any).default : LottieImport;
import aiAnimation from '@/assets/ai-animation.json';
import { useI18n as useI18nFull } from '@/hooks/useI18n';
import { cn } from '@/lib/utils';

interface CanvasNode {
  block: CanvasBlockData;
  x: number;
  y: number;
  w: number;
  h: number;
  minimized: boolean;
  zIndex: number;
}

const DEFAULT_CARD_W = 420;
const DEFAULT_CARD_H = 320;
const GRID_CARD_W = 600;
const GRID_CARD_H = 400;

export function GaiaWorkspace() {
  const { language } = useI18n();
  // Cliente efectivo (para superadmin = automotora seleccionada). Se manda a GAIA
  // para que las consultas se scoricen al tenant correcto; el server solo lo respeta
  // si el usuario es superadmin.
  const { clientId } = useAuth();
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingLabel, setProcessingLabel] = useState('');
  const [showTimeline, setShowTimeline] = useState(false);
  const [topZ, setTopZ] = useState(1);

  // Canvas pan & zoom
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  const blockIdCounter = useRef(0);
  const conversationHistory = useRef<{ role: string; content: string }[]>([]);

  const addTimelineEntry = useCallback((entry: Omit<TimelineEntry, 'id' | 'timestamp'>) => {
    setTimeline(prev => [{
      ...entry,
      id: `tl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date(),
    }, ...prev]);
  }, []);

  const bringToFront = useCallback((nodeId: string) => {
    setTopZ(prev => {
      const newZ = prev + 1;
      setNodes(ns => ns.map(n => n.block.id === nodeId ? { ...n, zIndex: newZ } : n));
      return newZ;
    });
  }, []);

  const removeNode = useCallback((nodeId: string) => {
    setNodes(prev => prev.filter(n => n.block.id !== nodeId));
  }, []);

  const toggleMinimize = useCallback((nodeId: string) => {
    setNodes(prev => prev.map(n =>
      n.block.id === nodeId ? { ...n, minimized: !n.minimized } : n
    ));
  }, []);

  // Calculate position for new nodes — cascade from top-left
  const getNewPosition = useCallback(() => {
    const count = nodes.length;
    const col = count % 3;
    const row = Math.floor(count / 3);
    return {
      x: 40 + col * (DEFAULT_CARD_W + 24) - pan.x / zoom,
      y: 40 + row * (DEFAULT_CARD_H + 24) - pan.y / zoom,
    };
  }, [nodes.length, pan, zoom]);

  const sendMessage = useCallback(async (input: string) => {
    if (!input.trim() || isProcessing) return;

    setIsProcessing(true);
    setProcessingLabel('Pensando...');

    addTimelineEntry({ type: 'user', content: input });
    conversationHistory.current.push({ role: 'user', content: input });

    try {
      const mastraUrl = import.meta.env.VITE_MASTRA_URL;
      if (!mastraUrl) throw new Error('VITE_MASTRA_URL not configured');

      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error('No auth token');

      const res = await fetch(`${mastraUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: conversationHistory.current,
          language,
          clientId,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Error ${res.status}`);
      }

      const data = await res.json();
      const responseText = data.response || '';
      const responseBlocks: GaiaBlock[] = data.blocks || [];

      conversationHistory.current.push({ role: 'assistant', content: responseText });

      const newNodes: CanvasNode[] = [];
      const basePos = getNewPosition();
      let nextZ = topZ + 1;

      // Text response as a node
      if (responseText) {
        newNodes.push({
          block: {
            id: `block-${++blockIdCounter.current}`,
            type: 'text',
            content: responseText,
            timestamp: new Date(),
            query: input,
          },
          x: basePos.x,
          y: basePos.y,
          w: DEFAULT_CARD_W,
          h: DEFAULT_CARD_H,
          minimized: false,
          zIndex: nextZ++,
        });
      }

      // Rich blocks as separate nodes
      for (let i = 0; i < responseBlocks.length; i++) {
        const isVehicleGrid = responseBlocks[i].type === 'vehicle_cards' || responseBlocks[i].type === 'vehicle_selector';
        newNodes.push({
          block: {
            id: `block-${++blockIdCounter.current}`,
            type: responseBlocks[i].type,
            data: responseBlocks[i],
            timestamp: new Date(),
            query: input,
          },
          x: basePos.x + (newNodes.length % 3) * (DEFAULT_CARD_W + 24),
          y: basePos.y + Math.floor(newNodes.length / 3) * (DEFAULT_CARD_H + 24),
          w: isVehicleGrid ? GRID_CARD_W : DEFAULT_CARD_W,
          h: isVehicleGrid ? GRID_CARD_H : DEFAULT_CARD_H,
          minimized: false,
          zIndex: nextZ++,
        });
      }

      setTopZ(nextZ);
      setNodes(prev => [...prev, ...newNodes]);

      addTimelineEntry({
        type: 'assistant',
        content: responseText.slice(0, 150) + (responseText.length > 150 ? '...' : ''),
        blockCount: responseBlocks.length,
      });

    } catch (err: any) {
      addTimelineEntry({ type: 'error', content: err.message || 'Error desconocido' });
    } finally {
      setIsProcessing(false);
      setProcessingLabel('');
    }
  }, [isProcessing, language, clientId, addTimelineEntry, getNewPosition, topZ]);

  // Canvas pan handlers
  const handleCanvasMouseDown = (e: MouseEvent) => {
    if (e.button === 0 && !(e.target as HTMLElement).closest('.canvas-drag-handle, button, textarea, input, a')) {
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
      e.preventDefault();
    }
  };

  const handleCanvasMouseMove = (e: MouseEvent) => {
    if (!isPanning) return;
    setPan({
      x: panStart.current.panX + (e.clientX - panStart.current.x),
      y: panStart.current.panY + (e.clientY - panStart.current.y),
    });
  };

  const handleCanvasMouseUp = () => setIsPanning(false);

  // Canvas zoom
  const handleWheel = (e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      setZoom(z => Math.max(0.3, Math.min(2, z + delta)));
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-50 overflow-hidden">
      <GaiaHeader
        blockCount={nodes.length}
        onToggleTimeline={() => setShowTimeline(p => !p)}
        showTimeline={showTimeline}
        onClearCanvas={() => {
          setNodes([]);
          conversationHistory.current = [];
          setPan({ x: 0, y: 0 });
          setZoom(1);
        }}
      />

      <div className="flex-1 flex overflow-hidden relative">
        {/* Canvas */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div
            ref={canvasRef}
            className={cn(
              'flex-1 relative overflow-hidden',
              isPanning ? 'cursor-grabbing' : 'cursor-default',
            )}
            style={{
              backgroundImage: `radial-gradient(circle, #e2e8f0 1px, transparent 1px)`,
              backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
              backgroundPosition: `${pan.x}px ${pan.y}px`,
            }}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            onWheel={handleWheel}
          >
            {/* Transform layer */}
            <div
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: '0 0',
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
              }}
            >
              {/* Processing indicator */}
              {isProcessing && (
                <div
                  className="absolute flex items-center gap-3 px-5 py-4 rounded-2xl bg-white/90 backdrop-blur-sm border border-cyan-200 shadow-lg animate-pulse"
                  style={{ left: -pan.x / zoom + 40, top: -pan.y / zoom + 20, zIndex: 99999 }}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  </div>
                  <span className="text-sm font-medium text-cyan-700">{processingLabel}</span>
                </div>
              )}

              {/* Draggable nodes */}
              {nodes.map((node) => (
                <Rnd
                  key={node.block.id}
                  position={{ x: node.x, y: node.y }}
                  size={{ width: node.w, height: node.minimized ? 48 : node.h }}
                  onDragStart={() => bringToFront(node.block.id)}
                  onDragStop={(_, d) => {
                    setNodes(prev => prev.map(n =>
                      n.block.id === node.block.id ? { ...n, x: d.x, y: d.y } : n
                    ));
                  }}
                  onResizeStop={(_, __, ref, ___, pos) => {
                    setNodes(prev => prev.map(n =>
                      n.block.id === node.block.id
                        ? { ...n, w: parseInt(ref.style.width), h: parseInt(ref.style.height), x: pos.x, y: pos.y }
                        : n
                    ));
                  }}
                  minWidth={280}
                  minHeight={48}
                  dragHandleClassName="canvas-drag-handle"
                  enableResizing={!node.minimized}
                  style={{ zIndex: node.zIndex }}
                  scale={zoom}
                >
                  <div className={cn(
                    'h-full flex flex-col rounded-2xl border bg-white shadow-md transition-shadow hover:shadow-xl overflow-hidden',
                    node.minimized ? 'border-slate-200' : 'border-slate-200/60'
                  )}>
                    {/* Title bar — draggable */}
                    <div className="canvas-drag-handle flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-slate-50/80 cursor-grab active:cursor-grabbing select-none flex-shrink-0">
                      <GripVertical className="w-3.5 h-3.5 text-slate-300" />
                      <span className="text-[11px] text-slate-400 truncate flex-1 italic">
                        {node.block.query || node.block.type}
                      </span>
                      <span className="text-[10px] text-slate-300">
                        {node.block.timestamp.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <button
                        onMouseDown={e => e.stopPropagation()}
                        onClick={() => toggleMinimize(node.block.id)}
                        className="p-0.5 rounded hover:bg-slate-200 text-slate-400"
                      >
                        {node.minimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
                      </button>
                      <button
                        onMouseDown={e => e.stopPropagation()}
                        onClick={() => removeNode(node.block.id)}
                        className="p-0.5 rounded hover:bg-red-100 text-slate-400 hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Content */}
                    {!node.minimized && (
                      <div className="flex-1 overflow-auto p-4">
                        <CanvasBlock
                          block={node.block}
                          onRemove={() => removeNode(node.block.id)}
                          onAction={sendMessage}
                        />
                      </div>
                    )}
                  </div>
                </Rnd>
              ))}
            </div>

            {/* Empty state */}
            {nodes.length === 0 && !isProcessing && (
              <EmptyState onSuggestion={sendMessage} />
            )}

            {/* Zoom indicator */}
            <div className="absolute bottom-20 right-4 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/80 backdrop-blur-sm border border-slate-200 text-[11px] text-slate-400 select-none">
              <button onClick={() => setZoom(z => Math.max(0.3, z - 0.1))} className="hover:text-slate-700 px-1">-</button>
              <span className="w-10 text-center">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="hover:text-slate-700 px-1">+</button>
              <span className="text-slate-300">|</span>
              <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="hover:text-slate-700">Reset</button>
            </div>
          </div>

          {/* Command bar */}
          <CommandBar onSend={sendMessage} isProcessing={isProcessing} />
        </div>

        {/* Timeline */}
        {showTimeline && (
          <ActionTimeline entries={timeline} onClose={() => setShowTimeline(false)} />
        )}
      </div>
    </div>
  );
}

function EmptyState({ onSuggestion }: { onSuggestion: (msg: string) => void }) {
  const { tCommon } = useI18nFull();

  const quickCards = [
    { icon: Car, title: 'Inventario activo', description: 'Muéstrame mi inventario activo con detalles' },
    { icon: TrendingUp, title: 'Ventas del mes', description: '¿Cómo van las ventas de este mes?' },
    { icon: Users, title: 'Leads pendientes', description: 'Muéstrame los leads sin responder' },
    { icon: Search, title: 'Auto prioritario', description: '¿Cuál auto debo priorizar para vender esta semana?' },
  ];

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="max-w-lg mx-auto px-4">
        <div className="flex flex-col items-center">
          {/* GAIA Orb — same as landing page */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="mb-4"
          >
            <div className="relative flex items-center justify-center w-20 h-20 mx-auto">
              <div
                className="absolute inset-[-12px] rounded-full animate-pulse"
                style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.18) 0%, transparent 70%)' }}
              />
              <div className="absolute inset-[-5px] animate-spin" style={{ animationDuration: '10s' }}>
                <div className="w-full h-full rounded-full" style={{
                  background: 'conic-gradient(from 0deg, transparent 0%, transparent 55%, rgba(6,182,212,0.4) 78%, transparent 100%)',
                  WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 1.5px), #fff calc(100% - 1.5px))',
                  mask: 'radial-gradient(farthest-side, transparent calc(100% - 1.5px), #fff calc(100% - 1.5px))',
                }} />
              </div>
              <div className="absolute inset-[-5px] animate-spin" style={{ animationDuration: '14s', animationDirection: 'reverse' }}>
                <div className="w-full h-full rounded-full" style={{
                  background: 'conic-gradient(from 180deg, transparent 0%, transparent 60%, rgba(59,130,246,0.3) 80%, transparent 100%)',
                  WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 1.5px), #fff calc(100% - 1.5px))',
                  mask: 'radial-gradient(farthest-side, transparent calc(100% - 1.5px), #fff calc(100% - 1.5px))',
                }} />
              </div>
              <div className="absolute inset-2 rounded-full bg-gradient-to-br from-cyan-400/25 via-cyan-500/20 to-blue-600/25 shadow-[0_0_20px_0px_rgba(6,182,212,0.15)]" />
              <Lottie animationData={aiAnimation} loop className="relative w-14 h-14" />
            </div>
          </motion.div>

          {/* Title */}
          <motion.h1
            className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent mb-2 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            GAIA Workspace
          </motion.h1>

          <motion.p
            className="text-sm text-gray-400 max-w-md mx-auto leading-relaxed text-center mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            Tu centro de operaciones. Pide lo que necesites y arrastra los elementos en el canvas.
          </motion.p>

          {/* Quick cards */}
          <motion.div
            className="grid grid-cols-2 gap-2 w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            {quickCards.map((card) => {
              const Icon = card.icon;
              return (
                <motion.button
                  key={card.title}
                  onClick={() => onSuggestion(card.description)}
                  className="group relative overflow-hidden flex items-center gap-3 p-3 text-left bg-white border border-gray-200/60 rounded-xl hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 group-hover:border-primary/20 transition-colors">
                    <Icon className="w-4 h-4 text-gray-600 group-hover:text-primary transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-[13px] truncate group-hover:text-primary transition-colors">
                      {card.title}
                    </p>
                    <p className="text-[11px] text-gray-500 truncate">{card.description}</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
                </motion.button>
              );
            })}
          </motion.div>

          <motion.p
            className="text-[11px] text-slate-400 mt-6 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            Arrastra el fondo para mover el canvas · Ctrl+Scroll para zoom
          </motion.p>
        </div>
      </div>
    </div>
  );
}
