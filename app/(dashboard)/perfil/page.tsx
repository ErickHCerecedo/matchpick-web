'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import type { ApiResponse, User } from '@/types';
import { ArrowLeft, Camera, Loader2, UserCircle } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

export default function PerfilPage() {
  const router = useRouter();
  const { user, setUser } = useAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [name, setName] = useState(user?.name ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('auth_token');
      const formData = new FormData();

      if (name.trim() && name.trim() !== user.name) {
        formData.append('name', name.trim());
      }
      if (username.trim() !== (user.username ?? '')) {
        formData.append('username', username.trim());
      }
      if (selectedFile) {
        formData.append('avatar', selectedFile);
      }

      const res = await fetch(`${API_URL}/profile`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: `Error ${res.status}` }));
        throw new Error((err as { message?: string }).message ?? `Error ${res.status}`);
      }

      const data: ApiResponse<User> = await res.json();
      setUser(data.data);
      setPreview(null);
      setSelectedFile(null);
      toast.success('Perfil actualizado.');
      router.push('/');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar el perfil');
    } finally {
      setLoading(false);
    }
  };

  const avatarSrc = preview ?? user.avatar_url ?? undefined;
  const initials   = user.name.charAt(0).toUpperCase();

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-white">Editar perfil</h2>
          <p className="text-slate-400 text-sm">Actualiza tu nombre, alias e imagen</p>
        </div>
      </div>

      <Card className="bg-slate-900 border-slate-700">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <UserCircle className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-white text-base">Tu perfil</CardTitle>
              <CardDescription className="text-slate-400 text-sm">Los cambios son visibles para todos los participantes</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Avatar picker */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative group">
                <Avatar className="h-20 w-20 ring-2 ring-slate-700 ring-offset-2 ring-offset-slate-900">
                  <AvatarImage src={avatarSrc} />
                  <AvatarFallback className="bg-slate-700 text-white text-2xl">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Camera className="h-5 w-5 text-white" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                {selectedFile ? selectedFile.name : 'Cambiar foto de perfil'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-slate-300">Nombre</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-600"
                required
              />
            </div>

            {/* Username */}
            <div className="space-y-1.5">
              <Label className="text-slate-300">
                Alias / Username{' '}
                <span className="text-slate-500 font-normal text-xs">(opcional)</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm select-none">@</span>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                  placeholder="tu_alias"
                  maxLength={50}
                  className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-600 pl-7"
                />
              </div>
              <p className="text-[11px] text-slate-600">Solo letras, números y guiones bajos.</p>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold mt-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Guardar cambios
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
