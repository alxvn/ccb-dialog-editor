import { JSX } from "react/jsx-runtime";
import { SUPPORTED_MODEL_LABEL } from "../../shared/llmConstants";
import { useLlm } from "../context/LlmContext";

export default function ModelDownloadPanel(): JSX.Element {
  const { downloaded, downloading, downloadProgress, error, downloadModel } = useLlm();

  return (
    <section className="panel model-download-panel">
      <h2>LLM Model</h2>
      <p className="model-download-description">
        Download the local model used for NPC reply generation.
      </p>
      <p className="model-download-name">{SUPPORTED_MODEL_LABEL}</p>

      {downloaded && !downloading ? (
        <p className="model-download-ready">Model ready</p>
      ) : null}

      {downloading ? (
        <div className="model-download-progress">
          <div className="model-download-progress-bar">
            <div
              className="model-download-progress-fill"
              style={{ width: `${downloadProgress ?? 0}%` }}
            />
          </div>
          <span className="model-download-progress-label">{downloadProgress ?? 0}%</span>
        </div>
      ) : null}

      {!downloaded && !downloading ? (
        <div className="actions-row">
          <button type="button" onClick={() => void downloadModel()}>
            Download Model
          </button>
        </div>
      ) : null}

      {error ? <p className="model-download-error">{error}</p> : null}

      {error && !downloading ? (
        <div className="actions-row">
          <button type="button" onClick={() => void downloadModel()}>
            Retry Download
          </button>
        </div>
      ) : null}
    </section>
  );
}
