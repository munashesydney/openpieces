"use client";

import { useState, useTransition } from "react";
import {
  ClipboardList,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "@/components/basic/buttons/button";
import { Textarea } from "@/components/basic/input/textarea";
import {
  addDetailedStepAction,
  updateDetailedStepAction,
  deleteDetailedStepAction,
} from "@/app/workspace/[workspaceId]/personal/workflows/actions";

interface WorkflowStepsProps {
  workflowId: string;
  workspaceId: string;
  steps: string[];
}

export function WorkflowSteps({
  workflowId,
  workspaceId,
  steps,
}: WorkflowStepsProps) {
  const [isPending, startTransition] = useTransition();
  const [showAll, setShowAll] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [addValue, setAddValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const hasSteps = steps.length > 0;
  const displaySteps = showAll ? steps : steps.slice(0, 5);
  const hasHidden = steps.length > 5;

  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditValue(steps[index]);
    setIsAdding(false);
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditValue("");
    setError(null);
  };

  const handleSaveEdit = (index: number) => {
    if (!editValue.trim()) {
      setError("Step content cannot be empty.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await updateDetailedStepAction(
        workspaceId,
        workflowId,
        index,
        editValue,
      );
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setEditingIndex(null);
      setEditValue("");
    });
  };

  const handleStartAdd = () => {
    setIsAdding(true);
    setEditingIndex(null);
    setError(null);
  };

  const handleCancelAdd = () => {
    setIsAdding(false);
    setAddValue("");
    setError(null);
  };

  const handleSaveAdd = () => {
    if (!addValue.trim()) {
      setError("Step content cannot be empty.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await addDetailedStepAction(
        workspaceId,
        workflowId,
        addValue,
      );
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setIsAdding(false);
      setAddValue("");
    });
  };

  const handleDelete = (index: number) => {
    startTransition(async () => {
      const result = await deleteDetailedStepAction(
        workspaceId,
        workflowId,
        index,
      );
      if ("error" in result) {
        setError(result.error);
        return;
      }
      if (editingIndex === index) {
        setEditingIndex(null);
        setEditValue("");
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-emerald-500" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--muted)]">
            Execution Plan
            {hasSteps && (
              <span className="ml-1.5 font-normal text-[var(--muted)]">
                ({steps.length} step{steps.length > 1 ? "s" : ""})
              </span>
            )}
          </h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs font-semibold uppercase tracking-wider text-emerald-500 hover:text-emerald-400"
          onClick={handleStartAdd}
          disabled={isAdding || isPending}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Step
        </Button>
      </div>

      {/* Steps list */}
      {hasSteps && (
        <div className="space-y-2">
          {displaySteps.map((step, i) => (
            <StepCard
              key={i}
              stepNumber={steps.length > 1 ? i + 1 : null}
              content={step}
              isEditing={editingIndex === i}
              editValue={editValue}
              onEditValueChange={setEditValue}
              onStartEdit={() => handleStartEdit(i)}
              onSaveEdit={() => handleSaveEdit(i)}
              onCancelEdit={handleCancelEdit}
              onDelete={() => handleDelete(i)}
              isPending={isPending}
            />
          ))}
        </div>
      )}

      {/* Show more / less */}
      {hasHidden && (
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--muted)] hover:text-[var(--foreground)]"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                Show all ({steps.length} steps)
              </>
            )}
          </Button>
        </div>
      )}

      {/* Empty state */}
      {!hasSteps && !isAdding && (
        <Card className="flex flex-col items-center gap-3 border-dashed border-[var(--border)] p-8 text-center">
          <ClipboardList className="h-8 w-8 text-[var(--muted)]" />
          <div>
            <p className="text-sm font-medium text-[var(--foreground)]">
              No execution plan yet
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Add steps to guide the Events AI on how to process this workflow.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleStartAdd}
          >
            <Plus className="h-3.5 w-3.5" />
            Add your first step
          </Button>
        </Card>
      )}

      {/* Add step form */}
      {isAdding && (
        <Card className="p-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-[10px] font-bold text-emerald-500">
                {steps.length + 1}
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-500">
                New Step
              </span>
            </div>
            <Textarea
              placeholder="Describe what the Events AI should do in this step..."
              value={addValue}
              onChange={(e) => setAddValue(e.target.value)}
              className="min-h-[80px]"
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelAdd}
                disabled={isPending}
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveAdd}
                disabled={isPending || !addValue.trim()}
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                {isPending ? "Adding..." : "Add Step"}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Individual Step Card ───────────────────────────────────────────────────

function StepCard({
  stepNumber,
  content,
  isEditing,
  editValue,
  onEditValueChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  isPending,
}: {
  stepNumber: number | null;
  content: string;
  isEditing: boolean;
  editValue: string;
  onEditValueChange: (val: string) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  isPending: boolean;
}) {
  if (isEditing) {
    return (
      <Card className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-500">
              Editing Step {stepNumber}
            </span>
          </div>
          <Textarea
            value={editValue}
            onChange={(e) => onEditValueChange(e.target.value)}
            className="min-h-[80px]"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancelEdit}
              disabled={isPending}
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={onSaveEdit}
              disabled={isPending || !editValue.trim()}
            >
              <Check className="h-3.5 w-3.5 mr-1" />
              {isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="group p-4 transition-colors hover:border-[var(--border)]">
      <div className="flex items-start gap-4">
        {stepNumber !== null && (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-[11px] font-bold text-emerald-500">
            {stepNumber}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--foreground)]">
            {content}
          </p>
        </div>
        <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={onStartEdit}
            className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted)] transition-colors hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)]"
            title="Edit step"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted)] transition-colors hover:bg-red-500/10 hover:text-red-500"
            title="Delete step"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </Card>
  );
}
