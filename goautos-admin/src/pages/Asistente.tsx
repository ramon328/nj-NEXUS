import React, { useState, useEffect, useMemo, useRef, KeyboardEvent } from 'react';
import {
  Send,
  Loader2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Menu,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContentLeft } from '@/components/ui/drawer';
import { useAIChatContext } from '@/contexts/AIChatContext';
import { useI18n } from '@/hooks/useI18n';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DashboardLayout from '@/components/DashboardLayout';
import ConversationSidebar from '@/components/ai-chat/ConversationSidebar';
import EmptyConversationState from '@/components/ai-chat/EmptyConversationState';
import { BlockRenderer } from '@/components/ai-chat/blocks/BlockRenderer';
import { useAuth } from '@/contexts/AuthContext';
import posthog from '@/utils/posthog';

const COLLAPSE_CHAR_LIMIT = 1400;

const splitIntoCards = (text: string) => {
  if (!text) return [];
  const parts = text
    .split(/\n-{3,}\n|\n—{3,}\n/g)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts : [text.trim()];
};

type AnyRecord = Record<string, any>;

const niceKey = (k: string) =>
  k
    .replace(/_/g, ' ')
    .replace(/\b(id)\b/gi, 'ID')
    .replace(/\burl\b/gi, 'URL')
    .replace(/\bapi\b/gi, 'API')
    .replace(/\b([a-z])/g, (m) => m.toUpperCase())
    .trim();

const isDateLike = (v: any) =>
  typeof v === 'string' &&
  /\d{4}-\d{2}-\d{2}|T\d{2}:\d{2}:\d{2}/.test(v);

const fmtVal = (v: any) => {
  if (v == null) return '—';
  if (typeof v === 'number') return v.toLocaleString('es-CL');
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  if (isDateLike(v)) {
    const d = new Date(v);
    return isNaN(d.getTime())
      ? String(v)
      : d.toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
  }
  return String(v);
};

