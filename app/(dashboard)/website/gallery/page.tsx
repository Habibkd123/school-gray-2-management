"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Save, Loader2, Plus, Trash2, Image, CheckCircle2, AlertCircle, Camera } from "lucide-react";
import { FileUploadField } from "../../../components/ui/FileUploadField";

const YoutubeIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/>
    <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white"/>
  </svg>
);

interface PhotoItem {
  _id?: string;
  url: string;
  caption: string;
  album: string;
}

interface VideoItem {
  _id?: string;
  url: string;
  title: string;
}

interface GalleryData {
  hero_image_url: string;
  photos: PhotoItem[];
  videos: VideoItem[];
}

const defaultData: GalleryData = { hero_image_url: "", photos: [], videos: [] };

export default function GalleryPage() {
  const [data, setData] = useState<GalleryData>(defaultData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [tab, setTab] = useState<"photos" | "videos">("photos");

  useEffect(() => {
    const token = localStorage.getItem("sm_access_token");
    if (!token) { setLoading(false); return; }
    fetch("/api/landing", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => { if (res.success && res.data?.gallery) setData({ ...defaultData, ...res.data.gallery }); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true); setStatus("idle");
    try {
      const token = localStorage.getItem("sm_access_token");
      const res = await fetch("/api/landing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ section: "gallery", data }),
      });
      setStatus((await res.json()).success ? "success" : "error");
    } catch { setStatus("error"); }
    finally { setSaving(false); setTimeout(() => setStatus("idle"), 3000); }
  };

  const addPhoto = () => setData((p) => ({ ...p, photos: [...p.photos, { url: "", caption: "", album: "General" }] }));
  const removePhoto = (i: number) => setData((p) => ({ ...p, photos: p.photos.filter((_, idx) => idx !== i) }));
  const updatePhoto = (i: number, f: keyof PhotoItem, v: string) =>
    setData((p) => ({ ...p, photos: p.photos.map((ph, idx) => idx === i ? { ...ph, [f]: v } : ph) }));

  const addVideo = () => setData((p) => ({ ...p, videos: [...p.videos, { url: "", title: "" }] }));
  const removeVideo = (i: number) => setData((p) => ({ ...p, videos: p.videos.filter((_, idx) => idx !== i) }));
  const updateVideo = (i: number, f: keyof VideoItem, v: string) =>
    setData((p) => ({ ...p, videos: p.videos.map((v2, idx) => idx === i ? { ...v2, [f]: v } : v2) }));

  // Get unique albums
  const albums = Array.from(new Set(data.photos.map((p) => p.album).filter(Boolean)));

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/website" className="p-2 rounded-lg hover:bg-slate-800/50 text-slate-400 hover:text-white transition-colors"><ArrowLeft className="w-5 h-5" /></Link>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center"><Image className="w-5 h-5 text-cyan-400" /></div>
          <div>
            <h1 className="text-xl font-bold text-white">Gallery</h1>
            <p className="text-slate-400 text-[12px]">Photo albums and video gallery</p>
          </div>
        </div>
        <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white text-[13px] font-semibold hover:bg-primary/90 disabled:opacity-60 transition-all">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {status === "success" && <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[13px] font-medium"><CheckCircle2 className="w-4 h-4" /> Saved!</div>}
      {status === "error" && <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[13px] font-medium"><AlertCircle className="w-4 h-4" /> Failed.</div>}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5">
          <div className="flex items-center gap-2 text-cyan-400 mb-1"><Camera className="w-4 h-4" /><span className="text-[11px] font-semibold uppercase tracking-wider">Photos</span></div>
          <p className="text-2xl font-black text-white">{data.photos.length}</p>
          <p className="text-slate-500 text-[11px] mt-1">{albums.length} albums</p>
        </div>
        <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5">
          <div className="flex items-center gap-2 text-rose-400 mb-1"><YoutubeIcon className="w-4 h-4" /><span className="text-[11px] font-semibold uppercase tracking-wider">Videos</span></div>
          <p className="text-2xl font-black text-white">{data.videos.length}</p>
        </div>
      </div>

      {/* Gallery Settings */}
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-6">
        <h2 className="text-white font-bold text-[14px] border-b border-slate-700/50 pb-3 mb-4">Gallery Page Settings</h2>
        <FileUploadField
          label="Hero Banner Image"
          value={data.hero_image_url || ""}
          onChange={(v) => setData((p) => ({ ...p, hero_image_url: v }))}
          accept="image/*"
          placeholder="Upload or paste image URL for Gallery page hero banner..."
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-800/50 rounded-xl border border-slate-700/50 w-fit">
        {(["photos", "videos"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-[13px] font-semibold transition-all capitalize ${tab === t ? "bg-primary text-white shadow" : "text-slate-400 hover:text-white"}`}>
            {t === "photos" ? `📷 Photos (${data.photos.length})` : `🎬 Videos (${data.videos.length})`}
          </button>
        ))}
      </div>

      {/* Photos Tab */}
      {tab === "photos" && (
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-700/50 pb-3">
            <h2 className="text-white font-bold text-[14px]">Photo Albums</h2>
            <button onClick={addPhoto} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[12px] font-semibold hover:bg-primary/20 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add Photo
            </button>
          </div>
          {data.photos.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-[13px]">
              <Camera className="w-12 h-12 text-slate-700 mx-auto mb-2 dark:text-slate-200" />
              No photos yet. Add photo URLs to build your gallery.
            </div>
          ) : (
            <div className="space-y-3">
              {data.photos.map((photo, i) => (
                <div key={i} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/30">
                  <div className="flex gap-3 items-start">
                    {/* Preview */}
                    {photo.url ? (
                      <img src={photo.url} alt={photo.caption} className="w-16 h-16 rounded-lg object-cover shrink-0 border border-slate-700/50" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-slate-700/50 border border-slate-700/30 flex items-center justify-center shrink-0">
                        <Camera className="w-6 h-6 text-slate-600 dark:text-slate-300" />
                      </div>
                    )}
                    <div className="flex-1 space-y-3">
                      <FileUploadField
                        label="Photo"
                        value={photo.url}
                        onChange={(v) => updatePhoto(i, "url", v)}
                        accept="image/*"
                        placeholder="https://... (link to photo or upload)"
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Caption</label>
                          <input type="text" value={photo.caption} onChange={(e) => updatePhoto(i, "caption", e.target.value)} placeholder="e.g. Annual Sports Day"
                            className="w-full bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-2 text-[12px] text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Album</label>
                          <input type="text" value={photo.album} onChange={(e) => updatePhoto(i, "album", e.target.value)} placeholder="e.g. Sports Day 2024"
                            className="w-full bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-2 text-[12px] text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all" />
                        </div>
                      </div>
                    </div>
                    <button onClick={() => removePhoto(i)} className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Videos Tab */}
      {tab === "videos" && (
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-700/50 pb-3">
            <h2 className="text-white font-bold text-[14px]">Video Gallery</h2>
            <button onClick={addVideo} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[12px] font-semibold hover:bg-primary/20 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add Video
            </button>
          </div>
          {data.videos.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-[13px]">
              <YoutubeIcon className="w-12 h-12 text-slate-700 mx-auto mb-2 dark:text-slate-200" />
              No videos yet. Add YouTube or video embed URLs.
            </div>
          ) : (
            <div className="space-y-3">
              {data.videos.map((video, i) => (
                <div key={i} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/30">
                  <div className="flex gap-4 items-start">
                    {/* Preview */}
                    {video.url ? (
                      (() => {
                        const ytMatch = video.url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
                        if (ytMatch && ytMatch[1]) {
                          return (
                            <img src={`https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`} className="w-16 h-16 rounded-lg object-cover shrink-0 border border-slate-700/50" alt="YT Thumbnail" />
                          );
                        } else {
                          return (
                            <video src={video.url} className="w-16 h-16 rounded-lg object-cover shrink-0 border border-slate-700/50 bg-black" />
                          );
                        }
                      })()
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-slate-700/50 border border-slate-700/30 flex items-center justify-center shrink-0">
                        <YoutubeIcon className="w-6 h-6 text-slate-600 dark:text-slate-300" />
                      </div>
                    )}
                    <div className="flex-1 space-y-3">
                      <FileUploadField
                        label="Video (Upload file or paste YouTube/direct URL)"
                        value={video.url}
                        onChange={(v) => updateVideo(i, "url", v)}
                        accept="video/*"
                        placeholder="Upload video or paste link (YouTube, MP4, etc.)..."
                      />
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Title / Caption</label>
                        <input type="text" value={video.title} onChange={(e) => updateVideo(i, "title", e.target.value)} placeholder="e.g. Annual Day 2024 Highlights"
                          className="w-full bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-2 text-[12px] text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all" />
                      </div>
                    </div>
                    <button onClick={() => removeVideo(i)} className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end pb-6">
        <button onClick={save} disabled={saving} className="flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-white text-[14px] font-semibold hover:bg-primary/90 disabled:opacity-60 transition-all">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Saving..." : "Save Gallery"}
        </button>
      </div>
    </div>
  );
}
