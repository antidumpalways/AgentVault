"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useWallet } from "@/hooks/useWallet";
import { useAppStore } from "@/hooks/useAppStore";
import { storeEncryptedMemory } from "@/hooks/useCDRClient";
import { showToast } from "@/components/Toast";

interface Message {
  id: number;
  role: "user" | "agent";
  content: string;
  timestamp: Date;
  uuid?: string;
}

interface LogEntry {
  time: string;
  type: string;
  message: string;
}

export default function TrainContent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { address, isConnected, connect } = useWallet();
  const { agents, addMemory } = useAppStore();
  const activeAgent = agents[0];

  function formatTime() {
    return new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  const addLog = useCallback((type: string, message: string) => {
    setLogs((prev) => [...prev, { time: formatTime(), type, message }]);
  }, []);

  const scrollToBottom = useCallback(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);
  useEffect(() => { if (isConnected) addLog("SYSTEM", "CDR ready."); }, [isConnected, addLog]);

  const getAIResponse = async (message: string): Promise<string> => {
    const res = await fetch("/api/llm/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, context: { agentName: "AgentVault AI", history: messages.slice(-6).map((m) => ({ role: m.role === "agent" ? "assistant" : "user", content: m.content })) } }) });
    const data = await res.json();
    return data.content || "Processed.";
  };

  const handleSend = async () => {
    if (!input.trim() || isProcessing || !address) return;
    const userMsg = input;
    setMessages((prev) => [...prev, { id: Date.now(), role: "user", content: userMsg, timestamp: new Date() }]);
    setInput("");
    setIsProcessing(true);
    try {
      addLog("LLM", "Generating response...");
      const aiContent = await getAIResponse(userMsg);
      addLog("CDR", "Encrypting with DKG public key...");
      const { uuid, txHash } = await storeEncryptedMemory(`User: ${userMsg}\nAgent: ${aiContent}`, address);
      addLog("STORE", `Vault UUID ${uuid} → agent-${uuid}.md`);
      addLog("DONE", `Tx: ${txHash.slice(0, 10)}...`);
      showToast("Memory encrypted", txHash, "success");
      // Save user message
      addMemory({
        id: `mem-${Date.now()}`,
        agentId: activeAgent?.id || "unknown",
        agentName: activeAgent?.name || "Unknown Agent",
        uuid,
        txHash,
        content: userMsg,
        role: "user",
        createdAt: new Date().toISOString(),
      });
      // Save agent response
      addMemory({
        id: `mem-${Date.now() + 1}`,
        agentId: activeAgent?.id || "unknown",
        agentName: activeAgent?.name || "Unknown Agent",
        uuid,
        txHash,
        content: aiContent,
        role: "agent",
        createdAt: new Date().toISOString(),
      });
      setMessages((prev) => [...prev, { id: Date.now() + 1, role: "agent", content: aiContent, timestamp: new Date(), uuid }]);
    } catch (error: unknown) {
      const msg = (error as Error)?.message || "Failed";
      addLog("ERROR", msg);
      showToast(msg, undefined, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)]">
      {/* Chat Panel */}
      <div className="flex-[7] flex flex-col border border-[#1e1e1e] bg-[#0e0e0e]">
        <div className="h-12 flex items-center px-5 border-b border-[#1e1e1e] shrink-0">
          <h1 className="font-mono text-[10px] text-[#3a3a3a] tracking-widest">TRAINING SESSION</h1>
          <div className="ml-auto flex items-center gap-2">
            {isConnected ? (
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
                <span className="font-mono text-[9px] text-[#3a3a3a]">CDR ACTIVE</span>
              </div>
            ) : (
              <button onClick={connect} className="font-mono text-[10px] text-[#00d9ff] hover:text-[#00e6ff] transition-colors">CONNECT</button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {isConnected && messages.length === 0 && (
            <div className="h-full flex items-center justify-center">
              <p className="font-mono text-[10px] text-[#3a3a3a] tracking-widest">START TRAINING YOUR AGENT</p>
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={`max-w-[80%] ${msg.role === "user" ? "ml-auto" : ""}`}>
              {msg.role === "agent" && <div className="font-mono text-[9px] text-[#00d9ff] mb-1 tracking-widest">AGENT</div>}
              <div className={`text-sm leading-relaxed whitespace-pre-wrap ${msg.role === "user" ? "text-[#f2ede6]" : "text-[#5a5a5a]"}`}>
                {msg.content}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-[9px] text-[#3a3a3a]">{msg.timestamp.toLocaleTimeString("en-US", { hour12: false })}</span>
                {msg.uuid && <span className="font-mono text-[9px] text-[#3a3a3a]">UUID:{msg.uuid}</span>}
              </div>
            </div>
          ))}
          {isProcessing && (
            <div className="flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-[#00d9ff] animate-pulse" />
              <span className="font-mono text-[10px] text-[#3a3a3a]">PROCESSING...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-[#1e1e1e] shrink-0">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder={isConnected ? "Type a message..." : "Connect wallet first..."}
              className="flex-1 bg-[#050505] border border-[#1e1e1e] px-4 py-2.5 font-mono text-sm text-[#f2ede6] placeholder:text-[#3a3a3a] focus:border-[#00d9ff] focus:outline-none transition-colors"
              disabled={isProcessing || !isConnected}
            />
            <button
              onClick={handleSend}
              disabled={isProcessing || !input.trim() || !isConnected}
              className="bg-[#00d9ff] text-[#0a0e27] font-mono text-[11px] tracking-widest px-5 hover:bg-[#00e6ff] transition-colors font-semibold disabled:opacity-30"
            >
              SEND
            </button>
          </div>
        </div>
      </div>

      {/* CDR Stream Panel */}
      <div className="flex-[3] flex flex-col border border-l-0 border-[#1e1e1e] bg-[#050505]">
        <div className="h-12 flex items-center px-5 border-b border-[#1e1e1e] shrink-0">
          <h1 className="font-mono text-[10px] text-[#3a3a3a] tracking-widest">CDR STREAM</h1>
        </div>
        <div className="flex-1 overflow-y-auto p-4 font-mono text-[10px] leading-relaxed">
          {logs.map((log, i) => (
            <div key={i} className="flex gap-2 mb-1">
              <span className="text-[#3a3a3a] shrink-0">[{log.time}]</span>
              <span className={`shrink-0 ${
                log.type === "DONE" ? "text-[#00d9ff]" : log.type === "ERROR" ? "text-[#f87171]" : log.type === "LLM" ? "text-[#a78bfa]" : "text-[#3a3a3a]"
              }`}>{log.type}:</span>
              <span className={log.type === "DONE" ? "text-[#00d9ff]" : "text-[#5a5a5a]"}>{log.message}</span>
            </div>
          ))}
          {isProcessing && (
            <div className="flex gap-2 mb-1">
              <span className="text-[#3a3a3a] shrink-0">[{formatTime()}]</span>
              <span className="text-[#3a3a3a] shrink-0">CDR:</span>
              <span className="text-[#5a5a5a] animate-pulse">Processing...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
