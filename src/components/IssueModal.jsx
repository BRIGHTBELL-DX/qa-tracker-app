import { useState } from "react";
import CaptureField from "./CaptureField";
import { createIssue, nextSeq, uploadCapture, addHistory, updateIssue } from "../lib/db";
import { dataUrlToBlob } from "../lib/util";

export default function IssueModal({ project, activeType, recentAssignees, onClose, onCreated, showToast }) {
  const [location, setLocation] = useState("");
  const [environment, setEnvironment] = useState("");
  const [issueText, setIssueText] = useState("");
  const [expectedText, setExpectedText] = useState("");
  const [assignee, setAssignee] = useState(recentAssignees[0] || "");
  const [image, setImage] = useState(null);
  const [busy, setBusy] = useState(false);

  const isDesign = activeType === "design";

  async function handleSubmit(e) {
    e.preventDefault();
    if (!issueText.trim()) {
      showToast("이슈 내용을 입력하세요");
      return;
    }
    setBusy(true);
    try {
      const seq = await nextSeq(project.id);
      const issue = await createIssue({
        project_id: project.id,
        seq,
        type: activeType,
        location: location.trim(),
        environment: isDesign ? "" : environment.trim(),
        issue_text: issueText.trim(),
        expected_text: isDesign ? "" : expectedText.trim(),
        assignee: assignee.trim(),
        image_path: null,
        status: "new",
        rework_count: 0,
      });

      let imagePath = null;
      if (image) {
        imagePath = await uploadCapture(project.id, issue.id, dataUrlToBlob(image));
        await updateIssue(issue.id, { image_path: imagePath });
      }
      await addHistory(issue.id, { status: "new", comment: "등록됨", image_path: imagePath });

      showToast("이슈가 등록되었어요");
      onCreated();
      onClose();
    } catch (err) {
      showToast("등록 실패: " + err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="overlay">
      <div className="modal md">
        <div className="modal-head">
          <div className="modal-title">새 이슈 등록 · {isDesign ? "디자인 QA" : "개발 QA"}</div>
          <button className="close-x" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <CaptureField value={image} onChange={setImage} />

            <div className="field">
              <label className="field-label">위치 {isDesign ? "(피그마 프레임명)" : "(URL / 경로)"}</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={isDesign ? "예: 메인페이지 > 상세 섹션" : "예: /cpo/detail?id=123"}
              />
            </div>

            {!isDesign && (
              <div className="field">
                <label className="field-label">영역</label>
                <input
                  type="text"
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value)}
                  placeholder="예: 프론트, 어드민"
                />
              </div>
            )}

            <div className="field">
              <label className="field-label">
                {isDesign ? "이슈 내용 (시안/가이드와 다른 점)" : "이슈 내용"}
              </label>
              <textarea
                value={issueText}
                onChange={(e) => setIssueText(e.target.value)}
                placeholder={isDesign ? "예: 버튼 색상이 가이드 대비 어둡게 적용됨" : "예: 장바구니 버튼 눌러도 반응 없음"}
              />
            </div>

            {!isDesign && (
              <div className="field">
                <label className="field-label">정상 동작 / 의도</label>
                <textarea
                  value={expectedText}
                  onChange={(e) => setExpectedText(e.target.value)}
                  placeholder="예: 담기 후 하단에 확인 토스트가 떠야 함"
                />
              </div>
            )}

            <div className="field">
              <label className="field-label">담당자</label>
              <input
                type="text"
                list="assignee-datalist"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                placeholder="예: 김OO"
              />
              <datalist id="assignee-datalist">
                {recentAssignees.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
              {recentAssignees.length > 0 && (
                <div className="chip-row" style={{ marginTop: 7 }}>
                  {recentAssignees.map((n) => (
                    <div key={n} className="chip" onClick={() => setAssignee(n)}>
                      {n}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="modal-foot">
            <button type="button" className="ghost-btn" onClick={onClose}>취소</button>
            <button type="submit" className="primary-btn" disabled={busy}>
              {busy ? "등록 중..." : "이슈 등록"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