const DataTable: React.FC<{ columns: string[]; rows: AnyRecord[] }> = ({
  columns,
  rows,
}) => (
  <div className="overflow-x-auto not-prose">
    <table className="w-full text-[13px] border-collapse rounded-lg overflow-hidden">
      <thead className="bg-slate-50 sticky top-0">
        <tr>
          {columns.map((c) => (
            <th
              key={c}
              className="px-3 py-2 border border-slate-200 text-left font-medium text-slate-600 whitespace-nowrap"
            >
              {niceKey(c)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td
              colSpan={columns.length}
              className="px-3 py-2 border border-slate-100 text-center text-slate-400"
            >
              Sin datos
            </td>
          </tr>
        ) : (
          rows.map((r, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
              {columns.map((c) => (
                <td key={c} className="px-3 py-2 border border-slate-100 whitespace-nowrap text-slate-700">
                  {fmtVal(r[c])}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

// --- Copy Button ---
const CopyButton: React.FC<{ text: string; label: string; copiedLabel: string }> = ({
  text,
  label,
  copiedLabel,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback ignored
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100/80 hover:bg-slate-200 text-xs text-slate-500 hover:text-slate-700"
      title={label}
    >
      {copied ? (
        <>
          <Check className="h-3 w-3 text-green-600" />
          <span className="text-green-600">{copiedLabel}</span>
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
};

// --- AssistantCard with copy button ---
const AssistantCard: React.FC<{
  content: string;
  lang: 'es' | 'en';
  copyLabel: string;
  copiedLabel: string;
}> = ({ content, lang, copyLabel, copiedLabel }) => {
  const needsCollapse =
    (content?.length || 0) > COLLAPSE_CHAR_LIMIT ||
    (content?.split('\n').length || 0) > 60;

  const [expanded, setExpanded] = useState(!needsCollapse);
  const moreLabel = lang === 'en' ? 'Show more' : 'Ver más';
  const lessLabel = lang === 'en' ? 'Show less' : 'Ver menos';

  const maskStyle = useMemo(
    () =>
      !expanded && needsCollapse
        ? {
            maskImage: 'linear-gradient(180deg, black 80%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(180deg, black 80%, transparent 100%)',
          }
        : {},
    [expanded, needsCollapse]
  );

  return (
    <div className="group relative rounded-2xl bg-white border border-slate-200/60 shadow-sm overflow-hidden">
      <CopyButton text={content} label={copyLabel} copiedLabel={copiedLabel} />
      <div className="p-4">
        <div
          className={cn(
            'text-[13.5px] leading-[1.75] break-words overflow-x-auto text-slate-600',
            !expanded && needsCollapse ? 'max-h-[320px] overflow-y-hidden' : ''
          )}
          style={maskStyle as React.CSSProperties}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ node, ...props }) => (
                <h1 className="text-[15px] font-semibold text-slate-800 mb-2 mt-1" {...props} />
              ),
              h2: ({ node, ...props }) => (
                <h2 className="text-[14px] font-semibold text-slate-800 mt-3 mb-1.5" {...props} />
              ),
              h3: ({ node, ...props }) => (
                <h3 className="text-[13.5px] font-semibold text-slate-700 mt-2.5 mb-1" {...props} />
              ),
              p: ({ node, ...props }) => <p className="mb-2 text-slate-600" {...props} />,
              ul: ({ node, ...props }) => (
                <ul className="list-disc pl-5 space-y-1 mb-2 text-slate-600" {...props} />
              ),
              ol: ({ node, ...props }) => (
                <ol className="list-decimal pl-5 space-y-1 mb-2 text-slate-600" {...props} />
              ),
              li: ({ node, ...props }) => <li className="text-slate-600" {...props} />,
              strong: ({ node, ...props }) => (
                <strong className="font-semibold text-slate-800" {...props} />
              ),
              table: ({ node, ...props }) => (
                <div className="overflow-x-auto mb-2 rounded-lg border border-slate-200/60">
                  <table className="w-full border-collapse text-[13px]" {...props} />
                </div>
              ),
              th: ({ node, ...props }) => (
                <th className="border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-left font-medium text-slate-600" {...props} />
              ),
              td: ({ node, ...props }) => (
                <td className="border border-slate-100 px-2.5 py-1.5 text-slate-600" {...props} />
              ),
              code: ({ inline, className, children, ...props }) => {
                if (inline) {
                  return (
                    <code className="bg-slate-100 text-sky-700 px-1.5 py-0.5 rounded text-[12px]" {...props}>
                      {children}
                    </code>
                  );
                }
                return (
                  <pre className="bg-slate-800 text-slate-100 p-3 rounded-lg overflow-auto mb-2 text-[12px]">
                    <code className={className} {...props}>{children}</code>
                  </pre>
                );
              },
              a: ({ node, ...props }) => (
                <a
                  className="text-sky-600 underline decoration-sky-300 underline-offset-2 hover:text-sky-700"
                  target="_blank"
                  rel="noreferrer"
                  {...props}
                />
              ),
              hr: () => <div className="my-3 border-t border-slate-100" />,
            }}
          >
            {content}
          </ReactMarkdown>
        </div>

        {needsCollapse && (
          <div className="mt-2 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded((v) => !v)}
              className="gap-1 text-sky-600 hover:text-sky-700 hover:bg-sky-50/50 text-[13px] h-8"
            >
              {expanded ? (
                <>
                  {lessLabel}
                  <ChevronUp className="h-3.5 w-3.5" />
                </>
              ) : (
                <>
                  {moreLabel}
                  <ChevronDown className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Follow-up Suggestion Chips ---
const SUGGESTION_KEYS = [
  'showMore',
  'compareSales',
  'topVehicles',
  'leadDetails',
  'stockByBrand',
  'recentActivity',
] as const;

const pickSuggestions = (
  lastContent: string,
  tCommon: (key: string) => string
): string[] => {
  const lower = lastContent.toLowerCase();
  const picked: string[] = [];

  if (lower.includes('stock') || lower.includes('inventario') || lower.includes('vehículo'))
    picked.push(tCommon('aiAssistant.suggestions.stockByBrand'));
  if (lower.includes('venta') || lower.includes('sale'))
    picked.push(tCommon('aiAssistant.suggestions.compareSales'));
  if (lower.includes('lead'))
    picked.push(tCommon('aiAssistant.suggestions.leadDetails'));
  if (lower.includes('visita') || lower.includes('visit'))
    picked.push(tCommon('aiAssistant.suggestions.topVehicles'));

  // Fill up to 3 with generic ones
  const generic = [
    tCommon('aiAssistant.suggestions.showMore'),
    tCommon('aiAssistant.suggestions.recentActivity'),
  ];
  for (const g of generic) {
    if (picked.length >= 3) break;
    if (!picked.includes(g)) picked.push(g);
  }

  return picked.slice(0, 3);
};

// --- Animated placeholder examples ---
const PLACEHOLDER_EXAMPLES_ES = [
  'Cuántos vehículos tengo en stock?',
  'Cuáles fueron las ventas de este mes?',
  'Qué lead llegó último?',
  'Cuál es el vehículo más visitado?',
  'Info del vehículo con patente XXXX',
  'Quién es el cliente Juan?',
];
const PLACEHOLDER_EXAMPLES_EN = [
  'How many vehicles do I have in stock?',
  'What were this month\'s sales?',
  'Which lead came in last?',
  'What is the most visited vehicle?',
  'Info on the vehicle with plate XXXX',
  'Who is the customer Juan?',
];

// ================ MAIN PAGE ================
const Asistente = () => {
  const {
    messages,
    isLoading,
    error,
    messagesEndRef,
    sendMessage,
    addLocalAssistantMessage,
    currentConversationId,
    conversations,
    newConversation,
  } = useAIChatContext();

  const { user } = useAuth();
  const [inputValue, setInputValue] = useState('');
  const { tCommon, language } = useI18n();
  const locale = language === 'en' ? 'en-US' : 'es-ES';
  const [sheetOpen, setSheetOpen] = useState(false);

  // Animated placeholder
  const examples = language === 'en' ? PLACEHOLDER_EXAMPLES_EN : PLACEHOLDER_EXAMPLES_ES;
  const [placeholderText, setPlaceholderText] = useState('');
  const placeholderIdx = useRef(0);
  const charIdx = useRef(0);
  const phaseRef = useRef<'typing' | 'pause' | 'erasing'>('typing');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (inputValue) return;
    const current = examples[placeholderIdx.current % examples.length];
    let timeout: ReturnType<typeof setTimeout>;

    if (phaseRef.current === 'typing') {
      timeout = setTimeout(() => {
        charIdx.current++;
        setPlaceholderText(current.slice(0, charIdx.current));
        if (charIdx.current >= current.length) phaseRef.current = 'pause';
        setTick((t) => t + 1);
      }, 50);
    } else if (phaseRef.current === 'pause') {
      timeout = setTimeout(() => {
        phaseRef.current = 'erasing';
        setTick((t) => t + 1);
      }, 2000);
    } else if (phaseRef.current === 'erasing') {
      timeout = setTimeout(() => {
        charIdx.current--;
        setPlaceholderText(current.slice(0, charIdx.current));
        if (charIdx.current <= 0) {
          placeholderIdx.current++;
          phaseRef.current = 'typing';
        }
        setTick((t) => t + 1);
      }, 30);
    }

    return () => clearTimeout(timeout);
  }, [tick, inputValue, examples]);

  const handleSend = (text?: string) => {
    const value = text || inputValue;
    if (value.trim() && !isLoading) {
      // Track new conversation start (first message in empty conversation)
      if (messages.length === 0) {
        posthog.capture({
          distinctId: user?.id || 'anonymous',
          event: 'assistant_conversation_started',
          properties: {
            conversation_id: currentConversationId || 'new',
          },
        });
      }

      posthog.capture({
        distinctId: user?.id || 'anonymous',
        event: 'assistant_message_sent',
        properties: {
          conversation_id: currentConversationId || 'new',
          message_length: value.trim().length,
        },
      });

      sendMessage(value);
      setInputValue('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  // Current conversation title
  const currentTitle = useMemo(() => {
    if (!currentConversationId) return null;
    return conversations.find((c) => c.id === currentConversationId)?.title;
  }, [currentConversationId, conversations]);

  // Is conversation empty (no user messages)?
  const showEmptyState = messages.length === 0;

  // Last assistant message (for suggestions)
  const lastAssistantMsg = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') return messages[i];
    }
    return null;
  }, [messages]);

  const isLastMessageFromAssistant =
    messages.length > 0 && messages[messages.length - 1]?.role === 'assistant';

  const suggestions = useMemo(() => {
    if (!lastAssistantMsg || isLoading) return [];
    return pickSuggestions(lastAssistantMsg.content, tCommon);
  }, [lastAssistantMsg, isLoading, tCommon]);

  const copyLabel = tCommon('aiAssistant.actions.copy');
  const copiedLabel = tCommon('aiAssistant.actions.copied');

  // Desktop sidebar collapsed state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  return (
    <DashboardLayout>
      <div className="flex h-full overflow-hidden">
        {/* Desktop sidebar — collapsible */}
        <div
          className={cn(
            'hidden md:flex border-r border-slate-200/60 shrink-0 transition-[width] duration-300 overflow-hidden',
            sidebarCollapsed ? 'w-0 border-r-0' : 'w-72'
          )}
        >
          <div className="w-72 h-full">
            <ConversationSidebar />
          </div>
        </div>

        {/* Mobile sidebar — Drawer from the left */}
        <Drawer direction="left" open={sheetOpen} onOpenChange={setSheetOpen}>
          <DrawerContentLeft className="p-0 border-0 overflow-hidden">
            <ConversationSidebar onSelect={() => setSheetOpen(false)} />
          </DrawerContentLeft>
        </Drawer>

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-gradient-to-b from-slate-50/80 to-white">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 shrink-0">
            {/* Mobile: hamburger menu */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-8 w-8 shrink-0 text-slate-400"
              onClick={() => setSheetOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </Button>

            {/* Desktop: sidebar toggle */}
            <div className="hidden md:flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-slate-400 hover:text-slate-600"
                onClick={() => setSidebarCollapsed((v) => !v)}
                title={sidebarCollapsed ? 'Mostrar historial' : 'Ocultar historial'}
              >
                {sidebarCollapsed ? (
                  <PanelLeftOpen className="h-4 w-4" />
                ) : (
                  <PanelLeftClose className="h-4 w-4" />
                )}
              </Button>
              <span className="text-[11px] text-slate-400 font-medium">Historial</span>
            </div>

            {/* Title — only show when in conversation */}
            {currentTitle && (
              <div className="min-w-0">
                <h1 className="font-semibold text-sm text-slate-800 leading-tight truncate">
                  {currentTitle}
                </h1>
              </div>
            )}

            {/* Actions (top right) */}
            <div className="ml-auto flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => addLocalAssistantMessage('', [{ type: 'dashboard_metrics' }])}
                className="text-slate-500 hover:text-cyan-600 hover:bg-cyan-50/60 h-8 gap-1.5 px-2.5 shrink-0"
                title={language === 'en' ? 'Show summary' : 'Ver resumen del mes'}
              >
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline text-[13px] font-medium">
                  {language === 'en' ? 'Summary' : 'Resumen'}
                </span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={newConversation}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 h-8 w-8 shrink-0"
                title={tCommon('aiAssistant.sidebar.newConversation')}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages or Empty State */}
          {showEmptyState ? (
            <EmptyConversationState onSendMessage={handleSend}>
              {/* Inline search bar */}
              <div className="relative bg-white rounded-2xl shadow-xl shadow-gray-200/40 border border-gray-200/80 focus-within:border-primary/40 focus-within:shadow-primary/10 transition-all duration-300">
                <div className="flex items-center gap-2 px-4 py-2.5">
                  <Sparkles className="w-4 h-4 text-slate-300 shrink-0" />
                  <input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholderText || ''}
                    className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none disabled:opacity-50"
                    disabled={isLoading}
                  />
                  <button
                    onClick={() => handleSend()}
                    disabled={!inputValue.trim() || isLoading}
                    className="w-10 h-10 rounded-xl bg-gradient-to-r from-primary to-cyan-500 text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-primary/30 hover:scale-105 active:scale-95 transition-all duration-200 shrink-0"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <p className="text-center text-xs text-gray-400 mt-3">
                {language === 'en' ? 'Press Enter to send' : 'Presiona Enter para enviar'}
              </p>
            </EmptyConversationState>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-6 py-4 space-y-4">
              {messages.map((message) => {
                const isUser = message.role === 'user';
                const cards = !isUser ? splitIntoCards(message.content) : [];

                return (
                  <div
                    key={message.id}
                    className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}
                  >
                    <div className={cn(
                      'overflow-hidden',
                      isUser ? 'max-w-[80%] md:max-w-[65%]' : 'flex-1 min-w-0 max-w-full md:max-w-[85%]'
                    )}>
                      {isUser ? (
                        <div className="rounded-2xl rounded-br-md bg-gradient-to-r from-primary to-cyan-500 text-white px-4 py-2.5 shadow-sm">
                          <p className="whitespace-pre-wrap text-[14px] leading-relaxed break-words">
                            {message.content}
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2.5">
                          {cards.map((card, idx) => (
                            <AssistantCard
                              key={idx}
                              content={card}
                              lang={language}
                              copyLabel={copyLabel}
                              copiedLabel={copiedLabel}
                            />
                          ))}

                          {/* Interactive blocks — pre-built components, instant render */}
                          {message.blocks && message.blocks.length > 0 && (
                            <div className="flex flex-col gap-2.5">
                              {message.blocks.map((block, idx) => (
                                <BlockRenderer
                                  key={idx}
                                  block={block}
                                  onSendMessage={(msg) => handleSend(msg)}
                                  onVehicleSelect={(vehicle) =>
                                    addLocalAssistantMessage('', [
                                      { type: 'vehicle_detail', vehicleId: vehicle.id, preview: vehicle },
                                    ])
                                  }
                                  onRegisterSale={(vid, prev) =>
                                    addLocalAssistantMessage('', [
                                      { type: 'sale_form', vehicleId: vid, preview: prev },
                                    ])
                                  }
                                  onViewDocuments={(vid) =>
                                    addLocalAssistantMessage('', [
                                      { type: 'documents', vehicleId: vid },
                                    ])
                                  }
                                  onConfirm={() =>
                                    handleSend(
                                      language === 'en'
                                        ? 'Yes, confirm the action'
                                        : 'Sí, confirma la acción'
                                    )
                                  }
                                  onCancel={() =>
                                    handleSend(
                                      language === 'en'
                                        ? 'No, cancel the action'
                                        : 'No, cancela la acción'
                                    )
                                  }
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <p className={cn(
                        'text-[10px] mt-1 px-1',
                        isUser ? 'text-slate-300 text-right' : 'text-slate-400'
                      )}>
                        {message.timestamp.toLocaleTimeString(locale, {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex items-center gap-2.5 text-slate-400 text-sm pl-1">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce [animation-delay:0ms]"></span>
                    <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce [animation-delay:150ms]"></span>
                    <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce [animation-delay:300ms]"></span>
                  </div>
                  <span className="text-[13px]">{tCommon('aiAssistant.drawer.thinking')}</span>
                </div>
              )}

              {/* Follow-up suggestion chips */}
              {isLastMessageFromAssistant && !isLoading && suggestions.length > 0 && (
                <div className="flex flex-wrap gap-2 pl-1">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        posthog.capture({
                          distinctId: user?.id || 'anonymous',
                          event: 'assistant_suggestion_clicked',
                          properties: {
                            suggestion_text: s,
                            conversation_id: currentConversationId || 'new',
                          },
                        });
                        handleSend(s);
                      }}
                      className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-medium border border-sky-200 text-sky-700 bg-sky-50/50 hover:bg-sky-100 hover:border-sky-300 transition-colors cursor-pointer"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mx-4 md:mx-6 mb-1 px-3 py-2 bg-red-50 border border-red-200/60 rounded-xl shrink-0">
              <p className="text-[13px] text-red-600">{error}</p>
            </div>
          )}

          {/* Input bar — only sticky at bottom when in conversation */}
          {!showEmptyState && (
            <div className="px-3 md:px-5 py-3 shrink-0">
              <div className="max-w-3xl mx-auto">
                <div className="relative bg-white rounded-2xl shadow-xl shadow-gray-200/40 border border-gray-200/80 focus-within:border-primary/40 focus-within:shadow-primary/10 transition-all duration-300">
                  <div className="flex items-center gap-2 px-4 py-2.5">
                    <Sparkles className="w-4 h-4 text-slate-300 shrink-0" />
                    <input
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={placeholderText || ''}
                      className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none disabled:opacity-50"
                      disabled={isLoading}
                    />
                    <button
                      onClick={() => handleSend()}
                      disabled={!inputValue.trim() || isLoading}
                      className="w-10 h-10 rounded-xl bg-gradient-to-r from-primary to-cyan-500 text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-primary/30 hover:scale-105 active:scale-95 transition-all duration-200 shrink-0"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Asistente;
