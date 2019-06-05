import React, { useState, useRef, useEffect } from "react";
import { Editor } from "slate-react";
import { initialValue } from "./slateInitialValue";
import { Operation, Value } from "slate";
import io from "socket.io-client";

const serverURL = "http://localhost:4000";
const socket = io(serverURL);

interface Props {
  groupId: string;
}

export const SyncingEditor: React.FC<Props> = ({ groupId }) => {
  const [value, setValue] = useState(initialValue);
  const id = useRef(`${Date.now()}`);
  const editor = useRef<Editor | null>(null);
  const remote = useRef(false);

  useEffect(() => {
    fetch(`${serverURL}/groups/${groupId}`).then(x =>
      x.json().then(data => {
        setValue(Value.fromJSON(data));
      })
    );

    const eventName = `new-remote-operations-${groupId}`;

    socket.on(
      eventName,
      ({ editorId, ops }: { editorId: string; ops: Operation[] }) => {
        if (id.current !== editorId) {
          remote.current = true;
          ops.forEach((op: any) => editor.current!.applyOperation(op));
          remote.current = false;
        }
      }
    );
    return () => {
      socket.off(eventName);
    };
  }, [groupId]);

  return (
    <>
      <button
        style={{
          padding: "0.5em",
          fontSize: "15px",
          margin: "1em 1em 1em 2em"
        }}
        onMouseDown={e => {
          e.preventDefault();
          // bold
          editor.current!.toggleMark("bold");
        }}
      >
        bold
      </button>
      <button
        style={{
          padding: "0.5em",
          fontSize: "15px",
          margin: "1em"
        }}
        onMouseDown={e => {
          e.preventDefault();
          // Italic
          editor.current!.toggleMark("italic");
        }}
      >
        Italic
      </button>
      <button
        style={{
          padding: "0.5em",
          fontSize: "15px",
          margin: "1em"
        }}
        onMouseDown={e => {
          e.preventDefault();
          // code
          editor.current!.toggleMark("code");
        }}
      >
        code
      </button>
      <button
        style={{
          padding: "0.5em",
          fontSize: "15px",
          margin: "1em"
        }}
        onMouseDown={e => {
          e.preventDefault();
          // underlined
          editor.current!.toggleMark("underlined");
        }}
      >
        underlined
      </button>
      <Editor
        ref={editor}
        style={{
          padding: "1em",
          margin: "0 1em 1em 1em",
          backgroundColor: "#f0f0f0",
          maxWidth: 800,
          minHeight: 250,
          border: "solid gray 1px"
        }}
        value={value}
        renderMark={(props, _editor, next) => {
          if (props.mark.type === "bold") {
            return <strong>{props.children}</strong>;
          } else if (props.mark.type === "italic") {
            return <em>{props.children}</em>;
          } else if (props.mark.type === "code") {
            return (
              <code
                style={{
                  backgroundColor: "white",
                  padding: "0.5em",
                  border: "solid gray 1px"
                }}
              >
                {props.children}
              </code>
            );
          } else if (props.mark.type === "underlined") {
            return <u>{props.children}</u>;
          }
          return next();
        }}
        onChange={opts => {
          setValue(opts.value);

          const ops = opts.operations
            .filter(o => {
              if (o) {
                return (
                  o.type !== "set_selection" &&
                  o.type !== "set_value" &&
                  (!o.data || !o.data.has("source"))
                );
              }
              return false;
            })
            .toJS()
            .map((o: any) => ({ ...o, data: { source: "one" } }));

          if (ops.length && !remote.current) {
            socket.emit("new-operations", {
              editorId: id.current,
              ops,
              value: opts.value.toJSON(),
              groupId
            });
          }
        }}
      />
    </>
  );
};
