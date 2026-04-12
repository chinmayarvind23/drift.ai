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
  AUDIT_STATE_STORAGE_KEY,
  decryptAuditState,
  encryptAuditState,
  getOrCreateAuditStorageSecret,
  isRemovedSyntheticProfileState,
  parsePersistedAuditState,
  serializeAuditState
} from "@/lib/audit-persistence";
import {
  buildDemoDriftScan,
  buildDriftScan,
  clampProjectionScenario,
  type DriftScan,
  type ProjectionScenario
} from "@/lib/drift-scan";
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
  projectionScenario: ProjectionScenario;
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
    sourceLabel: "Demo data"
  });
  const [transactionEdits, setTransactionEdits] = useState<Record<string, TransactionEdit>>({});
  const [scan, setScan] = useState<DriftScan>(() => buildDemoDriftScan(DEFAULT_SCENARIO));
  const [importError, setImportError] = useState<string | null>(null);
  const [sourceMessage, setSourceMessage] = useState<string | null>(null);
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
        transactionEdits
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
    hasRestored,
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
    setSourceMessage(message);
    setImportError(null);
    setScanFromTransactions(transactions, sourceLabel, projectionScenario, {});
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
    const nextEdits = {
      ...transactionEdits,
      [sourceHash]: {
        ...transactionEdits[sourceHash],
        ...edit
      }
    };

    setTransactionEdits(nextEdits);
    setScanFromTransactions(
      activeEvidence.transactions,
      activeEvidence.sourceLabel,
      projectionScenario,
      nextEdits
    );
  }

  function setScanFromTransactions(
    transactions: DriftTransaction[] | null,
    sourceLabel: string,
    scenario: ProjectionScenario,
    edits: Record<string, TransactionEdit>
  ) {
    if (!transactions) {
      setScan(buildDemoDriftScan(scenario));
      return;
    }

    setScan(buildDriftScan(applyTransactionEdits(transactions, edits), sourceLabel, scenario));
  }

  return (
    <AuditWorkspaceContext.Provider
      value={{
        activeEvidence,
        applyEvidenceEdit,
        editedTransactions,
        importError,
        loadCsvFile,
        loadPlaidTransactions,
        projectionScenario,
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
