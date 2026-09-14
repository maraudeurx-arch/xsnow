/** Minimal Puter.js surface used by avatar chat. Loaded from https://js.puter.com/v2/. */
type PuterChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type PuterChatOptions = {
  model?: string;
  max_tokens?: number;
  temperature?: number;
  normalize?: boolean;
};

type PuterAI = {
  chat: (
    messages: PuterChatMessage[],
    testMode?: boolean,
    options?: PuterChatOptions,
  ) => Promise<unknown>;
};

type PuterAuth = {
  isSignedIn: () => boolean;
  signIn: (options?: { attempt_temp_user_creation?: boolean }) => Promise<unknown>;
};

type PuterSDK = {
  ai: PuterAI;
  auth: PuterAuth;
};

interface Window {
  puter?: PuterSDK;
}
