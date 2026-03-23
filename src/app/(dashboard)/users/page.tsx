"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";

interface User { id: string; name: string; email: string; role: string; isActive: boolean; createdAt: string; }

const ROLES = ["ADMIN", "MANAGER", "PROVIDER", "FRONT_DESK"];
const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin", MANAGER: "Manager", PROVIDER: "Provider", FRONT_DESK: "Front Desk",
};
const roleColors: Record<string, string> = {
  ADMIN: "bg-red-100 text-red-700",
  MANAGER: "bg-purple-100 text-purple-700",
  PROVIDER: "bg-blue-100 text-blue-700",
  FRONT_DESK: "bg-slate-100 text-slate-700",
};

type ModalState =
  | { type: "none" }
  | { type: "add" }
  | { type: "edit"; user: User }
  | { type: "delete"; user: User };

export default function UsersPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Add form state
  const [addForm, setAddForm] = useState({ name: "", email: "", password: "", role: "PROVIDER" });
  // Edit form state
  const [editForm, setEditForm] = useState({ name: "", email: "", role: "PROVIDER", isActive: true });

  const isAdmin = session?.user.role === "ADMIN";

  useEffect(() => {
    if (session && session.user.role !== "ADMIN" && session.user.role !== "MANAGER") {
      router.push("/");
    }
  }, [session, router]);

  function loadUsers() {
    fetch("/api/users").then((r) => r.json()).then((d) => { setUsers(d); setLoading(false); });
  }
  useEffect(() => { loadUsers(); }, []);

  function openAdd() {
    setAddForm({ name: "", email: "", password: "", role: "PROVIDER" });
    setError("");
    setModal({ type: "add" });
  }

  function openEdit(user: User) {
    setEditForm({ name: user.name, email: user.email, role: user.role, isActive: user.isActive });
    setError("");
    setModal({ type: "edit", user });
  }

  function openDelete(user: User) {
    setError("");
    setModal({ type: "delete", user });
  }

  function closeModal() {
    setModal({ type: "none" });
    setError("");
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addForm),
    });
    setSaving(false);
    if (res.ok) { closeModal(); loadUsers(); }
    else { const d = await res.json(); setError(d.error ?? "Failed to create user."); }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (modal.type !== "edit") return;
    setSaving(true);
    setError("");
    const res = await fetch(`/api/users/${modal.user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setSaving(false);
    if (res.ok) { closeModal(); loadUsers(); }
    else { const d = await res.json(); setError(d.error ?? "Failed to update user."); }
  }

  async function handleDelete() {
    if (modal.type !== "delete") return;
    setSaving(true);
    setError("");
    const res = await fetch(`/api/users/${modal.user.id}`, { method: "DELETE" });
    setSaving(false);
    if (res.ok) { closeModal(); loadUsers(); }
    else { const d = await res.json(); setError(d.error ?? "Failed to deactivate user."); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage staff accounts and access levels.</p>
        </div>
        {isAdmin && (
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Staff Member
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Created</th>
                {isAdmin && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold shrink-0">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      {user.name}
                      {user.id === session?.user.id && <span className="text-xs text-slate-400">(you)</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${roleColors[user.role] ?? "bg-gray-100 text-gray-700"}`}>
                      {ROLE_LABELS[user.role] ?? user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {user.isActive ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Active</span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">Inactive</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatDate(user.createdAt)}</td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(user)}
                          className="inline-flex items-center gap-1 h-9 px-3 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button>
                        {user.id !== session?.user.id && (
                          <button
                            onClick={() => openDelete(user)}
                            className="inline-flex items-center gap-1 h-9 px-3 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                            Deactivate
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Backdrop */}
      {modal.type !== "none" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">

            {/* Add Staff Modal */}
            {modal.type === "add" && (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">Add Staff Member</h2>
                  <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">{error}</div>}
                <form onSubmit={handleAdd} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                      <input type="text" value={addForm.name} onChange={(e) => setAddForm(f => ({ ...f, name: e.target.value }))} required
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                      <input type="email" value={addForm.email} onChange={(e) => setAddForm(f => ({ ...f, email: e.target.value }))} required
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Temporary Password</label>
                      <input type="password" value={addForm.password} onChange={(e) => setAddForm(f => ({ ...f, password: e.target.value }))} required minLength={8}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Role</label>
                      <select value={addForm.role} onChange={(e) => setAddForm(f => ({ ...f, role: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white">
                        {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button type="submit" disabled={saving}
                      className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
                      {saving ? "Creating..." : "Create Account"}
                    </button>
                    <button type="button" onClick={closeModal}
                      className="px-5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                      Cancel
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* Edit Staff Modal */}
            {modal.type === "edit" && (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">Edit Staff Member</h2>
                  <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">{error}</div>}
                <form onSubmit={handleEdit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                      <input type="text" value={editForm.name} onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))} required
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                      <input type="email" value={editForm.email} onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))} required
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Role</label>
                      <select value={editForm.role} onChange={(e) => setEditForm(f => ({ ...f, role: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white">
                        {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                      </select>
                    </div>
                    <div className="flex items-end pb-2.5">
                      <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                        <input type="checkbox" checked={editForm.isActive} onChange={(e) => setEditForm(f => ({ ...f, isActive: e.target.checked }))}
                          className="rounded accent-violet-600" />
                        Account active
                      </label>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button type="submit" disabled={saving}
                      className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                    <button type="button" onClick={closeModal}
                      className="px-5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                      Cancel
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* Delete Confirmation Modal */}
            {modal.type === "delete" && (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">Deactivate Account</h2>
                  <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-700">
                    Are you sure you want to deactivate <strong>{modal.user.name}</strong>? They will no longer be able to sign in.
                  </p>
                </div>
                {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">{error}</div>}
                <div className="flex gap-3">
                  <button onClick={handleDelete} disabled={saving}
                    className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
                    {saving ? "Deactivating..." : "Yes, Deactivate"}
                  </button>
                  <button onClick={closeModal}
                    className="px-5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                    Cancel
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
