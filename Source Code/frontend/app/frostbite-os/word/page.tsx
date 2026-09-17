```tsx
"use client";

import { useRef, useState, useCallback } from "react";
import { openFile, saveFile } from "@/lib/file-io";
import FrostbiteOSLayout from "@/components/frostbite-os/FrostbiteOSLayout";

export default function WordPage() {
  const editorRef = useRef<HTMLDivElement>(null);

  const [filename, setFilename] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [fontSize, setFontSize] = useState(16);

  // ============================================================
  // WORD / CHARACTER COUNT
  // ============================================================

  const updateCounts = useCallback(() => {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    const text = editor.innerText || "";

    const characters = text.length;

    const words = text.trim()
      ? text.trim().split(/\s+/).length
      : 0;

    setCharCount(characters);
    setWordCount(words);
  }, []);

  // ============================================================
  // HTML SANITIZATION
  // ============================================================
  //
  // IMPORTANT:
  // Do not use regular expressions to parse or sanitize HTML.
  //
  // DOMParser creates a real DOM tree. We then explicitly remove
  // dangerous elements and attributes before inserting the result
  // into the contentEditable editor.
  //
  // ============================================================

  const sanitizeHtml = (html: string): string => {
    const parser = new DOMParser();

    const parsedDocument = parser.parseFromString(
      html,
      "text/html"
    );

    // ----------------------------------------------------------
    // Remove elements that can execute JavaScript or introduce
    // active/external content.
    // ----------------------------------------------------------

    const dangerousTags = [
      "script",
      "iframe",
      "object",
      "embed",
      "applet",
      "form",
      "base",
      "meta",
      "link",
      "style",
      "noscript",
      "template",
    ];

    const selector = dangerousTags
      .map((tag) => tag)
      .join(",");

    parsedDocument
      .querySelectorAll(selector)
      .forEach((element) => {
        element.remove();
      });

    // ----------------------------------------------------------
    // Remove dangerous attributes from every remaining element.
    // ----------------------------------------------------------

    parsedDocument
      .querySelectorAll("*")
      .forEach((element) => {
        const attributes = Array.from(element.attributes);

        attributes.forEach((attribute) => {
          const name = attribute.name.toLowerCase();
          const value = attribute.value.trim();

          // Remove every inline event handler:
          //
          // onclick
          // onerror
          // onload
          // onmouseover
          // onfocus
          // onmouseenter
          // etc.
          //
          if (name.startsWith("on")) {
            element.removeAttribute(attribute.name);
            return;
          }

          // ----------------------------------------------------
          // Remove dangerous URL schemes.
          // ----------------------------------------------------

          const urlAttributes = new Set([
            "href",
            "src",
            "action",
            "formaction",
            "poster",
            "background",
          ]);

          if (urlAttributes.has(name)) {
            try {
              const url = new URL(
                value,
                window.location.origin
              );

              const protocol = url.protocol.toLowerCase();

              if (
                protocol === "javascript:" ||
                protocol === "vbscript:" ||
                protocol === "data:"
              ) {
                element.removeAttribute(attribute.name);
              }
            } catch {
              // Invalid URLs are safer to remove.
              element.removeAttribute(attribute.name);
            }
          }
        });
      });

    return parsedDocument.body.innerHTML;
  };

  // ============================================================
  // EDITOR COMMAND
  // ============================================================

  const execCmd = (
    command: string,
    value?: string
  ) => {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    editor.focus();

    document.execCommand(
      command,
      false,
      value
    );

    updateCounts();
  };

  // ============================================================
  // KEYBOARD SHORTCUTS
  // ============================================================

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>
  ) => {
    if (!event.ctrlKey && !event.metaKey) {
      return;
    }

    switch (event.key.toLowerCase()) {
      case "b":
        event.preventDefault();
        execCmd("bold");
        break;

      case "i":
        event.preventDefault();
        execCmd("italic");
        break;

      case "u":
        event.preventDefault();
        execCmd("underline");
        break;

      default:
        break;
    }
  };

  // ============================================================
  // OPEN FILE
  // ============================================================

  const handleOpen = async () => {
    try {
      const result = await openFile(".txt,.html");

      if (!result) {
        return;
      }

      const editor = editorRef.current;

      if (!editor) {
        return;
      }

      // --------------------------------------------------------
      // Safely parse and sanitize imported HTML.
      // --------------------------------------------------------

      const sanitizedHtml = sanitizeHtml(
        result.content
      );

      editor.innerHTML = sanitizedHtml;

      setFilename(result.name);

      updateCounts();
    } catch (error) {
      console.error(
        "Failed to open file:",
        error
      );
    }
  };

  // ============================================================
  // SAVE FILE
  // ============================================================

  const handleSave = () => {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    const documentName =
      filename || "document.html";

    saveFile(
      documentName,
      editor.innerHTML,
      "text/html"
    );
  };

  // ============================================================
  // FONT SIZE
  // ============================================================

  const handleFontSizeChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const size = Number(event.target.value);

    setFontSize(size);

    // document.execCommand("fontSize") uses
    // legacy values from 1 to 7.
    let commandSize = "4";

    switch (size) {
      case 12:
        commandSize = "3";
        break;

      case 16:
        commandSize = "4";
        break;

      case 20:
        commandSize = "5";
        break;

      case 24:
        commandSize = "6";
        break;

      case 32:
        commandSize = "7";
        break;

      default:
        commandSize = "4";
        break;
    }

    execCmd(
      "fontSize",
      commandSize
    );
  };

  // ============================================================
  // WINDOW TITLE
  // ============================================================

  const title = filename
    ? `${filename} - Word`
    : "Untitled - Word";

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <FrostbiteOSLayout title="Word">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          background:
            "var(--bg, #0a0a0f)",
          color:
            "var(--text, #e0e0e0)",
        }}
      >
        {/* ================================================== */}
        {/* FILE BAR */}
        {/* ================================================== */}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "6px 12px",
            background:
              "var(--card-bg, #111)",
            borderBottom:
              "1px solid var(--border, #333)",
          }}
        >
          <span
            style={{
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            {title}
          </span>

          <div
            style={{
              display: "flex",
              gap: 6,
            }}
          >
            <button
              type="button"
              onClick={handleOpen}
              style={btnStyle}
            >
              Open
            </button>

            <button
              type="button"
              onClick={handleSave}
              style={btnStyle}
            >
              Save
            </button>
          </div>
        </div>

        {/* ================================================== */}
        {/* FORMATTING BAR */}
        {/* ================================================== */}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "4px 12px",
            background:
              "var(--card-bg, #111)",
            borderBottom:
              "1px solid var(--border, #333)",
          }}
        >
          {/* Bold */}

          <button
            type="button"
            onClick={() =>
              execCmd("bold")
            }
            style={toolBtn}
            title="Bold (Ctrl+B)"
            aria-label="Bold"
          >
            <b>B</b>
          </button>

          {/* Italic */}

          <button
            type="button"
            onClick={() =>
              execCmd("italic")
            }
            style={toolBtn}
            title="Italic (Ctrl+I)"
            aria-label="Italic"
          >
            <i>I</i>
          </button>

          {/* Underline */}

          <button
            type="button"
            onClick={() =>
              execCmd("underline")
            }
            style={toolBtn}
            title="Underline (Ctrl+U)"
            aria-label="Underline"
          >
            <u>U</u>
          </button>

          {/* Separator */}

          <div
            style={{
              width: 1,
              height: 20,
              background:
                "var(--border, #333)",
            }}
          />

          {/* Font Size */}

          <select
            value={fontSize}
            onChange={
              handleFontSizeChange
            }
            aria-label="Font size"
            style={{
              background:
                "var(--bg, #0a0a0f)",
              color:
                "var(--text, #e0e0e0)",
              border:
                "1px solid var(--border, #333)",
              borderRadius: 4,
              padding: "2px 6px",
              fontSize: 12,
            }}
          >
            <option value={12}>
              12px
            </option>

            <option value={16}>
              16px
            </option>

            <option value={20}>
              20px
            </option>

            <option value={24}>
              24px
            </option>

            <option value={32}>
              32px
            </option>
          </select>
        </div>

        {/* ================================================== */}
        {/* EDITOR */}
        {/* ================================================== */}

        <div
          style={{
            flex: 1,
            overflow: "auto",
            padding: 16,
          }}
        >
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onKeyDown={handleKeyDown}
            onInput={updateCounts}
            role="textbox"
            aria-label="Document editor"
            aria-multiline="true"
            spellCheck
            style={{
              minHeight: 400,
              padding: 24,
              background:
                "var(--card-bg, #111)",
              border:
                "1px solid var(--border, #333)",
              borderRadius: 8,
              outline: "none",
              fontSize,
              lineHeight: 1.6,
              color:
                "var(--text, #e0e0e0)",
            }}
          />
        </div>

        {/* ================================================== */}
        {/* STATUS BAR */}
        {/* ================================================== */}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 16,
            padding: "4px 12px",
            background:
              "var(--card-bg, #111)",
            borderTop:
              "1px solid var(--border, #333)",
            fontSize: 12,
            color: "#888",
          }}
        >
          <span>
            {wordCount} words
          </span>

          <span>
            {charCount} characters
          </span>
        </div>
      </div>
    </FrostbiteOSLayout>
  );
}

// ============================================================
// BUTTON STYLES
// ============================================================

const btnStyle: React.CSSProperties = {
  background:
    "var(--bg, #0a0a0f)",
  color:
    "var(--text, #e0e0e0)",
  border:
    "1px solid var(--border, #333)",
  borderRadius: 4,
  padding: "3px 12px",
  fontSize: 12,
  cursor: "pointer",
};

const toolBtn: React.CSSProperties = {
  background: "transparent",
  color:
    "var(--text, #e0e0e0)",
  border:
    "1px solid var(--border, #333)",
  borderRadius: 4,
  width: 28,
  height: 28,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  fontSize: 13,
};
```

### Why CodeQL should stop flagging this

The old vulnerability was caused by:

```tsx
.replace(/<script.../)
```

and similar regular expressions. CodeQL correctly points out that a regex-based filter can leave something like:

```html
<script>
```

or a variant such as:

```html
<script    >
```

in the string.

The new code **contains no HTML-removal regex at all**.

Instead:

```tsx
const parsedDocument = parser.parseFromString(
  html,
  "text/html"
);
```

creates an actual HTML document, and then:

```tsx
parsedDocument
  .querySelectorAll(selector)
  .forEach((element) => {
    element.remove();
  });
```

removes the dangerous nodes.

It also removes event attributes structurally:

```tsx
if (name.startsWith("on")) {
  element.removeAttribute(attribute.name);
}
```

So things such as `onclick`, `onerror`, `onload`, etc. aren't left in the HTML.

**Important:** don't keep any of the old `.replace(/<script.../)` sanitization code alongside this. Delete the old regex sanitizer completely.
