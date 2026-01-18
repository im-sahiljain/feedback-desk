(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/hooks/use-toast.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "reducer",
    ()=>reducer,
    "toast",
    ()=>toast,
    "useToast",
    ()=>useToast
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
;
const TOAST_LIMIT = 1;
const TOAST_REMOVE_DELAY = 1000000;
const actionTypes = {
    ADD_TOAST: "ADD_TOAST",
    UPDATE_TOAST: "UPDATE_TOAST",
    DISMISS_TOAST: "DISMISS_TOAST",
    REMOVE_TOAST: "REMOVE_TOAST"
};
let count = 0;
function genId() {
    count = (count + 1) % Number.MAX_SAFE_INTEGER;
    return count.toString();
}
const toastTimeouts = new Map();
const addToRemoveQueue = (toastId)=>{
    if (toastTimeouts.has(toastId)) {
        return;
    }
    const timeout = setTimeout(()=>{
        toastTimeouts.delete(toastId);
        dispatch({
            type: "REMOVE_TOAST",
            toastId: toastId
        });
    }, TOAST_REMOVE_DELAY);
    toastTimeouts.set(toastId, timeout);
};
const reducer = (state, action)=>{
    switch(action.type){
        case "ADD_TOAST":
            return {
                ...state,
                toasts: [
                    action.toast,
                    ...state.toasts
                ].slice(0, TOAST_LIMIT)
            };
        case "UPDATE_TOAST":
            return {
                ...state,
                toasts: state.toasts.map((t)=>t.id === action.toast.id ? {
                        ...t,
                        ...action.toast
                    } : t)
            };
        case "DISMISS_TOAST":
            {
                const { toastId } = action;
                // ! Side effects ! - This could be extracted into a dismissToast() action,
                // but I'll keep it here for simplicity
                if (toastId) {
                    addToRemoveQueue(toastId);
                } else {
                    state.toasts.forEach((toast)=>{
                        addToRemoveQueue(toast.id);
                    });
                }
                return {
                    ...state,
                    toasts: state.toasts.map((t)=>t.id === toastId || toastId === undefined ? {
                            ...t,
                            open: false
                        } : t)
                };
            }
        case "REMOVE_TOAST":
            if (action.toastId === undefined) {
                return {
                    ...state,
                    toasts: []
                };
            }
            return {
                ...state,
                toasts: state.toasts.filter((t)=>t.id !== action.toastId)
            };
    }
};
const listeners = [];
let memoryState = {
    toasts: []
};
function dispatch(action) {
    memoryState = reducer(memoryState, action);
    listeners.forEach((listener)=>{
        listener(memoryState);
    });
}
function toast({ ...props }) {
    const id = genId();
    const update = (props)=>dispatch({
            type: "UPDATE_TOAST",
            toast: {
                ...props,
                id
            }
        });
    const dismiss = ()=>dispatch({
            type: "DISMISS_TOAST",
            toastId: id
        });
    dispatch({
        type: "ADD_TOAST",
        toast: {
            ...props,
            id,
            open: true,
            onOpenChange: (open)=>{
                if (!open) dismiss();
            }
        }
    });
    return {
        id: id,
        dismiss,
        update
    };
}
function useToast() {
    _s();
    const [state, setState] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"](memoryState);
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"]({
        "useToast.useEffect": ()=>{
            listeners.push(setState);
            return ({
                "useToast.useEffect": ()=>{
                    const index = listeners.indexOf(setState);
                    if (index > -1) {
                        listeners.splice(index, 1);
                    }
                }
            })["useToast.useEffect"];
        }
    }["useToast.useEffect"], [
        state
    ]);
    return {
        ...state,
        toast,
        dismiss: (toastId)=>dispatch({
                type: "DISMISS_TOAST",
                toastId
            })
    };
}
_s(useToast, "SPWE98mLGnlsnNfIwu/IAKTSZtk=");
;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/utils.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "cn",
    ()=>cn
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/clsx/dist/clsx.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/tailwind-merge/dist/bundle-mjs.mjs [app-client] (ecmascript)");
;
;
function cn(...inputs) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["twMerge"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clsx"])(inputs));
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/ui/toast.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Toast",
    ()=>Toast,
    "ToastAction",
    ()=>ToastAction,
    "ToastClose",
    ()=>ToastClose,
    "ToastDescription",
    ()=>ToastDescription,
    "ToastProvider",
    ()=>ToastProvider,
    "ToastTitle",
    ()=>ToastTitle,
    "ToastViewport",
    ()=>ToastViewport
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@radix-ui/react-toast/dist/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/class-variance-authority/dist/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/x.js [app-client] (ecmascript) <export default as X>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-client] (ecmascript)");
;
;
;
;
;
;
const ToastProvider = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Provider"];
const ToastViewport = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["forwardRef"](_c = ({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Viewport"], {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/components/ui/toast.tsx",
        lineNumber: 14,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0)));
