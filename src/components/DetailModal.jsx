import { useEffect, useState } from "react";
import { listHistory, updateIssue, addHistory, deleteIssue, getSignedUrl } from "../lib/db";

const STATUS = {
  new: { label: "신규", color: "var(--status-new)" },
  pending: { label: "검수대기", color: "var(--status-pending)" },
  clear: { label: "클리어", color: "var(--status-clear)" },
};

export default function DetailModal({ issue, onClose, onChanged, onRework, onDeleted, showToast }) {
  const [history, setHistory] = useState([]);
  const [imageUrl, setImageUrl] = useState(null);
  const [historyUrls, setHistoryUrls] = useState({});
  const [openIdx, setOpenIdx] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = await listHistory(issue.id);
      if (cancelled) return;
      setHistory(rows);
      if (issue.image_path) setImageUrl(await getSignedUrl(issue.image_path));
      const urls = {};
      for (const h of rows) {
        if (h.image_path) urls[h.id] = await getSignedUrl(h.image_path);
      }
      if (!cancelled) setHistoryUrls(urls);
    })();
    return () => {
      cancelled = true;
    };
  }, [issue.id, issue.image_path]);

  async function doTransition(nextStatus) {
    try {
      await updateIssue(issue.id, { status: nextStatus });
      await addHistory(issue.id, { status: nextStatus, comment: "" });
      onChanged();
      onClose();
    } catch (err) {
      showToast("상태 변경 실패: " + err.message);
    }
  }

  async function handleDelete() {
    if (!confirm("이 이슈를 삭제할까요?")) return;
    try {
      await deleteIssue(issue.id);
      onDeleted();
      onClose();
    } catch (err) {
      showToast("삭제 실패: " + err.message);
    }
  }

  const st = STATUS[issue.status] || STATUS.new;
  const actions =
    issue.status === "new"
      ? [{ key: "pending", label: "수정 완료" }]
      : issue.status === "pending"
      ? [
          { key: "clear", label: "클리어 처리" },
          { key: "rework", label: "재수정 요청" },
        ]
      : [{ key: "pending", label: "다시 열기" }];

  return (
    <div className="overlay">
      <div className="modal lg">
        <div className="modal-head">
          <div className="modal-title">
            #{issue.seq} · {issue.type === "design" ? "디자인 QA" : "개발 QA"}
          </div>
          <button className="close-x" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {imageUrl && <img className="detail-img" src={imageUrl} alt="캡쳐" />}
          <div style={{ marginBottom: 14 }}>
            <span
              className="status-pill"
              style={{ background: `color-mix(in srgb, ${st.color} 16%, transparent)`, color: st.color }}
            >
              {st.label}
            </span>
          </div>
          <div className="detail-grid">
            <div>
              <div className="dk">위치</div>
              <div className="dv mono">{issue.location || "-"}</div>
            </div>
            {issue.type === "dev" && (
              <div>
                <div className="dk">영역</div>
                <div className="dv mono">{issue.environment || "-"}</div>
              </div>
            )}
            <div>
              <div className="dk">담당자</div>
              <div className="dv">{issue.assignee || "미배정"}</div>
            </div>
            <div className="detail-item-full">
              <div className="dk">이슈 내용</div>
              <div className="dv">{issue.issue_text}</div>
            </div>
            {issue.type === "dev" && issue.expected_text && (
              <div className="detail-item-full">
                <div className="dk">정상 동작 / 의도</div>
                <div className="dv">{issue.expected_text}</div>
              </div>
            )}
          </div>

          <div className="action-row">
            {actions.map((a) => (
              <button
                key={a.key}
                className="action-btn"
                onClick={() => (a.key === "rework" ? onRework(issue) : doTransition(a.key))}
              >
                {a.label}
              </button>
            ))}
          </div>

          <div className="dk" style={{ marginBottom: 8 }}>히스토리</div>
          <div className="history-list">
            {history
              .slice()
              .reverse()
              .map((h) => {
                const hs = STATUS[h.status];
                const hasImage = !!h.image_path;
                const isOpen = openIdx === h.id;
                return (
                  <div className="history-item" key={h.id}>
                    <span className="history-dot" style={{ background: hs ? hs.color : "var(--ink-faint)" }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        className={"history-ts" + (hasImage ? " clickable" + (isOpen ? " open" : "") : "")}
                        onClick={hasImage ? () => setOpenIdx(isOpen ? null : h.id) : undefined}
                      >
                        {new Date(h.created_at).toLocaleString("ko-KR")} · {hs ? hs.label : h.status}
                        {hasImage && <span className="history-caret"> ▸</span>}
                      </div>
                      <div className="dv">{h.comment}</div>
                      {hasImage && isOpen && (
                        <div className="history-expand">
                          <div className="dk">위치</div>
                          <div className="dv mono">{issue.location || "-"}</div>
                          <div className="dk" style={{ marginTop: 8 }}>이슈 내용</div>
                          <div className="dv">{issue.issue_text}</div>
                          {historyUrls[h.id] && (
                            <img className="history-expand-img" src={historyUrls[h.id]} alt="당시 캡쳐" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
        <div className="modal-foot">
          <button className="ghost-btn action-btn danger" onClick={handleDelete}>삭제</button>
        </div>
      </div>
    </div>
  );
}
