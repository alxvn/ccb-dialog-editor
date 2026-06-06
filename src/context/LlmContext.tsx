import { createContext, useCallback, useContext, useEffect, useMemo, useState, type JSX, type ReactNode } from "react";

type LlmState = {
  downloaded: boolean;
  downloading: boolean;
  downloadProgress: number | null;
  error: string | null;
};

type LlmContextValue = LlmState & {
  downloadModel: () => Promise<void>;
  refreshStatus: () => Promise<void>;
};

const LlmContext = createContext<LlmContextValue | null>(null);

export function LlmProvider({ children }: { children: ReactNode }): JSX.Element {
  const [downloaded, setDownloaded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = useCallback(async (): Promise<void> => {
    try {
      const status = await window.llmApi.getStatus();
      setDownloaded(status.downloaded);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to check model status");
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  const downloadModel = useCallback(async (): Promise<void> => {
    if (downloading) return;
    setDownloading(true);
    setDownloadProgress(0);
    setError(null);
    try {
      await window.llmApi.downloadModel((percent) => {
        setDownloadProgress(percent);
      });
      setDownloaded(true);
      setDownloadProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Model download failed");
      setDownloaded(false);
    } finally {
      setDownloading(false);
    }
  }, [downloading]);

  const value = useMemo(
    (): LlmContextValue => ({
      downloaded,
      downloading,
      downloadProgress,
      error,
      downloadModel,
      refreshStatus,
    }),
    [downloaded, downloading, downloadProgress, error, downloadModel, refreshStatus],
  );

  return <LlmContext.Provider value={value}>{children}</LlmContext.Provider>;
}

export function useLlm(): LlmContextValue {
  const context = useContext(LlmContext);
  if (!context) {
    throw new Error("useLlm must be used within LlmProvider");
  }
  return context;
}
