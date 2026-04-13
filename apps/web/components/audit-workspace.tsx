"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type ReactNode
} from "react";
import { parseTransactionsCsv, type DriftTransaction } from "@drift/core";
import {
  restoreBehaviorInsights,
  restoreInterceptDecisions,
  type AccountBackupSnapshot
} from "@/lib/account-sync";
import {
  AUDIT_STATE_STORAGE_KEY,
  AUDIT_STORAGE_SECRET_KEY,
  decryptAuditState,
  encryptAuditState,
  getOrCreateAuditStorageSecret,
  isRemovedSyntheticProfileState,
  parsePersistedAuditState,
  serializeAuditState
} from "@/lib/audit-persistence";
import {
  buildDriftScan,
  buildDriftScanFromBackupSummary,
  buildEmptyDriftScan,
  clampProjectionScenario,
  type DriftScan,
  type ProjectionScenario
} from "@/lib/drift-scan";
import { buildAiBehaviorInsight } from "@/lib/ai-behavior-insights";
import type { BehaviorInsight } from "@/lib/behavior-insights";
import type { InterceptDecision } from "@/lib/spend-intercept";
import { applyTransactionEdits, type TransactionEdit } from "@/lib/transaction-edits";

const DEFAULT_SCENARIO: ProjectionScenario = {
  years: 10,
  annualReturnRate: 0.07
};

interface ActiveEvidence {
  transactions: DriftTransaction[] | null;
  sourceLabel: string;
}

interface AuditWorkspaceContextValue {
  activeEvidence: ActiveEvidence;
  applyEvidenceEdit: (sourceHash: string, edit: TransactionEdit) => void;
  editedTransactions: ReturnType<typeof applyTransactionEdits>;
  importError: string | null;
  loadCsvFile: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  loadPlaidTransactions: (
    transactions: DriftTransaction[],
    sourceLabel?: string,
    message?: string
  ) => void;
  restoreAccountBackup: (snapshot: AccountBackupSnapshot) => void;
  behaviorInsights: Record<string, BehaviorInsight>;
  classifyBehaviorInsight: (category: string, answer: string) => Promise<BehaviorInsight>;
  clearLocalAuditState: () => void;
  interceptDecisions: InterceptDecision[];
  lastSyncAt: string | null;
  projectionScenario: ProjectionScenario;
  saveBehaviorInsight: (insight: BehaviorInsight) => void;
  saveInterceptDecision: (decision: InterceptDecision) => void;
  scan: DriftScan;
  setProjectionScenario: (scenario: ProjectionScenario) => void;
  sourceMessage: string | null;
  transactionEdits: Record<string, TransactionEdit>;
}

const AuditWorkspaceContext = createContext<AuditWorkspaceContextValue | null>(null);

