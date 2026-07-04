'use client';
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { Users, Plus, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GroupCard {
  id: string;
  name: string;
  total_score: number;
  member_count: number;
  capacity: number;
  full: boolean;
  members: { uid: string; name: string; avatar: string | null }[];
}

interface Props {
  open: boolean;
  currentGroupId: string | null;
  onConfirmed: (groupId: string, groupName: string) => void;
  onClose: () => void;
}

export function GroupSelector({ open, currentGroupId, onConfirmed, onClose }: Props) {
  const [groups, setGroups] = useState<GroupCard[]>([]);
  const [canCreate, setCanCreate] = useState(true);
  const [maxGroups, setMaxGroups] = useState(8);
  const [maxMembers, setMaxMembers] = useState(7);
  const [selectedId, setSelectedId] = useState<string | null>(currentGroupId);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/groups', { cache: 'no-store' });
      const data = await res.json();
      setGroups(data.groups || []);
      setCanCreate(data.canCreate);
      setMaxGroups(data.maxGroups);
      setMaxMembers(data.maxMembers);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchGroups();
  }, [open]);

  useEffect(() => {
    setSelectedId(currentGroupId);
  }, [currentGroupId, open]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: 'Không thể tạo nhóm', description: data.message || data.error, variant: 'error' });
        return;
      }
      setGroups(prev => [...prev, data.group]);
      setSelectedId(data.group.id);
      setNewName('');
      toast({ title: `Đã tạo nhóm ${data.group.name}`, variant: 'success' });
    } finally {
      setCreating(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedId) return;
    const target = groups.find(g => g.id === selectedId);
    if (!target) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/user', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ groupId: selectedId })
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: 'Không thể tham gia nhóm', description: data.message || data.error, variant: 'error' });
        return;
      }
      onConfirmed(selectedId, target.name);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Bạn đang ở nhóm nào?</DialogTitle>
          <DialogDescription>
            Chọn nhóm để cùng thi đấu và tích điểm. Tối đa {maxGroups} nhóm, {maxMembers} thành viên mỗi nhóm.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 rounded-xl bg-primary-soft animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 max-h-[50vh] overflow-y-auto pr-2">
              {groups.length === 0 && (
                <div className="col-span-full text-center text-muted py-8">
                  Chưa có nhóm nào. Hãy là người đầu tiên tạo nhóm bên dưới!
                </div>
              )}
              {groups.map(g => {
                const isSelected = selectedId === g.id;
                const disabled = g.full && g.id !== currentGroupId;
                return (
                  <motion.button
                    key={g.id}
                    type="button"
                    whileHover={!disabled ? { scale: 1.02 } : undefined}
                    whileTap={!disabled ? { scale: 0.98 } : undefined}
                    onClick={() => !disabled && setSelectedId(g.id)}
                    disabled={disabled}
                    className={cn(
                      'relative rounded-xl border-2 p-4 text-left transition-colors',
                      isSelected
                        ? 'border-primary bg-primary-soft shadow-md'
                        : 'border-border bg-surface hover:border-primary/40',
                      disabled && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    {isSelected && (
                      <CheckCircle2 className="absolute right-3 top-3 h-5 w-5 text-primary" />
                    )}
                    <div className="font-display text-lg font-bold text-text mb-2">{g.name}</div>
                    <div className="flex items-center gap-1 mb-3">
                      {Array.from({ length: g.capacity }).map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            'h-2 flex-1 rounded-full',
                            i < g.member_count ? 'bg-primary' : 'bg-border'
                          )}
                        />
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1 text-muted">
                        <Users className="h-3.5 w-3.5" />
                        {g.member_count}/{g.capacity}
                      </span>
                      {g.full ? (
                        <span className="text-xs font-medium text-danger">Đã đầy</span>
                      ) : (
                        <span className="text-xs font-medium text-muted">
                          {g.total_score.toLocaleString()}đ
                        </span>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {canCreate && (
              <div className="border-t border-border pt-4 flex gap-2">
                <Input
                  placeholder="Tên nhóm mới..."
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  maxLength={50}
                  disabled={creating}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                />
                <Button onClick={handleCreate} disabled={!newName.trim() || creating} variant="outline">
                  <Plus className="h-4 w-4" />
                  Tạo nhóm
                </Button>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={onClose}>
                Để sau
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={!selectedId || submitting || selectedId === currentGroupId}
              >
                {submitting ? 'Đang lưu...' : 'Xác nhận'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
