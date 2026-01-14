/**
 * IO Diagram View
 * 
 * Obsidian-style graph visualization showing input/output
 * relationships between files and functions
 */

import { useState, useEffect, useRef } from "react";
import { useEditorStore } from "@/stores/editorStore";
import { 
  GitBranch, 
  ZoomIn, 
  ZoomOut, 
  Maximize2,
  RotateCcw,
  Circle,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface IONode {
  id: string;
  type: "input" | "output" | "function" | "file" | "variable";
  label: string;
  x: number;
  y: number;
  connections: string[];
}

export function IODiagramView() {
  const { openFiles, activeFile } = useEditorStore();
  const [nodes, setNodes] = useState<IONode[]>([]);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Analyze the active file to extract IO relationships
  useEffect(() => {
    const file = openFiles.find((f) => f.path === activeFile);
    if (!file) {
      setNodes([]);
      return;
    }

    // Simple analysis: look for function definitions, inputs, outputs
    const newNodes: IONode[] = [];
    const lines = file.content.split("\n");
    
    // Add file as central node
    newNodes.push({
      id: "file",
      type: "file",
      label: file.name,
      x: 300,
      y: 200,
      connections: [],
    });

    // Parse for patterns (simplified)
    let functionCount = 0;
    let inputCount = 0;
    let outputCount = 0;

    lines.forEach((line) => {
      // Detect function definitions
      const funcMatch = line.match(/(?:function\s+(\w+)|def\s+(\w+)|fn\s+(\w+)|(\w+)\s*=\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>))/);
      if (funcMatch) {
        const funcName = funcMatch[1] || funcMatch[2] || funcMatch[3] || funcMatch[4];
        if (funcName && !funcName.startsWith("_")) {
          const angle = (functionCount * 60) * (Math.PI / 180);
          newNodes.push({
            id: `func_${funcName}`,
            type: "function",
            label: funcName,
            x: 300 + Math.cos(angle) * 150,
            y: 200 + Math.sin(angle) * 150,
            connections: ["file"],
          });
          newNodes[0].connections.push(`func_${funcName}`);
          functionCount++;
        }
      }

      // Detect input patterns (stdin, input(), read, etc.)
      if (/input\(|stdin|read_line|prompt\(|readline/i.test(line)) {
        const inputId = `input_${inputCount}`;
        newNodes.push({
          id: inputId,
          type: "input",
          label: "Input",
          x: 100,
          y: 100 + inputCount * 60,
          connections: ["file"],
        });
        inputCount++;
      }

      // Detect output patterns (print, console.log, stdout, etc.)
      if (/print\(|console\.log|println!|stdout|writeln/i.test(line)) {
        const outputId = `output_${outputCount}`;
        newNodes.push({
          id: outputId,
          type: "output",
          label: "Output",
          x: 500,
          y: 100 + outputCount * 60,
          connections: ["file"],
        });
        outputCount++;
      }
    });

    setNodes(newNodes);
  }, [openFiles, activeFile]);

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === containerRef.current) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.1, 2));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.1, 0.5));
  const handleReset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  // Get node color based on type
  const getNodeColor = (type: IONode["type"]) => {
    switch (type) {
      case "input":
        return "from-blue-500 to-blue-600";
      case "output":
        return "from-green-500 to-green-600";
      case "function":
        return "from-purple-500 to-purple-600";
      case "file":
        return "from-amber-500 to-amber-600";
      case "variable":
        return "from-pink-500 to-pink-600";
      default:
        return "from-gray-500 to-gray-600";
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a]">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#3c3c3c]">
        <div className="flex items-center gap-2 text-xs text-sidebar-fg/60">
          <GitBranch className="h-4 w-4" />
          <span>IO Diagram</span>
          {nodes.length > 0 && (
            <span className="ml-2 text-sidebar-fg/40">
              {nodes.length} nodes
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded hover:bg-white/10 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-xs text-sidebar-fg/60 w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded hover:bg-white/10 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={handleReset}
            className="p-1.5 rounded hover:bg-white/10 transition-colors ml-2"
            title="Reset View"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden cursor-grab active:cursor-grabbing relative"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {nodes.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-sidebar-fg/40">
            <div className="text-center">
              <GitBranch className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Open a file to see its IO diagram</p>
              <p className="text-xs mt-1">
                Functions, inputs, and outputs will be visualized
              </p>
            </div>
          </div>
        ) : (
          <svg
            className="w-full h-full"
            style={{
              transform: `scale(${zoom}) translate(${offset.x}px, ${offset.y}px)`,
              transformOrigin: "center",
            }}
          >
            {/* Connection lines */}
            {nodes.map((node) =>
              node.connections.map((targetId) => {
                const target = nodes.find((n) => n.id === targetId);
                if (!target) return null;
                return (
                  <line
                    key={`${node.id}-${targetId}`}
                    x1={node.x}
                    y1={node.y}
                    x2={target.x}
                    y2={target.y}
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="2"
                    className="transition-all"
                  />
                );
              })
            )}

            {/* Nodes */}
            {nodes.map((node) => (
              <g
                key={node.id}
                onClick={() => setSelectedNode(node.id)}
                className="cursor-pointer"
              >
                {/* Node circle */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={node.type === "file" ? 30 : 20}
                  className={cn(
                    "transition-all",
                    selectedNode === node.id && "stroke-white stroke-2"
                  )}
                  fill={`url(#gradient-${node.type})`}
                />
                {/* Node label */}
                <text
                  x={node.x}
                  y={node.y + (node.type === "file" ? 45 : 35)}
                  textAnchor="middle"
                  className="text-xs fill-white/80"
                >
                  {node.label}
                </text>
              </g>
            ))}

            {/* Gradients */}
            <defs>
              <linearGradient id="gradient-input" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#2563eb" />
              </linearGradient>
              <linearGradient id="gradient-output" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#22c55e" />
                <stop offset="100%" stopColor="#16a34a" />
              </linearGradient>
              <linearGradient id="gradient-function" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#7c3aed" />
              </linearGradient>
              <linearGradient id="gradient-file" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>
              <linearGradient id="gradient-variable" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ec4899" />
                <stop offset="100%" stopColor="#db2777" />
              </linearGradient>
            </defs>
          </svg>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 px-3 py-2 border-t border-[#3c3c3c] text-xs text-sidebar-fg/60">
        <div className="flex items-center gap-1">
          <Circle className="h-3 w-3 fill-blue-500" />
          <span>Input</span>
        </div>
        <div className="flex items-center gap-1">
          <Circle className="h-3 w-3 fill-green-500" />
          <span>Output</span>
        </div>
        <div className="flex items-center gap-1">
          <Circle className="h-3 w-3 fill-purple-500" />
          <span>Function</span>
        </div>
        <div className="flex items-center gap-1">
          <Circle className="h-3 w-3 fill-amber-500" />
          <span>File</span>
        </div>
      </div>
    </div>
  );
}
