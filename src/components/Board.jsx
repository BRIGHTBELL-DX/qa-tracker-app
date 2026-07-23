import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { listProjects, createProject, listIssues, subscribeIssues, getSignedUrl } from "../lib/db";
import IssueModal from "./IssueModal";
import ReworkModal from "./ReworkModal";
import DetailModal from "./DetailModal";

const STATUS_COLS = [
  { key: "new", label: "신규", color: "var(--status-new)" },
  { key: "pending", label: "검수대기", color: "var(--status-pending)" },
  { key: "clear", label: "클리어", color: "var(--status-clear)" },
];

function useTheme() {
  const [mode, setMode] = useState(() => {
    const stored = localStorage.getItem("qa-theme");
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", mode);
    localStorage.setItem("qa-theme", mode);
  }, [mode]);
  return [mode, () => setMode((m) => (m === "dark" ? "light" : "dark"))];
}

export default function Board({ session }) {
  const [theme, toggleTheme] = useTheme();
  const [projects, setProjects] = useState([]);
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [issues, setIssues] = useState([]);
  const [typeTab, setTypeTab] = useState("design");
  const [newProjName, setNewProjName] = useState("");
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [reworkIssue, setReworkIssue] = useState(null);
  const [detailIssue, setDetailIssue] = useState(null);
  const [thumbs, setThumbs] = useState({});
  const [toast, setToast] = useState("");

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  }, []);

  useEffect(() => {
    listProjects().then((rows) => {
      setProjects(rows);
      if (rows.length && !currentProjectId) setCurrentProjectId(rows[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reloadIssues = useCallback(() => {
    if (!currentProjectId) return;
    listIssues(currentProjectId).then(setIssues);
  }, [currentProjectId]);

  useEffect(() => {
    reloadIssues();
    if (!currentProjectId) return;
    const unsubscribe = subscribeIssues(currentProjectId, reloadIssues);
    return unsubscribe;
  }, [currentProjectId, reloadIssues]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const entries = {};
      for (const i of issues) {
        if (i.image_path) entries[i.id] = await getSignedUrl(i.image_path);
      }
      if (!cancelled) setThumbs(entries);
    })();
    return () => {
      cancelled = true;
    };
  }, [issues]);

  async function handleAddProject() {
    const name = newProjName.trim();
    if (!name) return;
    const proj = await createProject(name);
    setProjects((p) => [...p, proj]);
    setCurrentProjectId(proj.id);
    setNewProjName("");
  }

  const filteredIssues = useMemo(() => issues.filter((i) => i.type === typeTab), [issues, typeTab]);

  const recentAssignees = useMemo(() => {
    const seen = [];
    for (const i of issues) {
      if (!i.assignee) continue;
      const idx = seen.indexOf(i.assignee);
      if (idx !== -1) seen.splice(idx, 1);
      seen.push(i.assignee);
    }
    return seen.slice(-6).reverse();
  }, [issues]);

  const currentProject = projects.find((p) => p.id === currentProjectId);

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div>
            <div className="brand-mark">Brightbell / DX QA</div>
            <div className="brand-title">QA 트러블슈터</div>
          </div>
          <button className="icon-btn" onClick={toggleTheme} title="라이트/다크 모드 전환">
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        </div>

        <div className="sb-section">
          <div className="sb-label">프로젝트</div>
          <div className="proj-list">
            {projects.map((p) => (
              <button
                key={p.id}
                className={"proj-item" + (p.id === currentProjectId ? " active" : "")}
                onClick={() => setCurrentProjectId(p.id)}
              >
                <span className="proj-item-name">{p.name}</span>
                <span className="proj-item-count">{issues.length && p.id === currentProjectId ? issues.length : ""}</span>
              </button>
            ))}
          </div>
          <div className="new-proj-row">
            <input
              type="text"
              placeholder="새 프로젝트 이름"
              value={newProjName}
              onChange={(e) => setNewProjName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddProject()}
            />
            <button className="icon-btn" onClick={handleAddProject} title="프로젝트 추가">+</button>
          </div>
        </div>

        <div className="sidebar-foot">
          <div className="storage-note">
            {session.user.email} 로 로그인됨 · 팀 전체와 실시간 공유돼요.
          </div>
          <button className="ghost-btn" onClick={() => supabase.auth.signOut()}>로그아웃</button>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div>
            <div className="topbar-title">{currentProject ? currentProject.name : "프로젝트 없음"}</div>
            <div className="topbar-sub">
              {filteredIssues.length} / {issues.length} ISSUES
            </div>
          </div>
          <button
            className="primary-btn"
            disabled={!currentProjectId}
            onClick={() => setShowIssueModal(true)}
          >
            + 새 이슈 등록
          </button>
        </div>

        <div className="type-tabs">
          <button
            className={"type-tab design" + (typeTab === "design" ? " active" : "")}
            onClick={() => setTypeTab("design")}
          >
            디자인 QA
          </button>
          <button
            className={"type-tab dev" + (typeTab === "dev" ? " active" : "")}
            onClick={() => setTypeTab("dev")}
          >
            개발 QA
          </button>
        </div>

        <div className="board">
          {!issues.length ? (
            <div className="empty-state">
              <b>아직 등록된 이슈가 없어요</b>
              <span>화면을 캡쳐하고 "+ 새 이슈 등록"으로 첫 카드를 만들어보세요.</span>
            </div>
          ) : (
            STATUS_COLS.map((col) => {
              const items = filteredIssues.filter((i) => i.status === col.key);
              return (
                <div className="col" key={col.key}>
                  <div className="col-head">
                    <span className="col-dot" style={{ background: col.color }} />
                    <span className="col-name">{col.label}</span>
                    <span className="col-count">{items.length}</span>
                  </div>
                  <div className="col-body">
                    {items.length === 0 ? (
                      <div className="empty-col">없음</div>
                    ) : (
                      items
                        .slice()
                        .reverse()
                        .map((issue) => (
                          <button
                            key={issue.id}
                            className={"card status-" + issue.status}
                            style={{
                              borderLeftColor: issue.type === "design" ? "var(--design-tag)" : "var(--dev-tag)",
                            }}
                            onClick={() => setDetailIssue(issue)}
                          >
                            <div className="card-top">
                              <div className="card-top-left">
                                <span className={"type-tag " + issue.type}>
                                  {issue.type === "design" ? "디자인 QA" : "개발 QA"}
                                </span>
                                {issue.rework_count > 0 && (
                                  <span className="rework-badge">재수정 {issue.rework_count}회</span>
                                )}
                              </div>
                              <span className="card-num">#{issue.seq}</span>
                            </div>
                            <div className="card-loc">{issue.location || "위치 미지정"}</div>
                            <div className="card-issue">{issue.issue_text}</div>
                            <div className="card-bottom">
                              <span className="assignee-badge">
                                <span className="avatar">{(issue.assignee || "?").slice(0, 1)}</span>
                                {issue.assignee || "미배정"}
                              </span>
                            </div>
                          </button>
                        ))
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {showIssueModal && currentProject && (
        <IssueModal
          project={currentProject}
          activeType={typeTab}
          recentAssignees={recentAssignees}
          onClose={() => setShowIssueModal(false)}
          onCreated={reloadIssues}
          showToast={showToast}
        />
      )}

      {reworkIssue && (
        <ReworkModal
          issue={reworkIssue}
          projectId={currentProjectId}
          onClose={() => setReworkIssue(null)}
          onDone={reloadIssues}
          showToast={showToast}
        />
      )}

      {detailIssue && (
        <DetailModal
          issue={detailIssue}
          onClose={() => setDetailIssue(null)}
          onChanged={reloadIssues}
          onDeleted={reloadIssues}
          onRework={(issue) => {
            setDetailIssue(null);
            setReworkIssue(issue);
          }}
          showToast={showToast}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
