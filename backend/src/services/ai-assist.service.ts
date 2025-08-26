import OpenAI from "openai";

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `
You are an expert assistant for creating states for a voice agent's conversation flow.
Your task is to take a user's request and generate a single JSON object for a new state.
The state should have the following fields: "id", "description", "instructions", "examples", and "condition".

- "id": A short, descriptive, unique ID in snake_case, based on the user's request (e.g., for a request "ask for name", the ID could be "get_name"). Do not include numbers.
- "description": A concise, one-sentence explanation of this state's purpose.
- "instructions": A JSON array of short, clear, imperative commands for the agent.
- "examples": A JSON array of one or two example phrases the agent might say in this state.
- "condition": Describes the check that must pass to confirm the task in 'instructions' is complete, allowing a transition to the next state (e.g., "Once the user's name has been confirmed.").

Based on the user's prompt and the context of existing states, generate the content.
The user will provide their request and the list of existing states.
Your output must be a single, valid JSON object and nothing else.
VERY IMPORTANT: You must generate the content for "description", "instructions", and "examples" in the same language as the user's request.
`;

export const generateState = async (userPrompt: string, existingStates: any[]) => {

    const stateContext = existingStates.length > 0
        ? `For context, here are the descriptions of existing states: ${JSON.stringify(existingStates.map(s => s.description))}`
        : "This is the first state in the conversation.";

    const fullPrompt = `
User's request: "${userPrompt}"
${stateContext}
`;

    const completion = await client.chat.completions.create({
        model: "gpt-4.1",
        messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: fullPrompt },
        ],
        response_format: { type: "json_object" },
    });

    const content = completion.choices[0].message.content;
    if (!content) {
        throw new Error("AI returned empty content.");
    }

    try {
        // The AI should return a valid JSON object, so we parse it.
        return JSON.parse(content);
    } catch (e) {
        console.error("Failed to parse JSON from AI:", content);
        throw new Error("AI returned invalid JSON.");
    }
}; 