export function AuditWorkspaceProvider({ children }: { children: ReactNode }) {
  const [projectionScenario, setProjectionScenarioState] =
    useState<ProjectionScenario>(DEFAULT_SCENARIO);
  const [activeEvidence, setActiveEvidence] = useState<ActiveEvidence>({
    transactions: null,
    sourceLabel: "No data yet"
  });
  const [transactionEdits, setTransactionEdits] = useState<Record<string, TransactionEdit>>({});
  const [scan, setScan] = useState<DriftScan>(() => buildEmptyDriftScan(DEFAULT_SCENARIO));
  const [importError, setImportError] = useState<string | null>(null);
  const [sourceMessage, setSourceMessage] = useState<string | null>(null);
  const [behaviorInsights, setBehaviorInsights] = useState<Record<string, BehaviorInsight>>({});
  const [interceptDecisions, setInterceptDecisions] = useState<InterceptDecision[]>([]);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [hasRestored, setHasRestored] = useState(false);

  const editedTransactions = useMemo(
    () =>
      activeEvidence.transactions
        ? applyTransactionEdits(activeEvidence.transactions, transactionEdits)
        : [],
    [activeEvidence.transactions, transactionEdits]
  );

  useEffect(() => {
    let isMounted = true;

    async function restoreAuditState() {
      const storedState = window.localStorage.getItem(AUDIT_STATE_STORAGE_KEY);
      const storageSecret = getOrCreateAuditStorageSecret(window.localStorage);
      const restored =
        storedState?.startsWith("drift-encrypted:")
          ? await decryptAuditState(storedState, storageSecret)
          : parsePersistedAuditState(storedState);

      if (!isMounted) {
        return;
      }

      if (!restored) {
        setHasRestored(true);
        return;
      }

      if (isRemovedSyntheticProfileState(restored)) {
        window.localStorage.removeItem(AUDIT_STATE_STORAGE_KEY);
        setHasRestored(true);
        return;
      }

      setProjectionScenarioState(restored.projectionScenario);
      setActiveEvidence({
        transactions: restored.transactions,
        sourceLabel: restored.sourceLabel
      });
      setTransactionEdits(restored.transactionEdits);
      setSourceMessage(restored.sourceMessage);
      setBehaviorInsights(restored.behaviorInsights);
      setInterceptDecisions(restored.interceptDecisions);
      setLastSyncAt(restored.lastSyncAt);
      setScanFromTransactions(
        restored.transactions,
        restored.sourceLabel,
        restored.projectionScenario,
        restored.transactionEdits
      );
      setHasRestored(true);
    }

    void restoreAuditState();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hasRestored) {
      return;
    }

    async function persistAuditState() {
      const state = {
        sourceLabel: activeEvidence.sourceLabel,
        sourceMessage,
        projectionScenario,
        transactions: activeEvidence.transactions,
        transactionEdits,
        behaviorInsights,
        interceptDecisions,
        lastSyncAt
      };
      const storageSecret = getOrCreateAuditStorageSecret(window.localStorage);
      const serializedState =
        crypto.subtle
          ? await encryptAuditState(state, storageSecret)
          : serializeAuditState(state);

      window.localStorage.setItem(AUDIT_STATE_STORAGE_KEY, serializedState);
    }

    void persistAuditState();
  }, [
    activeEvidence,
    behaviorInsights,
    hasRestored,
    interceptDecisions,
    lastSyncAt,
    projectionScenario,
    sourceMessage,
    transactionEdits
  ]);

  async function loadCsvFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const csv = await file.text();
      const transactions = parseTransactionsCsv(csv);
      setActiveEvidence({ transactions, sourceLabel: "Imported CSV" });
      setTransactionEdits({});
      setBehaviorInsights({});
      setInterceptDecisions([]);
      setLastSyncAt(new Date().toISOString());
      setSourceMessage(`Imported ${transactions.length} transactions from ${file.name}.`);
      setImportError(null);
      setScanFromTransactions(transactions, "Imported CSV", projectionScenario, {});
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Could not import this CSV.");
    } finally {
      event.target.value = "";
    }
  }

  function loadPlaidTransactions(
    transactions: DriftTransaction[],
    sourceLabel = "Plaid sandbox",
    message = `Synced ${transactions.length} Plaid transactions into your local Drift Scan.`
  ) {
    setActiveEvidence({
      transactions,
      sourceLabel
    });
    setTransactionEdits({});
    setBehaviorInsights({});
    setInterceptDecisions([]);
    setLastSyncAt(new Date().toISOString());
    setSourceMessage(message);
    setImportError(null);
    setScanFromTransactions(transactions, sourceLabel, projectionScenario, {});
  }

  function restoreAccountBackup(snapshot: AccountBackupSnapshot) {
    const restoredScenario = clampProjectionScenario(snapshot.projection_scenario);
    setProjectionScenarioState(restoredScenario);
    setActiveEvidence({
      transactions: null,
      sourceLabel: "Restored backup"
    });
    setTransactionEdits({});
    setBehaviorInsights(restoreBehaviorInsights(snapshot.behavior_insights));
    setInterceptDecisions(restoreInterceptDecisions(snapshot.intercept_decisions));
    setLastSyncAt(new Date().toISOString());
    setSourceMessage("Restored summary backup. Import or sync transactions on this device to review raw evidence rows.");
    setImportError(null);
    setScan(buildDriftScanFromBackupSummary(snapshot.scan_summary, restoredScenario));
  }

  function setProjectionScenario(nextScenario: ProjectionScenario) {
    const clampedScenario = clampProjectionScenario(nextScenario);
    setProjectionScenarioState(clampedScenario);
    setScanFromTransactions(
      activeEvidence.transactions,
      activeEvidence.sourceLabel,
      clampedScenario,
      transactionEdits
    );
  }

  function applyEvidenceEdit(sourceHash: string, edit: TransactionEdit) {
    const originalTransaction = activeEvidence.transactions?.find(
      (transaction) => transaction.sourceHash === sourceHash
    );
    const nextEdit = {
      ...transactionEdits[sourceHash],
      ...edit
    };
    const normalizedCategory = nextEdit.category?.trim();
    const normalizedNote = nextEdit.note?.trim();
    const isOriginalCategory =
      !normalizedCategory ||
      (originalTransaction ? normalizedCategory === originalTransaction.category : false);
    const nextEdits = { ...transactionEdits };

    if (isOriginalCategory && !normalizedNote) {
      delete nextEdits[sourceHash];
    } else {
      nextEdits[sourceHash] = {
        ...(isOriginalCategory ? {} : { category: normalizedCategory }),
        ...(normalizedNote ? { note: normalizedNote } : {})
      };
    }

    setTransactionEdits(nextEdits);
    setScanFromTransactions(
      activeEvidence.transactions,
      activeEvidence.sourceLabel,
      projectionScenario,
      nextEdits
    );
  }

  async function classifyBehaviorInsight(category: string, answer: string): Promise<BehaviorInsight> {
    return buildAiBehaviorInsight(category, answer);
  }

  function saveBehaviorInsight(insight: BehaviorInsight) {
    setBehaviorInsights((current) => ({
      ...current,
      [insight.category]: insight
    }));
  }

  function saveInterceptDecision(decision: InterceptDecision) {
    setInterceptDecisions((current) => [
      decision,
      ...current.filter((item) => item.id !== decision.id)
    ]);
  }

  function clearLocalAuditState() {
    window.localStorage.removeItem(AUDIT_STATE_STORAGE_KEY);
    window.localStorage.removeItem(AUDIT_STORAGE_SECRET_KEY);
    setProjectionScenarioState(DEFAULT_SCENARIO);
    setActiveEvidence({
      transactions: null,
      sourceLabel: "No data yet"
    });
    setTransactionEdits({});
    setBehaviorInsights({});
    setInterceptDecisions([]);
    setLastSyncAt(null);
    setSourceMessage(null);
    setImportError(null);
    setScan(buildEmptyDriftScan(DEFAULT_SCENARIO));
  }

  function setScanFromTransactions(
    transactions: DriftTransaction[] | null,
    sourceLabel: string,
    scenario: ProjectionScenario,
    edits: Record<string, TransactionEdit>
  ) {
    if (!transactions) {
      setScan(buildEmptyDriftScan(scenario));
      return;
    }

    setScan(buildDriftScan(applyTransactionEdits(transactions, edits), sourceLabel, scenario));
  }

  return (
    <AuditWorkspaceContext.Provider
      value={{
        activeEvidence,
        applyEvidenceEdit,
        behaviorInsights,
        classifyBehaviorInsight,
        clearLocalAuditState,
        editedTransactions,
        importError,
        interceptDecisions,
        lastSyncAt,
        loadCsvFile,
        loadPlaidTransactions,
        restoreAccountBackup,
        projectionScenario,
        saveBehaviorInsight,
        saveInterceptDecision,
        scan,
        setProjectionScenario,
        sourceMessage,
        transactionEdits
      }}
    >
      {children}
    </AuditWorkspaceContext.Provider>
  );
}

export function useAuditWorkspace() {
  const context = useContext(AuditWorkspaceContext);

  if (!context) {
    throw new Error("useAuditWorkspace must be used inside AuditWorkspaceProvider");
  }

  return context;
}
