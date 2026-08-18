import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function UserSetupModal({ 
  open, 
  onSave 
}: { 
  open: boolean; 
  onSave: (id: string) => void;
}) {
  const [val, setVal] = useState("");

  const handleSave = () => {
    if (val.trim()) {
      onSave(val.trim());
      setVal("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md [&>button]:hidden">
        <DialogHeader>
          <DialogTitle>Welcome to IronPace</DialogTitle>
          <DialogDescription>
            Enter your user ID to access your dashboard.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <Input 
            placeholder="e.g. 123e4567-e89b-12d3-a456-426614174000" 
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            className="font-mono"
          />
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={!val.trim()}>Save & Continue</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
