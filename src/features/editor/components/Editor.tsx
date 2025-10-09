import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Save, Upload, Info, Send } from "lucide-react";
import { motion } from "framer-motion";

/**
 * Editor
 * Single‑file, router‑friendly React component for an in‑browser HTML/CSS editor (CITD‑style).
 *
 * MVP checklist implemented:
 *  ✓ Routed through your web app (exported component—mount at /code via your router)
 *  ✓ Logo in background (set via props.logoUrl)
 *  ✓ Editor supports HTML/CSS only (two textareas)
 *  ✓ Button to display instructions (Dialog)
 *  ✓ Submit button
 *  ✓ Tag completion for HTML (auto‑close on ">" after <tag>)
 *
 * Nice‑to‑haves:
 *  ✓ Submissions saved in cache (localStorage)
 *  ✓ Code rendered after submission (sandboxed iframe with srcDoc)
 *
 * Security notes:
 *  - The preview uses a sandboxed <iframe> WITHOUT allow-scripts to block JS. CSS/HTML render fine.
 *  - No network access in preview; user JS is blocked by design.
 */

export type EditorProps = {
    logoUrl?: string;
    cacheKey?: string;
    initialCode?: string;
    instructions?: React.ReactNode;
};

export default function Editor(
    {
        logoUrl,
        cacheKey = "submission",
        initialCode = `<!-- Geeks&& HTML/CSS Editor Example -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    body {
      background: #0b1020;
      color: #e5e7eb;
      font-family: system-ui, sans-serif;
      display: grid;
      place-items: center;
      height: 100vh;
    }
    h1 {
      border: 2px dashed #7c3aed;
      padding: 1rem 2rem;
      border-radius: 0.5rem;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <h1>Hello, Geeks&& Drinks!</h1>
</body>
</html>`,
        instructions,
    }: EditorProps) {
    const htmlRef = useRef<HTMLTextAreaElement | null>(null);
    const cssRef = useRef<HTMLTextAreaElement | null>(null);
    const [code, setCode] = useState<string>(initialCode);
    const [name, setName] = useState<string>("");
    const [submitted, setSubmitted] = useState<boolean>(false);
    const [autoLoadCache, setAutoLoadCache] = useState<boolean>(true);

    // Load cached draft/submission on first mount
    useEffect(() => {
        const raw = localStorage.getItem(cacheKey);
        if (raw) {
            const { code, name } = JSON.parse(raw);
            if (autoLoadCache && typeof code === "string") setCode(code);
            if (typeof name === "string") setName(name);
        }
    }, []);

    // Cache on change (debounced)
    useEffect(() => {
        const t = setTimeout(() => {
            localStorage.setItem(cacheKey, JSON.stringify({ code, name, savedAt: Date.now() }));
        }, 300);
        return () => clearTimeout(t);
    }, [code, name, cacheKey]);

    const srcDoc = useMemo(() => code, [code]);

    // --- Tag Autocomplete (HTML) -------------------------------------------
    const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
        if (e.key !== ">") return;
        const ta = e.currentTarget;
        const value = ta.value;
        const start = ta.selectionStart ?? value.length;
        const before = value.slice(0, start);
        const m = /<([a-zA-Z][a-zA-Z0-9-]*)(?:\s[^<>]*)?>$/.exec(before);
        if (!m) return;
        const tag = m[1].toLowerCase();
        const voids = new Set(["area","base","br","col","embed","hr","img","input","link","meta","param","source","track","wbr"]);
        if (voids.has(tag)) return;
        e.preventDefault();
        const after = value.slice(start);
        const insertion = `></${tag}>`;
        const next = before + insertion + after;
        ta.value = next;
        setCode(next);
        const caretPos = before.length + 1;
        requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = caretPos; ta.focus(); });
    };

    const handleSubmit = () => {
        setSubmitted(true);
    };

    const handleClear = () => {
        setHtml("");
        setCss("");
        setSubmitted(false);
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
    <span className="text-lg">⚡</span>
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
                <li>Edit <strong>HTML</strong> and <strong>CSS</strong> in the tabs.</li>
    <li>Tag auto‑close: type <code>{"<div>"}</code> then <kbd>&gt;</kbd> to insert <code>{"</div>"}</code>.</li>
    <li>No preview until you hit <em>Submit</em> (CITD vibe).</li>
    <li>Submissions save to your browser cache automatically.</li>
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
        <Button variant="outline" size="sm" className="gap-2" onClick={handleClear}>
            <Upload className="h-4 w-4 rotate-180" /> Reset
        </Button>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => {
        try {
            localStorage.setItem(
                cacheKey,
                JSON.stringify({ html, css, name, savedAt: Date.now() })
            );
        } catch {}
    }}>
    <Save className="h-4 w-4" /> Save Draft
    </Button>
    </div>
    </CardHeader>
    <CardContent>
        <Textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-[60vh] w-full resize-y rounded-xl bg-slate-950/60 font-mono text-sm leading-5 text-slate-100 ring-1 ring-white/10 focus-visible:ring-violet-500"
            spellCheck={false}
        />
        <p className="mt-2 text-xs text-slate-400">
            Tip: edit HTML and CSS directly in this single editor, then press <kbd className="rounded bg-slate-800 px-1">Submit</kbd> to preview.
        </p>
    </CardContent>
    </Card>

    {/* Right: Preview (appears after submission) */}
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
            title="CITD Preview"
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
