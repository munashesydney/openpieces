 "use client";

 import { useState } from "react";
 import { Eye, Plus, Shield, Trash2 } from "lucide-react";
 import { Button } from "@/components/basic/buttons/button";
 import { Input } from "@/components/basic/input/input";
 import { Sheet } from "@/components/ui/sheet";

 type Secret = {
   id: string;
   name: string;
   value: string;
   createdAt: string;
   updatedAt: string;
 };

 const initialSecrets: Secret[] = [
   {
     id: "1",
     name: "OPENAI_API_KEY",
     value: "sk-live-************************",
     createdAt: new Date().toISOString(),
     updatedAt: new Date().toISOString(),
   },
   {
     id: "2",
     name: "GITHUB_TOKEN",
     value: "ghp_****************************",
     createdAt: new Date().toISOString(),
     updatedAt: new Date().toISOString(),
   },
 ];

export function SecretsPage() {
  const [secrets, setSecrets] = useState<Secret[]>(initialSecrets);
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name || !value) return;

    const now = new Date().toISOString();

    // Edit existing
    if (editingId) {
      setSecrets((prev) =>
        prev.map((s) =>
          s.id === editingId
            ? {
                ...s,
                name,
                value,
                updatedAt: now,
              }
            : s
        )
      );
    } else {
      const next: Secret = {
        id: crypto.randomUUID(),
        name,
        value,
        createdAt: now,
        updatedAt: now,
      };
      setSecrets((prev) => [next, ...prev]);
    }

    setName("");
    setValue("");
    setEditingId(null);
    setIsSheetOpen(false);
  };

  const handleDelete = (id: string) => {
    setSecrets((prev) => prev.filter((s) => s.id !== id));
  };

  const handleEdit = (secret: Secret) => {
    setEditingId(secret.id);
    setName(secret.name);
    setValue(secret.value);
    setIsSheetOpen(true);
  };

   return (
     <div className="flex w-full justify-center px-6 pb-20 pt-10">
       <div className="w-full max-w-[820px] space-y-10">
         <div className="flex items-center justify-between gap-4">
           <div>
             <h1 className="text-2xl font-semibold text-[var(--foreground)]">
               Secrets
             </h1>
             <p className="mt-1 text-sm text-[var(--muted)]">
               Manage environment variables used by your personal workflows and services.
             </p>
           </div>
           <Button
             type="button"
             className="gap-2"
             onClick={() => setIsSheetOpen(true)}
           >
             <Plus className="h-4 w-4" />
             Add secret
           </Button>
         </div>

         <Sheet
          isOpen={isSheetOpen}
          onClose={() => setIsSheetOpen(false)}
          title="Add secret"
          description="Create a new environment variable."
          footer={<></>}
        >
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label="Name"
              name="name"
              placeholder="e.g. OPENAI_API_KEY"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label="Value"
              name="value"
              type="password"
              placeholder="••••••••••••••••••"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              required
            />

            <div className="mt-6 flex justify-end gap-3 border-t border-[var(--border)] pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsSheetOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="gap-2"
                disabled={!name || !value}
              >
                <Plus className="h-4 w-4" />
                {editingId ? "Save changes" : "Add secret"}
              </Button>
            </div>
          </form>
        </Sheet>

         <section className="space-y-3">
           <div className="flex items-center justify-between gap-4">
             <div>
               <h2 className="text-sm font-semibold text-[var(--foreground)]">
                 Defined secrets
               </h2>
               <p className="text-xs text-[var(--muted)] mt-1">
                 These values will be injected as environment variables during workflow runs.
               </p>
             </div>
             {secrets.length > 0 && (
               <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--muted)]">
                 {secrets.length} {secrets.length === 1 ? "secret" : "secrets"}
               </span>
             )}
           </div>

           <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--background-soft)]">
             {secrets.length === 0 ? (
               <div className="flex flex-col items-center justify-center px 8 py-12 text-center">
                 <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--hover-bg)]">
                   <Shield className="h-5 w-5 text-[var(--accent)]" />
                 </div>
                 <p className="text-sm font-medium text-[var(--foreground)]">
                   No secrets yet
                 </p>
                 <p className="mt-1 max-w-md text-xs text-[var(--muted)]">
                   Create your first secret above. A good start is connecting your model
                   provider or any third-party API keys used by your workflows.
                 </p>
               </div>
             ) : (
               <div className="divide-y divide-[var(--border)]">
                 <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,2fr)_120px] gap-3 bg-[var(--background)] px-4 py-3 text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                   <span>Name</span>
                   <span>Value</span>
                   <span className="text-right">Actions</span>
                 </div>
                 {secrets.map((secret) => (
                  <SecretRow
                    key={secret.id}
                    secret={secret}
                    onDelete={handleDelete}
                    onEdit={handleEdit}
                  />
                 ))}
               </div>
             )}
           </div>
         </section>
       </div>
    </div>
  );
 }

function SecretRow({
  secret,
  onDelete,
  onEdit,
}: {
  secret: Secret;
  onDelete: (id: string) => void;
  onEdit: (secret: Secret) => void;
}) {
   const [revealed, setRevealed] = useState(false);

   return (
    <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,2fr)_120px] items-center gap-3 px-4 py-3 text-xs">
       <div className="min-w-0">
         <div className="flex items-center gap-2">
           <span className="truncate font-medium text-[var(--foreground)]">
             {secret.name}
           </span>
         </div>
         <p className="mt-0.5 text-[11px] text-[var(--muted)]">
           Updated {new Date(secret.updatedAt).toLocaleString()}
         </p>
       </div>
       <div className="min-w-0">
         {revealed ? (
           <span className="break-all text-[var(--foreground)]">
             {secret.value}
           </span>
         ) : (
           <span className="text-[var(--muted)]">
             {"•".repeat(Math.min(16, Math.max(4, secret.value.length)))}
           </span>
         )}
       </div>
       <div className="flex items-center justify-end gap-1">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-[var(--muted)]"
          onClick={() => onEdit(secret)}
          aria-label="Edit secret"
        >
          Edit
        </Button>
         <Button
           type="button"
           size="icon"
           variant="ghost"
           className="h-7 w-7 text-[var(--muted)]"
           onClick={() => setRevealed((v) => !v)}
           aria-label={revealed ? "Hide value" : "Reveal value"}
         >
           <Eye className="h-3.5 w-3.5" />
         </Button>
         <Button
           type="button"
           size="icon"
           variant="ghost"
           className="h-7 w-7 text-[var(--muted)] hover:text-red-500"
           onClick={() => onDelete(secret.id)}
           aria-label="Delete secret"
         >
           <Trash2 className="h-3.5 w-3.5" />
         </Button>
       </div>
     </div>
   );
 }