_c1 = ToastViewport;
ToastViewport.displayName = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Viewport"].displayName;
const toastVariants = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cva"])("group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full", {
    variants: {
        variant: {
            default: "border bg-background text-foreground",
            destructive: "destructive group border-destructive bg-destructive text-destructive-foreground"
        }
    },
    defaultVariants: {
        variant: "default"
    }
});
const Toast = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["forwardRef"](_c2 = ({ className, variant, ...props }, ref)=>{
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Root"], {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])(toastVariants({
            variant
        }), className),
        ...props
    }, void 0, false, {
        fileName: "[project]/components/ui/toast.tsx",
        lineNumber: 44,
        columnNumber: 10
    }, ("TURBOPACK compile-time value", void 0));
});
_c3 = Toast;
Toast.displayName = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Root"].displayName;
const ToastAction = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["forwardRef"](_c4 = ({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Action"], {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors group-[.destructive]:border-muted/40 hover:bg-secondary group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 group-[.destructive]:focus:ring-destructive disabled:pointer-events-none disabled:opacity-50", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/components/ui/toast.tsx",
        lineNumber: 52,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0)));
_c5 = ToastAction;
ToastAction.displayName = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Action"].displayName;
const ToastClose = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["forwardRef"](_c6 = ({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Close"], {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity group-hover:opacity-100 group-[.destructive]:text-red-300 hover:text-foreground group-[.destructive]:hover:text-red-50 focus:opacity-100 focus:outline-none focus:ring-2 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600", className),
        "toast-close": "",
        ...props,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
            className: "h-4 w-4"
        }, void 0, false, {
            fileName: "[project]/components/ui/toast.tsx",
            lineNumber: 76,
            columnNumber: 5
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/components/ui/toast.tsx",
        lineNumber: 67,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0)));
_c7 = ToastClose;
ToastClose.displayName = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Close"].displayName;
const ToastTitle = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["forwardRef"](_c8 = ({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Title"], {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-sm font-semibold", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/components/ui/toast.tsx",
        lineNumber: 85,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0)));
_c9 = ToastTitle;
ToastTitle.displayName = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Title"].displayName;
const ToastDescription = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["forwardRef"](_c10 = ({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Description"], {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-sm opacity-90", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/components/ui/toast.tsx",
        lineNumber: 93,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0)));
_c11 = ToastDescription;
ToastDescription.displayName = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Description"].displayName;
;
var _c, _c1, _c2, _c3, _c4, _c5, _c6, _c7, _c8, _c9, _c10, _c11;
__turbopack_context__.k.register(_c, "ToastViewport$React.forwardRef");
__turbopack_context__.k.register(_c1, "ToastViewport");
__turbopack_context__.k.register(_c2, "Toast$React.forwardRef");
__turbopack_context__.k.register(_c3, "Toast");
__turbopack_context__.k.register(_c4, "ToastAction$React.forwardRef");
__turbopack_context__.k.register(_c5, "ToastAction");
__turbopack_context__.k.register(_c6, "ToastClose$React.forwardRef");
__turbopack_context__.k.register(_c7, "ToastClose");
__turbopack_context__.k.register(_c8, "ToastTitle$React.forwardRef");
__turbopack_context__.k.register(_c9, "ToastTitle");
__turbopack_context__.k.register(_c10, "ToastDescription$React.forwardRef");
__turbopack_context__.k.register(_c11, "ToastDescription");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/ui/toaster.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Toaster",
    ()=>Toaster
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$hooks$2f$use$2d$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/hooks/use-toast.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$toast$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/toast.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
;
function Toaster() {
    _s();
    const { toasts } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$hooks$2f$use$2d$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useToast"])();
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$toast$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ToastProvider"], {
        children: [
            toasts.map(function({ id, title, description, action, ...props }) {
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$toast$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Toast"], {
                    ...props,
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "grid gap-1",
                            children: [
                                title && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$toast$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ToastTitle"], {
                                    children: title
                                }, void 0, false, {
                                    fileName: "[project]/components/ui/toaster.tsx",
                                    lineNumber: 13,
                                    columnNumber: 25
                                }, this),
                                description && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$toast$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ToastDescription"], {
                                    children: description
                                }, void 0, false, {
                                    fileName: "[project]/components/ui/toaster.tsx",
                                    lineNumber: 14,
                                    columnNumber: 31
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/ui/toaster.tsx",
                            lineNumber: 12,
                            columnNumber: 13
                        }, this),
                        action,
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$toast$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ToastClose"], {}, void 0, false, {
                            fileName: "[project]/components/ui/toaster.tsx",
                            lineNumber: 17,
                            columnNumber: 13
                        }, this)
                    ]
                }, id, true, {
                    fileName: "[project]/components/ui/toaster.tsx",
                    lineNumber: 11,
                    columnNumber: 11
                }, this);
            }),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$toast$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ToastViewport"], {}, void 0, false, {
                fileName: "[project]/components/ui/toaster.tsx",
                lineNumber: 21,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/ui/toaster.tsx",
        lineNumber: 8,
        columnNumber: 5
    }, this);
}
_s(Toaster, "1YTCnXrq2qRowe0H/LBWLjtXoYc=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$hooks$2f$use$2d$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useToast"]
    ];
});
_c = Toaster;
var _c;
__turbopack_context__.k.register(_c, "Toaster");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/ui/sonner.tsx [app-client] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Toaster",
    ()=>Toaster
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$themes$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next-themes/dist/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/sonner/dist/index.mjs [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
;
const Toaster = ({ ...props })=>{
    _s();
    const { theme = "system" } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$themes$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTheme"])();
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Toaster"], {
        theme: theme,
        className: "toaster group",
        toastOptions: {
            classNames: {
                toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
                description: "group-[.toast]:text-muted-foreground",
                actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
                cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground"
            }
        },
        ...props
    }, void 0, false, {
        fileName: "[project]/components/ui/sonner.tsx",
        lineNumber: 10,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_s(Toaster, "EriOrahfenYKDCErPq+L6926Dw4=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$themes$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTheme"]
    ];
});
_c = Toaster;
;
var _c;
__turbopack_context__.k.register(_c, "Toaster");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/ui/tooltip.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Tooltip",
    ()=>Tooltip,
    "TooltipContent",
    ()=>TooltipContent,
    "TooltipProvider",
    ()=>TooltipProvider,
    "TooltipTrigger",
    ()=>TooltipTrigger
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$tooltip$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@radix-ui/react-tooltip/dist/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-client] (ecmascript)");
;
;
;
;
const TooltipProvider = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$tooltip$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Provider"];
const Tooltip = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$tooltip$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Root"];
const TooltipTrigger = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$tooltip$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Trigger"];
const TooltipContent = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["forwardRef"](_c = ({ className, sideOffset = 4, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$tooltip$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Content"], {
        ref: ref,
        sideOffset: sideOffset,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/components/ui/tooltip.tsx",
        lineNumber: 16,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0)));
