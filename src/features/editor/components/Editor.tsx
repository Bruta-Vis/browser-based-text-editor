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
    logoUrl?: string; // background watermark
    cacheKey?: string; // customize localStorage key for multiple instances
    initialHTML?: string;
    initialCSS?: string;
    instructions?: React.ReactNode; // optional custom instructions content
};

export default function Editor({
                                             logoUrl,
                                             cacheKey = "citd-submission",
                                             initialHTML = "<!-- Start coding! Only HTML allowed here. -->\n<div class=\"container\">\n  <h1>Hello, Geeks&&</h1>\n  <p>Edit the HTML/CSS, then hit Submit to render.</p>\n</div>",
                                             initialCSS = `/* Only CSS here. No JS. */\n:root { --bg: #0b1020; --ink: #e5e7eb; --accent: #7c3aed; }\nhtml, body { height: 100%; }\n.container { max-width: 720px; margin: 10vh auto; padding: 2rem; border: 2px dashed var(--accent); border-radius: 1rem; }\nh1 { letter-spacing: 0.03em; }\n`,
                                             instructions,
                                         }: EditorProps) {
    const htmlRef = useRef<HTMLTextAreaElement | null>(null);
    const cssRef = useRef<HTMLTextAreaElement | null>(null);

    const [html, setHtml] = useState<string>(initialHTML);
    const [css, setCss] = useState<string>(initialCSS);
    const [name, setName] = useState<string>("");
    const [submitted, setSubmitted] = useState<boolean>(false);
    const [autoLoadCache, setAutoLoadCache] = useState<boolean>(true);

    // Load cached draft/submission on first mount
    useEffect(() => {
        try {
            const raw = localStorage.getItem(cacheKey);
            if (raw) {
                const { html, css, name } = JSON.parse(raw);
                if (autoLoadCache && typeof html === "string") setHtml(html);
                if (autoLoadCache && typeof css === "string") setCss(css);
                if (typeof name === "string") setName(name);
            }
        } catch {}
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Cache on change (debounced)
    useEffect(() => {
        const t = setTimeout(() => {
            try {
                localStorage.setItem(
                    cacheKey,
                    JSON.stringify({ html, css, name, savedAt: Date.now() })
                );
            } catch {}
        }, 300);
        return () => clearTimeout(t);
    }, [html, css, name, cacheKey]);

    // Build srcDoc for preview (scripts blocked by sandbox)
    const srcDoc = useMemo(() => {
        return `
            <!doctype html>
            <html lang="en">
                <head>
                    <meta charset=\"utf-8\" />
                    <meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; style-src 'unsafe-inline'; img-src data:;\"/>
                    <style>
                        html,
                        body{
                            margin:0;
                            background:#0b1020;
                            color:#e5e7eb;
                            font-family:ui-sans-serif,system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif,Apple Color Emoji,Segoe UI Emoji;
                            }
                        ${css}   
                    </style>
                    <title></title>
                </head>
                    <body>
                    ${html}
                    </body>
            </html>`;
    }, [html, css]);

    // --- Tag Autocomplete (HTML) -------------------------------------------
    const handleHTMLKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
        if (e.key !== ">") return; // only on '>' press
        const ta = e.currentTarget;
        const value = ta.value;
        const start = ta.selectionStart ?? value.length;
        const before = value.slice(0, start);

        // Match a just-typed opening tag ending at the caret: <tagName>
        // Allow attributes but capture the tag name right after '<'
        // e.g., <div>, <span class="x">
        const m = /<([a-zA-Z][a-zA-Z0-9-]*)(?:\s[^<>]*)?>$/.exec(before);
        if (!m) return; // not an opening tag context
        const tag = m[1].toLowerCase();

        // Void/self-closing tags should not auto-close
        const voids = new Set([
            "area","base","br","col","embed","hr","img","input","link","meta","param","source","track","wbr"
        ]);
        if (voids.has(tag)) return;

        // Insert closing tag at caret, then reposition caret between tags
        e.preventDefault();
        const after = value.slice(start);
        const insertion = `></${tag}>`;
        const next = before + insertion + after;
        ta.value = next;
        setHtml(next);

        // place caret right after the '>' of opening tag
        const caretPos = before.length + 1; // after the '>' we just inserted
        requestAnimationFrame(() => {
            ta.selectionStart = ta.selectionEnd = caretPos;
            ta.focus();
        });
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
    <Tabs defaultValue="html" className="w-full">
    <TabsList className="grid w-full grid-cols-2">
    <TabsTrigger value="html">HTML</TabsTrigger>
        <TabsTrigger value="css">CSS</TabsTrigger>
        </TabsList>
        <TabsContent value="html" className="mt-3">
    <Textarea
        ref={htmlRef}
    value={html}
    onChange={(e) => setHtml(e.target.value)}
    onKeyDown={handleHTMLKeyDown}
    className="h-[48vh] w-full resize-y rounded-xl bg-slate-950/60 font-mono text-sm leading-5 text-slate-100 ring-1 ring-white/10 focus-visible:ring-violet-500"
    spellCheck={false}
    />
    <p className="mt-2 text-xs text-slate-400">
        Tip: type an opening tag then press <kbd className="rounded bg-slate-800 px-1">&gt;</kbd> to auto‑insert the closing tag.
        </p>
        </TabsContent>
        <TabsContent value="css" className="mt-3">
    <Textarea
        ref={cssRef}
    value={css}
    onChange={(e) => setCss(e.target.value)}
    className="h-[48vh] w-full resize-y rounded-xl bg-slate-950/60 font-mono text-sm leading-5 text-slate-100 ring-1 ring-white/10 focus-visible:ring-violet-500"
    spellCheck={false}
    />
    <div className="mt-3 flex items-center gap-2">
    <Switch id="autoload" checked={autoLoadCache} onCheckedChange={setAutoLoadCache} />
    <Label htmlFor="autoload" className="text-xs text-slate-300">Auto‑load cached draft on open</Label>
    </div>
    </TabsContent>
    </Tabs>
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

    {/* Footer / Routing hint */}
    <footer className="relative z-10 mx-auto max-w-7xl px-4 pb-6 pt-2 text-center text-xs text-slate-500">
        Mount this component on a route like <code>/code</code> in your app. Example (React Router):
    <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-900/60 p-3 text-left">{`
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Editor from './Editor';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/code" element={<Editor logoUrl="/assets/logo.png" />} />
      </Routes>
    </BrowserRouter>
  );
}
        `}</pre>
    </footer>
    </div>
);
}
