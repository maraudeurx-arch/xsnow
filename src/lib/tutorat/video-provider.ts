/**
 * Video provider contracts, TYPE ONLY.
 *
 * No runtime code and no imports on purpose: the concrete provider is plugged
 * in behind these interfaces and its key lives in the server environment only.
 */

/** Role of a participant inside a tutoring session. */
export type TutoratRole = "learner" | "tutor" | "admin";

/** Measured quality of the participant's network. */
export type NetworkQuality = "good" | "low" | "very-low" | "unknown";

/** Input used by the server to create a room. */
export type RoomOptions = {
  /** Identifier of the tutoring session the room belongs to. */
  sessionId: string;
  /** Maximum number of participants allowed in the room. */
  maxParticipants: number;
  /** Whether the room should be recorded. */
  recording: boolean;
  /** Moment after which the room must not be usable. */
  expiresAt: Date;
};

/** A room created by the server. */
export type Room = {
  /** Provider-side room identifier. */
  id: string;
  /** Join URL handed to the clients. */
  url: string;
  /** Moment after which the room expires. */
  expiresAt: Date;
};

/** Input used by the server to mint a join token. */
export type JoinTokenRequest = {
  /** Room the token is valid for. */
  roomId: string;
  /** User the token is issued to. */
  userId: string;
  /** Role attached to the token. */
  role: TutoratRole;
  /** Token lifetime in seconds. */
  expiresInSeconds: number;
};

/** Input used by the client to join a room. */
export type JoinOptions = {
  /** Room URL to connect to. */
  url: string;
  /** Short-lived token obtained from the API. */
  token: string;
  /** When true, the client joins without sending video. */
  audioOnly: boolean;
};

/** Reason why a client stopped being connected. */
export type DisconnectReason = "left" | "network" | "kicked" | "expired" | "error";

/** Events emitted by the client implementation. */
export type VideoProviderEvents = {
  /** Latest measured network quality. */
  networkQuality: (quality: NetworkQuality) => void;
  /** Fired once when the session ends. */
  disconnected: (reason: DisconnectReason) => void;
};

/**
 * Server side only (API): needs the provider key from the server environment
 * and must never run in the browser.
 */
export interface VideoProviderServer {
  /** Creates a room and returns its join URL. */
  createRoom(options: RoomOptions): Promise<Room>;
  /** Mints a short-lived join token for one participant. */
  getJoinToken(request: JoinTokenRequest): Promise<string>;
  /** Starts recording an existing room. */
  startRecording(roomId: string): Promise<void>;
}

/** Browser side of the provider, used by the client components. */
export interface VideoProviderClient {
  /** Joins a room with a server-issued token. */
  join(options: JoinOptions): Promise<void>;
  /** Switches the local connection between audio-only and audio+video. */
  setAudioOnly(audioOnly: boolean): Promise<void>;
  /** Leaves the current room and releases local resources. */
  leave(): Promise<void>;
  /** Subscribes to an event and returns an unsubscribe function. */
  on<E extends keyof VideoProviderEvents>(
    event: E,
    handler: VideoProviderEvents[E],
  ): () => void;
}

/** Full provider contract: server API plus browser client. */
export type VideoProvider = VideoProviderServer & VideoProviderClient;
