import React, { useEffect, useRef } from "react";
import type { TerminalLine } from "./terminal_phase1";

interface Props {
  lines: TerminalLine[];
  visibleCount: number;
  agent: string;
  isStreaming: boolean;
}

export function TerminalPanel({ lines, visibleCount, agent, isStreaming }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visibleCount]);

  const visible = lines.slice(0, visibleCount);
  const showCursor = isStreaming && visibleCount < lines.length;

  return (
    <div className="terminal-panel">
      <div className="terminal-chrome">
        <span className="terminal-dot red" />
        <span className="terminal-dot yellow" />
        <span className="terminal-dot green" />
        <span className="terminal-title">claude-code · agent: {agent}</span>
      </div>
      <div className="terminal-body" ref={scrollRef}>
        {visible.map((line, i) => (
          <TerminalLineView key={i} line={line} />
        ))}
        {showCursor && <span className="terminal-cursor">▊</span>}
      </div>
    </div>
  );
}

function TerminalLineView({ line }: { line: TerminalLine }) {
  if (line.type === "user_prompt") {
    return (
      <div className="tline user-prompt">
        <div className="user-prompt-box">
          <span className="user-prompt-label">User</span>
          <span className="user-prompt-text">{line.content}</span>
        </div>
      </div>
    );
  }

  const prefixMap: Record<string, string> = {
    thinking: "✻",
    tool_call: "⏺",
    tool_result: "⎿",
    agent_text: "",
    status_warn: "⚠",
    status_ok: "✓",
    handoff: "→",
  };

  return (
    <div className={`tline ${line.type.replace("_", "-")}`}>
      {prefixMap[line.type] && <span className="tline-prefix">{prefixMap[line.type]}</span>}
      <span className="tline-content">{line.content}</span>
    </div>
  );
}
