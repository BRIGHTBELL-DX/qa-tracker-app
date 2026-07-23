import { useRef, useState } from "react";
import Annotator from "./Annotator";

export default function CaptureField({ value, onChange, hint }) {
  const fileRef = useRef(null);
  const [pendingSrc, setPendingSrc] = useState(null);

  function readFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPendingSrc(reader.result);
    reader.readAsDataURL(file);
  }

  function handlePaste(e) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type && item.type.indexOf("image") !== -1) {
        e.preventDefault();
        readFile(item.getAsFile());
        return;
      }
    }
  }

  return (
    <div className="field">
      <span className="field-label">캡쳐 이미지</span>
      <div
        className="shot-zone"
        tabIndex={0}
        onPaste={handlePaste}
        onClick={(e) => e.currentTarget.focus()}
      >
        {value ? (
          <img className="shot-preview" src={value} alt="캡쳐 미리보기" />
        ) : (
          <div className="hint">
            <b>Ctrl+V</b>로 클립보드 이미지를 붙여넣으세요
            <br />
            {hint || "(캡쳐 후 파일 저장 없이 바로 가능해요)"}
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            readFile(e.target.files[0]);
            e.target.value = "";
          }}
        />
        <button type="button" className="ghost-btn" onClick={() => fileRef.current.click()}>
          파일에서 선택
        </button>
      </div>
      {pendingSrc && (
        <Annotator
          src={pendingSrc}
          onCancel={() => setPendingSrc(null)}
          onDone={(finalDataUrl) => {
            setPendingSrc(null);
            onChange(finalDataUrl);
          }}
        />
      )}
    </div>
  );
}
