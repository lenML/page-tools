import { createRoot } from "react-dom/client";
    import {
      Plus, MousePointer2, Square, Minus as LineIcon, ArrowRight, MapPin,
      Trash2, Undo2, Redo2, Download, Upload, Map as MapIcon, X, ChevronLeft, Pin,
      Copy, AlignLeft, AlignRight, LayoutGrid, RotateCcw
    } from "lucide-react";
    import { create } from "zustand";
    import { marked } from "marked";
    import * as Tooltip from "@radix-ui/react-tooltip";
    import * as Dialog from "@radix-ui/react-dialog";
    import * as Popover from "@radix-ui/react-popover";
    import * as ToggleGroup from "@radix-ui/react-toggle-group";
    import * as ScrollArea from "@radix-ui/react-scroll-area";
    import * as VisuallyHidden from "@radix-ui/react-visually-hidden";

    marked.use({ breaks: true, gfm: true });
    const renderMarkdownSafe = (text) => text ? marked.parse(text) : '';
