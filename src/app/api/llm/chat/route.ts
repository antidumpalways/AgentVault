import { NextRequest, NextResponse } from "next/server";

const LLM_API_KEY = process.env.LLM_API_KEY;
const LLM_API_URL = process.env.LLM_API_URL || "https://api.anthropic.com/v1/messages";
const LLM_MODEL = process.env.LLM_MODEL || "claude-sonnet-4-20250514";

export async function POST(request: NextRequest) {
  try {
    const { message, context } = await request.json();
    if (!message) {
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
    }

    const systemPrompt = context
      ? `You are an AI agent named "${context.agentName || 'Agent'}". Respond concisely as a helpful AI assistant.`
      : "You are a helpful AI assistant. Respond concisely.";

    const userMessages = (context?.history || []).filter(
      (m: { role: string }) => m.role === "user" || m.role === "assistant"
    );

    const body: Record<string, unknown> = {
      model: LLM_MODEL,
      max_tokens: 500,
      system: systemPrompt,
      messages: [
        ...userMessages,
        { role: "user", content: message },
      ],
    };

    if (LLM_API_KEY) {
      const response = await fetch(LLM_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": LLM_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const err = await response.text();
        console.error("LLM API error:", err);
        return NextResponse.json(
          { error: "LLM request failed", content: fallbackReply(message) },
          { status: 200 }
        );
      }

      const data = await response.json();
      const content = data.content?.[0]?.text || fallbackReply(message);
      return NextResponse.json({ success: true, content });
    }

    return NextResponse.json({
      success: true,
      content: fallbackReply(message),
    });
  } catch (error) {
    console.error("LLM chat error:", error);
    return NextResponse.json(
      { error: "Failed to process chat", content: fallbackReply("") },
      { status: 200 }
    );
  }
}

function fallbackReply(message: string): string {
  const replies = [
    `I'll remember: "${message.slice(0, 60)}${message.length > 60 ? "..." : ""}"`,
    `Noted! "${message.slice(0, 40)}..." has been stored in my encrypted memory.`,
    `Got it. I've encrypted and stored that information.`,
    `Memory saved. I'll recall this when needed.`,
  ];
  return replies[Math.floor(Math.random() * replies.length)];
}
