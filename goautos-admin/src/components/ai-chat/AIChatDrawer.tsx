'use client';

import React, { useState, KeyboardEvent, useMemo } from 'react';
import {
  X,
  Send,
  Trash2,
  Loader2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Bot,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAIChat } from '@/hooks/useAIChat';
import { useI18n } from '@/hooks/useI18n';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const COLLAPSE_CHAR_LIMIT = 1400;
const COLLAPSE_HEIGHT = 320;

// Separa en "cards" usando líneas con --- o ——
const splitIntoCards = (text: string) => {
  if (!text) return [];
  const parts = text
    .split(/\n-{3,}\n|\n—{3,}\n/g)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts : [text.trim()];
};

type AnyRecord = Record<string, any>;

type StructuredPayload = {
  oneLine?: string;
  explanation?: string;
  recommendations?: string[];
  items?: AnyRecord[];
  table?: { columns: string[]; rows: AnyRecord[] } | null;
};

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
}) => {
  return (
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
              <tr
                key={i}
                className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}
              >
                {columns.map((c) => (
                  <td
                    key={c}
                    className="px-3 py-2 border border-slate-100 whitespace-nowrap text-slate-700"
                  >
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
};

const ItemCards: React.FC<{ items: AnyRecord[] }> = ({ items }) => {
  if (!items?.length) return null;

  // Detectamos las claves más frecuentes para mostrarlas primero
  const keyCount = new Map<string, number>();
  items.forEach((it) =>
    Object.keys(it || {}).forEach((k) =>
      keyCount.set(k, (keyCount.get(k) || 0) + 1)
    )
  );
  const sortedKeys = Array.from(keyCount.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {items.map((it, idx) => {
        const keys = sortedKeys.filter((k) => it[k] !== undefined).slice(0, 8);
        return (
          <div
            key={idx}
            className="rounded-lg border border-slate-200/80 bg-slate-50/50 p-3"
          >
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              {keys.map((k) => (
                <React.Fragment key={k}>
                  <dt className="text-[10px] uppercase tracking-wide text-slate-500">
                    {niceKey(k)}
                  </dt>
                  <dd className="text-[13px] text-slate-800">{fmtVal(it[k])}</dd>
                </React.Fragment>
              ))}
            </dl>
          </div>
        );
      })}
    </div>
  );
};

const AssistantStructuredBlock: React.FC<{ s: StructuredPayload }> = ({ s }) => {
  return (
    <div className="prose prose-sm max-w-none prose-headings:mb-2 prose-p:my-2">
      {s.oneLine && (
        <p className="text-[14px] font-medium text-slate-800">{s.oneLine}</p>
      )}

      {s.explanation && (
        <div className="mt-2">
          <p className="text-cyan-700 font-medium text-[13px] mb-1">Explicación:</p>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {s.explanation}
          </ReactMarkdown>
        </div>
      )}

      {s.items && s.items.length > 0 && (
        <div className="mt-3">
          <ItemCards items={s.items} />
        </div>
      )}

      {s.table && s.table.columns?.length ? (
        <div className="mt-3">
          <DataTable columns={s.table.columns} rows={s.table.rows || []} />
        </div>
      ) : null}

      {s.recommendations && s.recommendations.length > 0 && (
        <div className="mt-3">
          <p className="text-cyan-700 font-medium text-[13px] mb-1">Recomendaciones:</p>
          <ul className="list-disc pl-5 space-y-1">
            {s.recommendations.map((r, i) => (
              <li key={i} className="text-[13px]">{r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const AIChatDrawer = () => {
  const {
    isOpen,
    messages,
    isLoading,
    error,
    messagesEndRef,
    closeChat,
    sendMessage,
    clearChat,
  } = useAIChat();

  const [inputValue, setInputValue] = useState('');
  const { tCommon, language } = useI18n();
  const locale = language === 'en' ? 'en-US' : 'es-ES';

  const handleSend = () => {
    if (inputValue.trim() && !isLoading) {
      sendMessage(inputValue);
      setInputValue('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40 transition-opacity"
        onClick={closeChat}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full sm:w-[460px] bg-gradient-to-b from-slate-50 to-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300 min-h-0 border-l border-slate-200/60">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/60 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-sm">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-[15px] text-slate-800">
                  {tCommon('aiAssistant.drawer.title')}
                </h2>
                <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-amber-100 text-amber-700 rounded-md">
                  {tCommon('aiAssistant.drawer.beta')}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {tCommon('aiAssistant.drawer.subtitle')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={clearChat}
              className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 h-8 w-8"
              title={tCommon('aiAssistant.drawer.clear')}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={closeChat}
              className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 h-8 w-8"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 min-h-0 px-4 py-4">
          <div className="flex flex-col gap-5">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                locale={locale}
                assistantLabel={tCommon('aiAssistant.drawer.assistantLabel')}
                lang={language}
              />
            ))}
            {isLoading && (
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-cyan-50 to-blue-50 text-cyan-600 mt-0.5 shrink-0">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-2 text-slate-400 text-sm pt-1">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:0ms]"></span>
                    <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:150ms]"></span>
                    <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:300ms]"></span>
                  </div>
                  <span className="text-[13px]">{tCommon('aiAssistant.drawer.thinking')}</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Error */}
        {error && (
          <div className="mx-4 mb-2 px-3 py-2 bg-red-50 border border-red-200/60 rounded-lg">
            <p className="text-[13px] text-red-600">{error}</p>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-slate-200/60 bg-white">
          <div className="flex gap-2 items-end">
            <Textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={tCommon('aiAssistant.drawer.placeholder')}
              className="resize-none min-h-[48px] max-h-[120px] rounded-xl border-slate-200 bg-slate-50/80 focus:bg-white text-base md:text-sm placeholder:text-slate-400 transition-colors"
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              size="icon"
              className="shrink-0 h-[48px] w-[48px] rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 shadow-sm disabled:opacity-40"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 text-center">
            {tCommon('aiAssistant.drawer.helper')}
          </p>
        </div>
      </div>
    </>
  );
};

import type { GaiaBlock, PendingAction } from '@/types/gaia';
import { BlockRenderer } from './blocks/BlockRenderer';

interface ChatMessageUI {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  structured?: StructuredPayload;
  blocks?: GaiaBlock[];
  pending_action?: PendingAction;
  toolStatus?: string;
}

interface MessageBubbleProps {
  message: ChatMessageUI;
  locale: string;
  assistantLabel: string;
  lang: 'es' | 'en';
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  locale,
  assistantLabel,
  lang,
}) => {
  const isUser = message.role === 'user';
  const hasStructured = !!message.structured;
  const hasBlocks = !isUser && message.blocks && message.blocks.length > 0;

  if (hasBlocks) {
    console.log('[GAIA-RENDER] Rendering blocks:', message.blocks?.length, message.blocks?.map(b => b.type));
  }

  // Si no hay payload estructurado, caemos a markdown (con split en cards)
  const cards = !isUser && !hasStructured ? splitIntoCards(message.content) : [];

  return (
    <div className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}>
      {/* Assistant avatar */}
      {!isUser && (
        <div className="p-1.5 rounded-lg bg-gradient-to-br from-cyan-50 to-blue-50 text-cyan-600 mt-0.5 mr-2.5 shrink-0 h-fit">
          <Bot className="h-4 w-4" />
        </div>
      )}

      <div
        className={cn(
          'overflow-hidden',
          isUser
            ? 'max-w-[80%] rounded-2xl rounded-br-md px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm'
            : 'flex-1 min-w-0 text-slate-700'
        )}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap text-[14px] leading-relaxed break-words">
            {message.content}
          </div>
        ) : hasStructured ? (
          <div className="rounded-2xl border border-slate-200/70 bg-white shadow-sm overflow-hidden">
            <div className="p-4">
              <AssistantStructuredBlock s={message.structured!} />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {cards.map((card, idx) => (
              <AssistantCard key={idx} content={card} lang={lang} />
            ))}
          </div>
        )}

        {!isUser && message.toolStatus && (
          <div className="flex items-center gap-2 mt-2 px-1 animate-pulse">
            <div className="w-5 h-5 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 flex items-center justify-center">
              <Loader2 className="w-3 h-3 text-white animate-spin" />
            </div>
            <span className="text-xs font-medium text-cyan-600">{message.toolStatus}...</span>
          </div>
        )}

        {!isUser && message.blocks && message.blocks.length > 0 && (
          <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3">
            {message.blocks.map((block, idx) => (
              <BlockRenderer
                key={idx}
                block={block}
                onSendMessage={(msg) => {
                  const event = new CustomEvent('gaia-send-message', { detail: msg });
                  window.dispatchEvent(event);
                }}
                onConfirm={() => {
                  if (message.pending_action) {
                    const event = new CustomEvent('gaia-confirm-action', { detail: message.pending_action.id });
                    window.dispatchEvent(event);
                  }
                }}
                onCancel={() => {
                  if (message.pending_action) {
                    const event = new CustomEvent('gaia-cancel-action', { detail: message.pending_action.id });
                    window.dispatchEvent(event);
                  }
                }}
              />
            ))}
          </div>
        )}

        <div
          className={cn(
            'text-[11px] mt-1.5',
            isUser ? 'text-white/70 text-right' : 'text-slate-400'
          )}
        >
          {message.timestamp.toLocaleTimeString(locale, {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  );
};

const AssistantCard: React.FC<{ content: string; lang: 'es' | 'en' }> = ({
  content,
  lang,
}) => {
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
            WebkitMaskImage:
              'linear-gradient(180deg, black 80%, transparent 100%)',
          }
        : {},
    [expanded, needsCollapse]
  );

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white shadow-sm overflow-hidden">
      <div className="p-4">
        <div
          className={cn(
            'text-[13.5px] leading-[1.7] break-words overflow-x-auto text-slate-700',
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
              p: ({ node, ...props }) => (
                <p className="mb-2 text-slate-600" {...props} />
              ),
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
                <th
                  className="border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-left font-medium text-slate-600"
                  {...props}
                />
              ),
              td: ({ node, ...props }) => (
                <td className="border border-slate-100 px-2.5 py-1.5 text-slate-600" {...props} />
              ),
              code: ({ inline, className, children, ...props }) => {
                if (inline) {
                  return (
                    <code
                      className="bg-slate-100 text-cyan-700 px-1.5 py-0.5 rounded text-[12px]"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                }
                return (
                  <pre className="bg-slate-800 text-slate-100 p-3 rounded-lg overflow-auto mb-2 text-[12px]">
                    <code className={className} {...props}>
                      {children}
                    </code>
                  </pre>
                );
              },
              a: ({ node, ...props }) => (
                <a
                  className="text-cyan-600 underline decoration-cyan-300 underline-offset-2 hover:text-cyan-700"
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
              className="gap-1 text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50/50 text-[13px] h-8"
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

export default AIChatDrawer;