_c1 = TooltipContent;
TooltipContent.displayName = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$tooltip$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Content"].displayName;
;
var _c, _c1;
__turbopack_context__.k.register(_c, "TooltipContent$React.forwardRef");
__turbopack_context__.k.register(_c1, "TooltipContent");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/types/index.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DEFAULT_AI_PROMPTS",
    ()=>DEFAULT_AI_PROMPTS,
    "DEFAULT_CATEGORIES",
    ()=>DEFAULT_CATEGORIES,
    "INDUSTRY_ICONS",
    ()=>INDUSTRY_ICONS,
    "INDUSTRY_LABELS",
    ()=>INDUSTRY_LABELS
]);
const INDUSTRY_LABELS = {
    tech: 'Technology',
    healthcare: 'Healthcare',
    infrastructure: 'Infrastructure',
    custom: 'Custom'
};
const INDUSTRY_ICONS = {
    tech: '💻',
    healthcare: '🏥',
    infrastructure: '🏗️',
    custom: '⚙️'
};
const DEFAULT_CATEGORIES = {
    tech: [
        'Bug Report',
        'Performance',
        'Feature Request',
        'UI/UX',
        'Documentation',
        'Security'
    ],
    healthcare: [
        'Staff Behavior',
        'Wait Time',
        'Facilities',
        'Treatment Quality',
        'Billing',
        'Hygiene'
    ],
    infrastructure: [
        'Safety Concerns',
        'Project Delays',
        'Quality Issues',
        'Communication',
        'Cost Overrun',
        'Environmental'
    ],
    custom: [
        'General',
        'Suggestion',
        'Complaint',
        'Praise',
        'Question'
    ]
};
const DEFAULT_AI_PROMPTS = {
    tech: 'Analyze feedback focusing on technical issues, software bugs, performance problems, and feature suggestions. Prioritize security and critical bugs.',
    healthcare: 'Analyze feedback focusing on patient experience, staff interactions, facility conditions, and treatment quality. Prioritize patient safety concerns.',
    infrastructure: 'Analyze feedback focusing on construction quality, safety compliance, project timelines, and environmental impact. Prioritize safety issues.',
    custom: 'Analyze feedback and categorize based on sentiment, urgency, and actionability. Focus on identifying actionable insights.'
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/mockData.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "mockFeedback",
    ()=>mockFeedback,
    "mockProducts",
    ()=>mockProducts
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$types$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/types/index.ts [app-client] (ecmascript)");
;
const mockProducts = [
    {
        id: 'prod-1',
        name: 'TechFlow Pro',
        description: 'Enterprise project management and collaboration platform',
        industry: 'tech',
        config: {
            categories: __TURBOPACK__imported__module__$5b$project$5d2f$types$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DEFAULT_CATEGORIES"].tech,
            aiPrompt: __TURBOPACK__imported__module__$5b$project$5d2f$types$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DEFAULT_AI_PROMPTS"].tech,
            focusAreas: [
                'Performance optimization',
                'User experience',
                'Security vulnerabilities'
            ]
        },
        createdAt: new Date('2024-01-15')
    },
    {
        id: 'prod-2',
        name: 'HealthFirst Clinic',
        description: 'Multi-specialty healthcare facility serving the community',
        industry: 'healthcare',
        config: {
            categories: __TURBOPACK__imported__module__$5b$project$5d2f$types$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DEFAULT_CATEGORIES"].healthcare,
            aiPrompt: __TURBOPACK__imported__module__$5b$project$5d2f$types$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DEFAULT_AI_PROMPTS"].healthcare,
            focusAreas: [
                'Patient safety',
                'Wait time reduction',
                'Staff training'
            ]
        },
        createdAt: new Date('2024-02-20')
    },
    {
        id: 'prod-3',
        name: 'MetroBuild Infrastructure',
        description: 'Urban development and construction projects',
        industry: 'infrastructure',
        config: {
            categories: __TURBOPACK__imported__module__$5b$project$5d2f$types$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DEFAULT_CATEGORIES"].infrastructure,
            aiPrompt: __TURBOPACK__imported__module__$5b$project$5d2f$types$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DEFAULT_AI_PROMPTS"].infrastructure,
            focusAreas: [
                'Safety compliance',
                'Timeline adherence',
                'Quality standards'
            ]
        },
        createdAt: new Date('2024-03-10')
    }
];
const mockFeedback = [
    // TechFlow Pro feedback
    {
        id: 'fb-1',
        productId: 'prod-1',
        text: 'The dashboard takes forever to load when we have more than 100 projects. Really frustrating for our team.',
        rating: 2,
        email: 'john@company.com',
        createdAt: new Date('2024-12-01'),
        analysis: {
            sentiment: 'negative',
            category: 'Performance',
            priority: 'high',
            summary: 'Dashboard performance degrades significantly with large project counts, causing productivity loss.'
        }
    },
    {
        id: 'fb-2',
        productId: 'prod-1',
        text: 'Love the new dark mode feature! Makes working late much easier on the eyes.',
        rating: 5,
        createdAt: new Date('2024-12-05'),
        analysis: {
            sentiment: 'positive',
            category: 'UI/UX',
            priority: 'low',
            summary: 'User appreciates the dark mode feature for improved comfort during extended use.'
        }
    },
    {
        id: 'fb-3',
        productId: 'prod-1',
        text: 'Would be great to have Slack integration for notifications. Currently have to check both apps constantly.',
        rating: 3,
        email: 'sarah@startup.io',
        createdAt: new Date('2024-12-08'),
        analysis: {
            sentiment: 'neutral',
            category: 'Feature Request',
            priority: 'medium',
            summary: 'Request for Slack integration to streamline notification workflow.'
        }
    },
    {
        id: 'fb-4',
        productId: 'prod-1',
        text: 'Found a bug where file uploads fail silently. No error message, just nothing happens.',
        rating: 1,
        createdAt: new Date('2024-12-10'),
        analysis: {
            sentiment: 'negative',
            category: 'Bug Report',
            priority: 'high',
            summary: 'Critical UX issue with silent file upload failures requiring immediate attention.'
        }
    },
    {
        id: 'fb-5',
        productId: 'prod-1',
        text: 'The API documentation is excellent. Made integration a breeze!',
        rating: 5,
        email: 'dev@techcorp.com',
        createdAt: new Date('2024-12-12'),
        analysis: {
            sentiment: 'positive',
            category: 'Documentation',
            priority: 'low',
            summary: 'Positive feedback on API documentation quality facilitating easy integration.'
        }
    },
    {
        id: 'fb-6',
        productId: 'prod-1',
        text: 'Mobile app keeps crashing when switching between projects. Using iPhone 14.',
        rating: 2,
        createdAt: new Date('2024-12-14'),
        analysis: {
            sentiment: 'negative',
            category: 'Bug Report',
            priority: 'high',
            summary: 'Mobile app stability issue on iOS causing crashes during project navigation.'
        }
    },
    {
        id: 'fb-7',
        productId: 'prod-1',
        text: 'Overall solid product. A few rough edges but getting the job done.',
        rating: 4,
        createdAt: new Date('2024-12-15'),
        analysis: {
            sentiment: 'positive',
            category: 'UI/UX',
            priority: 'low',
            summary: 'Generally positive review acknowledging product utility despite minor issues.'
        }
    },
    {
        id: 'fb-8',
        productId: 'prod-1',
        text: 'Security concern: session doesn\'t expire even after 24 hours of inactivity.',
        rating: 2,
        email: 'security@enterprise.com',
        createdAt: new Date('2024-12-16'),
        analysis: {
            sentiment: 'negative',
            category: 'Security',
            priority: 'high',
            summary: 'Security vulnerability identified with session management requiring urgent review.'
        }
    },
    // HealthFirst Clinic feedback
    {
        id: 'fb-9',
        productId: 'prod-2',
        text: 'Dr. Smith was incredibly attentive and explained everything clearly. Best experience I\'ve had.',
        rating: 5,
        createdAt: new Date('2024-12-02'),
        analysis: {
            sentiment: 'positive',
            category: 'Staff Behavior',
            priority: 'low',
            summary: 'Excellent patient experience with clear communication from Dr. Smith.'
        }
    },
    {
        id: 'fb-10',
        productId: 'prod-2',
        text: 'Waited 2 hours past my appointment time. No one informed me about the delay.',
        rating: 1,
        email: 'frustrated@email.com',
        createdAt: new Date('2024-12-05'),
        analysis: {
            sentiment: 'negative',
            category: 'Wait Time',
            priority: 'high',
            summary: 'Significant wait time issue compounded by lack of communication to patient.'
        }
    },
    {
        id: 'fb-11',
        productId: 'prod-2',
        text: 'The new online booking system is convenient. Easy to reschedule appointments.',
        rating: 4,
        createdAt: new Date('2024-12-08'),
        analysis: {
            sentiment: 'positive',
            category: 'Facilities',
            priority: 'low',
            summary: 'Positive reception of digital booking system improving patient convenience.'
        }
    },
    {
        id: 'fb-12',
        productId: 'prod-2',
        text: 'Restrooms need better maintenance. Found them unclean during my visit.',
        rating: 2,
        createdAt: new Date('2024-12-10'),
        analysis: {
            sentiment: 'negative',
            category: 'Hygiene',
            priority: 'medium',
            summary: 'Facility hygiene concerns regarding restroom maintenance standards.'
        }
    },
    {
        id: 'fb-13',
        productId: 'prod-2',
        text: 'Billing department resolved my insurance issue quickly. Very professional.',
        rating: 4,
        email: 'patient123@mail.com',
        createdAt: new Date('2024-12-12'),
        analysis: {
            sentiment: 'positive',
            category: 'Billing',
            priority: 'low',
            summary: 'Efficient billing department handling insurance-related queries professionally.'
        }
    },
    {
        id: 'fb-14',
        productId: 'prod-2',
        text: 'Treatment was effective but felt rushed. Would appreciate more time with the doctor.',
        rating: 3,
        createdAt: new Date('2024-12-14'),
        analysis: {
            sentiment: 'neutral',
            category: 'Treatment Quality',
            priority: 'medium',
            summary: 'Effective treatment but concerns about consultation time allocation.'
        }
    },
    // MetroBuild Infrastructure feedback
    {
        id: 'fb-15',
        productId: 'prod-3',
        text: 'Workers not wearing safety helmets at the downtown site. This is dangerous!',
        rating: 1,
        email: 'concerned.citizen@email.com',
        createdAt: new Date('2024-12-03'),
        analysis: {
            sentiment: 'negative',
            category: 'Safety Concerns',
            priority: 'high',
            summary: 'Critical safety violation observed with workers lacking proper protective equipment.'
        }
    },
    {
        id: 'fb-16',
        productId: 'prod-3',
        text: 'The highway expansion is 3 months behind schedule. When will it be completed?',
        rating: 2,
        createdAt: new Date('2024-12-06'),
        analysis: {
            sentiment: 'negative',
            category: 'Project Delays',
            priority: 'medium',
            summary: 'Significant project timeline deviation causing public concern about completion.'
        }
    },
    {
        id: 'fb-17',
        productId: 'prod-3',
        text: 'The new bridge looks fantastic and the construction team kept the area clean.',
        rating: 5,
        createdAt: new Date('2024-12-09'),
        analysis: {
            sentiment: 'positive',
            category: 'Quality Issues',
            priority: 'low',
            summary: 'Positive feedback on project quality and site maintenance during construction.'
        }
    },
    {
        id: 'fb-18',
        productId: 'prod-3',
        text: 'Noise levels during night work are unbearable. Affecting the whole neighborhood.',
        rating: 1,
        email: 'resident@neighborhood.com',
        createdAt: new Date('2024-12-11'),
        analysis: {
            sentiment: 'negative',
            category: 'Environmental',
            priority: 'high',
            summary: 'Community disturbance from night construction work requiring noise mitigation.'
        }
    },
    {
        id: 'fb-19',
        productId: 'prod-3',
        text: 'Project updates on the website are helpful. Keep the community informed!',
        rating: 4,
        createdAt: new Date('2024-12-13'),
        analysis: {
            sentiment: 'positive',
            category: 'Communication',
            priority: 'low',
            summary: 'Appreciation for transparent project communication through digital channels.'
        }
    }
];
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/mockAI.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "analyzeTextWithMockAI",
    ()=>analyzeTextWithMockAI
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$types$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/types/index.ts [app-client] (ecmascript)");
;
const techKeywords = [
    {
        keywords: [
            'bug',
            'crash',
            'error',
            'broken',
            'fail',
            'not working'
        ],
        sentiment: 'negative',
        priority: 'high',
        category: 'Bug Report'
    },
    {
        keywords: [
            'slow',
            'loading',
            'performance',
            'lag',
            'freeze'
        ],
        sentiment: 'negative',
        priority: 'high',
        category: 'Performance'
    },
    {
        keywords: [
            'security',
            'vulnerability',
            'hack',
            'leak',
            'password'
        ],
        sentiment: 'negative',
        priority: 'high',
        category: 'Security'
    },
    {
        keywords: [
            'feature',
            'add',
            'would be great',
            'wish',
            'suggestion',
            'integrate'
        ],
        sentiment: 'neutral',
        priority: 'medium',
        category: 'Feature Request'
    },
    {
        keywords: [
            'ui',
            'ux',
            'design',
            'interface',
            'look',
            'dark mode',
            'theme'
        ],
        sentiment: 'neutral',
        priority: 'low',
        category: 'UI/UX'
    },
    {
        keywords: [
            'documentation',
            'docs',
            'guide',
            'tutorial',
            'help'
        ],
        sentiment: 'neutral',
        priority: 'low',
        category: 'Documentation'
    },
    {
        keywords: [
            'love',
            'great',
            'excellent',
            'amazing',
            'fantastic',
            'awesome'
        ],
        sentiment: 'positive',
        priority: 'low',
        category: 'UI/UX'
    }
];
const healthcareKeywords = [
    {
        keywords: [
            'wait',
            'waiting',
            'hours',
            'delay',
            'late'
        ],
        sentiment: 'negative',
        priority: 'high',
        category: 'Wait Time'
    },
    {
        keywords: [
            'staff',
            'nurse',
            'doctor',
            'rude',
            'unprofessional',
            'attentive'
        ],
        sentiment: 'neutral',
        priority: 'medium',
        category: 'Staff Behavior'
    },
    {
        keywords: [
            'dirty',
            'unclean',
            'hygiene',
            'smell',
            'messy'
        ],
        sentiment: 'negative',
        priority: 'medium',
        category: 'Hygiene'
    },
    {
        keywords: [
            'treatment',
            'diagnosis',
            'rushed',
            'care',
            'medical'
        ],
        sentiment: 'neutral',
        priority: 'medium',
        category: 'Treatment Quality'
    },
    {
        keywords: [
            'billing',
            'insurance',
            'charge',
            'payment',
            'cost'
        ],
        sentiment: 'neutral',
        priority: 'medium',
        category: 'Billing'
    },
    {
        keywords: [
            'facility',
            'room',
            'equipment',
            'parking',
            'booking'
        ],
        sentiment: 'neutral',
        priority: 'low',
        category: 'Facilities'
    },
    {
        keywords: [
            'excellent',
            'professional',
            'caring',
            'helpful',
            'wonderful'
        ],
        sentiment: 'positive',
        priority: 'low',
        category: 'Staff Behavior'
    }
];
const infrastructureKeywords = [
    {
        keywords: [
            'safety',
            'dangerous',
            'helmet',
            'accident',
            'injury',
            'hazard'
        ],
        sentiment: 'negative',
        priority: 'high',
        category: 'Safety Concerns'
    },
    {
        keywords: [
            'delay',
            'behind',
            'schedule',
            'late',
            'deadline'
        ],
        sentiment: 'negative',
        priority: 'medium',
        category: 'Project Delays'
    },
    {
        keywords: [
            'quality',
            'crack',
            'defect',
            'poor',
            'workmanship'
        ],
        sentiment: 'negative',
        priority: 'high',
        category: 'Quality Issues'
    },
    {
        keywords: [
            'noise',
            'pollution',
            'dust',
            'environment',
            'traffic'
        ],
        sentiment: 'negative',
        priority: 'high',
        category: 'Environmental'
    },
    {
        keywords: [
            'cost',
            'budget',
            'expensive',
            'overrun'
        ],
        sentiment: 'negative',
        priority: 'medium',
        category: 'Cost Overrun'
    },
    {
        keywords: [
            'update',
            'communication',
            'inform',
            'website'
        ],
        sentiment: 'neutral',
        priority: 'low',
        category: 'Communication'
    },
    {
        keywords: [
            'great',
            'fantastic',
            'clean',
            'professional',
            'excellent'
        ],
        sentiment: 'positive',
        priority: 'low',
        category: 'Quality Issues'
    }
];
const customKeywords = [
    {
        keywords: [
            'terrible',
            'awful',
            'worst',
            'hate',
            'disappointed'
        ],
        sentiment: 'negative',
        priority: 'high',
        category: 'Complaint'
    },
    {
        keywords: [
            'suggest',
            'idea',
            'maybe',
            'could',
            'should'
        ],
        sentiment: 'neutral',
        priority: 'medium',
        category: 'Suggestion'
    },
    {
        keywords: [
            'question',
            'how',
            'what',
            'when',
            'where',
            'why'
        ],
        sentiment: 'neutral',
        priority: 'low',
        category: 'Question'
    },
    {
        keywords: [
            'love',
            'great',
            'amazing',
            'thank',
            'appreciate'
        ],
        sentiment: 'positive',
        priority: 'low',
        category: 'Praise'
    }
];
const keywordsByIndustry = {
    tech: techKeywords,
    healthcare: healthcareKeywords,
    infrastructure: infrastructureKeywords,
    custom: customKeywords
};
function generateSummary(text, sentiment, category) {
    const lowerText = text.toLowerCase();
    const wordCount = text.split(' ').length;
    const summaryTemplates = {
        negative: [
            `User reports ${category.toLowerCase()} issue requiring attention.`,
            `Critical ${category.toLowerCase()} concern raised by user.`,
            `Negative feedback regarding ${category.toLowerCase()} identified.`
        ],
        neutral: [
            `User provides feedback on ${category.toLowerCase()}.`,
            `Suggestion received regarding ${category.toLowerCase()}.`,
            `Neutral observation about ${category.toLowerCase()} noted.`
        ],
        positive: [
            `Positive feedback received for ${category.toLowerCase()}.`,
            `User expresses satisfaction with ${category.toLowerCase()}.`,
            `Favorable review highlighting ${category.toLowerCase()}.`
        ]
    };
    const templates = summaryTemplates[sentiment];
    const index = wordCount % templates.length;
    return templates[index];
}
async function analyzeTextWithMockAI(text, industry, customCategories) {
    // Simulate AI processing time
    await new Promise((resolve)=>setTimeout(resolve, 1500 + Math.random() * 1000));
    const lowerText = text.toLowerCase();
    const keywords = keywordsByIndustry[industry];
    const categories = customCategories || __TURBOPACK__imported__module__$5b$project$5d2f$types$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DEFAULT_CATEGORIES"][industry];
    // Find matching keywords
    let bestMatch = null;
    let maxMatches = 0;
    for (const keywordMatch of keywords){
        const matchCount = keywordMatch.keywords.filter((kw)=>lowerText.includes(kw)).length;
        if (matchCount > maxMatches) {
            maxMatches = matchCount;
            bestMatch = keywordMatch;
        }
    }
    // Determine sentiment from text if no keyword match
    let sentiment = 'neutral';
    let priority = 'low';
    let category = categories[0] || 'General';
    if (bestMatch && maxMatches > 0) {
        sentiment = bestMatch.sentiment;
        priority = bestMatch.priority;
        category = categories.includes(bestMatch.category) ? bestMatch.category : categories[0];
    } else {
        // Fallback sentiment detection
        const positiveWords = [
            'good',
            'great',
            'excellent',
            'love',
            'amazing',
            'happy',
            'thanks',
            'helpful'
        ];
        const negativeWords = [
            'bad',
            'poor',
            'terrible',
            'hate',
            'awful',
            'frustrated',
            'angry',
            'disappointed'
        ];
        const positiveCount = positiveWords.filter((w)=>lowerText.includes(w)).length;
        const negativeCount = negativeWords.filter((w)=>lowerText.includes(w)).length;
        if (negativeCount > positiveCount) {
            sentiment = 'negative';
            priority = 'medium';
        } else if (positiveCount > negativeCount) {
            sentiment = 'positive';
            priority = 'low';
        }
        // Assign random category if no match
        category = categories[Math.floor(Math.random() * categories.length)];
    }
    // Adjust priority based on text urgency
    const urgentWords = [
        'urgent',
        'asap',
        'immediately',
        'critical',
        'emergency',
        'now'
    ];
    if (urgentWords.some((w)=>lowerText.includes(w))) {
        priority = 'high';
    }
    const summary = generateSummary(text, sentiment, category);
    return {
        sentiment,
        category,
        priority,
        summary
    };
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/context/AppContext.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AppProvider",
    ()=>AppProvider,
    "useApp",
    ()=>useApp
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mockData$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/mockData.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mockAI$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/mockAI.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
;
;
;
const AppContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"])(undefined);
function AppProvider({ children }) {
    _s();
    const [products, setProducts] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mockData$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["mockProducts"]);
    const [currentProduct, setCurrentProduct] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mockData$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["mockProducts"][0]);
    const [feedback, setFeedback] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mockData$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["mockFeedback"]);
    const [userRole, setUserRole] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('admin');
    const [isDarkMode, setIsDarkMode] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        "AppProvider.useState": ()=>{
            if ("TURBOPACK compile-time truthy", 1) {
                return document.documentElement.classList.contains('dark');
            }
            //TURBOPACK unreachable
            ;
        }
    }["AppProvider.useState"]);
    const toggleDarkMode = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "AppProvider.useCallback[toggleDarkMode]": ()=>{
            setIsDarkMode({
                "AppProvider.useCallback[toggleDarkMode]": (prev)=>{
                    const newValue = !prev;
                    if (newValue) {
                        document.documentElement.classList.add('dark');
                    } else {
                        document.documentElement.classList.remove('dark');
                    }
                    return newValue;
                }
            }["AppProvider.useCallback[toggleDarkMode]"]);
        }
    }["AppProvider.useCallback[toggleDarkMode]"], []);
    const addProduct = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "AppProvider.useCallback[addProduct]": (productData)=>{
            const newProduct = {
                ...productData,
                id: `prod-${Date.now()}`,
                createdAt: new Date()
            };
            setProducts({
                "AppProvider.useCallback[addProduct]": (prev)=>[
                        ...prev,
                        newProduct
                    ]
            }["AppProvider.useCallback[addProduct]"]);
            setCurrentProduct(newProduct);
        }
    }["AppProvider.useCallback[addProduct]"], []);
    const updateProduct = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "AppProvider.useCallback[updateProduct]": (id, updates)=>{
            setProducts({
                "AppProvider.useCallback[updateProduct]": (prev)=>prev.map({
                        "AppProvider.useCallback[updateProduct]": (p)=>p.id === id ? {
                                ...p,
                                ...updates
                            } : p
                    }["AppProvider.useCallback[updateProduct]"])
            }["AppProvider.useCallback[updateProduct]"]);
            setCurrentProduct({
                "AppProvider.useCallback[updateProduct]": (prev)=>prev?.id === id ? {
                        ...prev,
                        ...updates
                    } : prev
            }["AppProvider.useCallback[updateProduct]"]);
        }
    }["AppProvider.useCallback[updateProduct]"], []);
    const deleteProduct = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "AppProvider.useCallback[deleteProduct]": (id)=>{
            setProducts({
                "AppProvider.useCallback[deleteProduct]": (prev)=>prev.filter({
                        "AppProvider.useCallback[deleteProduct]": (p)=>p.id !== id
                    }["AppProvider.useCallback[deleteProduct]"])
            }["AppProvider.useCallback[deleteProduct]"]);
            setFeedback({
                "AppProvider.useCallback[deleteProduct]": (prev)=>prev.filter({
                        "AppProvider.useCallback[deleteProduct]": (f)=>f.productId !== id
                    }["AppProvider.useCallback[deleteProduct]"])
            }["AppProvider.useCallback[deleteProduct]"]);
            setCurrentProduct({
                "AppProvider.useCallback[deleteProduct]": (prev)=>prev?.id === id ? null : prev
            }["AppProvider.useCallback[deleteProduct]"]);
        }
    }["AppProvider.useCallback[deleteProduct]"], []);
    const getProductFeedback = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "AppProvider.useCallback[getProductFeedback]": (productId)=>feedback.filter({
                "AppProvider.useCallback[getProductFeedback]": (f)=>f.productId === productId
            }["AppProvider.useCallback[getProductFeedback]"])
    }["AppProvider.useCallback[getProductFeedback]"], [
        feedback
    ]);
    const addFeedback = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "AppProvider.useCallback[addFeedback]": async (feedbackData)=>{
            const newFeedback = {
                ...feedbackData,
                id: `fb-${Date.now()}`,
                createdAt: new Date(),
                isAnalyzing: true
            };
            setFeedback({
                "AppProvider.useCallback[addFeedback]": (prev)=>[
                        newFeedback,
                        ...prev
                    ]
            }["AppProvider.useCallback[addFeedback]"]);
            // Find product for AI analysis context
            const product = products.find({
                "AppProvider.useCallback[addFeedback].product": (p)=>p.id === feedbackData.productId
            }["AppProvider.useCallback[addFeedback].product"]);
            if (product) {
                try {
                    const analysis = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mockAI$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["analyzeTextWithMockAI"])(feedbackData.text, product.industry, product.config.categories);
                    setFeedback({
                        "AppProvider.useCallback[addFeedback]": (prev)=>prev.map({
                                "AppProvider.useCallback[addFeedback]": (f)=>f.id === newFeedback.id ? {
                                        ...f,
                                        analysis,
                                        isAnalyzing: false
                                    } : f
                            }["AppProvider.useCallback[addFeedback]"])
                    }["AppProvider.useCallback[addFeedback]"]);
                } catch (error) {
                    setFeedback({
                        "AppProvider.useCallback[addFeedback]": (prev)=>prev.map({
                                "AppProvider.useCallback[addFeedback]": (f)=>f.id === newFeedback.id ? {
                                        ...f,
                                        isAnalyzing: false
                                    } : f
                            }["AppProvider.useCallback[addFeedback]"])
                    }["AppProvider.useCallback[addFeedback]"]);
                }
            }
        }
    }["AppProvider.useCallback[addFeedback]"], [
        products
    ]);
    const value = {
        products,
        currentProduct,
        setCurrentProduct,
        addProduct,
        updateProduct,
        deleteProduct,
        feedback,
        getProductFeedback,
        addFeedback,
        userRole,
        setUserRole,
        isDarkMode,
        toggleDarkMode
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(AppContext.Provider, {
        value: value,
        children: children
    }, void 0, false, {
        fileName: "[project]/context/AppContext.tsx",
        lineNumber: 145,
        columnNumber: 10
    }, this);
}
_s(AppProvider, "AS50uDxOrMLyVR+u/5Qxf6+Yl0g=");
_c = AppProvider;
function useApp() {
    _s1();
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"])(AppContext);
    if (context === undefined) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
}
_s1(useApp, "b9L3QQ+jgeyIrH0NfHrJ8nn7VMU=");
var _c;
__turbopack_context__.k.register(_c, "AppProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/app/providers.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Providers",
    ()=>Providers
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$toaster$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/toaster.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$sonner$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/components/ui/sonner.tsx [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tooltip$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/tooltip.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$queryClient$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/query-core/build/modern/queryClient.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/react-query/build/modern/QueryClientProvider.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$context$2f$AppContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/context/AppContext.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
;
function Providers({ children }) {
    _s();
    const [queryClient] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        "Providers.useState": ()=>new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$queryClient$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["QueryClient"]()
    }["Providers.useState"]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["QueryClientProvider"], {
        client: queryClient,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tooltip$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TooltipProvider"], {
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$context$2f$AppContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AppProvider"], {
                children: [
                    children,
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$toaster$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Toaster"], {}, void 0, false, {
                        fileName: "[project]/app/providers.tsx",
                        lineNumber: 18,
                        columnNumber: 21
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$sonner$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["Toaster"], {}, void 0, false, {
                        fileName: "[project]/app/providers.tsx",
                        lineNumber: 19,
                        columnNumber: 21
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/providers.tsx",
                lineNumber: 16,
                columnNumber: 17
            }, this)
        }, void 0, false, {
            fileName: "[project]/app/providers.tsx",
            lineNumber: 15,
            columnNumber: 13
        }, this)
    }, void 0, false, {
        fileName: "[project]/app/providers.tsx",
        lineNumber: 14,
        columnNumber: 9
    }, this);
}
_s(Providers, "qFhNRSk+4hqflxYLL9+zYF5AcuQ=");
_c = Providers;
var _c;
__turbopack_context__.k.register(_c, "Providers");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=_53bbbc21._.js.map