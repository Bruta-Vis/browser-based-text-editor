import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { cn } from "@/lib/utils"

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

export function DialogContent({
                                  className,
                                  ...props
                              }: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>) {
    return (
        <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay
                className={cn(
                    "fixed inset-0 z-50",
                    "bg-slate-950/80 backdrop-blur-sm",       // <— dark, blurred overlay
                    "data-[state=open]:animate-in data-[state=closed]:animate-out",
                    "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
                )}
            />
            <DialogPrimitive.Content
                className={cn(
                    "fixed left-1/2 top-1/2 z-50 w-[95vw] max-w-3xl -translate-x-1/2 -translate-y-1/2",
                    "rounded-lg border bg-slate-950/95 text-slate-100 border-white/10 shadow-lg shadow-black/30",
                    "border-white shadow-lg shadow-black/30",
                    "outline-none",
                    "data-[state=open]:animate-in data-[state=closed]:animate-out",
                    "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                    "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
                    "data-[state=closed]:slide-out-to-top-1/2 data-[state=open]:slide-in-from-top-1/2",
                    className
                )}
                style={{ borderColor: "#b733e888" }}
                {...props}
            />
        </DialogPrimitive.Portal>
    )
}

export function DialogHeader(
    props: React.HTMLAttributes<HTMLDivElement>
) {
    return (
        <div
            {...props}
            className={cn(
                "flex flex-col space-y-1.5 px-5 pt-5 pb-3",
                props.className
            )}
        />
    )
}

export function DialogTitle(
    props: React.HTMLAttributes<HTMLHeadingElement>
) {
    return (
        <h2
            {...props}
            className={cn(
                "text-lg font-semibold tracking-tight text-slate-100",
                props.className
            )}
        />
    )
}

export const DialogDescription = DialogPrimitive.Description
