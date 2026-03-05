import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import api from '@/services/api';

interface User {
    id?: number;
    email: string;
    full_name: string;
    role: string;
    department?: string;
    institution_id?: string;
    position?: string;
    is_active?: boolean;
    password?: string;
}

interface UserModalProps {
    isOpen: boolean;
    onClose: () => void;
    user?: User | null;
    onSuccess: () => void;
}

const UserModal: React.FC<UserModalProps> = ({ isOpen, onClose, user, onSuccess }) => {
    const [formData, setFormData] = useState<User>({
        email: '',
        full_name: '',
        role: 'student',
        department: '',
        institution_id: '',
        position: '',
        is_active: true,
        password: ''
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            setFormData({
                ...user,
                password: '' // Don't populate password on edit
            });
        } else {
            setFormData({
                email: '',
                full_name: '',
                role: 'student',
                department: '',
                institution_id: '',
                position: '',
                is_active: true,
                password: ''
            });
        }
    }, [user, isOpen]);

    const handleChange = (field: keyof User, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (user?.id) {
                // Update
                await api.post(`/admin/users/${user.id}/edit`, formData);
            } else {
                // Create
                await api.post('/admin/users/create', formData);
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Operation failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{user ? 'Edit User' : 'Add New User'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="full_name" className="text-right">Name</Label>
                        <Input id="full_name" value={formData.full_name} onChange={e => handleChange('full_name', e.target.value)} className="col-span-3" required />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="email" className="text-right">Email</Label>
                        <Input id="email" type="email" value={formData.email} onChange={e => handleChange('email', e.target.value)} className="col-span-3" required />
                    </div>

                    <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                            <div className="w-full border-t border-slate-100 dark:border-slate-800"></div>
                        </div>
                        <div className="relative flex justify-center">
                            <span className="bg-white dark:bg-slate-950 px-2 text-[0.65rem] font-bold uppercase tracking-wider text-slate-400">Security & Access</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="role" className="text-right">Role</Label>
                        <div className="col-span-3">
                            <select
                                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 dark:border-slate-800 dark:bg-slate-950"
                                value={formData.role}
                                onChange={(e) => handleChange('role', e.target.value)}
                            >
                                <option value="student">Student</option>
                                <option value="faculty">Faculty</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                    </div>

                    {formData.role !== 'admin' && (
                        <>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="dept" className="text-right">Dept</Label>
                                <Input id="dept" value={formData.department || ''} onChange={e => handleChange('department', e.target.value)} className="col-span-3" required />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="inst_id" className="text-right">ID/Roll</Label>
                                <Input id="inst_id" value={formData.institution_id || ''} onChange={e => handleChange('institution_id', e.target.value)} className="col-span-3" required />
                            </div>
                        </>
                    )}

                    {formData.role === 'faculty' && (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="pos" className="text-right">Position</Label>
                            <Input id="pos" value={formData.position || ''} onChange={e => handleChange('position', e.target.value)} className="col-span-3" placeholder="e.g. HOD" />
                        </div>
                    )}

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="pass" className="text-right">Password</Label>
                        <Input id="pass" type="password" value={formData.password || ''} onChange={e => handleChange('password', e.target.value)} className="col-span-3" placeholder={user ? "Leave blank to keep" : "Required"} required={!user} />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <div className="col-start-2 col-span-3 flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="is_active"
                                checked={formData.is_active}
                                onChange={(e) => handleChange('is_active', e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <Label htmlFor="is_active">Active Account</Label>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save User'}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default UserModal;
