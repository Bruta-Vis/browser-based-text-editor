import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Save, Upload, Info, Send } from "lucide-react";
import { motion } from "framer-motion";

export type EditorProps = {
    logoUrl?: string;
    cacheKey?: string;
    initialCode?: string;
    instructions?: React.ReactNode;
};

export default function Editor({
                                   logoUrl,
                                   cacheKey = "submission",
                                   initialCode = `<!-- Geeks&& HTML/CSS Editor Example -->
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Geeks&& Text Editor</title>
    <style>
      * {
        box-sizing: border-box;
      }

      :root {
        --bg: #0b1020;
        --fg: #e5e7eb;
        --accent: #7c3aed;
      }

      html,
      body {
        height: 100%;
      }

      body {
        margin: 0;
        background: var(--bg);
        color: var(--fg);
        font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial,
          "Apple Color Emoji", "Segoe UI Emoji";
        display: grid;
        place-items: center;
        height: 100vh;
      }

      h1 {
        border: 2px dashed var(--accent);
        padding: 1rem 2rem;
        border-radius: 0.5rem;
        font-weight: 600;
      }
    </style>
  </head>

  <body>
    <h1>Hello, Geeks&&!</h1>
    <span>Test</span>
  </body>
</html>`,
                                   instructions,
                               }: EditorProps) {
    // keep an immutable snapshot so Reset always restores the original
    const initialRef = useRef(initialCode);

    const [autoLoadCache, setAutoLoadCache] = useState<boolean>(true);
    const [code, setCode] = useState<string>(initialCode);
    const [name, setName] = useState<string>("");
    const [submitted, setSubmitted] = useState<boolean>(false);
    const [textKey, setTextKey] = useState(0);

    // Load cached draft on mount
    useEffect(() => {
        try {
            const raw = localStorage.getItem(cacheKey);
            if (raw) {
                const { code: cached, name: cachedName } = JSON.parse(raw);
                if (autoLoadCache && typeof cached === "string") {
                    setCode(cached);
                    setTextKey((k) => k + 1); // <-- remount to show cached text
                }
                if (typeof cachedName === "string") setName(cachedName);
            }
        } catch {}
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Cache on change (debounced)
    useEffect(() => {
        const t = setTimeout(() => {
            try {
                localStorage.setItem(cacheKey, JSON.stringify({ code, name, savedAt: Date.now() }));
            } catch {}
        }, 300);
        return () => clearTimeout(t);
    }, [code, name, cacheKey]);

    // The iframe renders the whole document now
    const srcDoc = useMemo(() => code, [code]);


    const handleEditorKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
        const ta = e.currentTarget;
        const INDENT = "\t"; // or "  "

        const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

        // Helper: replace a range using execCommand (gives native undo + input event)
        const replaceRange = (from: number, to: number, text: string, caretPos?: number) => {
            ta.focus();
            ta.setSelectionRange(from, to);
            // insertText creates a single undoable step and fires 'input'
            document.execCommand("insertText", false, text);
            if (typeof caretPos === "number") {
                ta.setSelectionRange(caretPos, caretPos);
            }
        };

        // ---- Tab / Shift+Tab ----
        if (e.key === "Tab") {
            e.preventDefault();
            const start = ta.selectionStart ?? 0;
            const end = ta.selectionEnd ?? 0;
            const value = ta.value;
            const hasSelection = start !== end;

            // Compute line boundaries covering the selection or caret line
            const lineStart = value.lastIndexOf("\n", start - 1) + 1;
            const lineEndIdx = value.indexOf("\n", end);
            const blockStart = lineStart;
            const blockEnd = lineEndIdx === -1 ? value.length : lineEndIdx;

            if (hasSelection) {
                const block = value.slice(blockStart, blockEnd);

                if (e.shiftKey) {
                    // OUTDENT all selected lines (remove one unit if present)
                    const re = new RegExp("^(" + esc(INDENT) + "| {1," + INDENT.length + "})", "gm");
                    const outdented = block.replace(re, "");
                    replaceRange(blockStart, blockEnd, outdented);

                    // Keep selection across affected lines
                    const firstHadIndent = new RegExp("^(" + esc(INDENT) + "| {1," + INDENT.length + "})").test(block);
                    const removedOnFirstLine = firstHadIndent ? INDENT.length : 0;
                    const delta = outdented.length - block.length;
                    const newStart = Math.max(blockStart, start - removedOnFirstLine);
                    const newEnd = Math.max(newStart, end + delta);
                    ta.setSelectionRange(newStart, newEnd);
                } else {
                    // INDENT all selected lines
                    const indented = block.replace(/^/gm, INDENT);
                    replaceRange(blockStart, blockEnd, indented);

                    const lineCount = block.split("\n").length;
                    const delta = INDENT.length * lineCount;
                    ta.setSelectionRange(start + INDENT.length, end + delta);
                }
                return;
            }

            // No selection: single-caret
            if (e.shiftKey) {
                // OUTDENT current line
                const prefix = value.slice(blockStart, blockStart + INDENT.length);
                let removeLen = 0;
                if (prefix === INDENT) removeLen = INDENT.length;
                else if (/^ +$/.test(prefix)) removeLen = Math.min(prefix.length, INDENT.length);

                if (removeLen > 0) {
                    replaceRange(blockStart, blockStart + removeLen, "");
                    const newPos = Math.max(blockStart, start - removeLen);
                    ta.setSelectionRange(newPos, newPos);
                }
            } else {
                // INDENT at caret
                replaceRange(start, end, INDENT);
                // caret is already after inserted indent
            }
            return;
        }

        // ---- HTML tag auto-close on '>' (single undo step) ----
        if (e.key === ">") {
            const start = ta.selectionStart ?? 0;
            const before = ta.value.slice(0, start);
            const m = /<([a-zA-Z][a-zA-Z0-9-]*)(?:\s[^<>]*)?>$/.exec(before);
            if (!m) return;

            const tag = m[1].toLowerCase();
            const voids = new Set(["area","base","br","col","embed","hr","img","input","link","meta","param","source","track","wbr"]);
            if (voids.has(tag)) return;

            e.preventDefault();

            // Insert ">" + closing tag in ONE operation
            const insertion = `></${tag}>`;
            // caret should end up right after the '>'
            const caretAfter = start + 1;
            replaceRange(start, start, insertion, caretAfter);
        }
    };

    const PREVIEW_KEY = "preview-html";
    const handleSubmit = () => {
        try {
            localStorage.setItem(PREVIEW_KEY, code);
        } catch {}
        window.open("/preview.html", "_blank", "noopener,noreferrer");
    };

    const handleReset = () => {
        const original = initialRef.current ?? initialCode;
        setCode(original);
        setSubmitted(false);
        setTextKey((k) => k + 1); // <-- force remount so defaultValue is reapplied
        try {
            localStorage.setItem(cacheKey, JSON.stringify({ code: original, name, savedAt: Date.now() }));
        } catch {}
    };

    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
            {/* background logo watermark */}
            {logoUrl && (
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 opacity-10"
                    style={{
                        backgroundImage: `url(${logoUrl})`,
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "center",
                        backgroundSize: "min(80vmin, 900px)",
                        filter: "grayscale(100%) contrast(120%)",
                    }}
                />
            )}

            <div className="relative z-10 mx-auto grid w-full max-w-7xl grid-cols-1 gap-4 p-4 md:grid-cols-2">
                <motion.header
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="col-span-full flex flex-wrap items-center justify-between gap-3"
                >
                    <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-violet-600/20 ring-1 ring-violet-400/30">
              <img src="/logo.png" alt="" className="h-5 w-5" />
            </span>
                        <h1 className="text-xl font-semibold tracking-tight text-slate-100">
                            HTML/CSS Editor
                        </h1>
                    </div>

                    <div className="flex items-center gap-2">
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="secondary" size="sm" className="gap-2">
                                    <Info className="h-4 w-4" /> Instructions
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                    <DialogTitle>How it works</DialogTitle>
                                </DialogHeader>
                                <div className="prose prose-invert max-w-none text-sm">
                                    {instructions ?? (
                                        <ul className="list-disc pl-5">
                                            <li>Edit a full HTML document (you can include a &lt;style&gt; block).</li>
                                            <li>Tag auto-close: type <code>{"<div>"}</code> then press <kbd>&gt;</kbd> to insert <code>{"</div>"}</code>.</li>
                                            <li>No preview until you hit <em>Submit</em>.</li>
                                            <li>Drafts save automatically to your browser.</li>
                                            <li>Preview is sandboxed—JS is blocked by design.</li>
                                        </ul>
                                    )}
                                </div>
                            </DialogContent>
                        </Dialog>

                        <Button onClick={handleSubmit} className="gap-2">
                            <Send className="h-4 w-4" /> Submit
                        </Button>
                    </div>
                </motion.header>

                {/* Left: Editor */}
                <Card className="backdrop-blur supports-[backdrop-filter]:bg-slate-900/40">
                    <CardHeader className="flex flex-row items-center justify-between gap-3">
                        <CardTitle className="text-slate-100">Editor</CardTitle>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                <Label htmlFor="author" className="text-xs text-slate-300">Name</Label>
                                <Input
                                    id="author"
                                    placeholder="Optional"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="h-8 w-40 bg-slate-950/60 text-slate-100 placeholder-slate-400 ring-1 ring-white/10 focus-visible:ring-violet-500"
                                />
                            </div>
                            <Button variant="outline" size="sm" className="gap-2" onClick={handleReset}>
                                <Upload className="h-4 w-4 rotate-180" /> Reset
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-2"
                                onClick={() => {
                                    try {
                                        localStorage.setItem(cacheKey, JSON.stringify({ code, name, savedAt: Date.now() }));
                                    } catch {}
                                }}
                            >
                                <Save className="h-4 w-4" /> Save Draft
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            key={textKey}                                   // remounts when key changes
                            defaultValue={code}                             // initial content only
                            onInput={(e) => setCode(e.currentTarget.value)} // keep state in sync
                            onKeyDown={handleEditorKeyDown}
                            className="h-[60vh] w-full resize-y rounded-xl bg-slate-950/60 font-mono text-sm leading-5 text-slate-100 ring-1 ring-white/10 focus-visible:ring-violet-500"
                            spellCheck={false}
                        />
                        <div className="mt-3 flex items-center gap-2">
                            <Switch id="autoload" checked={autoLoadCache} onCheckedChange={setAutoLoadCache} />
                            <Label htmlFor="autoload" className="text-xs text-slate-300">Auto-load cached draft on open</Label>
                        </div>
                    </CardContent>
                </Card>

                {/* Right: Preview */}
                <Card className="relative backdrop-blur supports-[backdrop-filter]:bg-slate-900/40">
                    <CardHeader>
                        <CardTitle className="text-slate-100">Preview</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {!submitted ? (
                            <div className="flex h-[60vh] w-full items-center justify-center rounded-xl border border-dashed border-white/15 bg-slate-950/40 p-6 text-center text-sm text-slate-400">
                                Press <span className="mx-1 rounded bg-slate-800 px-1 text-slate-200">Submit</span> to render your HTML/CSS here.
                            </div>
                        ) : (
                            <iframe
                                title="Preview"
                                sandbox="allow-forms"
                                srcDoc={srcDoc}
                                className="h-[60vh] w-full rounded-xl bg-transparent"
                                style={{ backgroundColor: "transparent" }}
                            />
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
