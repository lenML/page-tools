import React, { useState, useEffect, useCallback, useRef } from "react";
import ReactDOM from "react-dom/client";
import ReactPlayer from "react-player";

const MAX_HISTORY_ITEMS = 50;
const HISTORY_STORAGE_KEY = "vidStreamXHistory";

const getVideoTitle = (url) => {
  try {
    const parsedUrl = new URL(url);
    if (
      parsedUrl.hostname.includes("youtube.com") ||
      parsedUrl.hostname.includes("youtu.be")
    ) {
      return `YouTube: ${
        parsedUrl.searchParams.get("v") || parsedUrl.pathname.slice(1)
      }`;
    }
    const pathParts = parsedUrl.pathname.split("/");
    const fileName = pathParts[pathParts.length - 1];
    return fileName.length > 50
      ? fileName.substring(0, 47) + "..."
      : fileName || url;
  } catch {
    return url.length > 70 ? url.substring(0, 67) + "..." : url;
  }
};

const AppHeader = ({
  inputValue,
  onInputChange,
  onLoadUrl,
  message,
  onToggleHistory,
  gitHubUrl,
}) => {
  useEffect(() => {
    if (typeof feather !== "undefined") {
      feather.replace(); // Ensure icons in header are rendered
    }
  }, [message]); // Re-run if message changes, just in case

  return (
    <header className="app-header">
      <div className="header-top-row">
        <div className="logo">MP4 Player</div>

        <div className="header-controls-row">
          <div className="controls-input-group">
            <input
              type="text"
              value={inputValue}
              onChange={onInputChange}
              onKeyDown={(e) => e.key === "Enter" && onLoadUrl()}
              placeholder="Enter video URL and press Load or Enter"
            />
            <button onClick={onLoadUrl}>Load URL</button>
          </div>
          {message.text && (
            <div className={`header-message ${message.type}`}>
              {message.text}
            </div>
          )}
          {!message.text && <div className="header-message"></div>}{" "}
          {/* Placeholder for height */}
        </div>
        <div className="header-actions">
          <a
            href={gitHubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="github-link"
          >
            View on GitHub
          </a>
          <button
            className="history-toggle-btn"
            onClick={onToggleHistory}
            aria-label="Toggle History"
            title="Toggle History"
          >
            <i data-feather="list"></i>
          </button>
        </div>
      </div>
    </header>
  );
};

const HistorySidebar = ({
  history,
  onPlayFromHistory,
  onClearHistory,
  isOpen,
}) => {
  useEffect(() => {
    if (typeof feather !== "undefined" && isOpen) {
      feather.replace(); // Make sure icons in sidebar are good
    }
  }, [isOpen, history]); // Re-run if history changes while open

  if (!isOpen && history.length === 0) return null; // Don't render if closed and empty for minor perf

  return (
    <aside className={`history-sidebar ${isOpen ? "open" : ""}`}>
      <h3>Playback History</h3>
      {history.length === 0 ? (
        <p style={{ color: "#777", textAlign: "center" }}>No history yet.</p>
      ) : (
        <ul>
          {history.map((item) => (
            <li key={item.id} onClick={() => onPlayFromHistory(item.url)}>
              {item.title}
              <span className="timestamp">
                {new Date(item.timestamp).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}
      {history.length > 0 && (
        <button className="clear-history-btn" onClick={onClearHistory}>
          Clear History
        </button>
      )}
    </aside>
  );
};

const App = () => {
  const [videoUrl, setVideoUrl] = useState("");
  const [inputValue, setInputValue] = useState(""); // Stays in App, passed to Header
  const [message, setMessage] = useState({ text: "", type: "info" }); // Stays in App, passed to Header
  const playerRef = useRef(null);
  const currentObjectUrlRef = useRef(null);

  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [history, setHistory] = useState([]);
  const [isHistorySidebarOpen, setIsHistorySidebarOpen] = useState(false);
  const GITHUB_URL =
    "https://github.com/lenml/page-tools/tree/main/pages/mp4player";

  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (storedHistory) setHistory(JSON.parse(storedHistory));
    } catch (e) {
      console.error("Failed to load history:", e);
    }
  }, []);

  const addToHistory = useCallback((url) => {
    setHistory((prevHistory) => {
      const newHistoryItem = {
        url,
        title: getVideoTitle(url),
        timestamp: Date.now(),
        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      };
      const filteredHistory = prevHistory.filter((item) => item.url !== url);
      const updatedHistory = [newHistoryItem, ...filteredHistory].slice(
        0,
        MAX_HISTORY_ITEMS
      );
      try {
        localStorage.setItem(
          HISTORY_STORAGE_KEY,
          JSON.stringify(updatedHistory)
        );
      } catch (e) {
        console.error("Failed to save history:", e);
      }
      return updatedHistory;
    });
  }, []);

  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(HISTORY_STORAGE_KEY);
    } catch (e) {
      console.error("Failed to clear history:", e);
    }
    setMessage({ text: "Playback history cleared.", type: "info" });
  };

  const playFromHistory = (url) => {
    setNewSource(url); // Use setNewSource to handle object URLs and history addition
    setInputValue(url); // Update input field as well
    setIsHistorySidebarOpen(false);
  };

  const VIDEO_EXTENSIONS = [
    ".mp4",
    ".webm",
    ".ogv",
    ".mov",
    ".m4v",
    ".m3u8",
    ".mpd",
  ];

  const setNewSource = useCallback(
    (newUrl, isObjectUrl = false) => {
      if (
        currentObjectUrlRef.current &&
        currentObjectUrlRef.current !== newUrl
      ) {
        // Avoid revoking the same URL if re-processing
        URL.revokeObjectURL(currentObjectUrlRef.current);
        currentObjectUrlRef.current = null;
      }
      if (isObjectUrl) {
        currentObjectUrlRef.current = newUrl;
      }

      setVideoUrl(newUrl);
      setMessage({
        text: newUrl ? `Playing: ${getVideoTitle(newUrl)}` : "",
        type: "info",
      });
      if (newUrl && !isObjectUrl) {
        addToHistory(newUrl);
      }
    },
    [addToHistory]
  );

  const isValidVideoUrl = (url) => {
    /* ... (same as before) ... */
    if (!url || typeof url !== "string") return false;
    try {
      const parsedUrl = new URL(url);
      return (
        VIDEO_EXTENSIONS.some((ext) =>
          parsedUrl.pathname.toLowerCase().endsWith(ext)
        ) || ReactPlayer.canPlay(url)
      );
    } catch (e) {
      if (url.startsWith("blob:")) return true;
      return (
        VIDEO_EXTENSIONS.some((ext) => url.toLowerCase().endsWith(ext)) ||
        ReactPlayer.canPlay(url)
      );
    }
  };
  const extractUrlFromHtml = (htmlString) => {
    /* ... (same as before) ... */
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlString, "text/html");
      const base = doc.baseURI;

      const tryUrl = (rawUrl) => {
        if (!rawUrl) return null;
        try {
          const absoluteUrl = new URL(rawUrl, base).href;
          if (isValidVideoUrl(absoluteUrl)) return absoluteUrl;
        } catch (e) {
          /* Ignore */
        }
        return null;
      };
      let foundUrl =
        tryUrl(doc.querySelector("video[src]")?.src) ||
        tryUrl(doc.querySelector("video source[src]")?.src) ||
        tryUrl(doc.querySelector("a[href]")?.href);
      if (foundUrl) return foundUrl;
      const linksInText = htmlString.match(/https?:\/\/[^\s"'<>()]+/g) || [];
      for (const link of linksInText) {
        if (isValidVideoUrl(link)) return link;
      }
    } catch (e) {
      console.error("Error parsing HTML:", e);
    }
    return null;
  };

  const handleUrlInputChange = (event) => setInputValue(event.target.value);

  const loadUrlFromInput = () => {
    const trimmedUrl = inputValue.trim();
    if (isValidVideoUrl(trimmedUrl)) {
      setNewSource(trimmedUrl);
      // setInputValue(''); // Keep input value for reference or clear it, user preference
    } else {
      setMessage({
        text: "Invalid or unsupported video URL entered.",
        type: "error",
      });
    }
  };

  const processDroppedOrPastedText = (text) => {
    if (text && isValidVideoUrl(text)) {
      setNewSource(text);
      setInputValue(text);
      return true;
    }
    return false;
  };

  const handlePageDragEnter = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOver(true);
  }, []);
  const handlePageDragLeave = useCallback((event) => {
    if (!event.currentTarget.contains(event.relatedTarget))
      setIsDraggingOver(false);
    event.preventDefault();
    event.stopPropagation();
  }, []);
  const handleDrop = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDraggingOver(false);

      const files = event.dataTransfer.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file.type.startsWith("video/")) {
          const objectURL = URL.createObjectURL(file);
          setNewSource(objectURL, true);
          return;
        }
        setMessage({ text: "Dropped file is not a video.", type: "error" });
        return;
      }
      const htmlContent = event.dataTransfer.getData("text/html");
      if (htmlContent) {
        const extractedUrl = extractUrlFromHtml(htmlContent);
        if (extractedUrl) {
          setNewSource(extractedUrl);
          setInputValue(extractedUrl);
          return;
        }
      }
      const textContent = event.dataTransfer.getData("text/plain");
      if (processDroppedOrPastedText(textContent)) return;

      setMessage({
        text: "No valid video source found in drop.",
        type: "error",
      });
    },
    [setNewSource]
  );
  const handlePageDragOver = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
    setIsDraggingOver(true);
  }, []);
  const handlePaste = useCallback(
    async (event) => {
      if (
        document.activeElement &&
        ["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)
      )
        return;
      event.preventDefault();
      try {
        const text = await navigator.clipboard.readText();
        if (!processDroppedOrPastedText(text.trim())) {
          setMessage({
            text: "Pasted content is not a valid video URL.",
            type: "error",
          });
        }
      } catch (err) {
        console.error("Paste error: ", err);
        setMessage({ text: "Failed to read from clipboard.", type: "error" });
      }
    },
    [setNewSource]
  );

  useEffect(() => {
    const appRoot = document.getElementById("root");
    appRoot.addEventListener("dragenter", handlePageDragEnter);
    appRoot.addEventListener("dragleave", handlePageDragLeave);
    appRoot.addEventListener("dragover", handlePageDragOver);
    appRoot.addEventListener("drop", handleDrop);
    document.addEventListener("paste", handlePaste);
    if (typeof feather !== "undefined") feather.replace();

    return () => {
      appRoot.removeEventListener("dragenter", handlePageDragEnter);
      appRoot.removeEventListener("dragleave", handlePageDragLeave);
      appRoot.removeEventListener("dragover", handlePageDragOver);
      appRoot.removeEventListener("drop", handleDrop);
      document.removeEventListener("paste", handlePaste);
      if (currentObjectUrlRef.current)
        URL.revokeObjectURL(currentObjectUrlRef.current);
    };
  }, [
    handleDrop,
    handlePageDragEnter,
    handlePageDragLeave,
    handlePageDragOver,
    handlePaste,
  ]);

  const showDropZone = !videoUrl || isDraggingOver;

  return (
    <>
      <AppHeader
        inputValue={inputValue}
        onInputChange={handleUrlInputChange}
        onLoadUrl={loadUrlFromInput}
        message={message}
        onToggleHistory={() => setIsHistorySidebarOpen(!isHistorySidebarOpen)}
        gitHubUrl={GITHUB_URL}
      />
      <HistorySidebar
        history={history}
        onPlayFromHistory={playFromHistory}
        onClearHistory={clearHistory}
        isOpen={isHistorySidebarOpen}
      />

      <main className="app-content">
        <div className="player-area">
          {videoUrl && (
            <div className="player-container">
              <div className="player-wrapper">
                <ReactPlayer
                  key={videoUrl}
                  ref={playerRef}
                  className="react-player"
                  url={videoUrl}
                  playing={true}
                  controls={true}
                  width="100%"
                  height="100%"
                  onError={(e, data) => {
                    console.error("ReactPlayer Error:", e, data);
                    setMessage({
                      text: `Error playing video. Try another source.`,
                      type: "error",
                    });
                  }}
                />
              </div>
            </div>
          )}
          <div
            className={`drop-zone ${showDropZone ? "visible" : ""} ${
              isDraggingOver ? "dragging-over" : ""
            }`}
          >
            <span className="drop-zone-text">
              {isDraggingOver
                ? "Drop video here!"
                : "Drag & Drop Video File / URL / HTML Element Here\nOR Paste Video URL anywhere"}
            </span>
          </div>
        </div>
      </main>
    </>
  );
};

const container = document.getElementById("root");
const root = ReactDOM.createRoot(container);
root.render(<App />);
