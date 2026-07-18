import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  SYSTEM_PROMPT,
  buildUserMessage,
  PROPOSE_PROTOCOL_TOOL,
  validateProtocolResponse,
} from "@/lib/ai-protocol";

const MAX_GOAL_LENGTH = 500;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const goal = typeof body?.goal === "string" ? body.goal.trim() : "";

  if (!goal) {
    return NextResponse.json({ error: "Describe a goal before generating." }, { status: 400 });
  }
  if (goal.length > MAX_GOAL_LENGTH) {
    return NextResponse.json(
      { error: `Keep your goal under ${MAX_GOAL_LENGTH} characters.` },
      { status: 400 },
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI generation isn't configured on this server yet." },
      { status: 500 },
    );
  }

  const client = new Anthropic({ apiKey });

  let response;
  try {
    response = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      tools: [PROPOSE_PROTOCOL_TOOL],
      tool_choice: { type: "tool", name: "propose_protocol" },
      messages: [{ role: "user", content: buildUserMessage(goal) }],
    });
  } catch {
    return NextResponse.json(
      { error: "Couldn't reach the AI service. Try again in a moment." },
      { status: 502 },
    );
  }

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    return NextResponse.json(
      { error: "The AI didn't return a usable suggestion. Try rephrasing your goal." },
      { status: 502 },
    );
  }

  const result = validateProtocolResponse(toolUse.input);
  if (!result.ok || !result.data) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json(result.data);
}
