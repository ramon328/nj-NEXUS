import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  SquarePen,
  MessageSquare,
  Pencil,
  Trash2,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAIChatContext } from "@/contexts/AIChatContext";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";
import type { AIConversation } from "@/services/aiChatService";

interface ConversationSidebarProps {
  onSelect?: () => void;
}

type DateGroup = "today" | "yesterday" | "last7Days" | "older";

const groupConversations = (
  conversations: AIConversation[]
): Record<DateGroup, AIConversation[]> => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const last7 = new Date(today);
  last7.setDate(last7.getDate() - 7);

  const groups: Record<DateGroup, AIConversation[]> = {
    today: [],
    yesterday: [],
    last7Days: [],
    older: [],
  };

  for (const conv of conversations) {
    const d = new Date(conv.updated_at);
    if (d >= today) groups.today.push(conv);
    else if (d >= yesterday) groups.yesterday.push(conv);
    else if (d >= last7) groups.last7Days.push(conv);
    else groups.older.push(conv);
  }

  return groups;
};

const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  onSelect,
}) => {
  const {
    conversations,
    conversationsLoading,
    currentConversationId,
    loadConversation,
    newConversation,
    deleteConversation,
    renameConversation,
  } = useAIChatContext();

  const { tCommon } = useI18n();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  const grouped = useMemo(
    () => groupConversations(conversations),
    [conversations]
  );

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  const handleStartRename = (conv: AIConversation) => {
    setRenamingId(conv.id);
    setRenameValue(conv.title);
  };

  const handleConfirmRename = async () => {
    if (renamingId && renameValue.trim()) {
      await renameConversation(renamingId, renameValue.trim());
    }
    setRenamingId(null);
  };

  const handleCancelRename = () => {
    setRenamingId(null);
  };

  const handleSelect = (id: string) => {
    loadConversation(id);
    onSelect?.();
  };

  const handleNewConversation = () => {
    newConversation();
    onSelect?.();
  };

  const groupLabels: Record<DateGroup, string> = {
    today: tCommon("aiAssistant.sidebar.today"),
    yesterday: tCommon("aiAssistant.sidebar.yesterday"),
    last7Days: tCommon("aiAssistant.sidebar.last7Days"),
    older: tCommon("aiAssistant.sidebar.older"),
  };

  const groupOrder: DateGroup[] = ["today", "yesterday", "last7Days", "older"];

  return (
    <div className="flex flex-col h-full bg-slate-50/50 overflow-hidden">
      {/* New conversation button — ghost style, left-aligned */}
      <div className="px-2 pt-3 pb-1">
        <button
          onClick={handleNewConversation}
          className="flex items-center gap-2 px-2 py-1.5 text-[13px] text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors w-full"
        >
          <SquarePen className="h-4 w-4 shrink-0" />
          <span>{tCommon("aiAssistant.sidebar.newConversation")}</span>
        </button>
      </div>

      {/* Conversation list */}
      <ScrollArea className="flex-1">
        <div className="px-2 pb-2">
          {conversationsLoading ? (
            <div className="space-y-1.5 px-1 pt-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-8 w-full rounded-lg" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <MessageSquare className="h-7 w-7 text-slate-300 mb-2" />
              <p className="text-xs text-slate-400">
                {tCommon("aiAssistant.sidebar.noConversations")}
              </p>
            </div>
          ) : (
            groupOrder.map((group) => {
              const items = grouped[group];
              if (items.length === 0) return null;

              return (
                <div key={group} className="mt-2">
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider px-2 py-1">
                    {groupLabels[group]}
                  </p>
                  <div className="space-y-px">
                    {items.map((conv) => {
                      const isActive = conv.id === currentConversationId;
                      const isRenaming = conv.id === renamingId;

                      return (
                        <div
                          key={conv.id}
                          className={cn(
                            "group flex items-center rounded-lg px-2 py-1.5 cursor-pointer transition-colors min-w-0",
                            isActive
                              ? "bg-sky-50 text-sky-800"
                              : "hover:bg-slate-100 text-slate-600"
                          )}
                          onClick={() =>
                            !isRenaming && handleSelect(conv.id)
                          }
                        >
                          {isRenaming ? (
                            <div className="flex items-center gap-1 flex-1 min-w-0">
                              <Input
                                ref={renameInputRef}
                                value={renameValue}
                                onChange={(e) =>
                                  setRenameValue(e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter")
                                    handleConfirmRename();
                                  if (e.key === "Escape")
                                    handleCancelRename();
                                }}
                                className="h-6 text-xs px-1.5 flex-1 min-w-0"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleConfirmRename();
                                }}
                              >
                                <Check className="h-3 w-3 text-green-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCancelRename();
                                }}
                              >
                                <X className="h-3 w-3 text-slate-400" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <span className="flex-1 min-w-0 text-[12px] truncate">
                                {conv.title}
                              </span>
                              <div className="flex items-center shrink-0 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStartRename(conv);
                                  }}
                                  title={tCommon(
                                    "aiAssistant.sidebar.renameTitle"
                                  )}
                                >
                                  <Pencil className="h-2.5 w-2.5 text-slate-400" />
                                </Button>

                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Trash2 className="h-2.5 w-2.5 text-slate-400 hover:text-red-500" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        {tCommon(
                                          "aiAssistant.sidebar.deleteTitle"
                                        )}
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        {tCommon(
                                          "aiAssistant.sidebar.deleteDescription"
                                        )}
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>
                                        {tCommon("buttons.cancel")}
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        className="bg-red-600 hover:bg-red-700"
                                        onClick={() =>
                                          deleteConversation(conv.id)
                                        }
                                      >
                                        {tCommon("buttons.delete")}
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ConversationSidebar;
