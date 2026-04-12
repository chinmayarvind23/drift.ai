import type { DriftTransaction } from "@drift/core";
import type { ProjectionScenario } from "./drift-scan";
import type { TransactionEdit } from "./transaction-edits";

export const AUDIT_STATE_STORAGE_KEY = "drift.audit.v1";

const AUDIT_STATE_VERSION = 1;
const ENCRYPTED_AUDIT_STATE_VERSION = 2;
const ENCRYPTION_PREFIX = "drift-encrypted:";

export interface PersistedAuditState {
  sourceLabel: string;
  sourceMessage: string | null;
  selectedSyntheticUserId: string | null;
  projectionScenario: ProjectionScenario;
  transactions: DriftTransaction[] | null;
  transactionEdits: Record<string, TransactionEdit>;
}

interface PersistedAuditStateEnvelope {
  version: typeof AUDIT_STATE_VERSION;
  state: PersistedAuditState;
}

export function serializeAuditState(state: PersistedAuditState): string {
  return JSON.stringify({
    version: AUDIT_STATE_VERSION,
    state
  } satisfies PersistedAuditStateEnvelope);
}

export function parsePersistedAuditState(value: string | null): PersistedAuditState | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<PersistedAuditStateEnvelope>;

    if (parsed.version !== AUDIT_STATE_VERSION || !parsed.state) {
      return null;
    }

    return parsed.state;
  } catch {
    return null;
  }
}

export async function encryptAuditState(
  state: PersistedAuditState,
  secret: string
): Promise<string> {
  const encodedState = new TextEncoder().encode(serializeAuditState(state));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveEncryptionKey(secret);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encodedState);

  return `${ENCRYPTION_PREFIX}${JSON.stringify({
    version: ENCRYPTED_AUDIT_STATE_VERSION,
    iv: encodeBase64(iv),
    payload: encodeBase64(new Uint8Array(encrypted))
  })}`;
}

export async function decryptAuditState(
  value: string,
  secret: string
): Promise<PersistedAuditState | null> {
  if (!value.startsWith(ENCRYPTION_PREFIX)) {
    return parsePersistedAuditState(value);
  }

  try {
    const envelope = JSON.parse(value.slice(ENCRYPTION_PREFIX.length)) as {
      version?: number;
      iv?: string;
      payload?: string;
    };

    if (
      envelope.version !== ENCRYPTED_AUDIT_STATE_VERSION ||
      !envelope.iv ||
      !envelope.payload
    ) {
      return null;
    }

    const key = await deriveEncryptionKey(secret);
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: decodeBase64(envelope.iv) },
      key,
      decodeBase64(envelope.payload)
    );

    return parsePersistedAuditState(new TextDecoder().decode(decrypted));
  } catch {
    return null;
  }
}

export function getOrCreateAuditStorageSecret(storage: Storage): string {
  const key = "drift.audit.local_key.v1";
  const existingSecret = storage.getItem(key);

  if (existingSecret) {
    return existingSecret;
  }

  const secret = encodeBase64(crypto.getRandomValues(new Uint8Array(32)));
  storage.setItem(key, secret);

  return secret;
}

function encodeBase64(value: Uint8Array): string {
  let binary = "";

  value.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary);
}

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

async function deriveEncryptionKey(secret: string): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode("drift-local-audit-state"),
      iterations: 120_000,
      hash: "SHA-256"
    },
    keyMaterial,
    {
      name: "AES-GCM",
      length: 256
    },
    false,
    ["encrypt", "decrypt"]
  );
}
