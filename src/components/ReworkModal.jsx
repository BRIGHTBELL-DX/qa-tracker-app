import { useState } from "react";
import CaptureField from "./CaptureField";
import { updateIssue, uploadCapture, addHistory } from "../lib/db";
import { dataUrlToBlob } from "../lib/util";

export default function ReworkModal({ issue, projectId, onClose, onDone, showToast }) {
  const [image, setImage] = useState(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!comment.trim()) {
      showToast("재수정 사유를 입력하세요");
      return;
    }
    setBusy(true);
    try {
      let imagePath = null;
      if (image) {
        imagePath = await uploadCapture(projectId, issue.id, dataUrlToBlob(image));
      }
      await updateIssue(issue.id, {
        status: "new",
        rework_count: (issue.rework_count || 0) + 1,
        ...(imagePath ? { image_path: imagePath } : {}),
      });
      await addHistory(issue.id, {
        status: "new",
        comment: "[재수정 요청] " + comment.trim(),
        image_path: imagePath,
      });
      showToast("재수정 요청으로 전환했어요");
      onDone();
      onClose();
    } catch (err) {
      showToast("처리 실패: " + err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="overlay">
      <div className="modal md">
        <div className="modal-head">
          <div className="modal-title">재수정 요청</div>
          <button className="close-x" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <CaptureField value={image} onChange={setImage} hint="재확인 캡쳐 (선택)" />
            <div className="field">
              <label className="field-label">재수정 사유 / 확인 결과</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="예: 버튼은 눌리는데 토스트 문구가 아직 이상함"
              />
            </div>
          </div>
          <div className="modal-foot">
            <button type="button" className="ghost-btn" onClick={onClose}>취소</button>
            <button type="submit" className="primary-btn" disabled={busy}>
              {busy ? "처리 중..." : "재수정 요청"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
