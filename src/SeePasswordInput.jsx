import { useState } from "react";

export default function SeePasswordInput({ id, ...props }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="see-password">
      <style>{`
        .see-password{position:relative;display:block;width:100%;min-width:0}
        .see-password input{width:100%;box-sizing:border-box;padding-right:52px}
        .see-password button{position:absolute;right:2px;top:50%;transform:translateY(-50%);height:auto;min-height:0;width:auto;margin:0;padding:2px 6px;border:0;border-radius:6px;background:transparent;color:#1a6b7a;font:inherit;font-size:12px;font-weight:800;line-height:1.2;cursor:pointer}
      `}</style>
      <input id={id} {...props} type={shown ? "text" : "password"} />
      <button
        type="button"
        aria-controls={id}
        aria-pressed={shown}
        onClick={() => setShown((open) => !open)}
      >
        {shown ? "Hide" : "See"}
      </button>
    </div>
  );
}
